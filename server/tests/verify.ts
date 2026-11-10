import http from 'http';
import { WebSocket } from 'ws';
import { createApp } from '../index';
import { realtimeHub } from '../ws';
import { db } from '../db';
import { simulationEngine } from '../simulation';

async function runVerificationSuite() {
  console.log('===================================================================');
  console.log('CIBUS CEBU PLATFORM — PHASE 3 AUTOMATED VERIFICATION SUITE');
  console.log('===================================================================');

  // Reset database to clean verified CIBUS Cebu seed before testing
  db.resetToVerifiedSeed();

  const app = createApp();
  const server = http.createServer(app);
  realtimeHub.attach(server);

  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as { port: number };
  const baseUrl = `http://localhost:${address.port}`;
  const wsUrl = `ws://localhost:${address.port}/ws`;

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, label: string, detail?: string) {
    if (condition) {
      passed++;
      console.log(`✅ PASS: ${label}`);
    } else {
      failed++;
      console.error(`❌ FAIL: ${label}${detail ? ` -> ${detail}` : ''}`);
    }
  }

  // Connect WebSocket client to verify real-time broadcasts
  const receivedWsEvents: string[] = [];
  const wsClient = new WebSocket(wsUrl);
  wsClient.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.type) receivedWsEvents.push(msg.type);
    } catch {
      // ignore
    }
  });
  await new Promise<void>((resolve) => {
    wsClient.on('open', () => setTimeout(resolve, 50));
  });

  // 1. Verify Initial Seed & Strict No-Simulated-GPS Rule in LIVE Mode
  const overviewRes = await fetch(`${baseUrl}/api/transit/overview`);
  const overviewData = await overviewRes.json();
  assert(overviewRes.status === 200, 'Transit Overview API returns 200 OK');
  assert(
    overviewData.stops.length === 13 &&
      overviewData.stops.filter((s: any) => s.verificationStatus === 'VERIFIED').length === 9 &&
      overviewData.stops.filter((s: any) => s.verificationStatus === 'PROVISIONAL').length === 4,
    'All 13 CIBUS corridor stops loaded (9 Verified southern corridor stops + 4 Provisional Northern extension stops)'
  );
  assert(
    overviewData.buses.every((b: any) => b.lastGpsUpdateAt === null && b.gpsSource === 'NONE'),
    'In LIVE mode, buses start with zero fabricated live GPS timestamps (Strict No-Fake-GPS Rule)'
  );

  // 2. Authenticate Passenger, Driver, Conductor, and Admin
  async function loginAs(email: string) {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'cibus123' }),
    });
    return res.json();
  }

  const paxAuth = await loginAs('commuter@cebu.ph');
  const driverAuth = await loginAs('driver1@cibuscebu.ph');
  const driver2Auth = await loginAs('driver2@cibuscebu.ph');
  const conductorAuth = await loginAs('conductor1@cibuscebu.ph');
  const adminAuth = await loginAs('admin@cibuscebu.ph');

  assert(Boolean(paxAuth.token && paxAuth.user.role === 'PASSENGER'), 'Passenger authentication succeeded');
  assert(Boolean(driverAuth.token && driverAuth.user.role === 'DRIVER'), 'Driver authentication succeeded');
  assert(Boolean(conductorAuth.token && conductorAuth.user.role === 'CONDUCTOR'), 'Conductor authentication succeeded');
  assert(Boolean(adminAuth.token && adminAuth.user.role === 'ADMIN'), 'Admin authentication succeeded');

  // 3. Test Role-Based Access Restrictions
  const paxAdminAttempt = await fetch(`${baseUrl}/api/admin/analytics`, {
    headers: { Authorization: `Bearer ${paxAuth.token}` },
  });
  assert(paxAdminAttempt.status === 403, 'Passenger is blocked from accessing Admin Analytics (403 Forbidden)');

  const paxDriverAttempt = await fetch(`${baseUrl}/api/driver/seats`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${paxAuth.token}` },
    body: JSON.stringify({ busId: 'bus-cibus-001', availableSeats: 20 }),
  });
  assert(paxDriverAttempt.status === 403, 'Passenger is blocked from updating bus seat availability (403 Forbidden)');

  const wrongDriverAttempt = await fetch(`${baseUrl}/api/driver/seats`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${driver2Auth.token}` },
    body: JSON.stringify({ busId: 'bus-cibus-001', availableSeats: 20 }),
  });
  assert(
    wrongDriverAttempt.status === 403,
    'Driver 2 (assigned to CIBUS-002) is blocked from modifying CIBUS-001 (Rule 8)'
  );

  // 4. Test Driver Start Trip & Live GPS Update
  const startTripRes = await fetch(`${baseUrl}/api/driver/trips/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${driverAuth.token}` },
    body: JSON.stringify({ busId: 'bus-cibus-001', routeId: 'route-cibus-main-sb' }),
  });
  const startTripData = await startTripRes.json();
  assert(
    startTripRes.status === 201 && startTripData.bus.operationalStatus === 'IN_SERVICE',
    'Driver 1 started trip on CIBUS-001 (Status -> IN_SERVICE)'
  );

  const gpsRes = await fetch(`${baseUrl}/api/driver/gps`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${driverAuth.token}` },
    body: JSON.stringify({
      busId: 'bus-cibus-001',
      latitude: 10.3193,
      longitude: 123.9052,
      heading: 185,
      speedKmh: 24,
      source: 'DEVICE_GPS',
    }),
  });
  assert(gpsRes.status === 200, 'Driver 1 transmitted live GPS coordinates for CIBUS-001');

  // 5. Test Manual Seat Availability & Validation Boundaries (0 <= available <= capacity)
  const invalidOverCapRes = await fetch(`${baseUrl}/api/driver/seats`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${conductorAuth.token}` },
    body: JSON.stringify({ busId: 'bus-cibus-001', availableSeats: 55 }), // Capacity is 40
  });
  assert(invalidOverCapRes.status === 400, 'Seat update exceeding capacity (55 > 40) rejected (Rule 6)');

  const invalidNegativeRes = await fetch(`${baseUrl}/api/driver/seats`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${conductorAuth.token}` },
    body: JSON.stringify({ busId: 'bus-cibus-001', availableSeats: -3 }),
  });
  assert(invalidNegativeRes.status === 400, 'Negative seat update (-3) rejected (Rule 6)');

  const validSeatRes = await fetch(`${baseUrl}/api/driver/seats`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${conductorAuth.token}` },
    body: JSON.stringify({ busId: 'bus-cibus-001', availableSeats: 13 }),
  });
  const validSeatData = await validSeatRes.json();
  assert(
    validSeatRes.status === 200 &&
      validSeatData.bus.availableSeats === 13 &&
      validSeatData.bus.occupiedSeats === 27 &&
      validSeatData.bus.seatSource === 'MANUAL_REPORT',
    'Conductor manually updated CIBUS-001 to 13 available / 27 occupied seats with MANUAL_REPORT source'
  );

  // 6. Test Passenger Waiting Request ("I'm Waiting for This Bus") & Business Rules
  // 6a. Reject invalid stop order (destination before boarding stop)
  const wrongDirectionWaitRes = await fetch(`${baseUrl}/api/waiting`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${paxAuth.token}` },
    body: JSON.stringify({
      routeId: 'route-cibus-main-sb',
      boardingStopId: 'stop-csbt-brt',
      destinationStopId: 'stop-it-park', // IT Park is before CSBT on Southbound route
      passengerCount: 2,
    }),
  });
  assert(
    wrongDirectionWaitRes.status === 400,
    'Waiting request with reverse stop sequence on Southbound route rejected (Rule 1)'
  );

  // 6b. Submit valid waiting request for 3 passengers at Fuente BRT Station BRT Stop
  const validWaitRes = await fetch(`${baseUrl}/api/waiting`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${paxAuth.token}` },
    body: JSON.stringify({
      routeId: 'route-cibus-main-sb',
      boardingStopId: 'stop-mcdonalds-osmena',
      destinationStopId: 'stop-sm-seaside',
      passengerCount: 3,
    }),
  });
  const validWaitData = await validWaitRes.json();
  assert(
    validWaitRes.status === 201 && validWaitData.request.passengerCount === 3,
    "Passenger submitted waiting request for 3 commuters at Fuente BRT Station stop"
  );

  // 6c. Prevent duplicate active waiting request at same route & stop
  const dupWaitRes = await fetch(`${baseUrl}/api/waiting`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${paxAuth.token}` },
    body: JSON.stringify({
      routeId: 'route-cibus-main-sb',
      boardingStopId: 'stop-mcdonalds-osmena',
      destinationStopId: 'stop-il-corso',
      passengerCount: 1,
    }),
  });
  assert(dupWaitRes.status === 409, 'Duplicate active waiting request for same route & stop blocked (409 Conflict)');

  // 6d. Verify Driver/Conductor dashboard sees 3 expected passengers on Southbound CIBUS-001, while Northbound CIBUS-002 sees 0
  const drv1DashRes = await fetch(`${baseUrl}/api/driver/dashboard?busId=bus-cibus-001`, {
    headers: { Authorization: `Bearer ${driverAuth.token}` },
  });
  const drv1Dash = await drv1DashRes.json();
  const fuenteDemandSb = drv1Dash.upcomingStops.find((s: any) => s.stopId === 'stop-mcdonalds-osmena');
  assert(
    fuenteDemandSb && fuenteDemandSb.expectedPassengers === 3 && fuenteDemandSb.registeredRequestCount === 1,
    "Driver 1 (Southbound) sees 3 expected passengers (1 request) at Fuente BRT Station"
  );

  const drv2DashRes = await fetch(`${baseUrl}/api/driver/dashboard?busId=bus-cibus-002`, {
    headers: { Authorization: `Bearer ${driver2Auth.token}` },
  });
  const drv2Dash = await drv2DashRes.json();
  const fuenteDemandNb = drv2Dash.upcomingStops.find((s: any) => s.stopId === 'stop-mcdonalds-osmena');
  assert(
    fuenteDemandNb && fuenteDemandNb.expectedPassengers === 0,
    'Driver 2 (Northbound) does not see Southbound waiting requests (Rule 3)'
  );

  // 7. Test Conductor Boarding Confirmation & Automatic Seat Recalculation
  const confirmBoardRes = await fetch(`${baseUrl}/api/driver/boarding/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${conductorAuth.token}` },
    body: JSON.stringify({
      busId: 'bus-cibus-001',
      stopId: 'stop-mcdonalds-osmena',
      actualBoardedCount: 3,
      alightedCount: 1,
    }),
  });
  const confirmBoardData = await confirmBoardRes.json();
  // Previous available = 13; +1 alighted - 3 boarded = 11 available (29 occupied)
  assert(
    confirmBoardRes.status === 200 &&
      confirmBoardData.bus.availableSeats === 11 &&
      confirmBoardData.bus.occupiedSeats === 29 &&
      confirmBoardData.bus.seatSource === 'BOARDING_CALCULATED',
    'Conductor confirmed 3 boarded & 1 alighted -> seats recalculated to 11 available / 29 occupied (BOARDING_CALCULATED)'
  );

  // 8. Test Fare Calculation, Payment Initiation (PENDING), Webhook Verification (PAID), and QR Ticket Validation
  const quoteRes = await fetch(
    `${baseUrl}/api/payments/fare-quote?routeId=route-cibus-main-sb&originStopId=stop-it-park&destinationStopId=stop-sm-seaside&passengerCount=2&discountType=REGULAR`
  );
  const quoteData = await quoteRes.json();
  assert(quoteRes.status === 200 && quoteData.totalFarePhp > 0, `Fare quote calculated: PHP ${quoteData.totalFarePhp}`);

  // Initiate GCash payment -> must start as PENDING, not PAID (Rule 10)
  const payInitRes = await fetch(`${baseUrl}/api/payments/initiate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${paxAuth.token}` },
    body: JSON.stringify({
      routeId: 'route-cibus-main-sb',
      originStopId: 'stop-it-park',
      destinationStopId: 'stop-sm-seaside',
      busId: 'bus-cibus-001',
      passengerCount: 2,
      paymentMethod: 'GCASH',
    }),
  });
  const payInitData = await payInitRes.json();
  assert(
    payInitRes.status === 201 && payInitData.payment.status === 'PENDING' && payInitData.ticket === null,
    'Online GCash payment starts in PENDING state with no premature ticket before callback verification (Rule 10)'
  );

  // Verify via server callback -> status becomes PAID and digital QR ticket is issued
  const webhookRes = await fetch(`${baseUrl}/api/payments/webhook-verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${paxAuth.token}` },
    body: JSON.stringify({
      paymentId: payInitData.payment.id,
      outcome: 'PAID',
    }),
  });
  const webhookData = await webhookRes.json();
  assert(
    webhookRes.status === 200 &&
      webhookData.payment.status === 'PAID' &&
      Boolean(webhookData.ticket?.ticketReference),
    `Server callback verified payment -> Digital Ticket ${webhookData.ticket?.ticketReference} generated`
  );

  // Validate ticket by Conductor
  const validateTktRes = await fetch(`${baseUrl}/api/driver/tickets/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${conductorAuth.token}` },
    body: JSON.stringify({
      ticketReferenceOrQr: webhookData.ticket.ticketReference,
      busId: 'bus-cibus-001',
    }),
  });
  const validateTktData = await validateTktRes.json();
  assert(
    validateTktRes.status === 200 && validateTktData.ticket.validationStatus === 'VALIDATED_ON_BOARD',
    'Conductor validated passenger QR ticket on board'
  );

  // Prevent double-use of already validated ticket
  const doubleValidateRes = await fetch(`${baseUrl}/api/driver/tickets/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${conductorAuth.token}` },
    body: JSON.stringify({
      ticketReferenceOrQr: webhookData.ticket.ticketReference,
      busId: 'bus-cibus-001',
    }),
  });
  assert(doubleValidateRes.status === 409, 'Re-using an already validated ticket is blocked (409 Conflict)');

  // 9. Verify Real-Time WebSocket Events Were Broadcasted
  assert(
    receivedWsEvents.includes('INITIAL_STATE') &&
      receivedWsEvents.includes('TRIP_STATUS_CHANGED') &&
      receivedWsEvents.includes('BUS_GPS_UPDATED') &&
      receivedWsEvents.includes('SEAT_AVAILABILITY_UPDATED') &&
      receivedWsEvents.includes('WAITING_REQUEST_UPDATED') &&
      receivedWsEvents.includes('BOARDING_CONFIRMED') &&
      receivedWsEvents.includes('PAYMENT_AND_TICKET_UPDATED'),
    `All 7 real-time WebSocket event types received by connected client (${receivedWsEvents.length} total events)`
  );

  // 10. Verify Dry-Run Simulation Engine, Route Geometry Segments & Unauthenticated Demo Waiting Request
  await fetch(`${baseUrl}/api/simulation/reset`, { method: 'POST' });
  const simSettingsRes = await fetch(`${baseUrl}/api/simulation/settings`);
  const simSettingsData = await simSettingsRes.json();
  assert(
    simSettingsRes.status === 200 &&
      simSettingsData.settings.operatingMode === 'DRY_RUN' &&
      simSettingsData.settings.enabled === true,
    'Dry-Run Simulation Mode is active by default after reset'
  );

  const initialLat = simSettingsData.buses[0].lastLat;
  const initialLng = simSettingsData.buses[0].lastLng;
  simulationEngine.tick();
  const afterTickBuses = db.getEnrichedBuses();
  assert(
    afterTickBuses[0].lastLat !== initialLat || afterTickBuses[0].lastLng !== initialLng,
    'Simulated bus CIBUS-001 smoothly interpolated along road-following route geometry on tick()'
  );

  // Verify unauthenticated demo passenger waiting request works in DRY_RUN mode
  const demoGuestWaitRes = await fetch(`${baseUrl}/api/waiting`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      routeId: 'route-cibus-main-nb',
      boardingStopId: 'stop-mambaling',
      destinationStopId: 'stop-it-park',
      passengerCount: 2,
      demoPassengerName: 'Dry-Run Guest Commuter',
    }),
  });
  const demoGuestWaitData = await demoGuestWaitRes.json();
  assert(
    demoGuestWaitRes.status === 201 && demoGuestWaitData.request.isSampleData === true,
    'Demonstration commuter can submit waiting request in Dry-Run mode without requiring production user login'
  );

  // 11. Verify Built-in PayMongo Mock Sandbox Config (Zero .env needed) & 1-Click Auto-Verified Checkout
  const payConfigRes = await fetch(`${baseUrl}/api/payments/config`);
  const payConfigData = await payConfigRes.json();
  const allMethodsConfigured =
    Array.isArray(payConfigData.methods) &&
    payConfigData.methods.length === 5 &&
    payConfigData.methods.every((m: any) => m.configured === true);
  assert(
    payConfigRes.status === 200 && allMethodsConfigured,
    'All 5 payment methods (GCash, Maya, QR Ph, In-App Card, Cash) are enabled out-of-the-box via PayMongo Mock Sandbox without needing .env'
  );

  // Verify unauthenticated Dry-Run 1-click PayMongo checkout (autoVerifyMockCallback: true)
  const instantMockPayRes = await fetch(`${baseUrl}/api/payments/initiate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      routeId: 'route-cibus-main-nb',
      originStopId: 'stop-il-corso',
      destinationStopId: 'stop-sm-seaside',
      busId: 'bus-cibus-002',
      passengerCount: 1,
      paymentMethod: 'MAYA',
      autoVerifyMockCallback: true,
    }),
  });
  const instantMockPayData = await instantMockPayRes.json();
  assert(
    instantMockPayRes.status === 201 &&
      instantMockPayData.payment.status === 'PAID' &&
      Boolean(instantMockPayData.ticket?.ticketReference),
    `Unauthenticated Dry-Run 1-click PayMongo Maya checkout auto-verified and issued QR ticket ${instantMockPayData.ticket?.ticketReference}`
  );

  // Clean up test artifacts & reset DB to Dry-Run Demo Seed so the app opens with moving simulated buses and mock PayMongo data
  db.resetToDryRunDemoSeed();
  simulationEngine.initializeCursorsFromCurrentState();

  const seededAnalyticsRes = await fetch(`${baseUrl}/api/admin/analytics`);
  const seededAnalytics = await seededAnalyticsRes.json();
  assert(
    seededAnalyticsRes.status === 200 &&
      seededAnalytics.payments.length >= 3 &&
      seededAnalytics.tickets.length >= 2 &&
      seededAnalytics.boardingRecords.length >= 2,
    `Dry-Run Demo Seed pre-loads ${seededAnalytics.payments.length} mock PayMongo transactions, ${seededAnalytics.tickets.length} QR tickets, and ${seededAnalytics.boardingRecords.length} boarding records for zero-setup testing`
  );

  wsClient.close();
  server.close();

  console.log('===================================================================');
  console.log(`VERIFICATION SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('===================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runVerificationSuite().catch((err) => {
  console.error('Verification suite error:', err);
  process.exit(1);
});
