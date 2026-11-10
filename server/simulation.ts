import { db, haversineDistanceKm } from './db';
import { realtimeHub } from './ws';
import { flattenRouteCoordinates } from './cibusRouteData';
import { Bus, BusRoute } from '../src/types/cibus';

interface BusInterpolationCursor {
  vertexIndex: number; // current vertex index along flattened route polyline
  segmentProgress: number; // 0.0 to 1.0 along [vertexIndex -> vertexIndex + 1]
  dwellSecondsRemaining: number;
  lastVisitedStopId: string | null;
}

function computeBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

class DryRunSimulationEngine {
  private timer: ReturnType<typeof setInterval> | null = null;
  private cursors: Map<string, BusInterpolationCursor> = new Map();

  public start(): void {
    if (this.timer) return;
    this.initializeCursorsFromCurrentState();
    this.timer = setInterval(() => {
      this.tick();
    }, 1500);
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public initializeCursorsFromCurrentState(): void {
    this.cursors.clear();
    for (const bus of db.state.buses) {
      const route = db.state.busRoutes.find((r) => r.id === bus.assignedRouteId);
      const coords = route?.geometrySegments ? flattenRouteCoordinates(route.geometrySegments) : [];
      const startIndex = Math.min(
        Math.max(0, bus.currentSegmentIndex ?? 0),
        Math.max(0, coords.length - 2)
      );
      this.cursors.set(bus.id, {
        vertexIndex: startIndex,
        segmentProgress: 0,
        dwellSecondsRemaining: bus.dwellRemainingSeconds || 0,
        lastVisitedStopId: null,
      });
    }
  }

  public resetPositions(): void {
    const now = new Date().toISOString();
    const presets = [
      { routeId: 'route-cibus-main-nb', dir: 'NORTHBOUND' as const, segIdx: 7, seats: 15 },
      { routeId: 'route-cibus-main-nb', dir: 'NORTHBOUND' as const, segIdx: 62, seats: 24 },
      { routeId: 'route-cibus-main-sb', dir: 'SOUTHBOUND' as const, segIdx: 35, seats: 18 },
    ];

    db.state.buses.forEach((bus, idx) => {
      const preset = presets[idx % presets.length];
      const route = db.state.busRoutes.find((r) => r.id === preset.routeId);
      const coords = route?.geometrySegments ? flattenRouteCoordinates(route.geometrySegments) : [];
      const pt = coords[Math.min(preset.segIdx, Math.max(0, coords.length - 1))] || [10.2817, 123.8810];

      bus.assignedRouteId = preset.routeId;
      bus.currentDirection = preset.dir;
      bus.operationalStatus = 'IN_SERVICE';
      bus.availableSeats = Math.min(bus.totalCapacity, preset.seats);
      bus.occupiedSeats = bus.totalCapacity - bus.availableSeats;
      bus.seatSource = 'SIMULATED_SAMPLE';
      bus.lastLat = pt[0];
      bus.lastLng = pt[1];
      bus.lastGpsUpdateAt = now;
      bus.gpsSource = 'DEMO_MODE';
      bus.isDemoData = true;
      bus.simulationStatus = 'MOVING';
      bus.currentSegmentIndex = preset.segIdx;
      bus.dwellRemainingSeconds = 0;
    });

    this.initializeCursorsFromCurrentState();
    db.save();
    realtimeHub.broadcast('BUS_GPS_UPDATED', { reason: 'SIMULATION_RESET' });
  }

  public jumpBusToStop(busId: string, stopId: string): boolean {
    const bus = db.state.buses.find((b) => b.id === busId);
    const stop = db.state.busStops.find((s) => s.id === stopId);
    if (!bus || !stop) return false;

    const route = db.state.busRoutes.find((r) => r.id === bus.assignedRouteId);
    const coords = route?.geometrySegments ? flattenRouteCoordinates(route.geometrySegments) : [];

    let bestIdx = 0;
    let bestDist = Infinity;
    coords.forEach((pt, idx) => {
      const d = haversineDistanceKm(pt[0], pt[1], stop.latitude, stop.longitude);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = idx;
      }
    });

    bus.lastLat = stop.latitude;
    bus.lastLng = stop.longitude;
    bus.lastGpsUpdateAt = new Date().toISOString();
    bus.currentSegmentIndex = bestIdx;
    bus.simulationStatus = 'AT_STOP';
    bus.dwellRemainingSeconds = db.state.simulationSettings.stopDurationSeconds;

    this.cursors.set(bus.id, {
      vertexIndex: Math.min(bestIdx, Math.max(0, coords.length - 2)),
      segmentProgress: 0,
      dwellSecondsRemaining: db.state.simulationSettings.stopDurationSeconds,
      lastVisitedStopId: stop.id,
    });

    this.updateNextUpcomingStop(bus, route);
    db.save();
    realtimeHub.broadcast('BUS_GPS_UPDATED', { busId: bus.id });
    return true;
  }

  private updateNextUpcomingStop(bus: Bus, route?: BusRoute): void {
    if (!route || bus.lastLat === null || bus.lastLng === null) return;
    const orderedRouteStops = db.state.routeStops
      .filter((rs) => rs.routeId === route.id)
      .sort((a, b) => a.stopSequence - b.stopSequence);

    const coords = route.geometrySegments ? flattenRouteCoordinates(route.geometrySegments) : [];
    const currentVertex = bus.currentSegmentIndex ?? 0;

    // Map each route stop to its closest vertex index along the polyline
    for (const rs of orderedRouteStops) {
      const stop = db.state.busStops.find((s) => s.id === rs.stopId && s.isActive);
      if (!stop) continue;
      let closestVertex = 0;
      let minDist = Infinity;
      coords.forEach((pt, vIdx) => {
        const d = haversineDistanceKm(pt[0], pt[1], stop.latitude, stop.longitude);
        if (d < minDist) {
          minDist = d;
          closestVertex = vIdx;
        }
      });
      if (closestVertex >= currentVertex) {
        bus.nextStopId = stop.id;
        return;
      }
    }
    if (orderedRouteStops.length > 0) {
      bus.nextStopId = orderedRouteStops[orderedRouteStops.length - 1].stopId;
    }
  }

  public tick(): void {
    const settings = db.state.simulationSettings;
    if (settings.operatingMode !== 'DRY_RUN' || !settings.enabled) {
      return;
    }

    const activeBuses = db.state.buses.slice(0, Math.max(1, settings.busCount));
    const dtSeconds = 1.5;
    const baseSpeedKmh = 26 * Math.max(0.25, settings.speedMultiplier);
    const distancePerTickKm = (baseSpeedKmh / 3600) * dtSeconds * 6; // visual smooth scale factor for prototype observation
    const now = new Date().toISOString();

    for (const bus of activeBuses) {
      if (bus.operationalStatus !== 'IN_SERVICE' && bus.operationalStatus !== 'DELAYED') {
        bus.simulationStatus = 'PAUSED';
        continue;
      }

      const route = db.state.busRoutes.find((r) => r.id === bus.assignedRouteId);
      if (!route || !route.geometrySegments) continue;

      const coords = flattenRouteCoordinates(route.geometrySegments);
      if (coords.length < 2) continue;

      let cursor = this.cursors.get(bus.id);
      if (!cursor) {
        cursor = {
          vertexIndex: Math.min(bus.currentSegmentIndex ?? 0, coords.length - 2),
          segmentProgress: 0,
          dwellSecondsRemaining: 0,
          lastVisitedStopId: null,
        };
        this.cursors.set(bus.id, cursor);
      }

      // 1. Handle Stop Dwell Time
      if (cursor.dwellSecondsRemaining > 0) {
        cursor.dwellSecondsRemaining = Math.max(0, Number((cursor.dwellSecondsRemaining - dtSeconds).toFixed(1)));
        bus.simulationStatus = 'AT_STOP';
        bus.dwellRemainingSeconds = Math.ceil(cursor.dwellSecondsRemaining);
        bus.lastSpeedKmh = 0;
        bus.lastGpsUpdateAt = now;
        continue;
      }

      // 2. Interpolate smoothly along current road segment [p1 -> p2]
      const idx = Math.min(cursor.vertexIndex, coords.length - 2);
      const p1 = coords[idx];
      const p2 = coords[idx + 1];
      const segLengthKm = Math.max(0.05, haversineDistanceKm(p1[0], p1[1], p2[0], p2[1]));

      const progressDelta = distancePerTickKm / segLengthKm;
      cursor.segmentProgress += progressDelta;

      if (cursor.segmentProgress >= 1.0) {
        cursor.vertexIndex = idx + 1;
        cursor.segmentProgress = 0;

        const reachedPt = coords[cursor.vertexIndex];
        bus.lastLat = reachedPt[0];
        bus.lastLng = reachedPt[1];

        // Check if this vertex corresponds to a designated bus stop on this route
        const routeStopIds = new Set(
          db.state.routeStops.filter((rs) => rs.routeId === route.id).map((rs) => rs.stopId)
        );
        const nearbyStop = db.state.busStops.find(
          (s) =>
            s.isActive &&
            routeStopIds.has(s.id) &&
            s.id !== cursor!.lastVisitedStopId &&
            haversineDistanceKm(reachedPt[0], reachedPt[1], s.latitude, s.longitude) <= 0.03
        );

        if (nearbyStop) {
          cursor.lastVisitedStopId = nearbyStop.id;
          cursor.dwellSecondsRemaining = settings.stopDurationSeconds;
          bus.simulationStatus = 'AT_STOP';
          bus.dwellRemainingSeconds = settings.stopDurationSeconds;
          bus.lastSpeedKmh = 0;
        }

        // Check if reached route endpoint
        if (cursor.vertexIndex >= coords.length - 1) {
          if (settings.autoReturn) {
            // Reverse direction onto opposite route
            const oppositeRoute = db.state.busRoutes.find(
              (r) => r.id !== route.id && r.isActive && r.direction !== route.direction
            );
            if (oppositeRoute && oppositeRoute.geometrySegments) {
              bus.assignedRouteId = oppositeRoute.id;
              bus.currentDirection = oppositeRoute.direction;
              const oppCoords = flattenRouteCoordinates(oppositeRoute.geometrySegments);
              cursor.vertexIndex = 0;
              cursor.segmentProgress = 0;
              cursor.dwellSecondsRemaining = settings.stopDurationSeconds;
              cursor.lastVisitedStopId = null;
              bus.lastLat = oppCoords[0][0];
              bus.lastLng = oppCoords[0][1];
              bus.simulationStatus = 'TURNAROUND';
            } else {
              cursor.vertexIndex = 0;
              cursor.segmentProgress = 0;
            }
          } else {
            cursor.vertexIndex = 0;
            cursor.segmentProgress = 0;
          }
        }
      } else {
        const lat = p1[0] + (p2[0] - p1[0]) * cursor.segmentProgress;
        const lng = p1[1] + (p2[1] - p1[1]) * cursor.segmentProgress;
        bus.lastLat = Number(lat.toFixed(6));
        bus.lastLng = Number(lng.toFixed(6));
        bus.lastHeading = Math.round(computeBearing(p1[0], p1[1], p2[0], p2[1]));
        bus.lastSpeedKmh = Math.round(baseSpeedKmh);
        bus.simulationStatus = 'MOVING';
        bus.dwellRemainingSeconds = 0;
      }

      bus.currentSegmentIndex = cursor.vertexIndex;
      bus.routeProgressPct = Math.round(((cursor.vertexIndex + cursor.segmentProgress) / (coords.length - 1)) * 100);
      bus.lastGpsUpdateAt = now;
      bus.gpsSource = 'DEMO_MODE';
      bus.isDemoData = true;

      this.updateNextUpcomingStop(bus, db.state.busRoutes.find((r) => r.id === bus.assignedRouteId));
    }

    realtimeHub.broadcast('BUS_GPS_UPDATED', { simulatedTick: true });
  }
}

export const simulationEngine = new DryRunSimulationEngine();

