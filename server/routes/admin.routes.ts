import { Router, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { db, haversineDistanceKm, UserRecord } from '../db';
import { AuthenticatedRequest, requireAuth, requireRoles } from '../middleware/auth';
import { realtimeHub } from '../ws';
import { Bus, BusRoute, BusStop, RouteStop } from '../../src/types/cibus';

const router = Router();

function adminOrDemoAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    requireAuth(req, res, () => {
      requireRoles('ADMIN')(req, res, next);
    });
    return;
  }

  if (db.state.simulationSettings.operatingMode === 'DRY_RUN') {
    const demoAdmin = db.state.users.find((u) => u.role === 'ADMIN') || db.state.users[0];
    req.user = demoAdmin;
    next();
    return;
  }

  requireAuth(req, res, next);
}

router.use(adminOrDemoAuth);

// 1. Comprehensive Analytics & System State Overview
router.get('/analytics', (_req: AuthenticatedRequest, res: Response) => {
  db.expireOutdatedWaitingRequests();

  const totalRegisteredPassengers = db.state.users.filter((u) => u.role === 'PASSENGER').length;
  const totalDriversAndConductors = db.state.users.filter((u) => u.role === 'DRIVER' || u.role === 'CONDUCTOR').length;
  const activeBuses = db.state.buses.filter((b) => b.operationalStatus !== 'OUT_OF_SERVICE').length;
  const busesInService = db.state.buses.filter((b) => b.operationalStatus === 'IN_SERVICE' || b.operationalStatus === 'DELAYED').length;
  const totalActiveRoutes = db.state.busRoutes.filter((r) => r.isActive && r.isVerifiedCibus).length;
  const totalRegisteredBusStops = db.state.busStops.filter((s) => s.isActive && s.isVerifiedCibus).length;
  const activeWaitingRequests = db.state.waitingRequests.filter((w) => w.status === 'WAITING');
  const totalWaitingPassengers = activeWaitingRequests.reduce((sum, w) => sum + w.passengerCount, 0);
  const successfulTransactions = db.state.payments.filter((p) => p.status === 'PAID');
  const totalRevenuePhp = successfulTransactions.reduce((sum, p) => sum + p.amountPhp, 0);

  // Stop demand analytics: compare expected vs actual boarding per stop
  const stopDemandAnalytics = db.state.busStops.map((stop) => {
    const allRequestsForStop = db.state.waitingRequests.filter((w) => w.boardingStopId === stop.id);
    const activeForStop = allRequestsForStop.filter((w) => w.status === 'WAITING');
    const totalExpectedHistorical = allRequestsForStop.reduce((sum, w) => sum + w.passengerCount, 0);
    const currentExpected = activeForStop.reduce((sum, w) => sum + w.passengerCount, 0);

    const boardingsAtStop = db.state.boardingRecords.filter((b) => b.stopId === stop.id);
    const totalActualBoarded = boardingsAtStop.reduce((sum, b) => sum + b.actualBoardedCount, 0);

    return {
      stopId: stop.id,
      stopCode: stop.stopCode,
      stopName: stop.stopName,
      stopType: stop.stopType,
      isVerifiedCibus: stop.isVerifiedCibus,
      currentExpectedPassengers: currentExpected,
      totalHistoricalExpected: totalExpectedHistorical,
      totalActualBoarded,
      requestCount: allRequestsForStop.length,
    };
  });

  // Route demand analytics
  const routeDemandAnalytics = db.state.busRoutes.map((route) => {
    const reqs = db.state.waitingRequests.filter((w) => w.routeId === route.id);
    const boardings = db.state.boardingRecords.filter((b) => b.routeId === route.id);
    const payments = db.state.payments.filter((p) => p.routeId === route.id && p.status === 'PAID');

    return {
      routeId: route.id,
      routeCode: route.routeCode,
      routeName: route.routeName,
      direction: route.direction,
      expectedPassengersTotal: reqs.reduce((s, r) => s + r.passengerCount, 0),
      actualBoardedTotal: boardings.reduce((s, b) => s + b.actualBoardedCount, 0),
      paidRevenuePhp: payments.reduce((s, p) => s + p.amountPhp, 0),
    };
  });

  res.json({
    metrics: {
      totalRegisteredPassengers,
      activeBuses,
      busesInService,
      totalDriversAndConductors,
      totalActiveRoutes,
      totalRegisteredBusStops,
      totalWaitingRequests: activeWaitingRequests.length,
      totalWaitingPassengers,
      totalSuccessfulTransactions: successfulTransactions.length,
      totalRevenuePhp,
    },
    buses: db.getEnrichedBuses(),
    routes: db.getEnrichedRoutes(),
    stops: db.state.busStops,
    users: db.state.users.map(({ passwordHash, ...u }) => u),
    payments: db.state.payments
      .map((p) => ({
        ...p,
        routeCode: db.state.busRoutes.find((r) => r.id === p.routeId)?.routeCode,
        originStopName: db.state.busStops.find((s) => s.id === p.originStopId)?.stopName,
        destinationStopName: db.state.busStops.find((s) => s.id === p.destinationStopId)?.stopName,
      }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    tickets: db.state.digitalTickets,
    stopDemandAnalytics,
    routeDemandAnalytics,
    boardingRecords: db.state.boardingRecords.slice(-50).reverse(),
  });
});

// 2. Bus Management (Create / Update / Assign Driver & Conductor / Set Capacity & Route)
router.post('/buses', (req: AuthenticatedRequest, res: Response) => {
  const { busCode, plateNumber, model, totalCapacity = 40, assignedRouteId } = req.body;
  if (!busCode || !plateNumber) {
    res.status(400).json({ error: 'Bus code and plate number are required.' });
    return;
  }

  const cap = Number(totalCapacity);
  if (!Number.isInteger(cap) || cap <= 0) {
    res.status(400).json({ error: 'Total capacity must be a positive integer.' });
    return;
  }

  if (db.state.buses.some((b) => b.busCode.toLowerCase() === String(busCode).toLowerCase().trim())) {
    res.status(409).json({ error: 'A bus with this identification code already exists.' });
    return;
  }

  const route = db.state.busRoutes.find((r) => r.id === assignedRouteId);
  const firstStop = route
    ? db.state.routeStops
        .filter((rs) => rs.routeId === route.id)
        .sort((a, b) => a.stopSequence - b.stopSequence)[0]
    : null;
  const stopObj = firstStop ? db.state.busStops.find((s) => s.id === firstStop.stopId) : null;

  const newBus: Bus = {
    id: `bus-${Date.now()}`,
    busCode: String(busCode).trim().toUpperCase(),
    plateNumber: String(plateNumber).trim().toUpperCase(),
    model: model ? String(model).trim() : 'CIBUS Euro-4 Low-Entry City Bus',
    totalCapacity: cap,
    availableSeats: cap,
    occupiedSeats: 0,
    seatSource: 'UNREPORTED',
    lastSeatUpdateAt: null,
    assignedRouteId: route ? route.id : null,
    currentDirection: route ? route.direction : 'SOUTHBOUND',
    operationalStatus: 'NOT_OPERATING',
    nextStopId: stopObj?.id || null,
    lastLat: stopObj?.latitude ?? null,
    lastLng: stopObj?.longitude ?? null,
    lastHeading: 0,
    lastSpeedKmh: 0,
    lastGpsUpdateAt: null,
    gpsSource: 'NONE',
    isDemoData: false,
  };

  db.state.buses.push(newBus);
  db.save();
  realtimeHub.broadcast('ADMIN_CONFIG_UPDATED');

  res.status(201).json({ message: `Bus ${newBus.busCode} created.`, bus: newBus });
});

router.put('/buses/:id', (req: AuthenticatedRequest, res: Response) => {
  const bus = db.state.buses.find((b) => b.id === req.params.id);
  if (!bus) {
    res.status(404).json({ error: 'Bus not found.' });
    return;
  }

  const { busCode, plateNumber, model, totalCapacity, assignedRouteId, operationalStatus, driverUserId, conductorUserId } = req.body;

  if (busCode) bus.busCode = String(busCode).trim().toUpperCase();
  if (plateNumber) bus.plateNumber = String(plateNumber).trim().toUpperCase();
  if (model) bus.model = String(model).trim();

  if (totalCapacity !== undefined) {
    const cap = Number(totalCapacity);
    if (!Number.isInteger(cap) || cap <= 0) {
      res.status(400).json({ error: 'Total capacity must be a positive integer.' });
      return;
    }
    bus.totalCapacity = cap;
    bus.availableSeats = Math.min(cap, bus.availableSeats);
    bus.occupiedSeats = Math.max(0, cap - bus.availableSeats);
  }

  if (assignedRouteId !== undefined) {
    const route = db.state.busRoutes.find((r) => r.id === assignedRouteId);
    bus.assignedRouteId = route ? route.id : null;
    if (route) {
      bus.currentDirection = route.direction;
    }
  }

  if (operationalStatus) {
    bus.operationalStatus = operationalStatus;
  }

  if (driverUserId !== undefined) {
    // Unassign previous driver of this bus
    db.state.users.forEach((u) => {
      if (u.role === 'DRIVER' && u.assignedBusId === bus.id) {
        u.assignedBusId = null;
      }
    });
    if (driverUserId) {
      const driver = db.state.users.find((u) => u.id === driverUserId && u.role === 'DRIVER');
      if (driver) driver.assignedBusId = bus.id;
    }
  }

  if (conductorUserId !== undefined) {
    db.state.users.forEach((u) => {
      if (u.role === 'CONDUCTOR' && u.assignedBusId === bus.id) {
        u.assignedBusId = null;
      }
    });
    if (conductorUserId) {
      const conductor = db.state.users.find((u) => u.id === conductorUserId && u.role === 'CONDUCTOR');
      if (conductor) conductor.assignedBusId = bus.id;
    }
  }

  db.save();
  realtimeHub.broadcast('ADMIN_CONFIG_UPDATED');

  res.json({ message: `Bus ${bus.busCode} updated.`, bus: db.getEnrichedBuses().find((b) => b.id === bus.id) });
});

// 3. Bus Stop Management (Create / Edit / Toggle Verified CIBUS / Authorized BRT Lane)
router.post('/stops', (req: AuthenticatedRequest, res: Response) => {
  const {
    stopCode,
    stopName,
    latitude,
    longitude,
    stopType = 'CIBUS_DESIGNATED',
    verificationStatus = 'VERIFIED',
    isVerifiedCibus = true,
    isActive = true,
    landmarkNotes = '',
  } = req.body;

  if (!stopCode || !stopName || latitude === undefined || longitude === undefined) {
    res.status(400).json({ error: 'Stop code, stop name, latitude, and longitude are required.' });
    return;
  }

  const lat = Number(latitude);
  const lng = Number(longitude);
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    res.status(400).json({ error: 'Valid numeric coordinates are required.' });
    return;
  }

  const newStop: BusStop = {
    id: `stop-${Date.now()}`,
    stopCode: String(stopCode).trim().toUpperCase(),
    stopName: String(stopName).trim(),
    latitude: lat,
    longitude: lng,
    stopType: stopType === 'AUTHORIZED_BRT_LANE' ? 'AUTHORIZED_BRT_LANE' : 'CIBUS_DESIGNATED',
    verificationStatus: verificationStatus === 'PROVISIONAL' ? 'PROVISIONAL' : 'VERIFIED',
    isVerifiedCibus: Boolean(isVerifiedCibus),
    isActive: Boolean(isActive),
    landmarkNotes: String(landmarkNotes).trim(),
  };

  db.state.busStops.push(newStop);
  db.save();
  realtimeHub.broadcast('ADMIN_CONFIG_UPDATED');

  res.status(201).json({ message: `Bus stop ${newStop.stopName} created.`, stop: newStop });
});

router.put('/stops/:id', (req: AuthenticatedRequest, res: Response) => {
  const stop = db.state.busStops.find((s) => s.id === req.params.id);
  if (!stop) {
    res.status(404).json({ error: 'Bus stop not found.' });
    return;
  }

  const { stopCode, stopName, latitude, longitude, stopType, verificationStatus, isVerifiedCibus, isActive, landmarkNotes } = req.body;
  if (stopCode !== undefined) stop.stopCode = String(stopCode).trim().toUpperCase();
  if (stopName !== undefined) stop.stopName = String(stopName).trim();
  if (latitude !== undefined) stop.latitude = Number(latitude);
  if (longitude !== undefined) stop.longitude = Number(longitude);
  if (stopType !== undefined) {
    stop.stopType = stopType === 'AUTHORIZED_BRT_LANE' ? 'AUTHORIZED_BRT_LANE' : 'CIBUS_DESIGNATED';
  }
  if (verificationStatus !== undefined) {
    stop.verificationStatus = verificationStatus === 'PROVISIONAL' ? 'PROVISIONAL' : 'VERIFIED';
  }
  if (isVerifiedCibus !== undefined) stop.isVerifiedCibus = Boolean(isVerifiedCibus);
  if (isActive !== undefined) stop.isActive = Boolean(isActive);
  if (landmarkNotes !== undefined) stop.landmarkNotes = String(landmarkNotes).trim();

  db.save();
  realtimeHub.broadcast('ADMIN_CONFIG_UPDATED');

  res.json({ message: `Stop ${stop.stopName} updated.`, stop });
});

// 4. Route Management (Create / Modify Route + Ordered Stop Sequence)
router.post('/routes', (req: AuthenticatedRequest, res: Response) => {
  const {
    routeCode,
    routeName,
    originName,
    destinationName,
    direction = 'SOUTHBOUND',
    baseFarePhp = 15,
    perKmFarePhp = 2.25,
    operatingHours = '05:30 AM - 10:30 PM',
    isVerifiedCibus = true,
    isActive = true,
    stopIds = [],
  } = req.body;

  if (!routeCode || !routeName || !originName || !destinationName) {
    res.status(400).json({ error: 'Route code, route name, origin, and destination are required.' });
    return;
  }

  const newRoute: BusRoute = {
    id: `route-${Date.now()}`,
    routeCode: String(routeCode).trim().toUpperCase(),
    routeName: String(routeName).trim(),
    originName: String(originName).trim(),
    destinationName: String(destinationName).trim(),
    direction: ['NORTHBOUND', 'SOUTHBOUND', 'LOOP'].includes(direction) ? direction : 'SOUTHBOUND',
    baseFarePhp: Number(baseFarePhp) || 15,
    perKmFarePhp: Number(perKmFarePhp) || 2.25,
    operatingHours: String(operatingHours),
    isVerifiedCibus: Boolean(isVerifiedCibus),
    isActive: Boolean(isActive),
  };

  db.state.busRoutes.push(newRoute);

  if (Array.isArray(stopIds) && stopIds.length >= 2) {
    let cumKm = 0;
    stopIds.forEach((sId: string, idx: number) => {
      const stop = db.state.busStops.find((s) => s.id === sId);
      if (!stop) return;
      if (idx > 0) {
        const prevStop = db.state.busStops.find((s) => s.id === stopIds[idx - 1]);
        if (prevStop) {
          cumKm = Number(
            (cumKm + haversineDistanceKm(prevStop.latitude, prevStop.longitude, stop.latitude, stop.longitude) * 1.25).toFixed(2)
          );
        }
      }
      const rs: RouteStop = {
        id: `rs-${newRoute.id}-${idx + 1}`,
        routeId: newRoute.id,
        stopId: stop.id,
        direction: newRoute.direction,
        stopSequence: idx + 1,
        distanceFromOriginKm: cumKm,
        estimatedMinutesFromOrigin: idx * 7,
      };
      db.state.routeStops.push(rs);
    });
  }

  db.save();
  realtimeHub.broadcast('ADMIN_CONFIG_UPDATED');

  res.status(201).json({ message: `Route ${newRoute.routeCode} created.`, route: newRoute });
});

router.put('/routes/:id', (req: AuthenticatedRequest, res: Response) => {
  const route = db.state.busRoutes.find((r) => r.id === req.params.id);
  if (!route) {
    res.status(404).json({ error: 'Route not found.' });
    return;
  }

  const { routeCode, routeName, originName, destinationName, direction, baseFarePhp, perKmFarePhp, operatingHours, isVerifiedCibus, isActive, stopIds, geometrySegments } =
    req.body;

  if (routeCode !== undefined) route.routeCode = String(routeCode).trim().toUpperCase();
  if (routeName !== undefined) route.routeName = String(routeName).trim();
  if (originName !== undefined) route.originName = String(originName).trim();
  if (destinationName !== undefined) route.destinationName = String(destinationName).trim();
  if (direction !== undefined) route.direction = direction;
  if (baseFarePhp !== undefined) route.baseFarePhp = Number(baseFarePhp);
  if (perKmFarePhp !== undefined) route.perKmFarePhp = Number(perKmFarePhp);
  if (operatingHours !== undefined) route.operatingHours = String(operatingHours);
  if (isVerifiedCibus !== undefined) route.isVerifiedCibus = Boolean(isVerifiedCibus);
  if (isActive !== undefined) route.isActive = Boolean(isActive);
  if (Array.isArray(geometrySegments) && geometrySegments.length > 0) {
    route.geometrySegments = geometrySegments;
  }

  if (Array.isArray(stopIds) && stopIds.length >= 2) {
    db.state.routeStops = db.state.routeStops.filter((rs) => rs.routeId !== route.id);
    let cumKm = 0;
    stopIds.forEach((sId: string, idx: number) => {
      const stop = db.state.busStops.find((s) => s.id === sId);
      if (!stop) return;
      if (idx > 0) {
        const prevStop = db.state.busStops.find((s) => s.id === stopIds[idx - 1]);
        if (prevStop) {
          cumKm = Number(
            (cumKm + haversineDistanceKm(prevStop.latitude, prevStop.longitude, stop.latitude, stop.longitude) * 1.25).toFixed(2)
          );
        }
      }
      db.state.routeStops.push({
        id: `rs-${route.id}-${idx + 1}`,
        routeId: route.id,
        stopId: stop.id,
        direction: route.direction,
        stopSequence: idx + 1,
        distanceFromOriginKm: cumKm,
        estimatedMinutesFromOrigin: idx * 7,
      });
    });
  }

  db.save();
  realtimeHub.broadcast('ADMIN_CONFIG_UPDATED');

  res.json({ message: `Route ${route.routeCode} updated.`, route: db.getEnrichedRoutes().find((r) => r.id === route.id) });
});

// 5. User & Staff Management (Create Driver/Conductor/Admin, Change Role/Status/Assigned Bus)
router.post('/users', (req: AuthenticatedRequest, res: Response) => {
  const { email, phone, password = 'cibus123', fullName, role = 'DRIVER', assignedBusId, licenseNumber, employeeCode } = req.body;
  if (!email || !fullName) {
    res.status(400).json({ error: 'Email and full name are required.' });
    return;
  }

  const normalizedEmail = String(email).toLowerCase().trim();
  if (db.state.users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
    res.status(409).json({ error: 'Email is already registered.' });
    return;
  }

  const newUser: UserRecord = {
    id: `user-${Date.now()}`,
    email: normalizedEmail,
    phone: phone ? String(phone).trim() : '+639170000000',
    passwordHash: bcrypt.hashSync(String(password), 10),
    fullName: String(fullName).trim(),
    role: ['PASSENGER', 'DRIVER', 'CONDUCTOR', 'ADMIN'].includes(role) ? role : 'PASSENGER',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    assignedBusId: assignedBusId || null,
    licenseNumber: licenseNumber || undefined,
    employeeCode: employeeCode || undefined,
  };

  db.state.users.push(newUser);
  db.save();
  realtimeHub.broadcast('ADMIN_CONFIG_UPDATED');

  const { passwordHash, ...safeUser } = newUser;
  res.status(201).json({ message: `User ${newUser.fullName} created.`, user: safeUser });
});

router.put('/users/:id', (req: AuthenticatedRequest, res: Response) => {
  const user = db.state.users.find((u) => u.id === req.params.id);
  if (!user) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  const { role, status, assignedBusId, fullName, phone } = req.body;
  if (role && ['PASSENGER', 'DRIVER', 'CONDUCTOR', 'ADMIN'].includes(role)) {
    user.role = role;
  }
  if (status && ['ACTIVE', 'SUSPENDED', 'DEACTIVATED'].includes(status)) {
    user.status = status;
  }
  if (assignedBusId !== undefined) {
    user.assignedBusId = assignedBusId || null;
  }
  if (fullName) user.fullName = String(fullName).trim();
  if (phone) user.phone = String(phone).trim();

  db.save();
  realtimeHub.broadcast('ADMIN_CONFIG_UPDATED');

  const { passwordHash, ...safeUser } = user;
  res.json({ message: `Account ${user.fullName} updated.`, user: safeUser });
});

export default router;
