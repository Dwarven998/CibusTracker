import { Router, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';
import { realtimeHub } from '../ws';
import { PassengerWaitingRequest } from '../../src/types/cibus';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'cibus-cebu-production-grade-secret-key-change-in-prod';

// In DRY_RUN mode, allow demonstration passengers to submit waiting requests without requiring a registered account,
// while still enforcing JWT authentication in LIVE mode (or using the token if provided).
function optionalDemoAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
      const user = db.state.users.find((u) => u.id === decoded.id);
      if (user && user.status === 'ACTIVE') {
        req.user = user;
        next();
        return;
      }
    } catch {
      // fall through if in DRY_RUN mode
    }
  }

  if (db.state.simulationSettings.operatingMode === 'DRY_RUN') {
    const demoPax =
      db.state.users.find((u) => u.role === 'PASSENGER') || {
        id: 'demo-guest-passenger',
        email: 'demo-commuter@cibuscebu.ph',
        phone: '+639170000000',
        passwordHash: '',
        fullName: 'Demo Commuter (Dry-Run)',
        role: 'PASSENGER' as const,
        status: 'ACTIVE' as const,
        createdAt: new Date().toISOString(),
      };
    req.user = demoPax;
    next();
    return;
  }

  requireAuth(req, res, next);
}

// Get current passenger's waiting requests (plus sample requests when in DRY_RUN mode)
router.get('/my', optionalDemoAuth, (req: AuthenticatedRequest, res: Response) => {
  db.expireOutdatedWaitingRequests();
  const isDryRun = db.state.simulationSettings.operatingMode === 'DRY_RUN';
  const list = db.state.waitingRequests
    .filter((r) => r.passengerId === req.user!.id || (isDryRun && r.isSampleData))
    .map((r) => ({
      ...r,
      boardingStopName: db.state.busStops.find((s) => s.id === r.boardingStopId)?.stopName,
      destinationStopName: db.state.busStops.find((s) => s.id === r.destinationStopId)?.stopName,
      routeCode: db.state.busRoutes.find((rt) => rt.id === r.routeId)?.routeCode,
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json({ requests: list });
});

// Submit a new "I'm Waiting for This Bus" request
router.post('/', optionalDemoAuth, (req: AuthenticatedRequest, res: Response) => {
  db.expireOutdatedWaitingRequests();

  const { routeId, boardingStopId, destinationStopId, targetBusId, passengerCount = 1, notes, demoPassengerName } = req.body;

  if (!routeId || !boardingStopId || !destinationStopId) {
    res.status(400).json({ error: 'Please select a valid CIBUS route, boarding stop, and destination stop.' });
    return;
  }

  const route = db.state.busRoutes.find((r) => r.id === routeId && r.isVerifiedCibus && r.isActive);
  if (!route) {
    res.status(400).json({ error: 'Selected route is not an active verified CIBUS Cebu route.' });
    return;
  }

  const boardingStop = db.state.busStops.find((s) => s.id === boardingStopId && s.isVerifiedCibus && s.isActive);
  const destinationStop = db.state.busStops.find((s) => s.id === destinationStopId && s.isVerifiedCibus && s.isActive);
  if (!boardingStop || !destinationStop) {
    res.status(400).json({ error: 'Selected bus stops must be active CIBUS corridor stops.' });
    return;
  }

  // Validate both stops belong to the selected route and destination is after boarding stop
  const routeStopList = db.state.routeStops
    .filter((rs) => rs.routeId === route.id)
    .sort((a, b) => a.stopSequence - b.stopSequence);

  const boardingRs = routeStopList.find((rs) => rs.stopId === boardingStopId);
  const destRs = routeStopList.find((rs) => rs.stopId === destinationStopId);

  if (!boardingRs || !destRs) {
    res.status(400).json({
      error: 'One or more selected stops do not belong to the chosen CIBUS route.',
    });
    return;
  }

  if (destRs.stopSequence <= boardingRs.stopSequence) {
    res.status(400).json({
      error: `Invalid travel direction: ${destinationStop.stopName} comes before or is the same as ${boardingStop.stopName} on route ${route.routeCode}. Please switch route direction.`,
    });
    return;
  }

  const count = Number(passengerCount);
  if (!Number.isInteger(count) || count < 1 || count > 20) {
    res.status(400).json({ error: 'Passenger count must be a whole number between 1 and 20.' });
    return;
  }

  // Duplicate prevention: Only one active waiting request per passenger for the same route and boarding stop (excluding pre-seeded sample groups)
  const existingDuplicate = db.state.waitingRequests.find(
    (r) =>
      !r.isSampleData &&
      r.passengerId === req.user!.id &&
      r.routeId === route.id &&
      r.boardingStopId === boardingStopId &&
      r.status === 'WAITING'
  );

  if (existingDuplicate) {
    res.status(409).json({
      error: 'You already have an active waiting request at this stop for this route. You can update or cancel your existing request.',
      existingRequest: existingDuplicate,
    });
    return;
  }

  let linkedTripId: string | null = null;
  if (targetBusId) {
    const activeTrip = db.state.trips.find((t) => t.busId === targetBusId && t.status === 'ACTIVE');
    if (activeTrip) {
      linkedTripId = activeTrip.id;
    }
  } else {
    const activeRouteTrip = db.state.trips.find((t) => t.routeId === route.id && t.status === 'ACTIVE');
    if (activeRouteTrip) {
      linkedTripId = activeRouteTrip.id;
    }
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 45 * 60 * 1000);
  const isDryRun = db.state.simulationSettings.operatingMode === 'DRY_RUN';

  const newRequest: PassengerWaitingRequest = {
    id: `wait-${Date.now()}`,
    passengerId: req.user!.id,
    passengerName: demoPassengerName ? String(demoPassengerName).trim() : req.user!.fullName,
    routeId: route.id,
    direction: route.direction,
    boardingStopId,
    destinationStopId,
    targetBusId: targetBusId || null,
    tripId: linkedTripId,
    passengerCount: count,
    status: 'WAITING',
    isSampleData: isDryRun,
    notes: notes ? String(notes).trim() : isDryRun ? 'DEMO MODE – SIMULATED WAITING REQUEST' : undefined,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  db.state.waitingRequests.push(newRequest);
  db.save();

  realtimeHub.broadcast('WAITING_REQUEST_UPDATED', {
    action: 'CREATED',
    request: newRequest,
  });

  res.status(201).json({
    message:
      'Waiting request submitted to CIBUS drivers & conductors on this route. Note: This is a demand report and does not reserve a guaranteed seat.',
    request: {
      ...newRequest,
      boardingStopName: boardingStop.stopName,
      destinationStopName: destinationStop.stopName,
      routeCode: route.routeCode,
    },
  });
});

// Update passenger count or destination on an existing waiting request
router.put('/:id', optionalDemoAuth, (req: AuthenticatedRequest, res: Response) => {
  const waitingReq = db.state.waitingRequests.find((r) => r.id === req.params.id);
  if (!waitingReq) {
    res.status(404).json({ error: 'Waiting request not found.' });
    return;
  }

  const isDryRunSample = db.state.simulationSettings.operatingMode === 'DRY_RUN' && waitingReq.isSampleData;
  if (!isDryRunSample && waitingReq.passengerId !== req.user!.id && req.user!.role !== 'ADMIN') {
    res.status(403).json({ error: 'You cannot modify another passenger’s waiting request.' });
    return;
  }

  if (waitingReq.status !== 'WAITING') {
    res.status(400).json({ error: `Cannot update a request that is already ${waitingReq.status.toLowerCase()}.` });
    return;
  }

  const { passengerCount, destinationStopId } = req.body;
  if (passengerCount !== undefined) {
    const count = Number(passengerCount);
    if (!Number.isInteger(count) || count < 1 || count > 20) {
      res.status(400).json({ error: 'Passenger count must be between 1 and 20.' });
      return;
    }
    waitingReq.passengerCount = count;
  }

  if (destinationStopId) {
    const routeStopList = db.state.routeStops.filter((rs) => rs.routeId === waitingReq.routeId);
    const boardingRs = routeStopList.find((rs) => rs.stopId === waitingReq.boardingStopId);
    const destRs = routeStopList.find((rs) => rs.stopId === destinationStopId);
    if (!destRs || !boardingRs || destRs.stopSequence <= boardingRs.stopSequence) {
      res.status(400).json({ error: 'Selected destination stop must be after the boarding stop on this route.' });
      return;
    }
    waitingReq.destinationStopId = destinationStopId;
  }

  waitingReq.updatedAt = new Date().toISOString();
  db.save();

  realtimeHub.broadcast('WAITING_REQUEST_UPDATED', {
    action: 'UPDATED',
    request: waitingReq,
  });

  res.json({
    message: 'Waiting request updated.',
    request: waitingReq,
  });
});

// Cancel an active waiting request
router.delete('/:id', optionalDemoAuth, (req: AuthenticatedRequest, res: Response) => {
  const waitingReq = db.state.waitingRequests.find((r) => r.id === req.params.id);
  if (!waitingReq) {
    res.status(404).json({ error: 'Waiting request not found.' });
    return;
  }

  const isDryRunSample = db.state.simulationSettings.operatingMode === 'DRY_RUN' && waitingReq.isSampleData;
  if (!isDryRunSample && waitingReq.passengerId !== req.user!.id && req.user!.role !== 'ADMIN') {
    res.status(403).json({ error: 'You cannot cancel another passenger’s waiting request.' });
    return;
  }

  if (waitingReq.status !== 'WAITING') {
    res.status(400).json({ error: `Request is already ${waitingReq.status.toLowerCase()}.` });
    return;
  }

  waitingReq.status = 'CANCELLED';
  waitingReq.updatedAt = new Date().toISOString();
  db.save();

  realtimeHub.broadcast('WAITING_REQUEST_UPDATED', {
    action: 'CANCELLED',
    request: waitingReq,
  });

  res.json({
    message: 'Waiting request cancelled.',
    request: waitingReq,
  });
});

export default router;
