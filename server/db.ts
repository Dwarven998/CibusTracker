import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import {
  User,
  BusStop,
  RouteStop,
  BusRoute,
  Bus,
  Trip,
  PassengerWaitingRequest,
  BoardingRecord,
  PaymentRecord,
  DigitalTicket,
  SimulationSettings,
} from '../src/types/cibus';
import {
  INITIAL_CIBUS_STOPS,
  NORTHBOUND_STOP_IDS,
  SOUTHBOUND_STOP_IDS,
  NORTHBOUND_GEOMETRY_SEGMENTS,
  SOUTHBOUND_GEOMETRY_SEGMENTS,
} from './cibusRouteData';

export interface UserRecord extends User {
  passwordHash: string;
}

export interface GpsLocationHistoryRecord {
  id: string;
  tripId: string | null;
  busId: string;
  latitude: number;
  longitude: number;
  heading: number | null;
  speedKmh: number | null;
  source: 'DEVICE_GPS' | 'INSTALLED_TRACKER' | 'DEMO_MODE';
  recordedAt: string;
}

export interface SeatAvailabilityUpdateRecord {
  id: string;
  busId: string;
  tripId: string | null;
  updatedByUserId: string;
  previousAvailable: number;
  newAvailable: number;
  occupiedSeats: number;
  updateSource: 'MANUAL_REPORT' | 'BOARDING_CALCULATED';
  createdAt: string;
}

export interface FareConfigurationRecord {
  id: string;
  routeId: string;
  fromStopId: string;
  toStopId: string;
  distanceKm: number;
  regularFarePhp: number;
  discountedFarePhp: number;
  isActive: boolean;
}

export interface NotificationRecord {
  id: string;
  userId: string | null;
  roleTarget: string | null;
  title: string;
  message: string;
  type: 'INFO' | 'ALERT' | 'SUCCESS' | 'WARNING';
  isRead: boolean;
  createdAt: string;
}

export interface DatabaseState {
  simulationSettings: SimulationSettings;
  users: UserRecord[];
  busRoutes: BusRoute[];
  busStops: BusStop[];
  routeStops: RouteStop[];
  buses: Bus[];
  trips: Trip[];
  gpsHistory: GpsLocationHistoryRecord[];
  seatUpdates: SeatAvailabilityUpdateRecord[];
  waitingRequests: PassengerWaitingRequest[];
  boardingRecords: BoardingRecord[];
  fareConfigurations: FareConfigurationRecord[];
  payments: PaymentRecord[];
  digitalTickets: DigitalTicket[];
  notifications: NotificationRecord[];
}

const DB_FILE_PATH = path.resolve(process.cwd(), 'db', 'cibus-store.json');

export function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

function createInitialSeed(defaultOperatingMode: 'DRY_RUN' | 'LIVE' = 'DRY_RUN'): DatabaseState {
  const now = new Date().toISOString();
  const passwordHash = bcrypt.hashSync('cibus123', 10);

  const simulationSettings: SimulationSettings = {
    operatingMode: defaultOperatingMode,
    enabled: defaultOperatingMode === 'DRY_RUN',
    speedMultiplier: 1.5,
    stopDurationSeconds: 6,
    busCount: 3,
    autoReturn: true,
    updateIntervalMs: 1500,
    liveSourceConfigured: false,
  };

  const busStops: BusStop[] = INITIAL_CIBUS_STOPS.map((s) => ({ ...s }));

  const busRoutes: BusRoute[] = [
    {
      id: 'route-cibus-main-nb',
      routeCode: 'CIBUS-01-NB',
      routeName: 'Il Corso (SRP) → Downtown / Fuente Osmeña → N. Escario → Cebu IT Park',
      originName: 'Il Corso (SRP Terminal)',
      destinationName: 'Cebu IT Park',
      direction: 'NORTHBOUND',
      baseFarePhp: 15.0,
      perKmFarePhp: 2.25,
      operatingHours: '05:30 AM - 10:30 PM',
      verificationStatus: 'PROVISIONAL',
      dataSource: 'ROAD_FOLLOWING_OSM_WITH_PROVISIONAL_EXTENSION',
      geometrySegments: NORTHBOUND_GEOMETRY_SEGMENTS.map((seg) => ({
        ...seg,
        coordinates: seg.coordinates.map((c) => [...c] as [number, number]),
      })),
      isVerifiedCibus: true,
      isActive: true,
    },
    {
      id: 'route-cibus-main-sb',
      routeCode: 'CIBUS-01-SB',
      routeName: 'Cebu IT Park → N. Escario → Fuente Osmeña / Downtown → Il Corso (SRP)',
      originName: 'Cebu IT Park',
      destinationName: 'Il Corso (SRP Terminal)',
      direction: 'SOUTHBOUND',
      baseFarePhp: 15.0,
      perKmFarePhp: 2.25,
      operatingHours: '05:30 AM - 10:30 PM',
      verificationStatus: 'PROVISIONAL',
      dataSource: 'ROAD_FOLLOWING_OSM_WITH_PROVISIONAL_EXTENSION',
      geometrySegments: SOUTHBOUND_GEOMETRY_SEGMENTS.map((seg) => ({
        ...seg,
        coordinates: seg.coordinates.map((c) => [...c] as [number, number]),
      })),
      isVerifiedCibus: true,
      isActive: true,
    },
  ];

  const routeStops: RouteStop[] = [];

  // Northbound ordered sequence
  let cumKmNb = 0;
  NORTHBOUND_STOP_IDS.forEach((stopId, idx) => {
    const stop = busStops.find((s) => s.id === stopId)!;
    if (idx > 0) {
      const prev = busStops.find((s) => s.id === NORTHBOUND_STOP_IDS[idx - 1])!;
      cumKmNb = Number((cumKmNb + haversineDistanceKm(prev.latitude, prev.longitude, stop.latitude, stop.longitude) * 1.25).toFixed(2));
    }
    routeStops.push({
      id: `rs-nb-${idx + 1}`,
      routeId: 'route-cibus-main-nb',
      stopId: stop.id,
      direction: 'NORTHBOUND',
      stopSequence: idx + 1,
      distanceFromOriginKm: cumKmNb,
      estimatedMinutesFromOrigin: idx * 4,
    });
  });

  // Southbound ordered sequence
  let cumKmSb = 0;
  SOUTHBOUND_STOP_IDS.forEach((stopId, idx) => {
    const stop = busStops.find((s) => s.id === stopId)!;
    if (idx > 0) {
      const prev = busStops.find((s) => s.id === SOUTHBOUND_STOP_IDS[idx - 1])!;
      cumKmSb = Number((cumKmSb + haversineDistanceKm(prev.latitude, prev.longitude, stop.latitude, stop.longitude) * 1.25).toFixed(2));
    }
    routeStops.push({
      id: `rs-sb-${idx + 1}`,
      routeId: 'route-cibus-main-sb',
      stopId: stop.id,
      direction: 'SOUTHBOUND',
      stopSequence: idx + 1,
      distanceFromOriginKm: cumKmSb,
      estimatedMinutesFromOrigin: idx * 4,
    });
  });

  // Pre-calculate Fare Matrix for all stop pairs on each route
  const fareConfigurations: FareConfigurationRecord[] = [];
  for (const route of busRoutes) {
    const rStops = routeStops
      .filter((rs) => rs.routeId === route.id)
      .sort((a, b) => a.stopSequence - b.stopSequence);

    for (let i = 0; i < rStops.length; i++) {
      for (let j = i + 1; j < rStops.length; j++) {
        const fromRs = rStops[i];
        const toRs = rStops[j];
        const distKm = Math.max(0.5, Number((toRs.distanceFromOriginKm - fromRs.distanceFromOriginKm).toFixed(2)));
        const extraKm = Math.max(0, distKm - 4);
        const regularFare = Math.round(route.baseFarePhp + extraKm * route.perKmFarePhp);
        const discountedFare = Math.round(regularFare * 0.8);

        fareConfigurations.push({
          id: `fare-${route.id}-${fromRs.stopSequence}-${toRs.stopSequence}`,
          routeId: route.id,
          fromStopId: fromRs.stopId,
          toStopId: toRs.stopId,
          distanceKm: distKm,
          regularFarePhp: regularFare,
          discountedFarePhp: discountedFare,
          isActive: true,
        });
      }
    }
  }

  const isDryRun = defaultOperatingMode === 'DRY_RUN';

  // Placeholder / Fleet Buses (CIBUS-001, CIBUS-002, CIBUS-003)
  const buses: Bus[] = [
    {
      id: 'bus-cibus-001',
      busCode: 'CIBUS-001',
      plateNumber: 'DEMO-001',
      model: 'Golden Dragon XML6105 Low-Entry Euro-4 (Placeholder Bus)',
      totalCapacity: 40,
      availableSeats: isDryRun ? 15 : 40,
      occupiedSeats: isDryRun ? 25 : 0,
      seatSource: isDryRun ? 'SIMULATED_SAMPLE' : 'UNREPORTED',
      lastSeatUpdateAt: isDryRun ? now : null,
      assignedRouteId: 'route-cibus-main-nb',
      currentDirection: 'NORTHBOUND',
      operationalStatus: isDryRun ? 'IN_SERVICE' : 'NOT_OPERATING',
      nextStopId: 'stop-sm-seaside',
      lastLat: 10.27185,
      lastLng: 123.87945,
      lastHeading: 25,
      lastSpeedKmh: isDryRun ? 26 : 0,
      lastGpsUpdateAt: isDryRun ? now : null,
      gpsSource: isDryRun ? 'DEMO_MODE' : 'NONE',
      isDemoData: isDryRun,
      simulationStatus: isDryRun ? 'MOVING' : 'INACTIVE',
      dwellRemainingSeconds: 0,
      currentSegmentIndex: 7,
      routeProgressPct: 8,
    },
    {
      id: 'bus-cibus-002',
      busCode: 'CIBUS-002',
      plateNumber: 'DEMO-002',
      model: 'Golden Dragon XML6105 Low-Entry Euro-4 (Placeholder Bus)',
      totalCapacity: 40,
      availableSeats: isDryRun ? 24 : 40,
      occupiedSeats: isDryRun ? 16 : 0,
      seatSource: isDryRun ? 'SIMULATED_SAMPLE' : 'UNREPORTED',
      lastSeatUpdateAt: isDryRun ? now : null,
      assignedRouteId: 'route-cibus-main-nb',
      currentDirection: 'NORTHBOUND',
      operationalStatus: isDryRun ? 'IN_SERVICE' : 'NOT_OPERATING',
      nextStopId: 'stop-csbt-brt',
      lastLat: 10.29732,
      lastLng: 123.88966,
      lastHeading: 45,
      lastSpeedKmh: isDryRun ? 22 : 0,
      lastGpsUpdateAt: isDryRun ? now : null,
      gpsSource: isDryRun ? 'DEMO_MODE' : 'NONE',
      isDemoData: isDryRun,
      simulationStatus: isDryRun ? 'MOVING' : 'INACTIVE',
      dwellRemainingSeconds: 0,
      currentSegmentIndex: 62,
      routeProgressPct: 38,
    },
    {
      id: 'bus-cibus-003',
      busCode: 'CIBUS-003',
      plateNumber: 'DEMO-003',
      model: 'Yutong ZK6118HGA Low-Floor City Bus (Placeholder Bus)',
      totalCapacity: 45,
      availableSeats: isDryRun ? 18 : 45,
      occupiedSeats: isDryRun ? 27 : 0,
      seatSource: isDryRun ? 'SIMULATED_SAMPLE' : 'UNREPORTED',
      lastSeatUpdateAt: isDryRun ? now : null,
      assignedRouteId: 'route-cibus-main-sb',
      currentDirection: 'SOUTHBOUND',
      operationalStatus: isDryRun ? 'IN_SERVICE' : 'OFFLINE',
      nextStopId: 'stop-mcdonalds-osmena',
      lastLat: 10.3175,
      lastLng: 123.89459,
      lastHeading: 195,
      lastSpeedKmh: isDryRun ? 24 : 0,
      lastGpsUpdateAt: isDryRun ? now : null,
      gpsSource: isDryRun ? 'DEMO_MODE' : 'NONE',
      isDemoData: isDryRun,
      simulationStatus: isDryRun ? 'MOVING' : 'INACTIVE',
      dwellRemainingSeconds: 0,
      currentSegmentIndex: 35,
      routeProgressPct: 25,
    },
  ];

  const users: UserRecord[] = [
    {
      id: 'user-admin-1',
      email: 'admin@cibuscebu.ph',
      phone: '+639171000001',
      passwordHash,
      fullName: 'Engr. Marco Villamor (CIBUS Dispatcher)',
      role: 'ADMIN',
      status: 'ACTIVE',
      createdAt: now,
    },
    {
      id: 'user-driver-1',
      email: 'driver1@cibuscebu.ph',
      phone: '+639171000002',
      passwordHash,
      fullName: 'Rodelio Cañete (Demo Driver - CIBUS-001)',
      role: 'DRIVER',
      status: 'ACTIVE',
      createdAt: now,
      assignedBusId: 'bus-cibus-001',
      licenseNumber: 'G01-19-004821',
    },
    {
      id: 'user-conductor-1',
      email: 'conductor1@cibuscebu.ph',
      phone: '+639171000003',
      passwordHash,
      fullName: 'Jomar Bacalso (Demo Conductor - CIBUS-001)',
      role: 'CONDUCTOR',
      status: 'ACTIVE',
      createdAt: now,
      assignedBusId: 'bus-cibus-001',
      employeeCode: 'COND-CEB-001',
    },
    {
      id: 'user-driver-2',
      email: 'driver2@cibuscebu.ph',
      phone: '+639171000004',
      passwordHash,
      fullName: 'Arnel Osmeña (Demo Driver - CIBUS-002)',
      role: 'DRIVER',
      status: 'ACTIVE',
      createdAt: now,
      assignedBusId: 'bus-cibus-002',
      licenseNumber: 'G01-18-009123',
    },
    {
      id: 'user-passenger-1',
      email: 'commuter@cebu.ph',
      phone: '+639171000010',
      passwordHash,
      fullName: 'Bea Alcantara (Demo Commuter)',
      role: 'PASSENGER',
      status: 'ACTIVE',
      createdAt: now,
      discountType: 'REGULAR',
    },
  ];

  const expiresInTwoHours = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

  // Sample Waiting Requests in DRY_RUN Mode
  const waitingRequests: PassengerWaitingRequest[] = isDryRun
    ? [
        {
          id: 'wait-sample-1',
          passengerId: 'user-passenger-1',
          passengerName: 'Sample Commuter Group A (Demo)',
          routeId: 'route-cibus-main-nb',
          direction: 'NORTHBOUND',
          boardingStopId: 'stop-sm-seaside',
          destinationStopId: 'stop-mcdonalds-osmena',
          targetBusId: 'bus-cibus-001',
          tripId: null,
          passengerCount: 5,
          status: 'WAITING',
          isSampleData: true,
          notes: 'DEMO MODE – SAMPLE WAITING REQUEST',
          createdAt: now,
          updatedAt: now,
          expiresAt: expiresInTwoHours,
        },
        {
          id: 'wait-sample-2',
          passengerId: 'user-passenger-1',
          passengerName: 'Sample Commuter Group B (Demo)',
          routeId: 'route-cibus-main-nb',
          direction: 'NORTHBOUND',
          boardingStopId: 'stop-csbt-brt',
          destinationStopId: 'stop-it-park',
          targetBusId: 'bus-cibus-002',
          tripId: null,
          passengerCount: 9,
          status: 'WAITING',
          isSampleData: true,
          notes: 'DEMO MODE – SAMPLE WAITING REQUEST',
          createdAt: now,
          updatedAt: now,
          expiresAt: expiresInTwoHours,
        },
        {
          id: 'wait-sample-3',
          passengerId: 'user-passenger-1',
          passengerName: 'Sample Commuter Group C (Demo)',
          routeId: 'route-cibus-main-nb',
          direction: 'NORTHBOUND',
          boardingStopId: 'stop-central-bank',
          destinationStopId: 'stop-it-park',
          targetBusId: 'bus-cibus-001',
          tripId: null,
          passengerCount: 4,
          status: 'WAITING',
          isSampleData: true,
          notes: 'DEMO MODE – SAMPLE WAITING REQUEST',
          createdAt: now,
          updatedAt: now,
          expiresAt: expiresInTwoHours,
        },
        {
          id: 'wait-sample-4',
          passengerId: 'user-passenger-1',
          passengerName: 'Sample Commuter Group D (Demo)',
          routeId: 'route-cibus-main-sb',
          direction: 'SOUTHBOUND',
          boardingStopId: 'stop-mcdonalds-osmena',
          destinationStopId: 'stop-sm-seaside',
          targetBusId: 'bus-cibus-003',
          tripId: null,
          passengerCount: 6,
          status: 'WAITING',
          isSampleData: true,
          notes: 'DEMO MODE – SAMPLE WAITING REQUEST',
          createdAt: now,
          updatedAt: now,
          expiresAt: expiresInTwoHours,
        },
      ]
    : [];

  // Pre-seeded Sample PayMongo Sandbox Payments, Digital QR Tickets & Boarding Records in DRY_RUN Mode (Zero .env required)
  const payments: PaymentRecord[] = isDryRun
    ? [
        {
          id: 'pay-sample-gcash-1',
          referenceCode: 'CIBUS-PAY-GC8801',
          passengerId: 'user-passenger-1',
          passengerName: 'Bea Alcantara (Demo Commuter)',
          routeId: 'route-cibus-main-nb',
          originStopId: 'stop-sm-seaside',
          destinationStopId: 'stop-mcdonalds-osmena',
          busId: 'bus-cibus-001',
          passengerCount: 2,
          unitFarePhp: 19,
          amountPhp: 38,
          paymentMethod: 'GCASH',
          providerName: 'PayMongo_Mock_Sandbox',
          providerTxId: 'paymongo_src_gcash_demo_8801',
          status: 'PAID',
          verifiedViaCallback: true,
          createdAt: now,
          verifiedAt: now,
        },
        {
          id: 'pay-sample-maya-2',
          referenceCode: 'CIBUS-PAY-MY9902',
          passengerId: 'user-passenger-1',
          passengerName: 'Bea Alcantara (Demo Commuter)',
          routeId: 'route-cibus-main-nb',
          originStopId: 'stop-il-corso',
          destinationStopId: 'stop-it-park',
          busId: 'bus-cibus-002',
          passengerCount: 1,
          unitFarePhp: 33,
          amountPhp: 33,
          paymentMethod: 'MAYA',
          providerName: 'PayMongo_Mock_Sandbox',
          providerTxId: 'paymongo_src_maya_demo_9902',
          status: 'PAID',
          verifiedViaCallback: true,
          createdAt: now,
          verifiedAt: now,
        },
        {
          id: 'pay-sample-qrph-3',
          referenceCode: 'CIBUS-PAY-QR7703',
          passengerId: 'user-passenger-1',
          passengerName: 'Bea Alcantara (Demo Commuter)',
          routeId: 'route-cibus-main-sb',
          originStopId: 'stop-it-park',
          destinationStopId: 'stop-csbt-brt',
          busId: 'bus-cibus-003',
          passengerCount: 1,
          unitFarePhp: 21,
          amountPhp: 21,
          paymentMethod: 'QR_PH',
          providerName: 'PayMongo_Mock_Sandbox',
          providerTxId: 'paymongo_src_qrph_demo_7703',
          status: 'PENDING',
          verifiedViaCallback: false,
          createdAt: now,
          verifiedAt: null,
        },
      ]
    : [];

  const digitalTickets: DigitalTicket[] = isDryRun
    ? [
        {
          id: 'tkt-sample-1',
          ticketReference: 'CIBUS-TKT-GC8801',
          paymentId: 'pay-sample-gcash-1',
          transactionReference: 'CIBUS-PAY-GC8801',
          passengerId: 'user-passenger-1',
          passengerName: 'Bea Alcantara (Demo Commuter)',
          routeId: 'route-cibus-main-nb',
          originStopId: 'stop-sm-seaside',
          destinationStopId: 'stop-mcdonalds-osmena',
          passengerCount: 2,
          farePaidPhp: 38,
          paymentMethod: 'GCASH',
          paymentStatus: 'PAID',
          qrPayload: JSON.stringify({
            ticketRef: 'CIBUS-TKT-GC8801',
            txRef: 'CIBUS-PAY-GC8801',
            route: 'CIBUS-01-NB',
            pax: 2,
            amount: 38,
            method: 'GCASH',
            verifiedAt: now,
          }),
          validationStatus: 'VALID',
          validatedByUserId: null,
          validatedBusId: null,
          validatedAt: null,
          issuedAt: now,
        },
        {
          id: 'tkt-sample-2',
          ticketReference: 'CIBUS-TKT-MY9902',
          paymentId: 'pay-sample-maya-2',
          transactionReference: 'CIBUS-PAY-MY9902',
          passengerId: 'user-passenger-1',
          passengerName: 'Bea Alcantara (Demo Commuter)',
          routeId: 'route-cibus-main-nb',
          originStopId: 'stop-il-corso',
          destinationStopId: 'stop-it-park',
          passengerCount: 1,
          farePaidPhp: 33,
          paymentMethod: 'MAYA',
          paymentStatus: 'PAID',
          qrPayload: JSON.stringify({
            ticketRef: 'CIBUS-TKT-MY9902',
            txRef: 'CIBUS-PAY-MY9902',
            route: 'CIBUS-01-NB',
            pax: 1,
            amount: 33,
            method: 'MAYA',
            verifiedAt: now,
          }),
          validationStatus: 'VALIDATED_ON_BOARD',
          validatedByUserId: 'user-conductor-1',
          validatedBusId: 'bus-cibus-002',
          validatedAt: now,
          issuedAt: now,
        },
      ]
    : [];

  const boardingRecords: BoardingRecord[] = isDryRun
    ? [
        {
          id: 'brd-sample-1',
          tripId: null,
          busId: 'bus-cibus-001',
          routeId: 'route-cibus-main-nb',
          stopId: 'stop-il-corso',
          confirmedByUserId: 'user-conductor-1',
          expectedPassengerCount: 6,
          expectedRequestCount: 2,
          actualBoardedCount: 7,
          alightedCount: 0,
          resolvedRequestIds: [],
          createdAt: now,
        },
        {
          id: 'brd-sample-2',
          tripId: null,
          busId: 'bus-cibus-002',
          routeId: 'route-cibus-main-nb',
          stopId: 'stop-sm-seaside',
          confirmedByUserId: 'user-conductor-1',
          expectedPassengerCount: 8,
          expectedRequestCount: 3,
          actualBoardedCount: 8,
          alightedCount: 2,
          resolvedRequestIds: [],
          createdAt: now,
        },
      ]
    : [];

  return {
    simulationSettings,
    users,
    busRoutes,
    busStops,
    routeStops,
    buses,
    trips: [],
    gpsHistory: [],
    seatUpdates: [],
    waitingRequests,
    boardingRecords,
    fareConfigurations,
    payments,
    digitalTickets,
    notifications: [],
  };
}

class RelationalStore {
  public state: DatabaseState;

  constructor() {
    this.state = this.loadOrSeed();
  }

  private loadOrSeed(): DatabaseState {
    try {
      if (fs.existsSync(DB_FILE_PATH)) {
        const raw = fs.readFileSync(DB_FILE_PATH, 'utf-8');
        const parsed = JSON.parse(raw) as DatabaseState;
        // Upgrade schema if older version without simulationSettings, the current stop list, or pre-seeded sample tickets
        if (
          parsed &&
          parsed.simulationSettings &&
          Array.isArray(parsed.busStops) &&
          parsed.busStops.some((s) => s.id === 'stop-ayala-center') &&
          Array.isArray(parsed.digitalTickets) &&
          parsed.digitalTickets.length > 0
        ) {
          return parsed;
        }
      }
    } catch (err) {
      console.error('Failed to read existing DB store, initializing fresh seed:', err);
    }
    const seeded = createInitialSeed('DRY_RUN');
    this.save(seeded);
    return seeded;
  }

  public save(nextState: DatabaseState = this.state): void {
    this.state = nextState;
    const dir = path.dirname(DB_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(this.state, null, 2), 'utf-8');
  }

  public resetToVerifiedSeed(mode: 'DRY_RUN' | 'LIVE' = 'LIVE'): DatabaseState {
    const seeded = createInitialSeed(mode);
    this.save(seeded);
    return seeded;
  }

  public resetToDryRunDemoSeed(): DatabaseState {
    const seeded = createInitialSeed('DRY_RUN');
    this.save(seeded);
    return seeded;
  }

  public getEnrichedBuses(): Bus[] {
    const activeCount =
      this.state.simulationSettings.operatingMode === 'DRY_RUN'
        ? this.state.simulationSettings.busCount
        : this.state.buses.length;

    return this.state.buses.slice(0, Math.max(1, activeCount)).map((bus) => {
      const route = this.state.busRoutes.find((r) => r.id === bus.assignedRouteId);
      const nextStop = this.state.busStops.find((s) => s.id === bus.nextStopId);
      const driver = this.state.users.find((u) => u.role === 'DRIVER' && u.assignedBusId === bus.id);
      const conductor = this.state.users.find((u) => u.role === 'CONDUCTOR' && u.assignedBusId === bus.id);
      const activeTrip = this.state.trips.find((t) => t.busId === bus.id && t.status === 'ACTIVE');

      return {
        ...bus,
        routeName: route?.routeName || null,
        routeCode: route?.routeCode || null,
        nextStopName: nextStop?.stopName || null,
        driverName: driver?.fullName || null,
        conductorName: conductor?.fullName || null,
        activeTripId: activeTrip?.id || null,
      };
    });
  }

  public getEnrichedRoutes(): BusRoute[] {
    return this.state.busRoutes.map((route) => {
      const stops = this.state.routeStops
        .filter((rs) => rs.routeId === route.id)
        .sort((a, b) => a.stopSequence - b.stopSequence)
        .map((rs) => ({
          ...rs,
          stop: this.state.busStops.find((s) => s.id === rs.stopId),
        }));
      return {
        ...route,
        stops,
      };
    });
  }

  public expireOutdatedWaitingRequests(): number {
    const now = Date.now();
    let expiredCount = 0;
    for (const req of this.state.waitingRequests) {
      if (req.status === 'WAITING' && new Date(req.expiresAt).getTime() <= now) {
        req.status = 'EXPIRED';
        req.updatedAt = new Date().toISOString();
        expiredCount++;
      }
    }
    if (expiredCount > 0) {
      this.save();
    }
    return expiredCount;
  }
}

export const db = new RelationalStore();
