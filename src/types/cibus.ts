export type UserRole = 'PASSENGER' | 'DRIVER' | 'CONDUCTOR' | 'ADMIN';
export type AccountStatus = 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';
export type DirectionType = 'NORTHBOUND' | 'SOUTHBOUND' | 'LOOP';
export type StopType = 'CIBUS_DESIGNATED' | 'AUTHORIZED_BRT_LANE';
export type VerificationStatus = 'VERIFIED' | 'PROVISIONAL';
export type SystemOperatingMode = 'DRY_RUN' | 'LIVE';
export type BusOperationalStatus = 'IN_SERVICE' | 'DELAYED' | 'OFFLINE' | 'OUT_OF_SERVICE' | 'NOT_OPERATING';
export type SeatSourceType = 'MANUAL_REPORT' | 'BOARDING_CALCULATED' | 'UNREPORTED' | 'SIMULATED_SAMPLE';
export type GpsSourceType = 'NONE' | 'DEVICE_GPS' | 'INSTALLED_TRACKER' | 'DEMO_MODE';
export type WaitingRequestStatus = 'WAITING' | 'BOARDED' | 'CANCELLED' | 'EXPIRED';
export type PaymentMethodType = 'GCASH' | 'MAYA' | 'QR_PH' | 'IN_APP_CARD' | 'CASH';
export type PaymentStatusType = 'PENDING' | 'PAID' | 'CASH_ON_BOARD_PENDING' | 'FAILED' | 'CANCELLED' | 'REFUNDED';
export type TicketValidationStatus = 'VALID' | 'VALIDATED_ON_BOARD' | 'EXPIRED' | 'CANCELLED' | 'REFUNDED';

export interface RouteGeometrySegment {
  id: string;
  label: string;
  verificationStatus: VerificationStatus;
  dataSource: 'ROAD_FOLLOWING_OSM' | 'PROVISIONAL_CORRIDOR';
  coordinates: [number, number][]; // [lat, lng][]
}

export interface SimulationSettings {
  operatingMode: SystemOperatingMode;
  enabled: boolean; // true = running, false = paused
  speedMultiplier: number; // e.g., 1x, 2x, 4x
  stopDurationSeconds: number; // dwell time at stops
  busCount: number; // 1 to 3
  autoReturn: boolean; // reverse direction at terminal
  updateIntervalMs: number;
  liveSourceConfigured: boolean; // false unless real GPS feed is connected
}

export interface User {
  id: string;
  email: string;
  phone: string;
  fullName: string;
  role: UserRole;
  status: AccountStatus;
  createdAt: string;
  assignedBusId?: string | null;
  licenseNumber?: string;
  employeeCode?: string;
  discountType?: 'REGULAR' | 'STUDENT' | 'SENIOR' | 'PWD';
}

export interface BusStop {
  id: string;
  stopCode: string;
  stopName: string;
  latitude: number;
  longitude: number;
  stopType: StopType;
  verificationStatus?: VerificationStatus;
  isVerifiedCibus: boolean;
  isActive: boolean;
  landmarkNotes: string;
}

export interface RouteStop {
  id: string;
  routeId: string;
  stopId: string;
  direction: DirectionType;
  stopSequence: number;
  distanceFromOriginKm: number;
  estimatedMinutesFromOrigin: number;
  stop?: BusStop;
}

export interface BusRoute {
  id: string;
  routeCode: string;
  routeName: string;
  originName: string;
  destinationName: string;
  direction: DirectionType;
  baseFarePhp: number;
  perKmFarePhp: number;
  operatingHours: string;
  verificationStatus?: VerificationStatus;
  dataSource?: string;
  geometrySegments?: RouteGeometrySegment[];
  isVerifiedCibus: boolean;
  isActive: boolean;
  stops?: RouteStop[];
}

export interface Bus {
  id: string;
  busCode: string;
  plateNumber: string;
  model: string;
  totalCapacity: number;
  availableSeats: number;
  occupiedSeats: number;
  seatSource: SeatSourceType;
  lastSeatUpdateAt: string | null;
  assignedRouteId: string | null;
  currentDirection: DirectionType;
  operationalStatus: BusOperationalStatus;
  nextStopId: string | null;
  lastLat: number | null;
  lastLng: number | null;
  lastHeading: number | null;
  lastSpeedKmh: number | null;
  lastGpsUpdateAt: string | null;
  gpsSource: GpsSourceType;
  isDemoData: boolean;
  simulationStatus?: 'MOVING' | 'AT_STOP' | 'PAUSED' | 'TURNAROUND' | 'INACTIVE';
  dwellRemainingSeconds?: number;
  currentSegmentIndex?: number;
  routeProgressPct?: number;
  driverName?: string | null;
  conductorName?: string | null;
  routeName?: string | null;
  routeCode?: string | null;
  nextStopName?: string | null;
  activeTripId?: string | null;
}

export interface Trip {
  id: string;
  busId: string;
  routeId: string;
  driverId: string | null;
  conductorId: string | null;
  direction: DirectionType;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  currentStopSequence: number;
  nextStopId: string | null;
  startedAt: string;
  endedAt: string | null;
}

export interface PassengerWaitingRequest {
  id: string;
  passengerId: string;
  passengerName: string;
  routeId: string;
  direction: DirectionType;
  boardingStopId: string;
  destinationStopId: string;
  targetBusId: string | null;
  tripId: string | null;
  passengerCount: number;
  status: WaitingRequestStatus;
  isSampleData?: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  boardingStopName?: string;
  destinationStopName?: string;
  routeCode?: string;
}

export interface BoardingRecord {
  id: string;
  tripId: string | null;
  busId: string;
  routeId: string;
  stopId: string;
  stopName?: string;
  confirmedByUserId: string;
  expectedPassengerCount: number;
  expectedRequestCount: number;
  actualBoardedCount: number;
  alightedCount: number;
  resolvedRequestIds: string[];
  createdAt: string;
}

export interface PaymentRecord {
  id: string;
  referenceCode: string;
  passengerId: string;
  passengerName: string;
  routeId: string;
  routeCode?: string;
  originStopId: string;
  originStopName?: string;
  destinationStopId: string;
  destinationStopName?: string;
  busId: string | null;
  passengerCount: number;
  unitFarePhp: number;
  amountPhp: number;
  paymentMethod: PaymentMethodType;
  providerName: string;
  providerTxId: string | null;
  status: PaymentStatusType;
  verifiedViaCallback: boolean;
  failureReason?: string;
  createdAt: string;
  verifiedAt: string | null;
}

export interface DigitalTicket {
  id: string;
  ticketReference: string;
  paymentId: string;
  transactionReference: string;
  passengerId: string;
  passengerName: string;
  routeId: string;
  routeCode?: string;
  routeName?: string;
  originStopId: string;
  originStopName?: string;
  destinationStopId: string;
  destinationStopName?: string;
  passengerCount: number;
  farePaidPhp: number;
  paymentMethod: PaymentMethodType;
  paymentStatus: PaymentStatusType;
  qrPayload: string;
  validationStatus: TicketValidationStatus;
  validatedByUserId: string | null;
  validatedBusId: string | null;
  validatedAt: string | null;
  issuedAt: string;
}

export interface PaymentProviderConfigStatus {
  providerName: string;
  sandboxMode: boolean;
  hasLiveOrSandboxApiKey: boolean;
  methods: {
    method: PaymentMethodType;
    label: string;
    configured: boolean;
    requiresOnlineVerification: boolean;
    statusMessage: string;
  }[];
}
