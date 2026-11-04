-- =============================================================================
-- CIBUS Cebu – Real-Time Bus Tracking and Passenger Management Platform
-- Production PostgreSQL Schema & Constraints (17 Core Entities)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users
CREATE TABLE users (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(32) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL CHECK (role IN ('PASSENGER', 'DRIVER', 'CONDUCTOR', 'ADMIN')),
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'DEACTIVATED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Bus Routes
CREATE TABLE bus_routes (
    id VARCHAR(64) PRIMARY KEY,
    route_code VARCHAR(32) UNIQUE NOT NULL,
    route_name VARCHAR(255) NOT NULL,
    origin_name VARCHAR(255) NOT NULL,
    destination_name VARCHAR(255) NOT NULL,
    direction VARCHAR(32) NOT NULL CHECK (direction IN ('NORTHBOUND', 'SOUTHBOUND', 'LOOP')),
    base_fare_php NUMERIC(10, 2) NOT NULL DEFAULT 15.00,
    per_km_fare_php NUMERIC(10, 2) NOT NULL DEFAULT 2.25,
    operating_hours VARCHAR(128) NOT NULL DEFAULT '05:00 AM - 10:00 PM',
    is_verified_cibus BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Bus Stops
CREATE TABLE bus_stops (
    id VARCHAR(64) PRIMARY KEY,
    stop_code VARCHAR(32) UNIQUE NOT NULL,
    stop_name VARCHAR(255) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    stop_type VARCHAR(64) NOT NULL CHECK (stop_type IN ('CIBUS_DESIGNATED', 'AUTHORIZED_BRT_LANE')),
    is_verified_cibus BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    landmark_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Route Stops (Ordered junction between Routes and Bus Stops per direction)
CREATE TABLE route_stops (
    id VARCHAR(64) PRIMARY KEY,
    route_id VARCHAR(64) NOT NULL REFERENCES bus_routes(id) ON DELETE CASCADE,
    stop_id VARCHAR(64) NOT NULL REFERENCES bus_stops(id) ON DELETE CASCADE,
    direction VARCHAR(32) NOT NULL CHECK (direction IN ('NORTHBOUND', 'SOUTHBOUND', 'LOOP')),
    stop_sequence INTEGER NOT NULL,
    distance_from_origin_km NUMERIC(8, 2) NOT NULL DEFAULT 0.0,
    estimated_minutes_from_origin INTEGER NOT NULL DEFAULT 0,
    UNIQUE (route_id, direction, stop_sequence),
    UNIQUE (route_id, direction, stop_id)
);

-- 5. Buses
CREATE TABLE buses (
    id VARCHAR(64) PRIMARY KEY,
    bus_code VARCHAR(32) UNIQUE NOT NULL,
    plate_number VARCHAR(32) UNIQUE NOT NULL,
    model VARCHAR(128) NOT NULL DEFAULT 'CIBUS Euro-4 Low-Entry City Bus',
    total_capacity INTEGER NOT NULL CHECK (total_capacity > 0),
    available_seats INTEGER NOT NULL CHECK (available_seats >= 0 AND available_seats <= total_capacity),
    occupied_seats INTEGER NOT NULL CHECK (occupied_seats >= 0 AND occupied_seats <= total_capacity),
    seat_source VARCHAR(64) NOT NULL DEFAULT 'UNREPORTED' CHECK (seat_source IN ('MANUAL_REPORT', 'BOARDING_CALCULATED', 'UNREPORTED')),
    last_seat_update_at TIMESTAMPTZ,
    assigned_route_id VARCHAR(64) REFERENCES bus_routes(id) ON DELETE SET NULL,
    current_direction VARCHAR(32) DEFAULT 'NORTHBOUND' CHECK (current_direction IN ('NORTHBOUND', 'SOUTHBOUND', 'LOOP')),
    operational_status VARCHAR(64) NOT NULL DEFAULT 'NOT_OPERATING' CHECK (operational_status IN ('IN_SERVICE', 'DELAYED', 'OFFLINE', 'OUT_OF_SERVICE', 'NOT_OPERATING')),
    next_stop_id VARCHAR(64) REFERENCES bus_stops(id) ON DELETE SET NULL,
    last_lat DOUBLE PRECISION,
    last_lng DOUBLE PRECISION,
    last_heading DOUBLE PRECISION,
    last_speed_kmh DOUBLE PRECISION,
    last_gps_update_at TIMESTAMPTZ,
    gps_source VARCHAR(64) DEFAULT 'NONE' CHECK (gps_source IN ('NONE', 'DEVICE_GPS', 'INSTALLED_TRACKER', 'DEMO_MODE')),
    is_demo_data BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Passenger Profiles
CREATE TABLE passenger_profiles (
    user_id VARCHAR(64) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    preferred_stop_id VARCHAR(64) REFERENCES bus_stops(id) ON DELETE SET NULL,
    discount_type VARCHAR(32) NOT NULL DEFAULT 'REGULAR' CHECK (discount_type IN ('REGULAR', 'STUDENT', 'SENIOR', 'PWD')),
    emergency_contact VARCHAR(64)
);

-- 7. Drivers
CREATE TABLE drivers (
    user_id VARCHAR(64) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    license_number VARCHAR(64) UNIQUE NOT NULL,
    assigned_bus_id VARCHAR(64) REFERENCES buses(id) ON DELETE SET NULL,
    duty_status VARCHAR(32) NOT NULL DEFAULT 'OFF_DUTY' CHECK (duty_status IN ('ON_DUTY', 'OFF_DUTY'))
);

-- 8. Conductors
CREATE TABLE conductors (
    user_id VARCHAR(64) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    employee_code VARCHAR(64) UNIQUE NOT NULL,
    assigned_bus_id VARCHAR(64) REFERENCES buses(id) ON DELETE SET NULL,
    duty_status VARCHAR(32) NOT NULL DEFAULT 'OFF_DUTY' CHECK (duty_status IN ('ON_DUTY', 'OFF_DUTY'))
);

-- 9. Trips
CREATE TABLE trips (
    id VARCHAR(64) PRIMARY KEY,
    bus_id VARCHAR(64) NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
    route_id VARCHAR(64) NOT NULL REFERENCES bus_routes(id) ON DELETE CASCADE,
    driver_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    conductor_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    direction VARCHAR(32) NOT NULL CHECK (direction IN ('NORTHBOUND', 'SOUTHBOUND', 'LOOP')),
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED', 'CANCELLED')),
    current_stop_sequence INTEGER NOT NULL DEFAULT 1,
    next_stop_id VARCHAR(64) REFERENCES bus_stops(id) ON DELETE SET NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ
);

-- 10. GPS Location History
CREATE TABLE gps_location_history (
    id VARCHAR(64) PRIMARY KEY,
    trip_id VARCHAR(64) REFERENCES trips(id) ON DELETE CASCADE,
    bus_id VARCHAR(64) NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    heading DOUBLE PRECISION,
    speed_kmh DOUBLE PRECISION,
    source VARCHAR(32) NOT NULL CHECK (source IN ('DEVICE_GPS', 'INSTALLED_TRACKER', 'DEMO_MODE')),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Seat Availability Updates
CREATE TABLE seat_availability_updates (
    id VARCHAR(64) PRIMARY KEY,
    bus_id VARCHAR(64) NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
    trip_id VARCHAR(64) REFERENCES trips(id) ON DELETE SET NULL,
    updated_by_user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    previous_available INTEGER NOT NULL,
    new_available INTEGER NOT NULL,
    occupied_seats INTEGER NOT NULL,
    update_source VARCHAR(64) NOT NULL CHECK (update_source IN ('MANUAL_REPORT', 'BOARDING_CALCULATED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Passenger Waiting Requests
CREATE TABLE passenger_waiting_requests (
    id VARCHAR(64) PRIMARY KEY,
    passenger_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    passenger_name VARCHAR(255) NOT NULL,
    route_id VARCHAR(64) NOT NULL REFERENCES bus_routes(id) ON DELETE CASCADE,
    direction VARCHAR(32) NOT NULL CHECK (direction IN ('NORTHBOUND', 'SOUTHBOUND', 'LOOP')),
    boarding_stop_id VARCHAR(64) NOT NULL REFERENCES bus_stops(id) ON DELETE CASCADE,
    destination_stop_id VARCHAR(64) NOT NULL REFERENCES bus_stops(id) ON DELETE CASCADE,
    target_bus_id VARCHAR(64) REFERENCES buses(id) ON DELETE SET NULL,
    trip_id VARCHAR(64) REFERENCES trips(id) ON DELETE SET NULL,
    passenger_count INTEGER NOT NULL DEFAULT 1 CHECK (passenger_count >= 1 AND passenger_count <= 20),
    status VARCHAR(32) NOT NULL DEFAULT 'WAITING' CHECK (status IN ('WAITING', 'BOARDED', 'CANCELLED', 'EXPIRED')),
    notes VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- 13. Boarding Records
CREATE TABLE boarding_records (
    id VARCHAR(64) PRIMARY KEY,
    trip_id VARCHAR(64) REFERENCES trips(id) ON DELETE SET NULL,
    bus_id VARCHAR(64) NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
    route_id VARCHAR(64) NOT NULL REFERENCES bus_routes(id) ON DELETE CASCADE,
    stop_id VARCHAR(64) NOT NULL REFERENCES bus_stops(id) ON DELETE CASCADE,
    confirmed_by_user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expected_passenger_count INTEGER NOT NULL DEFAULT 0,
    expected_request_count INTEGER NOT NULL DEFAULT 0,
    actual_boarded_count INTEGER NOT NULL CHECK (actual_boarded_count >= 0),
    alighted_count INTEGER NOT NULL DEFAULT 0 CHECK (alighted_count >= 0),
    resolved_request_ids JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. Fare Configurations
CREATE TABLE fare_configurations (
    id VARCHAR(64) PRIMARY KEY,
    route_id VARCHAR(64) NOT NULL REFERENCES bus_routes(id) ON DELETE CASCADE,
    from_stop_id VARCHAR(64) NOT NULL REFERENCES bus_stops(id) ON DELETE CASCADE,
    to_stop_id VARCHAR(64) NOT NULL REFERENCES bus_stops(id) ON DELETE CASCADE,
    distance_km NUMERIC(8, 2) NOT NULL,
    regular_fare_php NUMERIC(10, 2) NOT NULL,
    discounted_fare_php NUMERIC(10, 2) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (route_id, from_stop_id, to_stop_id)
);

-- 15. Payments
CREATE TABLE payments (
    id VARCHAR(64) PRIMARY KEY,
    reference_code VARCHAR(64) UNIQUE NOT NULL,
    passenger_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    passenger_name VARCHAR(255) NOT NULL,
    route_id VARCHAR(64) NOT NULL REFERENCES bus_routes(id) ON DELETE CASCADE,
    origin_stop_id VARCHAR(64) NOT NULL REFERENCES bus_stops(id) ON DELETE CASCADE,
    destination_stop_id VARCHAR(64) NOT NULL REFERENCES bus_stops(id) ON DELETE CASCADE,
    bus_id VARCHAR(64) REFERENCES buses(id) ON DELETE SET NULL,
    passenger_count INTEGER NOT NULL CHECK (passenger_count >= 1),
    unit_fare_php NUMERIC(10, 2) NOT NULL,
    amount_php NUMERIC(10, 2) NOT NULL,
    payment_method VARCHAR(32) NOT NULL CHECK (payment_method IN ('GCASH', 'MAYA', 'QR_PH', 'IN_APP_CARD', 'CASH')),
    provider_name VARCHAR(64) NOT NULL,
    provider_tx_id VARCHAR(128),
    status VARCHAR(32) NOT NULL CHECK (status IN ('PENDING', 'PAID', 'CASH_ON_BOARD_PENDING', 'FAILED', 'CANCELLED', 'REFUNDED')),
    verified_via_callback BOOLEAN NOT NULL DEFAULT FALSE,
    failure_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    verified_at TIMESTAMPTZ
);

-- 16. Digital Tickets
CREATE TABLE digital_tickets (
    id VARCHAR(64) PRIMARY KEY,
    ticket_reference VARCHAR(64) UNIQUE NOT NULL,
    payment_id VARCHAR(64) UNIQUE NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    transaction_reference VARCHAR(64) NOT NULL,
    passenger_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    passenger_name VARCHAR(255) NOT NULL,
    route_id VARCHAR(64) NOT NULL REFERENCES bus_routes(id) ON DELETE CASCADE,
    origin_stop_id VARCHAR(64) NOT NULL REFERENCES bus_stops(id) ON DELETE CASCADE,
    destination_stop_id VARCHAR(64) NOT NULL REFERENCES bus_stops(id) ON DELETE CASCADE,
    passenger_count INTEGER NOT NULL,
    fare_paid_php NUMERIC(10, 2) NOT NULL,
    payment_method VARCHAR(32) NOT NULL,
    payment_status VARCHAR(32) NOT NULL,
    qr_payload TEXT NOT NULL,
    validation_status VARCHAR(32) NOT NULL DEFAULT 'VALID' CHECK (validation_status IN ('VALID', 'VALIDATED_ON_BOARD', 'EXPIRED', 'CANCELLED', 'REFUNDED')),
    validated_by_user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    validated_bus_id VARCHAR(64) REFERENCES buses(id) ON DELETE SET NULL,
    validated_at TIMESTAMPTZ,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 17. Notifications
CREATE TABLE notifications (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    role_target VARCHAR(32),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(32) NOT NULL DEFAULT 'INFO',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

