import { Router, Request, Response } from 'express';
import { db, haversineDistanceKm } from '../db';

const router = Router();

// Calculate live ETA in minutes from a bus's current verified position to a target stop along its route
function calculateEtaMinutes(busId: string, targetStopId: string): {
  etaMinutes: number | null;
  distanceKm: number | null;
  isLiveConfirmed: boolean;
  statusNote: string;
} {
  const bus = db.state.buses.find((b) => b.id === busId);
  const stop = db.state.busStops.find((s) => s.id === targetStopId);

  if (!bus || !stop || !bus.assignedRouteId) {
    return { etaMinutes: null, distanceKm: null, isLiveConfirmed: false, statusNote: 'No route assigned' };
  }

  if (bus.operationalStatus !== 'IN_SERVICE' && bus.operationalStatus !== 'DELAYED') {
    return {
      etaMinutes: null,
      distanceKm: null,
      isLiveConfirmed: false,
      statusNote: `Bus is currently ${bus.operationalStatus.replace(/_/g, ' ')}`,
    };
  }

  if (bus.lastLat === null || bus.lastLng === null || !bus.lastGpsUpdateAt) {
    return {
      etaMinutes: null,
      distanceKm: null,
      isLiveConfirmed: false,
      statusNote: 'Awaiting live GPS signal from bus',
    };
  }

  // Check if GPS update is stale (> 10 minutes old)
  const ageMinutes = (Date.now() - new Date(bus.lastGpsUpdateAt).getTime()) / 60000;
  const isStale = ageMinutes > 10;

  const directKm = haversineDistanceKm(bus.lastLat, bus.lastLng, stop.latitude, stop.longitude);
  const roadDistanceKm = Number((directKm * 1.25).toFixed(2));
  const effectiveSpeedKmh = bus.lastSpeedKmh && bus.lastSpeedKmh >= 8 ? bus.lastSpeedKmh : 20; // Cebu city bus avg 20 km/h
  const etaMinutes = Math.max(1, Math.round((roadDistanceKm / effectiveSpeedKmh) * 60));

  return {
    etaMinutes,
    distanceKm: roadDistanceKm,
    isLiveConfirmed: !isStale && !bus.isDemoData,
    statusNote: isStale
      ? `Based on last known GPS (${Math.round(ageMinutes)}m ago)`
      : bus.isDemoData
      ? 'Demo Mode Position'
      : 'Live GPS Confirmed',
  };
}

router.get('/overview', (_req: Request, res: Response) => {
  db.expireOutdatedWaitingRequests();

  // Only return verified & active CIBUS routes and stops to passengers unless requested by admin
  const verifiedRoutes = db
    .getEnrichedRoutes()
    .filter((r) => r.isVerifiedCibus && r.isActive)
    .map((r) => ({
      ...r,
      stops: (r.stops || []).filter((rs) => rs.stop && rs.stop.isVerifiedCibus && rs.stop.isActive),
    }));

  const verifiedStops = db.state.busStops.filter((s) => s.isVerifiedCibus && s.isActive);
  const buses = db.getEnrichedBuses();

  // Attach approaching buses & waiting counts per stop
  const stopsWithLiveInfo = verifiedStops.map((stop) => {
    const activeWaiting = db.state.waitingRequests.filter(
      (req) => req.boardingStopId === stop.id && req.status === 'WAITING'
    );
    const expectedPassengers = activeWaiting.reduce((sum, r) => sum + r.passengerCount, 0);

    // Find routes serving this stop
    const routeStopEntries = db.state.routeStops.filter((rs) => rs.stopId === stop.id);
    const routeIdsServingStop = new Set(routeStopEntries.map((rs) => rs.routeId));

    const approachingBuses = buses
      .filter((b) => b.assignedRouteId && routeIdsServingStop.has(b.assignedRouteId))
      .map((b) => {
        const eta = calculateEtaMinutes(b.id, stop.id);
        return {
          busId: b.id,
          busCode: b.busCode,
          routeCode: b.routeCode,
          routeName: b.routeName,
          operationalStatus: b.operationalStatus,
          availableSeats: b.availableSeats,
          totalCapacity: b.totalCapacity,
          seatSource: b.seatSource,
          lastGpsUpdateAt: b.lastGpsUpdateAt,
          isDemoData: b.isDemoData,
          ...eta,
        };
      });

    return {
      ...stop,
      expectedWaitingPassengers: expectedPassengers,
      activeRequestCount: activeWaiting.length,
      approachingBuses,
    };
  });

  res.json({
    simulationSettings: db.state.simulationSettings,
    buses,
    routes: verifiedRoutes,
    stops: stopsWithLiveInfo,
    waitingRequests: db.state.waitingRequests
      .filter((r) => r.status === 'WAITING')
      .map((r) => ({
        ...r,
        boardingStopName: db.state.busStops.find((s) => s.id === r.boardingStopId)?.stopName,
        destinationStopName: db.state.busStops.find((s) => s.id === r.destinationStopId)?.stopName,
        routeCode: db.state.busRoutes.find((rt) => rt.id === r.routeId)?.routeCode,
      })),
  });
});

router.get('/buses/:id', (req: Request, res: Response) => {
  const bus = db.getEnrichedBuses().find((b) => b.id === req.params.id);
  if (!bus) {
    res.status(404).json({ error: 'Bus not found.' });
    return;
  }

  const route = db.getEnrichedRoutes().find((r) => r.id === bus.assignedRouteId);
  const stopEtas = (route?.stops || []).map((rs) => ({
    stopId: rs.stopId,
    stopName: rs.stop?.stopName,
    stopCode: rs.stop?.stopCode,
    stopSequence: rs.stopSequence,
    ...calculateEtaMinutes(bus.id, rs.stopId),
  }));

  res.json({
    bus,
    route,
    stopEtas,
  });
});

export default router;
