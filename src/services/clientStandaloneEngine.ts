import {
  BoardingRecord,
  Bus,
  BusRoute,
  BusStop,
  DigitalTicket,
  DirectionType,
  PassengerWaitingRequest,
  PaymentMethodType,
  PaymentRecord,
  RouteGeometrySegment,
  RouteStop,
  SimulationSettings,
  Trip,
  User,
} from '../types/cibus';
import { EnrichedStopWithEta } from '../context/RealtimeContext';

export const CLIENT_CIBUS_STOPS: BusStop[] = [
  {
    id: 'stop-il-corso',
    stopCode: 'CIBUS-STP-01',
    stopName: 'Il Corso (SRP Terminal)',
    latitude: 10.2673,
    longitude: 123.8744,
    stopType: 'CIBUS_DESIGNATED',
    verificationStatus: 'VERIFIED',
    isVerifiedCibus: true,
    isActive: true,
    landmarkNotes:
      'Verified CIBUS Historical Launch Southern Terminal at Il Corso Filinvest Lifemalls, South Road Properties (SRP)',
  },
  {
    id: 'stop-sm-seaside',
    stopCode: 'CIBUS-STP-02',
    stopName: 'SM Seaside City',
    latitude: 10.2817,
    longitude: 123.881,
    stopType: 'CIBUS_DESIGNATED',
    verificationStatus: 'VERIFIED',
    isVerifiedCibus: true,
    isActive: true,
    landmarkNotes: 'Verified CIBUS Historical Launch Stop at SM Seaside City Cebu, South Road Properties (SRP)',
  },
  {
    id: 'stop-b-aranas',
    stopCode: 'CIBUS-STP-03',
    stopName: 'B. Aranas Street',
    latitude: 10.2918,
    longitude: 123.8884,
    stopType: 'CIBUS_DESIGNATED',
    verificationStatus: 'VERIFIED',
    isVerifiedCibus: true,
    isActive: true,
    landmarkNotes:
      'Verified CIBUS Historical Launch Stop near B. Aranas St / Cebu South Road junction (San Nicolas / Duljo-Fatima)',
  },
  {
    id: 'stop-petron-bacalso',
    stopCode: 'CIBUS-STP-04',
    stopName: 'Petron (Natalio Bacalso Avenue)',
    latitude: 10.2932,
    longitude: 123.8832,
    stopType: 'CIBUS_DESIGNATED',
    verificationStatus: 'VERIFIED',
    isVerifiedCibus: true,
    isActive: true,
    landmarkNotes: 'Verified CIBUS Historical Launch Stop along Natalio Bacalso Avenue (Mambaling / Basak corridor)',
  },
  {
    id: 'stop-gaisano-jai-alai',
    stopCode: 'CIBUS-STP-05',
    stopName: 'Gaisano Jai Alai',
    latitude: 10.2946,
    longitude: 123.8862,
    stopType: 'CIBUS_DESIGNATED',
    verificationStatus: 'VERIFIED',
    isVerifiedCibus: true,
    isActive: true,
    landmarkNotes:
      'Verified CIBUS Historical Launch Stop at former Gaisano Fiesta Mall / Jai Alai, N. Bacalso Ave, Mambaling',
  },
  {
    id: 'stop-budget-builders',
    stopCode: 'CIBUS-STP-06',
    stopName: 'Budget Builders',
    latitude: 10.2959,
    longitude: 123.8891,
    stopType: 'CIBUS_DESIGNATED',
    verificationStatus: 'VERIFIED',
    isVerifiedCibus: true,
    isActive: true,
    landmarkNotes: 'Verified CIBUS Historical Launch Stop at Budget Builders along Natalio Bacalso Avenue',
  },
  {
    id: 'stop-phoenix-bacalso',
    stopCode: 'CIBUS-STP-07',
    stopName: 'Phoenix (Natalio Bacalso Avenue)',
    latitude: 10.2971,
    longitude: 123.8914,
    stopType: 'CIBUS_DESIGNATED',
    verificationStatus: 'VERIFIED',
    isVerifiedCibus: true,
    isActive: true,
    landmarkNotes: 'Verified CIBUS Historical Launch Stop near Phoenix Petroleum station along Natalio Bacalso Avenue',
  },
  {
    id: 'stop-csbt-brt',
    stopCode: 'CIBUS-BRT-08',
    stopName: 'Cebu South Bus Terminal',
    latitude: 10.2983,
    longitude: 123.8934,
    stopType: 'AUTHORIZED_BRT_LANE',
    verificationStatus: 'VERIFIED',
    isVerifiedCibus: true,
    isActive: true,
    landmarkNotes:
      'Verified CIBUS Historical Launch Stop & Authorized CBRT Corridor Stop at Cebu South Bus Terminal (N. Bacalso Ave)',
  },
  {
    id: 'stop-central-bank',
    stopCode: 'CIBUS-BRT-09',
    stopName: 'Central Bank',
    latitude: 10.3019,
    longitude: 123.8957,
    stopType: 'AUTHORIZED_BRT_LANE',
    verificationStatus: 'VERIFIED',
    isVerifiedCibus: true,
    isActive: true,
    landmarkNotes:
      'Verified CIBUS Historical Launch Stop at Bangko Sentral ng Pilipinas (Central Bank), Osmeña Boulevard / P. del Rosario',
  },
  {
    id: 'stop-doh-office',
    stopCode: 'CIBUS-BRT-10',
    stopName: 'DOH Office',
    latitude: 10.3075,
    longitude: 123.8943,
    stopType: 'AUTHORIZED_BRT_LANE',
    verificationStatus: 'VERIFIED',
    isVerifiedCibus: true,
    isActive: true,
    landmarkNotes:
      'Verified CIBUS Historical Launch Stop in front of Department of Health (DOH Region VII) / Vicente Sotto, Osmeña Boulevard',
  },
  {
    id: 'stop-mcdonalds-osmena',
    stopCode: 'CIBUS-BRT-11',
    stopName: "McDonald's (Osmeña Boulevard)",
    latitude: 10.3103,
    longitude: 123.8939,
    stopType: 'AUTHORIZED_BRT_LANE',
    verificationStatus: 'VERIFIED',
    isVerifiedCibus: true,
    isActive: true,
    landmarkNotes: "Verified CIBUS Historical Launch Stop at McDonald's Fuente Osmeña Circle / Osmeña Boulevard",
  },
  {
    id: 'stop-escario-capitol',
    stopCode: 'CIBUS-PRV-12',
    stopName: 'N. Escario Street (Capitol Site – Placeholder)',
    latitude: 10.3168,
    longitude: 123.8942,
    stopType: 'CIBUS_DESIGNATED',
    verificationStatus: 'PROVISIONAL',
    isVerifiedCibus: true,
    isActive: true,
    landmarkNotes:
      'PROVISIONAL PLACEHOLDER STOP along N. Escario Street corridor near Cebu Provincial Capitol (Unverified intermediate stop sequence)',
  },
  {
    id: 'stop-gorordo-salinas',
    stopCode: 'CIBUS-PRV-13',
    stopName: 'Salinas Drive / Lahug (Provisional Placeholder)',
    latitude: 10.3256,
    longitude: 123.9035,
    stopType: 'CIBUS_DESIGNATED',
    verificationStatus: 'PROVISIONAL',
    isVerifiedCibus: true,
    isActive: true,
    landmarkNotes:
      'PROVISIONAL PLACEHOLDER STOP along Gorordo Ave / Salinas Drive approaching Cebu IT Park (Unverified intermediate stop sequence)',
  },
  {
    id: 'stop-it-park',
    stopCode: 'CIBUS-STP-14',
    stopName: 'Cebu IT Park',
    latitude: 10.3306,
    longitude: 123.9062,
    stopType: 'CIBUS_DESIGNATED',
    verificationStatus: 'PROVISIONAL',
    isVerifiedCibus: true,
    isActive: true,
    landmarkNotes:
      'Researched Northern Endpoint at Cebu IT Park Transport Terminal, Apas/Lahug (Northern extension endpoint)',
  },
];

const NB_STOP_IDS = [
  'stop-il-corso',
  'stop-sm-seaside',
  'stop-petron-bacalso',
  'stop-gaisano-jai-alai',
  'stop-budget-builders',
  'stop-phoenix-bacalso',
  'stop-b-aranas',
  'stop-csbt-brt',
  'stop-central-bank',
  'stop-doh-office',
  'stop-mcdonalds-osmena',
  'stop-escario-capitol',
  'stop-gorordo-salinas',
  'stop-it-park',
];

const SB_STOP_IDS = [...NB_STOP_IDS].reverse();

const NB_GEOMETRY_SEGMENTS: RouteGeometrySegment[] = [
  {
    id: 'seg-nb-verified-launch',
    label: 'Verified Historical Launch Corridor (Il Corso SRP → N. Bacalso Ave → Osmeña Blvd / Fuente)',
    verificationStatus: 'VERIFIED',
    dataSource: 'ROAD_FOLLOWING_OSM',
    coordinates: [
      [10.2673, 123.8744],
      [10.2712, 123.8768],
      [10.2764, 123.8794],
      [10.2817, 123.881],
      [10.2862, 123.8805],
      [10.2912, 123.8809],
      [10.2932, 123.8832],
      [10.2946, 123.8862],
      [10.2959, 123.8891],
      [10.2971, 123.8914],
      [10.2918, 123.8884],
      [10.2962, 123.8918],
      [10.2983, 123.8934],
      [10.2995, 123.8952],
      [10.3019, 123.8957],
      [10.3046, 123.8949],
      [10.3075, 123.8943],
      [10.3103, 123.8939],
    ],
  },
  {
    id: 'seg-nb-provisional-north',
    label: 'Provisional Northern Corridor Extension (Fuente Osmeña → N. Escario St → Cebu IT Park)',
    verificationStatus: 'PROVISIONAL',
    dataSource: 'PROVISIONAL_CORRIDOR',
    coordinates: [
      [10.3103, 123.8939],
      [10.3138, 123.8919],
      [10.3162, 123.8912],
      [10.3168, 123.8942],
      [10.3177, 123.8986],
      [10.3186, 123.9012],
      [10.322, 123.9022],
      [10.3256, 123.9035],
      [10.3284, 123.9051],
      [10.3306, 123.9062],
    ],
  },
];

const SB_GEOMETRY_SEGMENTS: RouteGeometrySegment[] = [
  {
    id: 'seg-sb-provisional-north',
    label: 'Provisional Northern Corridor Extension (Cebu IT Park → N. Escario St → Fuente Osmeña)',
    verificationStatus: 'PROVISIONAL',
    dataSource: 'PROVISIONAL_CORRIDOR',
    coordinates: [...NB_GEOMETRY_SEGMENTS[1].coordinates].reverse(),
  },
  {
    id: 'seg-sb-verified-launch',
    label: 'Verified Historical Launch Corridor (Fuente / Osmeña Blvd → N. Bacalso Ave → Il Corso SRP)',
    verificationStatus: 'VERIFIED',
    dataSource: 'ROAD_FOLLOWING_OSM',
    coordinates: [...NB_GEOMETRY_SEGMENTS[0].coordinates].reverse(),
  },
];

function flattenRouteCoordinates(segments: RouteGeometrySegment[]): [number, number][] {
  const pts: [number, number][] = [];
  for (const seg of segments) {
    for (const coord of seg.coordinates) {
      if (pts.length === 0 || pts[pts.length - 1][0] !== coord[0] || pts[pts.length - 1][1] !== coord[1]) {
        pts.push(coord);
      }
    }
  }
  return pts;
}

export function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
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

interface StandaloneState {
  simulationSettings: SimulationSettings;
  users: User[];
  busStops: BusStop[];
  busRoutes: BusRoute[];
  routeStops: RouteStop[];
  buses: Bus[];
  trips: Trip[];
  waitingRequests: PassengerWaitingRequest[];
  boardingRecords: BoardingRecord[];
  payments: PaymentRecord[];
  tickets: DigitalTicket[];
}

interface BusCursor {
  vertexIndex: number;
  segmentProgress: number;
  dwellSecondsRemaining: number;
  lastVisitedStopId: string | null;
}

function buildRouteStops(
  routeId: string,
  direction: DirectionType,
  stopIds: string[],
  stops: BusStop[]
): RouteStop[] {
  const list: RouteStop[] = [];
  let cumulativeKm = 0;
  stopIds.forEach((sId, idx) => {
    const cur = stops.find((s) => s.id === sId)!;
    if (idx > 0) {
      const prev = stops.find((s) => s.id === stopIds[idx - 1])!;
      cumulativeKm = Number(
        (cumulativeKm + haversineDistanceKm(prev.latitude, prev.longitude, cur.latitude, cur.longitude)).toFixed(2)
      );
    }
    list.push({
      id: `rs-${routeId}-${idx + 1}`,
      routeId,
      stopId: sId,
      stopSequence: idx + 1,
      direction,
      distanceFromOriginKm: cumulativeKm,
      estimatedMinutesFromOrigin: Math.round(cumulativeKm * 2.5),
    });
  });
  return list;
}

function createInitialClientState(): StandaloneState {
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  const stops: BusStop[] = JSON.parse(JSON.stringify(CLIENT_CIBUS_STOPS));
  const routeStops: RouteStop[] = [
    ...buildRouteStops('route-cibus-main-nb', 'NORTHBOUND', NB_STOP_IDS, stops),
    ...buildRouteStops('route-cibus-main-sb', 'SOUTHBOUND', SB_STOP_IDS, stops),
  ];

  const nbCoords = flattenRouteCoordinates(NB_GEOMETRY_SEGMENTS);
  const sbCoords = flattenRouteCoordinates(SB_GEOMETRY_SEGMENTS);

  const bus1Pt = nbCoords[6] || [10.2932, 123.8832];
  const bus2Pt = nbCoords[2] || [10.2764, 123.8794];
  const bus3Pt = sbCoords[5] || [10.3177, 123.8986];

  return {
    simulationSettings: {
      operatingMode: 'DRY_RUN',
      enabled: true,
      speedMultiplier: 1.5,
      stopDurationSeconds: 5,
      busCount: 3,
      autoReturn: true,
      updateIntervalMs: 1200,
      liveSourceConfigured: false,
    },
    users: [
      {
        id: 'user-admin-1',
        email: 'admin@cibuscebu.ph',
        phone: '+639171000001',
        fullName: 'Engr. Carlos Mendoza (CIBUS Dispatcher)',
        role: 'ADMIN',
        status: 'ACTIVE',
        createdAt: now,
      },
      {
        id: 'user-driver-1',
        email: 'driver1@cibuscebu.ph',
        phone: '+639171000002',
        fullName: 'Ramonjek Abellana (Driver - CIBUS-001)',
        role: 'DRIVER',
        status: 'ACTIVE',
        assignedBusId: 'bus-cibus-001',
        createdAt: now,
      },
      {
        id: 'user-conductor-1',
        email: 'conductor1@cibuscebu.ph',
        phone: '+639171000003',
        fullName: 'Marites Villamor (Conductor - CIBUS-001)',
        role: 'CONDUCTOR',
        status: 'ACTIVE',
        assignedBusId: 'bus-cibus-001',
        createdAt: now,
      },
      {
        id: 'user-driver-2',
        email: 'driver2@cibuscebu.ph',
        phone: '+639171000004',
        fullName: 'Jovenal Cañete (Driver - CIBUS-002)',
        role: 'DRIVER',
        status: 'ACTIVE',
        assignedBusId: 'bus-cibus-002',
        createdAt: now,
      },
      {
        id: 'user-passenger-1',
        email: 'commuter@cebu.ph',
        phone: '+639171000010',
        fullName: 'Bea Alcantara',
        role: 'PASSENGER',
        status: 'ACTIVE',
        discountType: 'REGULAR',
        createdAt: now,
      },
    ],
    busStops: stops,
    busRoutes: [
      {
        id: 'route-cibus-main-nb',
        routeCode: 'CIBUS-01-NB',
        routeName: 'Il Corso (SRP) → Downtown / Fuente → N. Escario → Cebu IT Park',
        originName: 'Il Corso (SRP Terminal)',
        destinationName: 'Cebu IT Park',
        direction: 'NORTHBOUND',
        baseFarePhp: 15,
        perKmFarePhp: 2.2,
        operatingHours: '05:30 AM - 10:30 PM',
        isActive: true,
        isVerifiedCibus: true,
        geometrySegments: NB_GEOMETRY_SEGMENTS,
      },
      {
        id: 'route-cibus-main-sb',
        routeCode: 'CIBUS-01-SB',
        routeName: 'Cebu IT Park → N. Escario → Fuente / Downtown → Il Corso (SRP)',
        originName: 'Cebu IT Park',
        destinationName: 'Il Corso (SRP Terminal)',
        direction: 'SOUTHBOUND',
        baseFarePhp: 15,
        perKmFarePhp: 2.2,
        operatingHours: '05:30 AM - 10:30 PM',
        isActive: true,
        isVerifiedCibus: true,
        geometrySegments: SB_GEOMETRY_SEGMENTS,
      },
    ],
    routeStops,
    buses: [
      {
        id: 'bus-cibus-001',
        busCode: 'CIBUS-001',
        plateNumber: 'GAW-1021 (Demo)',
        model: 'Golden Dragon XML6105 Low-Entry City Bus',
        assignedRouteId: 'route-cibus-main-nb',
        driverName: 'Ramonjek Abellana (Driver - CIBUS-001)',
        conductorName: 'Marites Villamor (Conductor - CIBUS-001)',
        totalCapacity: 40,
        availableSeats: 15,
        occupiedSeats: 25,
        seatSource: 'SIMULATED_SAMPLE',
        lastSeatUpdateAt: now,
        operationalStatus: 'IN_SERVICE',
        currentDirection: 'NORTHBOUND',
        nextStopId: 'stop-phoenix-bacalso',
        lastLat: bus1Pt[0],
        lastLng: bus1Pt[1],
        lastHeading: 32,
        lastSpeedKmh: 28,
        lastGpsUpdateAt: now,
        gpsSource: 'DEMO_MODE',
        isDemoData: true,
        simulationStatus: 'MOVING',
        currentSegmentIndex: 6,
        routeProgressPct: 35,
        dwellRemainingSeconds: 0,
      },
      {
        id: 'bus-cibus-002',
        busCode: 'CIBUS-002',
        plateNumber: 'GAW-1022 (Demo)',
        model: 'Golden Dragon XML6105 Low-Entry City Bus',
        assignedRouteId: 'route-cibus-main-nb',
        driverName: 'Jovenal Cañete (Driver - CIBUS-002)',
        conductorName: null,
        totalCapacity: 40,
        availableSeats: 24,
        occupiedSeats: 16,
        seatSource: 'SIMULATED_SAMPLE',
        lastSeatUpdateAt: now,
        operationalStatus: 'IN_SERVICE',
        currentDirection: 'NORTHBOUND',
        nextStopId: 'stop-sm-seaside',
        lastLat: bus2Pt[0],
        lastLng: bus2Pt[1],
        lastHeading: 25,
        lastSpeedKmh: 26,
        lastGpsUpdateAt: now,
        gpsSource: 'DEMO_MODE',
        isDemoData: true,
        simulationStatus: 'MOVING',
        currentSegmentIndex: 2,
        routeProgressPct: 12,
        dwellRemainingSeconds: 0,
      },
      {
        id: 'bus-cibus-003',
        busCode: 'CIBUS-003',
        plateNumber: 'GAW-1023 (Demo)',
        model: 'Golden Dragon XML6105 Low-Entry City Bus',
        assignedRouteId: 'route-cibus-main-sb',
        driverName: null,
        conductorName: null,
        totalCapacity: 40,
        availableSeats: 22,
        occupiedSeats: 18,
        seatSource: 'SIMULATED_SAMPLE',
        lastSeatUpdateAt: now,
        operationalStatus: 'IN_SERVICE',
        currentDirection: 'SOUTHBOUND',
        nextStopId: 'stop-mcdonalds-osmena',
        lastLat: bus3Pt[0],
        lastLng: bus3Pt[1],
        lastHeading: 215,
        lastSpeedKmh: 24,
        lastGpsUpdateAt: now,
        gpsSource: 'DEMO_MODE',
        isDemoData: true,
        simulationStatus: 'MOVING',
        currentSegmentIndex: 5,
        routeProgressPct: 28,
        dwellRemainingSeconds: 0,
      },
    ],
    trips: [
      {
        id: 'trip-demo-nb-1',
        busId: 'bus-cibus-001',
        routeId: 'route-cibus-main-nb',
        driverId: 'user-driver-1',
        conductorId: 'user-conductor-1',
        direction: 'NORTHBOUND',
        status: 'ACTIVE',
        currentStopSequence: 6,
        nextStopId: 'stop-phoenix-bacalso',
        startedAt: now,
        endedAt: null,
      },
    ],
    waitingRequests: [
      {
        id: 'wait-sample-1',
        passengerId: 'user-passenger-1',
        passengerName: 'Bea Alcantara (Sample Data)',
        routeId: 'route-cibus-main-nb',
        direction: 'NORTHBOUND',
        boardingStopId: 'stop-sm-seaside',
        destinationStopId: 'stop-it-park',
        targetBusId: 'bus-cibus-001',
        tripId: 'trip-demo-nb-1',
        passengerCount: 4,
        status: 'WAITING',
        createdAt: now,
        updatedAt: now,
        expiresAt,
        isSampleData: true,
      },
      {
        id: 'wait-sample-2',
        passengerId: 'sample-commuter-2',
        passengerName: 'CSBT Commuter Group (Sample Data)',
        routeId: 'route-cibus-main-nb',
        direction: 'NORTHBOUND',
        boardingStopId: 'stop-csbt-brt',
        destinationStopId: 'stop-mcdonalds-osmena',
        targetBusId: 'bus-cibus-001',
        tripId: 'trip-demo-nb-1',
        passengerCount: 6,
        status: 'WAITING',
        createdAt: now,
        updatedAt: now,
        expiresAt,
        isSampleData: true,
      },
      {
        id: 'wait-sample-3',
        passengerId: 'sample-commuter-3',
        passengerName: 'Fuente Commuter (Sample Data)',
        routeId: 'route-cibus-main-sb',
        direction: 'SOUTHBOUND',
        boardingStopId: 'stop-mcdonalds-osmena',
        destinationStopId: 'stop-sm-seaside',
        targetBusId: 'bus-cibus-003',
        tripId: null,
        passengerCount: 5,
        status: 'WAITING',
        createdAt: now,
        updatedAt: now,
        expiresAt,
        isSampleData: true,
      },
    ],
    boardingRecords: [
      {
        id: 'board-sample-1',
        tripId: 'trip-demo-nb-1',
        busId: 'bus-cibus-001',
        routeId: 'route-cibus-main-nb',
        stopId: 'stop-il-corso',
        confirmedByUserId: 'user-conductor-1',
        expectedPassengerCount: 5,
        expectedRequestCount: 2,
        actualBoardedCount: 5,
        alightedCount: 0,
        resolvedRequestIds: [],
        createdAt: now,
      },
      {
        id: 'board-sample-2',
        tripId: 'trip-demo-nb-1',
        busId: 'bus-cibus-001',
        routeId: 'route-cibus-main-nb',
        stopId: 'stop-sm-seaside',
        confirmedByUserId: 'user-conductor-1',
        expectedPassengerCount: 4,
        expectedRequestCount: 1,
        actualBoardedCount: 4,
        alightedCount: 1,
        resolvedRequestIds: [],
        createdAt: now,
      },
    ],
    payments: [
      {
        id: 'pay-sample-gcash-1',
        referenceCode: 'CIBUS-PAY-GC8801',
        passengerId: 'user-passenger-1',
        passengerName: 'Bea Alcantara',
        routeId: 'route-cibus-main-nb',
        originStopId: 'stop-sm-seaside',
        destinationStopId: 'stop-mcdonalds-osmena',
        busId: 'bus-cibus-001',
        passengerCount: 2,
        unitFarePhp: 31,
        amountPhp: 62,
        paymentMethod: 'GCASH',
        providerName: 'PayMongo_Mock_Sandbox',
        providerTxId: 'pi_paymongo_mock_gc8801',
        status: 'PAID',
        verifiedViaCallback: true,
        createdAt: now,
        verifiedAt: now,
      },
      {
        id: 'pay-sample-maya-2',
        referenceCode: 'CIBUS-PAY-MY9902',
        passengerId: 'user-passenger-1',
        passengerName: 'Bea Alcantara',
        routeId: 'route-cibus-main-sb',
        originStopId: 'stop-it-park',
        destinationStopId: 'stop-csbt-brt',
        busId: 'bus-cibus-003',
        passengerCount: 1,
        unitFarePhp: 23,
        amountPhp: 23,
        paymentMethod: 'MAYA',
        providerName: 'PayMongo_Mock_Sandbox',
        providerTxId: 'pi_paymongo_mock_my9902',
        status: 'PAID',
        verifiedViaCallback: true,
        createdAt: now,
        verifiedAt: now,
      },
      {
        id: 'pay-sample-qrph-3',
        referenceCode: 'CIBUS-PAY-QR7703',
        passengerId: 'user-passenger-1',
        passengerName: 'Bea Alcantara',
        routeId: 'route-cibus-main-nb',
        originStopId: 'stop-csbt-brt',
        destinationStopId: 'stop-it-park',
        busId: 'bus-cibus-002',
        passengerCount: 1,
        unitFarePhp: 29,
        amountPhp: 29,
        paymentMethod: 'QR_PH',
        providerName: 'PayMongo_Mock_Sandbox',
        providerTxId: 'pi_paymongo_mock_qr7703',
        status: 'PENDING',
        verifiedViaCallback: false,
        createdAt: now,
        verifiedAt: null,
      },
    ],
    tickets: [
      {
        id: 'tkt-sample-gcash-1',
        ticketReference: 'CIBUS-TKT-GC8801',
        paymentId: 'pay-sample-gcash-1',
        transactionReference: 'CIBUS-PAY-GC8801',
        passengerId: 'user-passenger-1',
        passengerName: 'Bea Alcantara',
        routeId: 'route-cibus-main-nb',
        originStopId: 'stop-sm-seaside',
        destinationStopId: 'stop-mcdonalds-osmena',
        passengerCount: 2,
        farePaidPhp: 62,
        paymentMethod: 'GCASH',
        paymentStatus: 'PAID',
        validationStatus: 'VALID',
        qrPayload: 'CIBUS-QR:CIBUS-TKT-GC8801:PAID:2PAX',
        issuedAt: now,
        validatedAt: null,
        validatedByUserId: null,
        validatedBusId: null,
      },
      {
        id: 'tkt-sample-maya-2',
        ticketReference: 'CIBUS-TKT-MY9902',
        paymentId: 'pay-sample-maya-2',
        transactionReference: 'CIBUS-PAY-MY9902',
        passengerId: 'user-passenger-1',
        passengerName: 'Bea Alcantara',
        routeId: 'route-cibus-main-sb',
        originStopId: 'stop-it-park',
        destinationStopId: 'stop-csbt-brt',
        passengerCount: 1,
        farePaidPhp: 23,
        paymentMethod: 'MAYA',
        paymentStatus: 'PAID',
        validationStatus: 'VALIDATED_ON_BOARD',
        qrPayload: 'CIBUS-QR:CIBUS-TKT-MY9902:PAID:1PAX',
        issuedAt: now,
        validatedAt: now,
        validatedByUserId: 'user-conductor-1',
        validatedBusId: 'bus-cibus-003',
      },
    ],
  };
}

class ClientStandaloneEngine {
  public state: StandaloneState;
  private cursors: Map<string, BusCursor> = new Map();
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.state = createInitialClientState();
    this.initCursors();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn());
  }

  public initCursors(): void {
    this.cursors.clear();
    for (const bus of this.state.buses) {
      const route = this.state.busRoutes.find((r) => r.id === bus.assignedRouteId);
      const coords = route?.geometrySegments ? flattenRouteCoordinates(route.geometrySegments) : [];
      const startIndex = Math.min(Math.max(0, bus.currentSegmentIndex ?? 0), Math.max(0, coords.length - 2));
      this.cursors.set(bus.id, {
        vertexIndex: startIndex,
        segmentProgress: 0,
        dwellSecondsRemaining: bus.dwellRemainingSeconds || 0,
        lastVisitedStopId: null,
      });
    }
  }

  public resetToDryRunSeed(): void {
    this.state = createInitialClientState();
    this.initCursors();
    this.notify();
  }

  private updateNextUpcomingStop(bus: Bus, route?: BusRoute): void {
    if (!route || bus.lastLat === null || bus.lastLng === null) return;
    const orderedRouteStops = this.state.routeStops
      .filter((rs) => rs.routeId === route.id)
      .sort((a, b) => a.stopSequence - b.stopSequence);

    const coords = route.geometrySegments ? flattenRouteCoordinates(route.geometrySegments) : [];
    const currentVertex = bus.currentSegmentIndex ?? 0;

    for (const rs of orderedRouteStops) {
      const stop = this.state.busStops.find((s) => s.id === rs.stopId && s.isActive);
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
    const settings = this.state.simulationSettings;
    if (settings.operatingMode !== 'DRY_RUN' || !settings.enabled) return;

    const activeBuses = this.state.buses.slice(0, Math.max(1, settings.busCount));
    const dtSeconds = 1.2;
    const baseSpeedKmh = 28 * Math.max(0.25, settings.speedMultiplier);
    const distancePerTickKm = (baseSpeedKmh / 3600) * dtSeconds * 6.5;
    const now = new Date().toISOString();

    for (const bus of activeBuses) {
      if (bus.operationalStatus !== 'IN_SERVICE' && bus.operationalStatus !== 'DELAYED') {
        bus.simulationStatus = 'PAUSED';
        continue;
      }

      const route = this.state.busRoutes.find((r) => r.id === bus.assignedRouteId);
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

      if (cursor.dwellSecondsRemaining > 0) {
        cursor.dwellSecondsRemaining = Math.max(0, Number((cursor.dwellSecondsRemaining - dtSeconds).toFixed(1)));
        bus.simulationStatus = 'AT_STOP';
        bus.dwellRemainingSeconds = Math.ceil(cursor.dwellSecondsRemaining);
        bus.lastSpeedKmh = 0;
        bus.lastGpsUpdateAt = now;
        continue;
      }

      const idx = Math.min(cursor.vertexIndex, coords.length - 2);
      const p1 = coords[idx];
      const p2 = coords[idx + 1];
      const segLengthKm = Math.max(0.05, haversineDistanceKm(p1[0], p1[1], p2[0], p2[1]));

      cursor.segmentProgress += distancePerTickKm / segLengthKm;

      if (cursor.segmentProgress >= 1.0) {
        cursor.vertexIndex = idx + 1;
        cursor.segmentProgress = 0;

        const reachedPt = coords[cursor.vertexIndex];
        bus.lastLat = reachedPt[0];
        bus.lastLng = reachedPt[1];

        const routeStopIds = new Set(
          this.state.routeStops.filter((rs) => rs.routeId === route.id).map((rs) => rs.stopId)
        );
        const nearbyStop = this.state.busStops.find(
          (s) =>
            s.isActive &&
            routeStopIds.has(s.id) &&
            s.id !== cursor!.lastVisitedStopId &&
            haversineDistanceKm(reachedPt[0], reachedPt[1], s.latitude, s.longitude) <= 0.08
        );

        if (nearbyStop) {
          cursor.lastVisitedStopId = nearbyStop.id;
          cursor.dwellSecondsRemaining = settings.stopDurationSeconds;
          bus.simulationStatus = 'AT_STOP';
          bus.dwellRemainingSeconds = settings.stopDurationSeconds;
          bus.lastSpeedKmh = 0;
        }

        if (cursor.vertexIndex >= coords.length - 1) {
          if (settings.autoReturn) {
            const oppositeRoute = this.state.busRoutes.find(
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

      this.updateNextUpcomingStop(bus, this.state.busRoutes.find((r) => r.id === bus.assignedRouteId));
    }

    this.notify();
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
      return { ...route, stops };
    });
  }

  public getEnrichedBuses(): Bus[] {
    const visibleBuses =
      this.state.simulationSettings.operatingMode === 'DRY_RUN'
        ? this.state.buses.slice(0, Math.max(1, this.state.simulationSettings.busCount))
        : this.state.buses;

    return visibleBuses.map((bus) => {
      const route = this.state.busRoutes.find((r) => r.id === bus.assignedRouteId);
      const nextStop = this.state.busStops.find((s) => s.id === bus.nextStopId);
      const driver = this.state.users.find((u) => u.assignedBusId === bus.id && u.role === 'DRIVER');
      const conductor = this.state.users.find((u) => u.assignedBusId === bus.id && u.role === 'CONDUCTOR');
      return {
        ...bus,
        routeName: route?.routeName ?? undefined,
        routeCode: route?.routeCode ?? undefined,
        nextStopName: nextStop?.stopName ?? undefined,
        driverName: bus.driverName ?? driver?.fullName ?? null,
        conductorName: bus.conductorName ?? conductor?.fullName ?? null,
      };
    });
  }

  public getEnrichedStops(): EnrichedStopWithEta[] {
    const buses = this.getEnrichedBuses();
    const activeWaiting = this.state.waitingRequests.filter((w) => w.status === 'WAITING');

    return this.state.busStops
      .filter((s) => s.isActive)
      .map((stop) => {
        const stopWaiting = activeWaiting.filter((w) => w.boardingStopId === stop.id);
        const totalExpectedAtStop = stopWaiting.reduce((sum, r) => sum + r.passengerCount, 0);

        const approachingBuses = buses
          .filter((b) => {
            if (!b.assignedRouteId) return false;
            return this.state.routeStops.some((rs) => rs.routeId === b.assignedRouteId && rs.stopId === stop.id);
          })
          .map((bus) => {
            let etaMinutes: number | null = null;
            let distanceKm: number | null = null;
            let statusNote = 'Awaiting live GPS';

            if (
              bus.lastLat !== null &&
              bus.lastLng !== null &&
              (bus.operationalStatus === 'IN_SERVICE' || bus.operationalStatus === 'DELAYED')
            ) {
              distanceKm = haversineDistanceKm(bus.lastLat, bus.lastLng, stop.latitude, stop.longitude);
              const speedKmh = bus.lastSpeedKmh && bus.lastSpeedKmh > 5 ? bus.lastSpeedKmh : 22;
              etaMinutes = Math.max(1, Math.round((distanceKm / speedKmh) * 60));
              statusNote = bus.isDemoData ? 'Demo GPS Mode' : 'Live GPS Estimate';
            }

            return {
              busId: bus.id,
              busCode: bus.busCode,
              routeCode: bus.routeCode || null,
              routeName: bus.routeName || null,
              operationalStatus: bus.operationalStatus,
              availableSeats: bus.availableSeats,
              totalCapacity: bus.totalCapacity,
              seatSource: bus.seatSource,
              lastGpsUpdateAt: bus.lastGpsUpdateAt,
              isDemoData: bus.isDemoData,
              etaMinutes,
              distanceKm,
              isLiveConfirmed: bus.operationalStatus === 'IN_SERVICE' && !bus.isDemoData,
              statusNote,
            };
          });

        return {
          ...stop,
          expectedWaitingPassengers: totalExpectedAtStop,
          activeRequestCount: stopWaiting.length,
          approachingBuses,
        };
      });
  }

  public getEnrichedWaitingRequests(): PassengerWaitingRequest[] {
    return this.state.waitingRequests
      .filter((w) => w.status === 'WAITING')
      .map((w) => {
        const route = this.state.busRoutes.find((r) => r.id === w.routeId);
        const bStop = this.state.busStops.find((s) => s.id === w.boardingStopId);
        const dStop = this.state.busStops.find((s) => s.id === w.destinationStopId);
        return {
          ...w,
          routeName: route?.routeName,
          routeCode: route?.routeCode,
          boardingStopName: bStop?.stopName,
          destinationStopName: dStop?.stopName,
        };
      });
  }

  public getOverviewPayload() {
    return {
      simulationSettings: this.state.simulationSettings,
      buses: this.getEnrichedBuses(),
      routes: this.getEnrichedRoutes(),
      stops: this.getEnrichedStops(),
      waitingRequests: this.getEnrichedWaitingRequests(),
      serverTimestamp: new Date().toISOString(),
    };
  }

  public handleApiRequest(urlStr: string, init?: RequestInit): Response | null {
    const url = new URL(urlStr, window.location.origin);
    const path = url.pathname;
    const method = (init?.method || 'GET').toUpperCase();
    const body = init?.body ? JSON.parse(String(init.body)) : {};

    const jsonRes = (data: unknown, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
      });

    if (path === '/api/transit/overview' && method === 'GET') {
      return jsonRes(this.getOverviewPayload());
    }

    if (path === '/api/simulation/settings') {
      if (method === 'GET') {
        return jsonRes({ settings: this.state.simulationSettings, buses: this.getEnrichedBuses() });
      }
      if (method === 'PUT') {
        this.state.simulationSettings = { ...this.state.simulationSettings, ...body };
        this.notify();
        return jsonRes({ settings: this.state.simulationSettings });
      }
    }

    if (path === '/api/simulation/reset' && method === 'POST') {
      this.resetToDryRunSeed();
      return jsonRes({ message: 'Dry-Run simulation reset to initial positions.', settings: this.state.simulationSettings });
    }

    if (path === '/api/simulation/bus-control' && method === 'POST') {
      const bus = this.state.buses.find((b) => b.id === body.busId);
      const stop = this.state.busStops.find((s) => s.id === body.stopId);
      if (bus && stop) {
        bus.lastLat = stop.latitude;
        bus.lastLng = stop.longitude;
        bus.lastGpsUpdateAt = new Date().toISOString();
        bus.nextStopId = stop.id;
        bus.simulationStatus = 'AT_STOP';
        this.notify();
      }
      return jsonRes({ message: 'Bus position updated.' });
    }

    // Payments & Tickets
    if (path === '/api/payments/config' && method === 'GET') {
      return jsonRes({
        providerName: 'PayMongo_Mock_Sandbox',
        sandboxMode: true,
        hasLiveOrSandboxApiKey: true,
        methods: [
          {
            method: 'GCASH',
            label: 'GCash Digital Wallet',
            configured: true,
            requiresOnlineVerification: true,
            statusMessage: 'Ready for testing — Built-in PayMongo Mock Sandbox active',
          },
          {
            method: 'MAYA',
            label: 'Maya Digital Wallet',
            configured: true,
            requiresOnlineVerification: true,
            statusMessage: 'Ready for testing — Built-in PayMongo Mock Sandbox active',
          },
          {
            method: 'QR_PH',
            label: 'QR Ph / InstaPay QR Code',
            configured: true,
            requiresOnlineVerification: true,
            statusMessage: 'Ready for testing — Built-in PayMongo Mock Sandbox active',
          },
          {
            method: 'IN_APP_CARD',
            label: 'In-App Debit / Credit Card',
            configured: true,
            requiresOnlineVerification: true,
            statusMessage: 'Ready for testing — Built-in PayMongo Mock Sandbox active',
          },
          {
            method: 'CASH',
            label: 'Cash on Board (Pay Conductor)',
            configured: true,
            requiresOnlineVerification: false,
            statusMessage: 'Available on all CIBUS Cebu trips',
          },
        ],
      });
    }

    if (path === '/api/payments/fare-quote' && method === 'GET') {
      const routeId = url.searchParams.get('routeId') || 'route-cibus-main-nb';
      const originStopId = url.searchParams.get('originStopId') || 'stop-il-corso';
      const destinationStopId = url.searchParams.get('destinationStopId') || 'stop-it-park';
      const passengerCount = Math.max(1, Number(url.searchParams.get('passengerCount') || 1));
      const discountType = url.searchParams.get('discountType') || 'REGULAR';

      const route = this.state.busRoutes.find((r) => r.id === routeId) || this.state.busRoutes[0];
      const oStop = this.state.busStops.find((s) => s.id === originStopId);
      const dStop = this.state.busStops.find((s) => s.id === destinationStopId);
      const distanceKm =
        oStop && dStop ? Math.max(1, haversineDistanceKm(oStop.latitude, oStop.longitude, dStop.latitude, dStop.longitude)) : 5;
      const extraKm = Math.max(0, distanceKm - 4);
      let unitFare = route.baseFarePhp + extraKm * route.perKmFarePhp;
      if (discountType !== 'REGULAR') unitFare *= 0.8;
      unitFare = Math.round(unitFare);
      return jsonRes({
        unitFarePhp: unitFare,
        totalFarePhp: unitFare * passengerCount,
        distanceKm,
        discountApplied: discountType,
      });
    }

    if (path === '/api/payments/my' && method === 'GET') {
      const payments = this.state.payments.map((p) => ({
        ...p,
        routeCode: this.state.busRoutes.find((r) => r.id === p.routeId)?.routeCode,
        originStopName: this.state.busStops.find((s) => s.id === p.originStopId)?.stopName,
        destinationStopName: this.state.busStops.find((s) => s.id === p.destinationStopId)?.stopName,
      }));
      const tickets = this.state.tickets.map((t) => ({
        ...t,
        routeCode: this.state.busRoutes.find((r) => r.id === t.routeId)?.routeCode,
        routeName: this.state.busRoutes.find((r) => r.id === t.routeId)?.routeName,
        originStopName: this.state.busStops.find((s) => s.id === t.originStopId)?.stopName,
        destinationStopName: this.state.busStops.find((s) => s.id === t.destinationStopId)?.stopName,
      }));
      return jsonRes({ payments, tickets });
    }

    if (path === '/api/payments/initiate' && method === 'POST') {
      const now = new Date().toISOString();
      const suffix = Math.random().toString(36).substring(2, 8).toUpperCase();
      const refCode = `CIBUS-PAY-${suffix}`;
      const oStop = this.state.busStops.find((s) => s.id === body.originStopId);
      const dStop = this.state.busStops.find((s) => s.id === body.destinationStopId);
      const dist = oStop && dStop ? Math.max(1, haversineDistanceKm(oStop.latitude, oStop.longitude, dStop.latitude, dStop.longitude)) : 5;
      const paxCount = Number(body.passengerCount) || 1;
      const unitFarePhp = Math.round(15 + Math.max(0, dist - 4) * 2.2);
      const amountPhp = unitFarePhp * paxCount;
      const isCash = body.paymentMethod === 'CASH';
      const autoPaid = !isCash && Boolean(body.autoVerifyMockCallback);

      const newPay: PaymentRecord = {
        id: `pay-${Date.now()}`,
        referenceCode: refCode,
        passengerId: 'user-passenger-1',
        passengerName: 'Bea Alcantara',
        routeId: body.routeId,
        originStopId: body.originStopId,
        destinationStopId: body.destinationStopId,
        busId: body.busId || null,
        passengerCount: paxCount,
        unitFarePhp,
        amountPhp,
        paymentMethod: body.paymentMethod as PaymentMethodType,
        providerName: isCash ? 'CIBUS_CONDUCTOR_CASH' : 'PayMongo_Mock_Sandbox',
        providerTxId: `pi_mock_${suffix}`,
        status: isCash ? 'CASH_ON_BOARD_PENDING' : autoPaid ? 'PAID' : 'PENDING',
        verifiedViaCallback: autoPaid,
        createdAt: now,
        verifiedAt: autoPaid ? now : null,
      };
      this.state.payments.unshift(newPay);

      let newTicket: DigitalTicket | null = null;
      if (isCash || autoPaid) {
        const tktRef = isCash ? `TKT-CASH-${suffix}` : `CIBUS-TKT-${suffix}`;
        const createdTicket: DigitalTicket = {
          id: `tkt-${Date.now()}`,
          ticketReference: tktRef,
          paymentId: newPay.id,
          transactionReference: refCode,
          passengerId: 'user-passenger-1',
          passengerName: 'Bea Alcantara',
          routeId: newPay.routeId,
          originStopId: newPay.originStopId,
          destinationStopId: newPay.destinationStopId,
          passengerCount: newPay.passengerCount,
          farePaidPhp: amountPhp,
          paymentMethod: newPay.paymentMethod,
          paymentStatus: newPay.status,
          validationStatus: 'VALID',
          qrPayload: `CIBUS-QR:${tktRef}:${newPay.status}:${newPay.passengerCount}PAX`,
          issuedAt: now,
          validatedAt: null,
          validatedByUserId: null,
          validatedBusId: null,
        };
        this.state.tickets.unshift(createdTicket);
        newTicket = createdTicket;
      }
      this.notify();
      return jsonRes(
        {
          message: autoPaid
            ? `PayMongo Mock Sandbox verified ${newPay.paymentMethod} payment (${refCode})! Digital QR Ticket ${newTicket?.ticketReference} issued.`
            : `Payment ${refCode} recorded.`,
          payment: newPay,
          ticket: newTicket,
        },
        201
      );
    }

    if (path === '/api/payments/webhook-verify' && method === 'POST') {
      const pay = this.state.payments.find((p) => p.id === body.paymentId);
      if (!pay) return jsonRes({ error: 'Payment not found' }, 404);
      pay.status = body.outcome;
      pay.verifiedViaCallback = body.outcome === 'PAID';
      if (body.outcome === 'PAID') {
        pay.verifiedAt = new Date().toISOString();
      }
      let ticket = this.state.tickets.find((t) => t.paymentId === pay.id) || null;
      if (body.outcome === 'PAID' && !ticket) {
        const suffix = Math.random().toString(36).substring(2, 8).toUpperCase();
        const tktRef = `CIBUS-TKT-${suffix}`;
        const createdTicket: DigitalTicket = {
          id: `tkt-${Date.now()}`,
          ticketReference: tktRef,
          paymentId: pay.id,
          transactionReference: pay.referenceCode,
          passengerId: pay.passengerId,
          passengerName: pay.passengerName,
          routeId: pay.routeId,
          originStopId: pay.originStopId,
          destinationStopId: pay.destinationStopId,
          passengerCount: pay.passengerCount,
          farePaidPhp: pay.amountPhp,
          paymentMethod: pay.paymentMethod,
          paymentStatus: 'PAID',
          validationStatus: 'VALID',
          qrPayload: `CIBUS-QR:${tktRef}:PAID:${pay.passengerCount}PAX`,
          issuedAt: new Date().toISOString(),
          validatedAt: null,
          validatedByUserId: null,
          validatedBusId: null,
        };
        this.state.tickets.unshift(createdTicket);
        ticket = createdTicket;
      }
      this.notify();
      return jsonRes({ message: `Payment updated to ${body.outcome}.`, payment: pay, ticket });
    }

    // Waiting Requests
    if (path === '/api/waiting/my' && method === 'GET') {
      return jsonRes({ requests: this.getEnrichedWaitingRequests() });
    }

    if (path === '/api/waiting' && method === 'POST') {
      const route = this.state.busRoutes.find((r) => r.id === body.routeId) || this.state.busRoutes[0];
      const now = new Date().toISOString();
      const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
      const newReq: PassengerWaitingRequest = {
        id: `wait-${Date.now()}`,
        passengerId: 'user-passenger-1',
        passengerName: body.demoPassengerName || 'Bea Alcantara',
        routeId: route.id,
        direction: route.direction,
        boardingStopId: body.boardingStopId,
        destinationStopId: body.destinationStopId,
        targetBusId: body.targetBusId || null,
        tripId: null,
        passengerCount: Math.max(1, Number(body.passengerCount) || 1),
        status: 'WAITING',
        createdAt: now,
        updatedAt: now,
        expiresAt,
        isSampleData: true,
      };
      this.state.waitingRequests.unshift(newReq);
      this.notify();
      return jsonRes({ message: 'Waiting request broadcast to approaching CIBUS buses.', request: newReq }, 201);
    }

    if (path.startsWith('/api/waiting/')) {
      const reqId = path.split('/').pop()!;
      const found = this.state.waitingRequests.find((w) => w.id === reqId);
      if (found) {
        if (method === 'PUT') {
          found.passengerCount = Math.max(1, Number(body.passengerCount) || 1);
        } else if (method === 'DELETE') {
          found.status = 'CANCELLED';
        }
        this.notify();
      }
      return jsonRes({ message: 'Updated waiting request.', request: found });
    }

    // Driver Dashboard
    if (path === '/api/driver/dashboard' && method === 'GET') {
      const busId = url.searchParams.get('busId') || 'bus-cibus-001';
      const bus = this.getEnrichedBuses().find((b) => b.id === busId) || this.getEnrichedBuses()[0];
      const route = this.getEnrichedRoutes().find((r) => r.id === bus.assignedRouteId) || this.getEnrichedRoutes()[0];
      const ordered = this.state.routeStops
        .filter((rs) => rs.routeId === route.id)
        .sort((a, b) => a.stopSequence - b.stopSequence);

      const upcomingStops = ordered.map((rs) => {
        const st = this.state.busStops.find((s) => s.id === rs.stopId)!;
        const reqs = this.state.waitingRequests.filter(
          (w) => w.status === 'WAITING' && w.routeId === route.id && w.boardingStopId === st.id
        );
        const expectedPassengers = reqs.reduce((s, r) => s + r.passengerCount, 0);
        const boarded = this.state.boardingRecords
          .filter((b) => b.busId === bus.id && b.stopId === st.id)
          .reduce((s, r) => s + r.actualBoardedCount, 0);
        return {
          stopId: st.id,
          stopCode: st.stopCode,
          stopName: st.stopName,
          stopType: st.stopType,
          stopSequence: rs.stopSequence,
          latitude: st.latitude,
          longitude: st.longitude,
          distanceFromOriginKm: rs.distanceFromOriginKm,
          isPassed: false,
          isCurrentOrNext: bus.nextStopId === st.id,
          expectedPassengers,
          registeredRequestCount: reqs.length,
          isHighDemand: expectedPassengers >= 8,
          actualBoardedCount: boarded,
        };
      });

      return jsonRes({
        bus,
        route,
        activeTrip: this.state.trips.find((t) => t.busId === bus.id && t.status === 'ACTIVE') || null,
        upcomingStops,
        totalExpectedRemainingPassengers: upcomingStops.reduce((s, u) => s + u.expectedPassengers, 0),
        totalRegisteredRequestsRemaining: upcomingStops.reduce((s, u) => s + u.registeredRequestCount, 0),
        recentBoardings: this.state.boardingRecords.filter((b) => b.busId === bus.id),
      });
    }

    if (path === '/api/driver/seats' && method === 'POST') {
      const bus = this.state.buses.find((b) => b.id === body.busId) || this.state.buses[0];
      bus.availableSeats = Math.max(0, Math.min(bus.totalCapacity, Number(body.availableSeats)));
      bus.occupiedSeats = bus.totalCapacity - bus.availableSeats;
      bus.seatSource = 'MANUAL_REPORT';
      bus.lastSeatUpdateAt = new Date().toISOString();
      this.notify();
      return jsonRes({ message: `Updated ${bus.busCode} to ${bus.availableSeats} available seats.`, bus });
    }

    if (path === '/api/driver/boarding/confirm' && method === 'POST') {
      const bus = this.state.buses.find((b) => b.id === body.busId) || this.state.buses[0];
      const boarded = Number(body.actualBoardedCount) || 0;
      const alighted = Number(body.alightedCount) || 0;
      bus.availableSeats = Math.max(0, Math.min(bus.totalCapacity, bus.availableSeats + alighted - boarded));
      bus.occupiedSeats = bus.totalCapacity - bus.availableSeats;
      bus.seatSource = 'BOARDING_CALCULATED';
      this.state.waitingRequests.forEach((w) => {
        if (w.status === 'WAITING' && w.boardingStopId === body.stopId && w.routeId === bus.assignedRouteId) {
          w.status = 'BOARDED';
        }
      });
      this.notify();
      return jsonRes({ message: `Boarding confirmed (${boarded} boarded, ${alighted} alighted).`, bus });
    }

    if (path === '/api/driver/tickets/validate' && method === 'POST') {
      const ref = String(body.ticketReferenceOrQr || '').trim();
      const tkt = this.state.tickets.find((t) => t.ticketReference.toUpperCase() === ref.toUpperCase());
      if (!tkt) return jsonRes({ error: `Ticket ${ref} not found.` }, 404);
      if (tkt.validationStatus === 'VALIDATED_ON_BOARD') {
        return jsonRes({ error: `Ticket ${ref} has already been validated on board.` }, 409);
      }
      tkt.validationStatus = 'VALIDATED_ON_BOARD';
      tkt.validatedAt = new Date().toISOString();
      if (tkt.paymentStatus === 'CASH_ON_BOARD_PENDING') tkt.paymentStatus = 'PAID';
      this.notify();
      return jsonRes({ message: `Ticket ${tkt.ticketReference} validated on board (${tkt.passengerCount} pax).`, ticket: tkt });
    }

    if (path === '/api/driver/trips/start' && method === 'POST') {
      const bus = this.state.buses.find((b) => b.id === body.busId) || this.state.buses[0];
      bus.operationalStatus = 'IN_SERVICE';
      this.notify();
      return jsonRes({ message: `Trip started for ${bus.busCode}.`, bus });
    }

    if (path === '/api/driver/trips/end' && method === 'POST') {
      const bus = this.state.buses.find((b) => b.id === body.busId) || this.state.buses[0];
      bus.operationalStatus = 'OUT_OF_SERVICE';
      this.notify();
      return jsonRes({ message: `Trip ended for ${bus.busCode}.`, bus });
    }

    // Admin Analytics
    if (path === '/api/admin/analytics' && method === 'GET') {
      const buses = this.getEnrichedBuses();
      const routes = this.getEnrichedRoutes();
      const activeWaiting = this.state.waitingRequests.filter((w) => w.status === 'WAITING');
      const paidPayments = this.state.payments.filter((p) => p.status === 'PAID');
      return jsonRes({
        metrics: {
          totalRegisteredPassengers: this.state.users.filter((u) => u.role === 'PASSENGER').length,
          activeBuses: buses.length,
          busesInService: buses.filter((b) => b.operationalStatus === 'IN_SERVICE').length,
          totalDriversAndConductors: this.state.users.filter((u) => u.role === 'DRIVER' || u.role === 'CONDUCTOR').length,
          totalActiveRoutes: routes.length,
          totalRegisteredBusStops: this.state.busStops.length,
          totalWaitingPassengers: activeWaiting.reduce((s, r) => s + r.passengerCount, 0),
          totalSuccessfulTransactions: paidPayments.length,
          totalRevenuePhp: paidPayments.reduce((s, p) => s + p.amountPhp, 0),
        },
        stopDemandAnalytics: this.state.busStops.map((st) => {
          const cur = activeWaiting.filter((w) => w.boardingStopId === st.id);
          const all = this.state.waitingRequests.filter((w) => w.boardingStopId === st.id);
          const brd = this.state.boardingRecords.filter((b) => b.stopId === st.id);
          return {
            stopId: st.id,
            stopCode: st.stopCode,
            stopName: st.stopName,
            stopType: st.stopType,
            isVerifiedCibus: st.isVerifiedCibus,
            currentExpectedPassengers: cur.reduce((s, r) => s + r.passengerCount, 0),
            totalHistoricalExpected: all.reduce((s, r) => s + r.passengerCount, 0),
            totalActualBoarded: brd.reduce((s, r) => s + r.actualBoardedCount, 0),
            requestCount: all.length,
          };
        }),
        routeDemandAnalytics: routes.map((rt) => ({
          routeId: rt.id,
          routeCode: rt.routeCode,
          routeName: rt.routeName,
          direction: rt.direction,
          expectedPassengersTotal: this.state.waitingRequests
            .filter((w) => w.routeId === rt.id)
            .reduce((s, r) => s + r.passengerCount, 0),
          actualBoardedTotal: this.state.boardingRecords
            .filter((b) => b.routeId === rt.id)
            .reduce((s, r) => s + r.actualBoardedCount, 0),
          paidRevenuePhp: paidPayments.filter((p) => p.routeId === rt.id).reduce((s, p) => s + p.amountPhp, 0),
        })),
        buses,
        routes,
        stops: this.state.busStops,
        users: this.state.users,
        payments: this.state.payments.map((p) => ({
          ...p,
          routeCode: this.state.busRoutes.find((r) => r.id === p.routeId)?.routeCode,
          originStopName: this.state.busStops.find((s) => s.id === p.originStopId)?.stopName,
          destinationStopName: this.state.busStops.find((s) => s.id === p.destinationStopId)?.stopName,
        })),
        tickets: this.state.tickets,
        boardingRecords: this.state.boardingRecords,
      });
    }

    if (path === '/api/admin/buses' && method === 'POST') {
      const newBus: Bus = {
        id: `bus-${Date.now()}`,
        busCode: body.busCode || 'CIBUS-004',
        plateNumber: body.plateNumber || 'GAW-4044',
        model: body.model || 'Golden Dragon XML6105 Low-Entry City Bus',
        assignedRouteId: body.assignedRouteId || 'route-cibus-main-nb',
        driverName: null,
        conductorName: null,
        totalCapacity: Number(body.totalCapacity) || 40,
        availableSeats: Number(body.totalCapacity) || 40,
        occupiedSeats: 0,
        seatSource: 'SIMULATED_SAMPLE',
        lastSeatUpdateAt: new Date().toISOString(),
        operationalStatus: 'IN_SERVICE',
        currentDirection: 'NORTHBOUND',
        nextStopId: 'stop-sm-seaside',
        lastLat: 10.2817,
        lastLng: 123.881,
        lastHeading: 25,
        lastSpeedKmh: 25,
        lastGpsUpdateAt: new Date().toISOString(),
        gpsSource: 'DEMO_MODE',
        isDemoData: true,
        simulationStatus: 'MOVING',
        currentSegmentIndex: 2,
        routeProgressPct: 10,
        dwellRemainingSeconds: 0,
      };
      this.state.buses.push(newBus);
      this.state.simulationSettings.busCount = Math.max(this.state.simulationSettings.busCount, this.state.buses.length);
      this.notify();
      return jsonRes({ message: `Bus ${newBus.busCode} added to CIBUS fleet.`, bus: newBus }, 201);
    }

    if (path.startsWith('/api/admin/buses/') && method === 'PUT') {
      const busId = path.split('/').pop()!;
      const bus = this.state.buses.find((b) => b.id === busId);
      if (bus) {
        Object.assign(bus, body);
        this.notify();
      }
      return jsonRes({ message: 'Bus updated.', bus });
    }

    if (path === '/api/admin/stops' && method === 'POST') {
      const newStop: BusStop = {
        id: `stop-${Date.now()}`,
        stopCode: body.stopCode,
        stopName: body.stopName,
        latitude: Number(body.latitude),
        longitude: Number(body.longitude),
        stopType: body.stopType || 'CIBUS_DESIGNATED',
        verificationStatus: body.isVerifiedCibus ? 'VERIFIED' : 'PROVISIONAL',
        isVerifiedCibus: Boolean(body.isVerifiedCibus),
        isActive: true,
        landmarkNotes: body.landmarkNotes || '',
      };
      this.state.busStops.push(newStop);
      this.notify();
      return jsonRes({ message: `Stop ${newStop.stopName} created.`, stop: newStop }, 201);
    }

    if (path.startsWith('/api/admin/stops/') && method === 'PUT') {
      const stopId = path.split('/').pop()!;
      const stop = this.state.busStops.find((s) => s.id === stopId);
      if (stop) {
        Object.assign(stop, body);
        this.notify();
      }
      return jsonRes({ message: 'Stop updated.', stop });
    }

    if (path === '/api/auth/login' && method === 'POST') {
      const user =
        this.state.users.find((u) => u.email.toLowerCase() === String(body.email || '').toLowerCase()) ||
        this.state.users[4];
      return jsonRes({ token: `standalone-token-${user.id}`, user });
    }

    if (path === '/api/auth/me' && method === 'GET') {
      return jsonRes({ user: this.state.users[4] });
    }

    return null;
  }
}

export const clientStandaloneEngine = new ClientStandaloneEngine();

let interceptorInstalled = false;
export function installStandaloneApiInterceptor(): void {
  if (interceptorInstalled || typeof window === 'undefined') return;
  interceptorInstalled = true;

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const isApiCall = urlStr.startsWith('/api/') || urlStr.includes('/api/');

    if (!isApiCall) {
      return originalFetch(input, init);
    }

    try {
      const response = await originalFetch(input, init);
      const contentType = response.headers.get('content-type') || '';
      // If deployed on Vercel static hosting, /api/* returns 404 or index.html (text/html)
      if (response.ok && contentType.includes('application/json')) {
        return response;
      }
    } catch {
      // Network error when no local server is running -> fall back to clientStandaloneEngine
    }

    const fallback = clientStandaloneEngine.handleApiRequest(urlStr, init);
    if (fallback) return fallback;

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
}
