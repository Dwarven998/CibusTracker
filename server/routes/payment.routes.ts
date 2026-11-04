import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';
import { realtimeHub } from '../ws';
import {
  DigitalTicket,
  PaymentMethodType,
  PaymentProviderConfigStatus,
  PaymentRecord,
} from '../../src/types/cibus';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'cibus-cebu-production-grade-secret-key-change-in-prod';

// Allow testing payments & tickets out-of-the-box in DRY_RUN mode without requiring a login or .env file
function paymentOrDemoAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
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
      // fall through in DRY_RUN mode
    }
  }

  if (db.state.simulationSettings.operatingMode === 'DRY_RUN') {
    const demoPax =
      db.state.users.find((u) => u.role === 'PASSENGER') || {
        id: 'user-passenger-1',
        email: 'commuter@cebu.ph',
        phone: '+639171000010',
        passwordHash: '',
        fullName: 'Bea Alcantara (Demo Commuter)',
        role: 'PASSENGER' as const,
        status: 'ACTIVE' as const,
        createdAt: new Date().toISOString(),
        discountType: 'REGULAR' as const,
      };
    req.user = demoPax;
    next();
    return;
  }

  requireAuth(req, res, next);
}

function getProviderConfiguration(): PaymentProviderConfigStatus {
  const isDryRun = db.state.simulationSettings.operatingMode === 'DRY_RUN';
  const providerName = process.env.PAYMENT_PROVIDER_NAME || 'PayMongo_Mock_Sandbox';
  const hasSecretKey = Boolean(
    (process.env.PAYMONGO_SECRET_KEY && process.env.PAYMONGO_SECRET_KEY.trim().length > 0) || isDryRun
  );

  // Ready out-of-the-box with built-in PayMongo Mock Sandbox when no .env is present
  const gcashConfigured = hasSecretKey || process.env.ENABLE_GCASH_SANDBOX !== 'false';
  const mayaConfigured = hasSecretKey || process.env.ENABLE_MAYA_SANDBOX !== 'false';
  const qrPhConfigured = hasSecretKey || process.env.ENABLE_QRPH_SANDBOX !== 'false';
  const inAppConfigured = hasSecretKey || process.env.ENABLE_INAPP_CARD_SANDBOX !== 'false';

  return {
    providerName,
    sandboxMode: true,
    hasLiveOrSandboxApiKey: hasSecretKey,
    methods: [
      {
        method: 'GCASH',
        label: 'GCash Digital Wallet',
        configured: gcashConfigured,
        requiresOnlineVerification: true,
        statusMessage: 'Ready for testing — Built-in PayMongo Mock Sandbox active (No .env required)',
      },
      {
        method: 'MAYA',
        label: 'Maya Digital Wallet',
        configured: mayaConfigured,
        requiresOnlineVerification: true,
        statusMessage: 'Ready for testing — Built-in PayMongo Mock Sandbox active (No .env required)',
      },
      {
        method: 'QR_PH',
        label: 'QR Ph / InstaPay QR Code',
        configured: qrPhConfigured,
        requiresOnlineVerification: true,
        statusMessage: 'Ready for testing — Built-in PayMongo Mock Sandbox active (No .env required)',
      },
      {
        method: 'IN_APP_CARD',
        label: 'In-App Online Gateway',
        configured: inAppConfigured,
        requiresOnlineVerification: true,
        statusMessage: 'Ready for testing — Built-in PayMongo Mock Sandbox active (No .env required)',
      },
      {
        method: 'CASH',
        label: 'Cash on Bus (Pay Conductor)',
        configured: true,
        requiresOnlineVerification: false,
        statusMessage: 'Always available — pay directly to the CIBUS conductor upon boarding',
      },
    ],
  };
}

// Get Payment Provider & Method Configuration Status
router.get('/config', (_req: Request, res: Response) => {
  res.json(getProviderConfiguration());
});

// Calculate Fare Quote between two stops on a route
router.get('/fare-quote', (req: Request, res: Response) => {
  const { routeId, originStopId, destinationStopId, passengerCount = 1, discountType = 'REGULAR' } = req.query;

  if (!routeId || !originStopId || !destinationStopId) {
    res.status(400).json({ error: 'routeId, originStopId, and destinationStopId are required.' });
    return;
  }

  const route = db.state.busRoutes.find((r) => r.id === routeId);
  if (!route) {
    res.status(404).json({ error: 'Route not found.' });
    return;
  }

  const routeStops = db.state.routeStops
    .filter((rs) => rs.routeId === route.id)
    .sort((a, b) => a.stopSequence - b.stopSequence);

  const originRs = routeStops.find((rs) => rs.stopId === originStopId);
  const destRs = routeStops.find((rs) => rs.stopId === destinationStopId);

  if (!originRs || !destRs || destRs.stopSequence <= originRs.stopSequence) {
    res.status(400).json({
      error: 'Selected destination stop must come after the origin stop along this route direction.',
    });
    return;
  }

  const fareConfig = db.state.fareConfigurations.find(
    (fc) => fc.routeId === route.id && fc.fromStopId === originStopId && fc.toStopId === destinationStopId && fc.isActive
  );

  const distKm = fareConfig
    ? fareConfig.distanceKm
    : Math.max(0.5, Number((destRs.distanceFromOriginKm - originRs.distanceFromOriginKm).toFixed(2)));

  const regularUnit = fareConfig
    ? fareConfig.regularFarePhp
    : Math.round(route.baseFarePhp + Math.max(0, distKm - 4) * route.perKmFarePhp);

  const discountedUnit = fareConfig ? fareConfig.discountedFarePhp : Math.round(regularUnit * 0.8);

  const isDiscounted = ['STUDENT', 'SENIOR', 'PWD'].includes(String(discountType));
  const unitFarePhp = isDiscounted ? discountedUnit : regularUnit;
  const count = Math.max(1, Math.min(20, Number(passengerCount) || 1));
  const totalFarePhp = Number((unitFarePhp * count).toFixed(2));

  res.json({
    routeId: route.id,
    routeCode: route.routeCode,
    originStopId,
    destinationStopId,
    distanceKm: distKm,
    discountApplied: isDiscounted ? discountType : 'REGULAR',
    unitFarePhp,
    regularUnitFarePhp: regularUnit,
    discountedUnitFarePhp: discountedUnit,
    passengerCount: count,
    totalFarePhp,
  });
});

// Get passenger's payment history & digital tickets (includes pre-seeded sample tickets in DRY_RUN mode)
router.get('/my', paymentOrDemoAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const isDryRun = db.state.simulationSettings.operatingMode === 'DRY_RUN';

  const payments = db.state.payments
    .filter((p) => p.passengerId === userId || isDryRun)
    .map((p) => ({
      ...p,
      routeCode: db.state.busRoutes.find((r) => r.id === p.routeId)?.routeCode,
      originStopName: db.state.busStops.find((s) => s.id === p.originStopId)?.stopName,
      destinationStopName: db.state.busStops.find((s) => s.id === p.destinationStopId)?.stopName,
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const tickets = db.state.digitalTickets
    .filter((t) => t.passengerId === userId || isDryRun)
    .map((t) => ({
      ...t,
      routeCode: db.state.busRoutes.find((r) => r.id === t.routeId)?.routeCode,
      routeName: db.state.busRoutes.find((r) => r.id === t.routeId)?.routeName,
      originStopName: db.state.busStops.find((s) => s.id === t.originStopId)?.stopName,
      destinationStopName: db.state.busStops.find((s) => s.id === t.destinationStopId)?.stopName,
    }))
    .sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime());

  res.json({ payments, tickets });
});

// Initiate a Fare Payment
router.post('/initiate', paymentOrDemoAuth, (req: AuthenticatedRequest, res: Response) => {
  const {
    routeId,
    originStopId,
    destinationStopId,
    busId,
    passengerCount = 1,
    paymentMethod,
    autoVerifyMockCallback = false,
  } = req.body;

  const allowedMethods: PaymentMethodType[] = ['GCASH', 'MAYA', 'QR_PH', 'IN_APP_CARD', 'CASH'];
  if (!allowedMethods.includes(paymentMethod)) {
    res.status(400).json({ error: 'Invalid payment method selected.' });
    return;
  }

  const route = db.state.busRoutes.find((r) => r.id === routeId && r.isVerifiedCibus && r.isActive);
  if (!route) {
    res.status(400).json({ error: 'Selected route is not a valid active CIBUS route.' });
    return;
  }

  const routeStops = db.state.routeStops
    .filter((rs) => rs.routeId === route.id)
    .sort((a, b) => a.stopSequence - b.stopSequence);

  const originRs = routeStops.find((rs) => rs.stopId === originStopId);
  const destRs = routeStops.find((rs) => rs.stopId === destinationStopId);

  if (!originRs || !destRs || destRs.stopSequence <= originRs.stopSequence) {
    res.status(400).json({ error: 'Destination stop must come after the origin stop along the route.' });
    return;
  }

  const count = Number(passengerCount);
  if (!Number.isInteger(count) || count < 1 || count > 20) {
    res.status(400).json({ error: 'Passenger count must be between 1 and 20.' });
    return;
  }

  const fareConfig = db.state.fareConfigurations.find(
    (fc) => fc.routeId === route.id && fc.fromStopId === originStopId && fc.toStopId === destinationStopId && fc.isActive
  );
  const distKm = fareConfig
    ? fareConfig.distanceKm
    : Math.max(0.5, Number((destRs.distanceFromOriginKm - originRs.distanceFromOriginKm).toFixed(2)));
  const regularUnit = fareConfig
    ? fareConfig.regularFarePhp
    : Math.round(route.baseFarePhp + Math.max(0, distKm - 4) * route.perKmFarePhp);
  const discountedUnit = fareConfig ? fareConfig.discountedFarePhp : Math.round(regularUnit * 0.8);

  const isDiscounted = ['STUDENT', 'SENIOR', 'PWD'].includes(req.user!.discountType || 'REGULAR');
  const unitFarePhp = isDiscounted ? discountedUnit : regularUnit;
  const totalAmountPhp = Number((unitFarePhp * count).toFixed(2));

  const now = new Date().toISOString();
  const refSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
  const referenceCode = `CIBUS-PAY-${refSuffix}`;

  const isCash = paymentMethod === 'CASH';
  const shouldAutoVerify = Boolean(autoVerifyMockCallback && !isCash);
  const initialStatus = isCash ? 'CASH_ON_BOARD_PENDING' : shouldAutoVerify ? 'PAID' : 'PENDING';

  const newPayment: PaymentRecord = {
    id: `pay-${Date.now()}`,
    referenceCode,
    passengerId: req.user!.id,
    passengerName: req.user!.fullName,
    routeId: route.id,
    originStopId,
    destinationStopId,
    busId: busId || null,
    passengerCount: count,
    unitFarePhp,
    amountPhp: totalAmountPhp,
    paymentMethod,
    providerName: isCash ? 'CONDUCTOR_CASH_COLLECTION' : process.env.PAYMENT_PROVIDER_NAME || 'PayMongo_Mock_Sandbox',
    providerTxId: isCash ? null : `paymongo_mock_${paymentMethod.toLowerCase()}_${Date.now()}`,
    status: initialStatus,
    verifiedViaCallback: shouldAutoVerify,
    createdAt: now,
    verifiedAt: shouldAutoVerify ? now : null,
  };

  db.state.payments.push(newPayment);

  let issuedTicket: DigitalTicket | null = null;
  if (isCash || shouldAutoVerify) {
    const ticketRef = isCash ? `TKT-CASH-${refSuffix}` : `CIBUS-TKT-${refSuffix}`;
    issuedTicket = {
      id: `tkt-${Date.now()}`,
      ticketReference: ticketRef,
      paymentId: newPayment.id,
      transactionReference: newPayment.referenceCode,
      passengerId: req.user!.id,
      passengerName: req.user!.fullName,
      routeId: route.id,
      originStopId,
      destinationStopId,
      passengerCount: count,
      farePaidPhp: totalAmountPhp,
      paymentMethod,
      paymentStatus: isCash ? 'CASH_ON_BOARD_PENDING' : 'PAID',
      qrPayload: JSON.stringify({
        ticketRef,
        txRef: newPayment.referenceCode,
        route: route.routeCode,
        pax: count,
        amount: totalAmountPhp,
        method: paymentMethod,
        verifiedAt: shouldAutoVerify ? now : undefined,
      }),
      validationStatus: 'VALID',
      validatedByUserId: null,
      validatedBusId: null,
      validatedAt: null,
      issuedAt: now,
    };
    db.state.digitalTickets.push(issuedTicket);
  }

  db.save();

  realtimeHub.broadcast('PAYMENT_AND_TICKET_UPDATED', {
    action: shouldAutoVerify ? 'PAYMENT_PAID' : 'PAYMENT_INITIATED',
    payment: newPayment,
    ticket: issuedTicket,
  });

  res.status(201).json({
    message: isCash
      ? 'Cash boarding pass created. Present the QR voucher and pay PHP ' + totalAmountPhp.toFixed(2) + ' directly to the conductor.'
      : shouldAutoVerify
      ? `PayMongo Mock Sandbox verified your ${paymentMethod} payment (₱${totalAmountPhp.toFixed(2)}) and issued Digital Ticket ${issuedTicket?.ticketReference}!`
      : 'Payment transaction initialized in PENDING state. Complete verification via the PayMongo Mock Sandbox callback.',
    payment: newPayment,
    ticket: issuedTicket,
  });
});

// Server-Side Provider Webhook / Callback Verification Endpoint
router.post('/webhook-verify', paymentOrDemoAuth, (req: AuthenticatedRequest, res: Response) => {
  const { paymentId, outcome = 'PAID', failureReason } = req.body;

  const payment = db.state.payments.find((p) => p.id === paymentId);
  if (!payment) {
    res.status(404).json({ error: 'Payment transaction not found.' });
    return;
  }

  const isDryRun = db.state.simulationSettings.operatingMode === 'DRY_RUN';
  if (!isDryRun && payment.passengerId !== req.user!.id && req.user!.role !== 'ADMIN') {
    res.status(403).json({ error: 'You are not authorized to verify or modify another passenger’s payment.' });
    return;
  }

  const now = new Date().toISOString();

  if (outcome === 'FAILED') {
    payment.status = 'FAILED';
    payment.failureReason = failureReason || 'Payment authorization declined or timed out by provider.';
    db.save();
    realtimeHub.broadcast('PAYMENT_AND_TICKET_UPDATED', { action: 'PAYMENT_FAILED', payment });
    res.json({ message: 'Payment marked as FAILED by provider verification.', payment });
    return;
  }

  if (outcome === 'CANCELLED') {
    payment.status = 'CANCELLED';
    const existingTicket = db.state.digitalTickets.find((t) => t.paymentId === payment.id);
    if (existingTicket) {
      existingTicket.validationStatus = 'CANCELLED';
      existingTicket.paymentStatus = 'CANCELLED';
    }
    db.save();
    realtimeHub.broadcast('PAYMENT_AND_TICKET_UPDATED', { action: 'PAYMENT_CANCELLED', payment });
    res.json({ message: 'Payment cancelled.', payment });
    return;
  }

  if (outcome === 'REFUNDED') {
    if (!isDryRun && req.user!.role !== 'ADMIN' && payment.passengerId !== req.user!.id) {
      res.status(403).json({ error: 'Unauthorized refund request.' });
      return;
    }
    payment.status = 'REFUNDED';
    const existingTicket = db.state.digitalTickets.find((t) => t.paymentId === payment.id);
    if (existingTicket) {
      existingTicket.validationStatus = 'REFUNDED';
      existingTicket.paymentStatus = 'REFUNDED';
    }
    db.save();
    realtimeHub.broadcast('PAYMENT_AND_TICKET_UPDATED', { action: 'PAYMENT_REFUNDED', payment });
    res.json({ message: 'Payment refunded and associated ticket invalidated.', payment });
    return;
  }

  // Outcome === 'PAID': Server-side callback verification succeeded
  payment.status = 'PAID';
  payment.verifiedViaCallback = true;
  payment.verifiedAt = now;
  payment.providerTxId = payment.providerTxId || `paymongo_cb_verified_${Date.now()}`;

  let ticket = db.state.digitalTickets.find((t) => t.paymentId === payment.id);
  const route = db.state.busRoutes.find((r) => r.id === payment.routeId);
  const refSuffix = payment.referenceCode.replace('CIBUS-PAY-', '');

  if (!ticket) {
    const ticketRef = `CIBUS-TKT-${refSuffix}`;
    ticket = {
      id: `tkt-${Date.now()}`,
      ticketReference: ticketRef,
      paymentId: payment.id,
      transactionReference: payment.referenceCode,
      passengerId: payment.passengerId,
      passengerName: payment.passengerName,
      routeId: payment.routeId,
      originStopId: payment.originStopId,
      destinationStopId: payment.destinationStopId,
      passengerCount: payment.passengerCount,
      farePaidPhp: payment.amountPhp,
      paymentMethod: payment.paymentMethod,
      paymentStatus: 'PAID',
      qrPayload: JSON.stringify({
        ticketRef,
        txRef: payment.referenceCode,
        route: route?.routeCode,
        pax: payment.passengerCount,
        amount: payment.amountPhp,
        method: payment.paymentMethod,
        verifiedAt: now,
      }),
      validationStatus: 'VALID',
      validatedByUserId: null,
      validatedBusId: null,
      validatedAt: null,
      issuedAt: now,
    };
    db.state.digitalTickets.push(ticket);
  } else {
    ticket.paymentStatus = 'PAID';
  }

  db.save();

  realtimeHub.broadcast('PAYMENT_AND_TICKET_UPDATED', {
    action: 'PAYMENT_PAID',
    payment,
    ticket,
  });

  res.json({
    message: 'Payment verified via server callback! Digital QR ticket generated.',
    payment,
    ticket: {
      ...ticket,
      routeCode: route?.routeCode,
      routeName: route?.routeName,
      originStopName: db.state.busStops.find((s) => s.id === ticket.originStopId)?.stopName,
      destinationStopName: db.state.busStops.find((s) => s.id === ticket.destinationStopId)?.stopName,
    },
  });
});

export default router;
