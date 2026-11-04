import { Router, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db, haversineDistanceKm } from '../db';
import { AuthenticatedRequest, requireAuth, requireRoles } from '../middleware/auth';
import { realtimeHub } from '../ws';
import { BoardingRecord, Trip } from '../../src/types/cibus';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'cibus-cebu-production-grade-secret-key-change-in-prod';

function driverOrDemoAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    requireAuth(req, res, () => {
      requireRoles('DRIVER', 'CONDUCTOR', 'ADMIN')(req, res, next);
    });
    return;
  }

  if (db.state.simulationSettings.operatingMode === 'DRY_RUN') {
    const demoDriver = db.state.users.find((u) => u.role === 'DRIVER') || db.state.users[1];
    req.user = demoDriver;
    next();
    return;
  }

  requireAuth(req, res, next);
}

router.use(driverOrDemoAuth);

function resolveAuthorizedBus(req: AuthenticatedRequest, requestedBusId?: string) {
  const user = req.user!;
  if (user.role === 'ADMIN' || !req.headers.authorization) {
    const targetId = requestedBusId || user.assignedBusId || db.state.buses[0]?.id;
    return db.state.buses.find((b) => b.id === targetId) || null;
  }
  const assignedId = user.assignedBusId;
  if (!assignedId) {
    return null;
  }
  if (requestedBusId && requestedBusId !== assignedId) {
    return null; // Prevent driver/conductor from updating another bus
  }
  return db.state.buses.find((b) => b.id === assignedId) || null;
}

// Get Driver/Conductor Assigned Bus & Live Upcoming Stop Demand Overview
router.get('/dashboard', (req: AuthenticatedRequest, res: Response) => {
  db.expireOutdatedWaitingRequests();

  const bus = resolveAuthorizedBus(req, req.query.busId as string | undefined);
  if (!bus) {
    res.status(404).json({
      error: 'No CIBUS bus is currently assigned to your account. Please ask an Administrator/Dispatcher to assign a bus.',
    });
    return;
  }

  const route = db.getEnrichedRoutes().find((r) => r.id === bus.assignedRouteId) || null;
  const activeTrip = db.state.trips.find((t) => t.busId === bus.id && t.status === 'ACTIVE') || null;
  const currentSeq = activeTrip ? activeTrip.currentStopSequence : 1;

  const upcomingStops = (route?.stops || []).map((rs) => {
    const isPassed = activeTrip ? rs.stopSequence < currentSeq : false;
    const isCurrentOrNext = rs.stopId === bus.nextStopId || rs.stopSequence === currentSeq;

    // Filter waiting requests strictly by assigned route, direction, and boarding stop
    const stopRequests = db.state.waitingRequests.filter(
      (wr) =>
        wr.routeId === bus.assignedRouteId &&
        wr.direction === bus.currentDirection &&
        wr.boardingStopId === rs.stopId &&
        wr.status === 'WAITING'
    );

    const expectedPassengers = stopRequests.reduce((sum, r) => sum + r.passengerCount, 0);

    // Also compute actual boarded today/on active trip at this stop
    const tripBoardings = db.state.boardingRecords.filter(
      (br) =>
        br.busId === bus.id &&
        br.stopId === rs.stopId &&
        (activeTrip ? br.tripId === activeTrip.id : true)
    );
    const actualBoardedAtStop = tripBoardings.reduce((sum, b) => sum + b.actualBoardedCount, 0);

    return {
      stopId: rs.stopId,
      stopCode: rs.stop?.stopCode,
      stopName: rs.stop?.stopName,
      stopType: rs.stop?.stopType,
      stopSequence: rs.stopSequence,
      latitude: rs.stop?.latitude,
      longitude: rs.stop?.longitude,
      distanceFromOriginKm: rs.distanceFromOriginKm,
      isPassed,
      isCurrentOrNext,
      expectedPassengers,
      registeredRequestCount: stopRequests.length,
      isHighDemand: expectedPassengers >= 8,
      actualBoardedCount: actualBoardedAtStop,
      waitingRequests: stopRequests,
    };
  });

  const remainingStops = upcomingStops.filter((s) => !s.isPassed);
  const totalExpectedRemainingPassengers = remainingStops.reduce((sum, s) => sum + s.expectedPassengers, 0);
  const totalRegisteredRequestsRemaining = remainingStops.reduce((sum, s) => sum + s.registeredRequestCount, 0);

  res.json({
    bus: db.getEnrichedBuses().find((b) => b.id === bus.id),
    route,
    activeTrip,
    upcomingStops,
    totalExpectedRemainingPassengers,
    totalRegisteredRequestsRemaining,
    recentBoardings: db.state.boardingRecords
      .filter((br) => br.busId === bus.id)
      .slice(-15)
      .reverse()
      .map((br) => ({
        ...br,
        stopName: db.state.busStops.find((s) => s.id === br.stopId)?.stopName,
      })),
  });
});

// A. Start Trip
router.post('/trips/start', (req: AuthenticatedRequest, res: Response) => {
  const { busId, routeId } = req.body;
  const bus = resolveAuthorizedBus(req, busId);
  if (!bus) {
    res.status(403).json({ error: 'Not authorized to control this bus.' });
    return;
  }

  const targetRouteId = routeId || bus.assignedRouteId;
  const route = db.state.busRoutes.find((r) => r.id === targetRouteId && r.isVerifiedCibus && r.isActive);
  if (!route) {
    res.status(400).json({ error: 'Bus must be assigned to a valid verified CIBUS route before starting a trip.' });
    return;
  }

  // Close any stale active trip for this bus
  db.state.trips
    .filter((t) => t.busId === bus.id && t.status === 'ACTIVE')
    .forEach((t) => {
      t.status = 'COMPLETED';
      t.endedAt = new Date().toISOString();
    });

  const orderedStops = db.state.routeStops
    .filter((rs) => rs.routeId === route.id)
    .sort((a, b) => a.stopSequence - b.stopSequence);

  const firstStopId = orderedStops[0]?.stopId || null;

  const newTrip: Trip = {
    id: `trip-${Date.now()}`,
    busId: bus.id,
    routeId: route.id,
    driverId: req.user!.role === 'DRIVER' ? req.user!.id : null,
    conductorId: req.user!.role === 'CONDUCTOR' ? req.user!.id : null,
    direction: route.direction,
    status: 'ACTIVE',
    currentStopSequence: 1,
    nextStopId: firstStopId,
    startedAt: new Date().toISOString(),
    endedAt: null,
  };

  bus.assignedRouteId = route.id;
  bus.currentDirection = route.direction;
  bus.operationalStatus = 'IN_SERVICE';
  bus.nextStopId = firstStopId;

  db.state.trips.push(newTrip);
  db.save();

  realtimeHub.broadcast('TRIP_STATUS_CHANGED', {
    action: 'STARTED',
    busId: bus.id,
    trip: newTrip,
  });

  res.status(201).json({
    message: `Trip started on ${route.routeCode}. Bus ${bus.busCode} is now IN SERVICE.`,
    trip: newTrip,
    bus: db.getEnrichedBuses().find((b) => b.id === bus.id),
  });
});

// B. End Trip
router.post('/trips/end', (req: AuthenticatedRequest, res: Response) => {
  const { busId } = req.body;
  const bus = resolveAuthorizedBus(req, busId);
  if (!bus) {
    res.status(403).json({ error: 'Not authorized to control this bus.' });
    return;
  }

  const activeTrips = db.state.trips.filter((t) => t.busId === bus.id && t.status === 'ACTIVE');
  const now = new Date().toISOString();

  activeTrips.forEach((t) => {
    t.status = 'COMPLETED';
    t.endedAt = now;
  });

  // Expire any waiting requests specifically bound to the ended trip
  db.state.waitingRequests.forEach((wr) => {
    if (wr.status === 'WAITING' && (wr.targetBusId === bus.id || activeTrips.some((t) => t.id === wr.tripId))) {
      wr.status = 'EXPIRED';
      wr.updatedAt = now;
    }
  });

  bus.operationalStatus = 'OUT_OF_SERVICE';
  bus.lastSpeedKmh = 0;
  bus.isDemoData = false;

  db.save();

  realtimeHub.broadcast('TRIP_STATUS_CHANGED', {
    action: 'ENDED',
    busId: bus.id,
  });

  res.json({
    message: `Trip ended. Bus ${bus.busCode} is now OUT OF SERVICE.`,
    bus: db.getEnrichedBuses().find((b) => b.id === bus.id),
  });
});

// Update Bus Operational Status (e.g. IN_SERVICE, DELAYED, OFFLINE)
router.post('/status', (req: AuthenticatedRequest, res: Response) => {
  const { busId, operationalStatus } = req.body;
  const bus = resolveAuthorizedBus(req, busId);
  if (!bus) {
    res.status(403).json({ error: 'Not authorized to update this bus.' });
    return;
  }

  const allowed = ['IN_SERVICE', 'DELAYED', 'OFFLINE', 'OUT_OF_SERVICE', 'NOT_OPERATING'];
  if (!allowed.includes(operationalStatus)) {
    res.status(400).json({ error: 'Invalid operational status.' });
    return;
  }

  bus.operationalStatus = operationalStatus;
  db.save();

  realtimeHub.broadcast('TRIP_STATUS_CHANGED', {
    action: 'STATUS_UPDATED',
    busId: bus.id,
    operationalStatus,
  });

  res.json({
    message: `Bus ${bus.busCode} status updated to ${operationalStatus}.`,
    bus: db.getEnrichedBuses().find((b) => b.id === bus.id),
  });
});

// C. Update Available Seats Manually
router.post('/seats', (req: AuthenticatedRequest, res: Response) => {
  const { busId, availableSeats } = req.body;
  const bus = resolveAuthorizedBus(req, busId);
  if (!bus) {
    res.status(403).json({ error: 'Only the assigned driver, conductor, or administrator can update seat availability for this bus.' });
    return;
  }

  const nextAvailable = Number(availableSeats);
  if (!Number.isInteger(nextAvailable) || nextAvailable < 0 || nextAvailable > bus.totalCapacity) {
    res.status(400).json({
      error: `Available seats must be a whole number between 0 and the bus capacity (${bus.totalCapacity}).`,
    });
    return;
  }

  const prevAvailable = bus.availableSeats;
  const nextOccupied = bus.totalCapacity - nextAvailable;
  const now = new Date().toISOString();
  const activeTrip = db.state.trips.find((t) => t.busId === bus.id && t.status === 'ACTIVE');

  bus.availableSeats = nextAvailable;
  bus.occupiedSeats = nextOccupied;
  bus.seatSource = 'MANUAL_REPORT';
  bus.lastSeatUpdateAt = now;

  db.state.seatUpdates.push({
    id: `seat-upd-${Date.now()}`,
    busId: bus.id,
    tripId: activeTrip?.id || null,
    updatedByUserId: req.user!.id,
    previousAvailable: prevAvailable,
    newAvailable: nextAvailable,
    occupiedSeats: nextOccupied,
    updateSource: 'MANUAL_REPORT',
    createdAt: now,
  });

  db.save();

  realtimeHub.broadcast('SEAT_AVAILABILITY_UPDATED', {
    busId: bus.id,
    availableSeats: bus.availableSeats,
    occupiedSeats: bus.occupiedSeats,
    totalCapacity: bus.totalCapacity,
    seatSource: bus.seatSource,
    lastSeatUpdateAt: bus.lastSeatUpdateAt,
  });

  res.json({
    message: `Seat availability updated: ${bus.availableSeats} available / ${bus.occupiedSeats} occupied.`,
    bus: db.getEnrichedBuses().find((b) => b.id === bus.id),
  });
});

// D. Confirm Boarding & Advance/Update Next Stop
router.post('/boarding/confirm', (req: AuthenticatedRequest, res: Response) => {
  const { busId, stopId, actualBoardedCount, alightedCount = 0 } = req.body;
  const bus = resolveAuthorizedBus(req, busId);
  if (!bus) {
    res.status(403).json({ error: 'Not authorized to record boarding for this bus.' });
    return;
  }

  const stop = db.state.busStops.find((s) => s.id === stopId);
  if (!stop) {
    res.status(400).json({ error: 'Valid CIBUS stop is required.' });
    return;
  }

  const boarded = Number(actualBoardedCount);
  const alighted = Number(alightedCount);
  if (!Number.isInteger(boarded) || boarded < 0) {
    res.status(400).json({ error: 'Actual boarded count must be 0 or greater.' });
    return;
  }
  if (!Number.isInteger(alighted) || alighted < 0) {
    res.status(400).json({ error: 'Alighted passenger count must be 0 or greater.' });
    return;
  }

  // Calculate net seat change: availableSeats = availableSeats + alighted - boarded, clamped [0, totalCapacity]
  const seatsAfterAlight = Math.min(bus.totalCapacity, bus.availableSeats + alighted);
  if (boarded > seatsAfterAlight) {
    res.status(400).json({
      error: `Cannot board ${boarded} passengers: only ${seatsAfterAlight} seats are available (after ${alighted} alighting).`,
    });
    return;
  }

  const prevAvailable = bus.availableSeats;
  const nextAvailable = Math.max(0, Math.min(bus.totalCapacity, seatsAfterAlight - boarded));
  const nextOccupied = bus.totalCapacity - nextAvailable;
  const now = new Date().toISOString();

  // Find waiting requests at this stop for this route & direction
  const matchingWaiting = db.state.waitingRequests.filter(
    (wr) =>
      wr.routeId === bus.assignedRouteId &&
      wr.direction === bus.currentDirection &&
      wr.boardingStopId === stop.id &&
      wr.status === 'WAITING'
  );

  const expectedPassengerSnapshot = matchingWaiting.reduce((sum, r) => sum + r.passengerCount, 0);
  const expectedRequestSnapshot = matchingWaiting.length;
  const resolvedIds: string[] = [];

  // Mark waiting requests at this stop as BOARDED (or EXPIRED if bus passed)
  matchingWaiting.forEach((wr) => {
    wr.status = boarded > 0 ? 'BOARDED' : 'EXPIRED';
    wr.updatedAt = now;
    resolvedIds.push(wr.id);
  });

  const activeTrip = db.state.trips.find((t) => t.busId === bus.id && t.status === 'ACTIVE');

  // Advance trip stop sequence to next stop on the route
  if (bus.assignedRouteId) {
    const routeStops = db.state.routeStops
      .filter((rs) => rs.routeId === bus.assignedRouteId)
      .sort((a, b) => a.stopSequence - b.stopSequence);

    const currentRs = routeStops.find((rs) => rs.stopId === stop.id);
    if (currentRs) {
      const nextRs = routeStops.find((rs) => rs.stopSequence > currentRs.stopSequence);
      bus.nextStopId = nextRs ? nextRs.stopId : currentRs.stopId;
      if (activeTrip) {
        activeTrip.currentStopSequence = nextRs ? nextRs.stopSequence : currentRs.stopSequence;
        activeTrip.nextStopId = bus.nextStopId;
      }

      // Auto-expire any waiting requests at earlier stops that the bus has now passed
      db.state.waitingRequests.forEach((wr) => {
        if (wr.routeId === bus.assignedRouteId && wr.status === 'WAITING') {
          const wrStopSeq = routeStops.find((rs) => rs.stopId === wr.boardingStopId)?.stopSequence || 999;
          if (wrStopSeq <= currentRs.stopSequence) {
            wr.status = 'EXPIRED';
            wr.updatedAt = now;
          }
        }
      });
    }
  }

  bus.availableSeats = nextAvailable;
  bus.occupiedSeats = nextOccupied;
  bus.seatSource = 'BOARDING_CALCULATED';
  bus.lastSeatUpdateAt = now;

  const boardingRecord: BoardingRecord = {
    id: `brd-${Date.now()}`,
    tripId: activeTrip?.id || null,
    busId: bus.id,
    routeId: bus.assignedRouteId || '',
    stopId: stop.id,
    confirmedByUserId: req.user!.id,
    expectedPassengerCount: expectedPassengerSnapshot,
    expectedRequestCount: expectedRequestSnapshot,
    actualBoardedCount: boarded,
    alightedCount: alighted,
    resolvedRequestIds: resolvedIds,
    createdAt: now,
  };

  db.state.boardingRecords.push(boardingRecord);
  db.state.seatUpdates.push({
    id: `seat-upd-${Date.now()}`,
    busId: bus.id,
    tripId: activeTrip?.id || null,
    updatedByUserId: req.user!.id,
    previousAvailable: prevAvailable,
    newAvailable: nextAvailable,
    occupiedSeats: nextOccupied,
    updateSource: 'BOARDING_CALCULATED',
    createdAt: now,
  });

  db.save();

  realtimeHub.broadcast('BOARDING_CONFIRMED', {
    busId: bus.id,
    boardingRecord,
    availableSeats: bus.availableSeats,
    occupiedSeats: bus.occupiedSeats,
  });

  res.json({
    message: `Boarding confirmed at ${stop.stopName}: ${boarded} boarded (vs ${expectedPassengerSnapshot} expected), ${alighted} alighted. Remaining seats: ${bus.availableSeats}.`,
    boardingRecord,
    bus: db.getEnrichedBuses().find((b) => b.id === bus.id),
  });
});

// E. Live GPS Location Sharing Update
router.post('/gps', (req: AuthenticatedRequest, res: Response) => {
  const { busId, latitude, longitude, heading, speedKmh, source = 'DEVICE_GPS', isDemoMode = false } = req.body;
  const bus = resolveAuthorizedBus(req, busId);
  if (!bus) {
    res.status(403).json({ error: 'Not authorized to update GPS for this bus.' });
    return;
  }

  const lat = Number(latitude);
  const lng = Number(longitude);
  if (Number.isNaN(lat) || Number.isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    res.status(400).json({ error: 'Valid GPS latitude and longitude coordinates are required.' });
    return;
  }

  const now = new Date().toISOString();
  const activeTrip = db.state.trips.find((t) => t.busId === bus.id && t.status === 'ACTIVE');

  bus.lastLat = lat;
  bus.lastLng = lng;
  bus.lastHeading = heading !== undefined && heading !== null ? Number(heading) : bus.lastHeading;
  bus.lastSpeedKmh = speedKmh !== undefined && speedKmh !== null ? Number(speedKmh) : 22;
  bus.lastGpsUpdateAt = now;
  bus.gpsSource = isDemoMode ? 'DEMO_MODE' : source === 'INSTALLED_TRACKER' ? 'INSTALLED_TRACKER' : 'DEVICE_GPS';
  bus.isDemoData = Boolean(isDemoMode);

  if (bus.operationalStatus === 'NOT_OPERATING' || bus.operationalStatus === 'OFFLINE') {
    bus.operationalStatus = 'IN_SERVICE';
  }

  // Determine nearest upcoming stop along the assigned route
  if (bus.assignedRouteId) {
    const rStops = db.state.routeStops
      .filter((rs) => rs.routeId === bus.assignedRouteId)
      .sort((a, b) => a.stopSequence - b.stopSequence);

    let closestStopId = bus.nextStopId;
    let minDistance = Infinity;
    let closestSeq = activeTrip?.currentStopSequence || 1;

    for (const rs of rStops) {
      const st = db.state.busStops.find((s) => s.id === rs.stopId);
      if (st) {
        const d = haversineDistanceKm(lat, lng, st.latitude, st.longitude);
        if (d < minDistance) {
          minDistance = d;
          closestStopId = st.id;
          closestSeq = rs.stopSequence;
        }
      }
    }

    // If within 150 meters of a stop, set nextStop to the following stop on the route
    if (minDistance <= 0.15) {
      const nextRs = rStops.find((rs) => rs.stopSequence > closestSeq);
      bus.nextStopId = nextRs ? nextRs.stopId : closestStopId;
      if (activeTrip && nextRs) {
        activeTrip.currentStopSequence = nextRs.stopSequence;
        activeTrip.nextStopId = nextRs.stopId;
      }
    } else if (!bus.nextStopId && closestStopId) {
      bus.nextStopId = closestStopId;
    }
  }

  db.state.gpsHistory.push({
    id: `gps-${Date.now()}`,
    tripId: activeTrip?.id || null,
    busId: bus.id,
    latitude: lat,
    longitude: lng,
    heading: bus.lastHeading,
    speedKmh: bus.lastSpeedKmh,
    source: bus.gpsSource === 'DEMO_MODE' ? 'DEMO_MODE' : bus.gpsSource === 'INSTALLED_TRACKER' ? 'INSTALLED_TRACKER' : 'DEVICE_GPS',
    recordedAt: now,
  });

  // Keep GPS history bounded
  if (db.state.gpsHistory.length > 500) {
    db.state.gpsHistory = db.state.gpsHistory.slice(-500);
  }

  db.save();

  realtimeHub.broadcast('BUS_GPS_UPDATED', {
    busId: bus.id,
    latitude: bus.lastLat,
    longitude: bus.lastLng,
    lastGpsUpdateAt: bus.lastGpsUpdateAt,
    nextStopId: bus.nextStopId,
    isDemoData: bus.isDemoData,
  });

  res.json({
    message: 'GPS location updated.',
    bus: db.getEnrichedBuses().find((b) => b.id === bus.id),
  });
});

// Validate a Passenger Digital Ticket QR Reference
router.post('/tickets/validate', (req: AuthenticatedRequest, res: Response) => {
  const { ticketReferenceOrQr, busId } = req.body;
  if (!ticketReferenceOrQr) {
    res.status(400).json({ error: 'Ticket reference or QR payload is required.' });
    return;
  }

  const raw = String(ticketReferenceOrQr).trim();
  const ticket = db.state.digitalTickets.find(
    (t) =>
      t.ticketReference.toLowerCase() === raw.toLowerCase() ||
      t.transactionReference.toLowerCase() === raw.toLowerCase() ||
      t.qrPayload === raw
  );

  if (!ticket) {
    res.status(404).json({ error: 'No matching CIBUS digital ticket found for this reference/QR code.' });
    return;
  }

  if (ticket.validationStatus === 'VALIDATED_ON_BOARD') {
    res.status(409).json({
      error: `Ticket ${ticket.ticketReference} was already validated on ${new Date(ticket.validatedAt!).toLocaleString()}.`,
      ticket,
    });
    return;
  }

  if (ticket.validationStatus !== 'VALID') {
    res.status(400).json({
      error: `Ticket ${ticket.ticketReference} is currently ${ticket.validationStatus} and cannot be used for boarding.`,
      ticket,
    });
    return;
  }

  const bus = resolveAuthorizedBus(req, busId);
  const now = new Date().toISOString();

  // If payment was CASH_ON_BOARD_PENDING, validating on board confirms the cash collection by conductor!
  const payment = db.state.payments.find((p) => p.id === ticket.paymentId);
  if (payment && payment.status === 'CASH_ON_BOARD_PENDING') {
    payment.status = 'PAID';
    payment.verifiedViaCallback = true;
    payment.verifiedAt = now;
    ticket.paymentStatus = 'PAID';
  }

  ticket.validationStatus = 'VALIDATED_ON_BOARD';
  ticket.validatedByUserId = req.user!.id;
  ticket.validatedBusId = bus?.id || null;
  ticket.validatedAt = now;

  db.save();

  realtimeHub.broadcast('PAYMENT_AND_TICKET_UPDATED', {
    action: 'TICKET_VALIDATED',
    ticket,
  });

  res.json({
    message: `Ticket ${ticket.ticketReference} (${ticket.passengerCount} pax) verified and marked as boarded!`,
    ticket: {
      ...ticket,
      originStopName: db.state.busStops.find((s) => s.id === ticket.originStopId)?.stopName,
      destinationStopName: db.state.busStops.find((s) => s.id === ticket.destinationStopId)?.stopName,
      routeCode: db.state.busRoutes.find((r) => r.id === ticket.routeId)?.routeCode,
    },
  });
});

export default router;
