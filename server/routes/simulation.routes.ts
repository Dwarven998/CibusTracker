import { Router, Request, Response } from 'express';
import { db } from '../db';
import { simulationEngine } from '../simulation';
import { realtimeHub } from '../ws';

const router = Router();

// Get current simulation & operating mode settings
router.get('/settings', (_req: Request, res: Response) => {
  res.json({
    settings: db.state.simulationSettings,
    buses: db.getEnrichedBuses(),
  });
});

// Update simulation settings (Speed, Stop Duration, Bus Count, Pause/Resume, Operating Mode)
router.put('/settings', (req: Request, res: Response) => {
  const {
    operatingMode,
    enabled,
    speedMultiplier,
    stopDurationSeconds,
    busCount,
    autoReturn,
  } = req.body;

  const settings = db.state.simulationSettings;

  // Handle Operating Mode switch (DRY_RUN vs LIVE)
  if (operatingMode === 'LIVE' || operatingMode === 'DRY_RUN') {
    if (operatingMode === 'LIVE' && !settings.liveSourceConfigured) {
      // Allow inspecting Live Mode standby state while preventing simulated data from mixing with live data
      settings.operatingMode = 'LIVE';
      settings.enabled = false;
      // Clear simulated telemetry & sample waiting requests so simulated data NEVER mixes with actual operational data
      db.state.buses.forEach((b) => {
        if (b.isDemoData) {
          b.operationalStatus = 'NOT_OPERATING';
          b.lastGpsUpdateAt = null;
          b.gpsSource = 'NONE';
          b.isDemoData = false;
          b.simulationStatus = 'INACTIVE';
          b.availableSeats = b.totalCapacity;
          b.occupiedSeats = 0;
          b.seatSource = 'UNREPORTED';
        }
      });
      db.state.waitingRequests.forEach((w) => {
        if (w.isSampleData && w.status === 'WAITING') {
          w.status = 'CANCELLED';
        }
      });
    } else if (operatingMode === 'DRY_RUN' && settings.operatingMode !== 'DRY_RUN') {
      settings.operatingMode = 'DRY_RUN';
      settings.enabled = true;
      simulationEngine.resetPositions();
    }
  }

  if (enabled !== undefined && settings.operatingMode === 'DRY_RUN') {
    settings.enabled = Boolean(enabled);
  }
  if (speedMultiplier !== undefined) {
    settings.speedMultiplier = Math.max(0.25, Math.min(10, Number(speedMultiplier) || 1));
  }
  if (stopDurationSeconds !== undefined) {
    settings.stopDurationSeconds = Math.max(0, Math.min(60, Number(stopDurationSeconds) || 5));
  }
  if (busCount !== undefined) {
    settings.busCount = Math.max(1, Math.min(db.state.buses.length, Number(busCount) || 3));
  }
  if (autoReturn !== undefined) {
    settings.autoReturn = Boolean(autoReturn);
  }

  db.save();
  realtimeHub.broadcast('ADMIN_CONFIG_UPDATED', { settings });

  res.json({
    message:
      settings.operatingMode === 'LIVE'
        ? 'Switched to LIVE MODE (Standby — Simulated data cleared; awaiting verified real GPS feeds).'
        : `Dry-Run Simulation settings updated (${settings.enabled ? 'Running' : 'Paused'}, ${settings.speedMultiplier}x speed).`,
    settings,
  });
});

// Reset simulation to initial dry-run positions and sample waiting data
router.post('/reset', (_req: Request, res: Response) => {
  db.resetToDryRunDemoSeed();
  simulationEngine.initializeCursorsFromCurrentState();
  realtimeHub.broadcast('ADMIN_CONFIG_UPDATED', { reset: true });
  res.json({
    message: 'Dry-run simulation reset to initial CIBUS corridor positions and sample passenger demand.',
    settings: db.state.simulationSettings,
  });
});

// Set starting position / direction of a specific placeholder bus
router.post('/bus-control', (req: Request, res: Response) => {
  const { busId, stopId, direction, availableSeats, operationalStatus } = req.body;
  const bus = db.state.buses.find((b) => b.id === busId);
  if (!bus) {
    res.status(404).json({ error: 'Placeholder bus not found.' });
    return;
  }

  if (direction === 'NORTHBOUND' || direction === 'SOUTHBOUND') {
    const targetRoute = db.state.busRoutes.find((r) => r.direction === direction && r.isActive);
    if (targetRoute) {
      bus.assignedRouteId = targetRoute.id;
      bus.currentDirection = targetRoute.direction;
    }
  }

  if (availableSeats !== undefined) {
    const clamped = Math.max(0, Math.min(bus.totalCapacity, Number(availableSeats)));
    bus.availableSeats = clamped;
    bus.occupiedSeats = bus.totalCapacity - clamped;
    bus.seatSource = 'MANUAL_REPORT';
    bus.lastSeatUpdateAt = new Date().toISOString();
  }

  if (operationalStatus) {
    bus.operationalStatus = operationalStatus;
  }

  if (stopId) {
    simulationEngine.jumpBusToStop(bus.id, stopId);
  } else {
    simulationEngine.initializeCursorsFromCurrentState();
  }

  db.save();
  realtimeHub.broadcast('BUS_GPS_UPDATED', { busId: bus.id });

  res.json({
    message: `Placeholder bus ${bus.busCode} simulation state updated.`,
    bus: db.getEnrichedBuses().find((b) => b.id === bus.id),
  });
});

export default router;

