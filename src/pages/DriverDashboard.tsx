import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Play,
  Square,
  Navigation,
  Users,
  Plus,
  Minus,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Radio,
  MapPin,
  ShieldAlert,
  Bus as BusIcon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../context/RealtimeContext';
import { Bus, BusRoute, Trip, BoardingRecord } from '../types/cibus';

interface UpcomingStopDemandItem {
  stopId: string;
  stopCode: string;
  stopName: string;
  stopType: string;
  stopSequence: number;
  latitude: number;
  longitude: number;
  distanceFromOriginKm: number;
  isPassed: boolean;
  isCurrentOrNext: boolean;
  expectedPassengers: number;
  registeredRequestCount: number;
  isHighDemand: boolean;
  actualBoardedCount: number;
}

export const DriverDashboard: React.FC = () => {
  const { user, token } = useAuth();
  const { simulationSettings, buses, routes, lastEventTimestamp, refreshTransitOverview, updateSimulationSettings } =
    useRealtime();
  const isDryRun = simulationSettings.operatingMode === 'DRY_RUN';

  const [selectedBusId, setSelectedBusId] = useState<string>(user?.assignedBusId || '');
  const [bus, setBus] = useState<Bus | null>(null);
  const [route, setRoute] = useState<BusRoute | null>(null);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [upcomingStops, setUpcomingStops] = useState<UpcomingStopDemandItem[]>([]);
  const [totalExpectedRemaining, setTotalExpectedRemaining] = useState<number>(0);
  const [totalRequestsRemaining, setTotalRequestsRemaining] = useState<number>(0);
  const [recentBoardings, setRecentBoardings] = useState<BoardingRecord[]>([]);

  // Seat manual input
  const [manualSeatInput, setManualSeatInput] = useState<number>(40);

  // Boarding confirmation modal / inline state
  const [boardingStopId, setBoardingStopId] = useState<string>('');
  const [actualBoardedInput, setActualBoardedInput] = useState<number>(1);
  const [alightedInput, setAlightedInput] = useState<number>(0);

  // Ticket QR / Reference Validator
  const [ticketRefInput, setTicketRefInput] = useState<string>('');
  const [ticketValidationFeedback, setTicketValidationFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Device Geolocation Watch State
  const [gpsWatchActive, setGpsWatchActive] = useState<boolean>(false);
  const [gpsStatusMessage, setGpsStatusMessage] = useState<string>(
    'GPS sharing inactive. Click "Share Device GPS" or "Start Trip" to broadcast live coordinates.'
  );
  const [gpsError, setGpsError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // Action feedback banner
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchDriverDashboard = useCallback(async () => {
    if (!token && !isDryRun) return;
    try {
      const query = selectedBusId ? `?busId=${selectedBusId}` : '';
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(`/api/driver/dashboard${query}`, {
        headers,
      });
      if (res.ok) {
        const data = await res.json();
        setBus(data.bus);
        setRoute(data.route);
        setActiveTrip(data.activeTrip);
        setUpcomingStops(data.upcomingStops || []);
        setTotalExpectedRemaining(data.totalExpectedRemainingPassengers || 0);
        setTotalRequestsRemaining(data.totalRegisteredRequestsRemaining || 0);
        setRecentBoardings(data.recentBoardings || []);
        if (data.bus) {
          setManualSeatInput(data.bus.availableSeats);
          if (!selectedBusId) setSelectedBusId(data.bus.id);
        }
        if (data.upcomingStops?.length > 0 && !boardingStopId) {
          const nextSt =
            data.upcomingStops.find((s: UpcomingStopDemandItem) => s.isCurrentOrNext && !s.isPassed) ||
            data.upcomingStops[0];
          if (nextSt) {
            setBoardingStopId(nextSt.stopId);
            setActualBoardedInput(nextSt.expectedPassengers > 0 ? nextSt.expectedPassengers : 1);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load driver dashboard:', err);
    }
  }, [token, selectedBusId, boardingStopId]);

  useEffect(() => {
    fetchDriverDashboard();
  }, [fetchDriverDashboard, lastEventTimestamp]);

  const sendGpsCoordinate = useCallback(
    async (lat: number, lng: number, heading: number | null, speedKmh: number | null, isDemoMode = false) => {
      if (!token || !bus) return;
      try {
        const res = await fetch('/api/driver/gps', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            busId: bus.id,
            latitude: lat,
            longitude: lng,
            heading,
            speedKmh,
            source: 'DEVICE_GPS',
            isDemoMode,
          }),
        });
        if (res.ok) {
          setGpsError(null);
          setGpsStatusMessage(
            isDemoMode
              ? `Development Demo Mode checkpoint sent (${lat.toFixed(4)}, ${lng.toFixed(4)}) at ${new Date().toLocaleTimeString()}`
              : `Live Device GPS shared (${lat.toFixed(4)}, ${lng.toFixed(4)}) at ${new Date().toLocaleTimeString()}`
          );
          fetchDriverDashboard();
          refreshTransitOverview();
        }
      } catch {
        setGpsError('Connection lost while transmitting GPS coordinates.');
      }
    },
    [token, bus, fetchDriverDashboard, refreshTransitOverview]
  );

  const startDeviceGpsSharing = () => {
    setGpsError(null);
    if (!('geolocation' in navigator)) {
      setGpsError('Browser Geolocation API is not supported on this device.');
      return;
    }

    setGpsStatusMessage('Requesting device GPS permission...');
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsWatchActive(true);
        const speedKmh = pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 22;
        sendGpsCoordinate(pos.coords.latitude, pos.coords.longitude, pos.coords.heading, speedKmh, false);
      },
      (err) => {
        setGpsWatchActive(false);
        setGpsError(
          `GPS Permission / Signal Unavailable (${err.message}). Passenger map will display last known location & timestamp.`
        );
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 10000,
      }
    );
    watchIdRef.current = id;
  };

  const stopDeviceGpsSharing = () => {
    if (watchIdRef.current !== null && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setGpsWatchActive(false);
    setGpsStatusMessage('Device GPS sharing paused.');
  };

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  const buildAuthHeaders = (includeJson = true): Record<string, string> => {
    const h: Record<string, string> = {};
    if (includeJson) h['Content-Type'] = 'application/json';
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  };

  // A. Start Trip
  const handleStartTrip = async () => {
    if ((!token && !isDryRun) || !bus) return;
    setFeedback(null);
    const res = await fetch('/api/driver/trips/start', {
      method: 'POST',
      headers: buildAuthHeaders(),
      body: JSON.stringify({ busId: bus.id, routeId: bus.assignedRouteId }),
    });
    const data = await res.json();
    if (res.ok) {
      setFeedback({ type: 'success', text: data.message });
      if (isDryRun) {
        await updateSimulationSettings({ enabled: true });
      } else {
        startDeviceGpsSharing();
      }
      fetchDriverDashboard();
      refreshTransitOverview();
    } else {
      setFeedback({ type: 'error', text: data.error || 'Could not start trip.' });
    }
  };

  // B. End Trip
  const handleEndTrip = async () => {
    if ((!token && !isDryRun) || !bus) return;
    setFeedback(null);
    stopDeviceGpsSharing();
    const res = await fetch('/api/driver/trips/end', {
      method: 'POST',
      headers: buildAuthHeaders(),
      body: JSON.stringify({ busId: bus.id }),
    });
    const data = await res.json();
    if (res.ok) {
      setFeedback({ type: 'success', text: data.message });
      fetchDriverDashboard();
      refreshTransitOverview();
    } else {
      setFeedback({ type: 'error', text: data.error || 'Could not end trip.' });
    }
  };

  // C. Update Available Seats Manually
  const handleUpdateSeats = async (targetSeats: number) => {
    if ((!token && !isDryRun) || !bus) return;
    const clamped = Math.max(0, Math.min(bus.totalCapacity, targetSeats));
    setManualSeatInput(clamped);

    const res = await fetch('/api/driver/seats', {
      method: 'POST',
      headers: buildAuthHeaders(),
      body: JSON.stringify({ busId: bus.id, availableSeats: clamped }),
    });
    const data = await res.json();
    if (res.ok) {
      setFeedback({ type: 'success', text: data.message });
      fetchDriverDashboard();
      refreshTransitOverview();
    } else {
      setFeedback({ type: 'error', text: data.error || 'Failed to update seats.' });
    }
  };

  // D. Confirm Actual Boarding at Stop
  const handleConfirmBoarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!token && !isDryRun) || !bus || !boardingStopId) return;
    setFeedback(null);

    const res = await fetch('/api/driver/boarding/confirm', {
      method: 'POST',
      headers: buildAuthHeaders(),
      body: JSON.stringify({
        busId: bus.id,
        stopId: boardingStopId,
        actualBoardedCount: actualBoardedInput,
        alightedCount: alightedInput,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setFeedback({ type: 'success', text: data.message });
      setAlightedInput(0);
      fetchDriverDashboard();
      refreshTransitOverview();
    } else {
      setFeedback({ type: 'error', text: data.error || 'Boarding confirmation failed.' });
    }
  };

  // Ticket QR Validation
  const handleValidateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!token && !isDryRun) || !ticketRefInput.trim()) return;
    setTicketValidationFeedback(null);

    const res = await fetch('/api/driver/tickets/validate', {
      method: 'POST',
      headers: buildAuthHeaders(),
      body: JSON.stringify({
        ticketReferenceOrQr: ticketRefInput.trim(),
        busId: bus?.id,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setTicketValidationFeedback({ type: 'success', text: data.message });
      setTicketRefInput('');
    } else {
      setTicketValidationFeedback({ type: 'error', text: data.error || 'Invalid ticket.' });
    }
  };

  if (!bus) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-8 text-center space-y-3 shadow-card">
          <AlertTriangle className="w-10 h-10 text-[#F59E0B] mx-auto" />
          <h2 className="text-xl font-bold text-[#102542]">No Assigned CIBUS Bus Found</h2>
          <p className="text-xs text-[#64748B]">
            Please ask a CIBUS Administrator / Dispatcher to assign a bus to your Driver or Conductor account.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-5">
      {/* Safety Banner & Bus Selector */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-[#F59E0B] shrink-0" />
          <span>
            <strong>Vehicle Safety Notice:</strong> Operate controls only when the bus is safely stopped at a designated
            CIBUS stop or by the assigned conductor.
          </span>
        </div>
        {(user?.role === 'ADMIN' || isDryRun) && (
          <select
            value={selectedBusId}
            onChange={(e) => setSelectedBusId(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-white border border-amber-300 text-[#102542] text-xs font-bold shrink-0"
          >
            {buses.map((b) => (
              <option key={b.id} value={b.id}>
                Control Bus: {b.busCode} ({b.currentDirection})
              </option>
            ))}
          </select>
        )}
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-[#159B62]'
              : 'bg-rose-50 border-rose-200 text-[#E5484D]'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Top Overview Metrics Card (Mobile-First Large Touch Targets) */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 sm:p-6 shadow-card space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-lg bg-[#0B2545] text-white font-extrabold text-sm">
                {bus.busCode}
              </span>
              <span className="text-xs font-mono text-[#64748B]">Plate: {bus.plateNumber}</span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase ${
                  bus.operationalStatus === 'IN_SERVICE'
                    ? 'bg-[#159B62] text-white'
                    : bus.operationalStatus === 'DELAYED'
                    ? 'bg-[#F59E0B] text-white'
                    : 'bg-slate-200 text-[#64748B]'
                }`}
              >
                {bus.operationalStatus.replace(/_/g, ' ')}
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-black text-[#102542] mt-1.5">
              {route ? `[${route.routeCode}] ${route.routeName}` : 'No Assigned Route'}
            </h1>
            <p className="text-xs text-[#64748B] mt-0.5">
              Direction: <strong className="text-[#268DE0]">{bus.currentDirection}</strong> • Next Upcoming Stop:{' '}
              <strong className="text-[#159B62]">{bus.nextStopName || 'Terminal'}</strong>
            </p>
          </div>

          {/* Large Touch-Friendly Start Trip / End Trip Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleStartTrip}
              disabled={bus.operationalStatus === 'IN_SERVICE' && Boolean(activeTrip)}
              className="flex-1 sm:flex-initial px-5 py-3 rounded-xl bg-[#159B62] hover:bg-emerald-700 disabled:opacity-40 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-colors"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Start Trip</span>
            </button>

            <button
              onClick={handleEndTrip}
              disabled={bus.operationalStatus === 'OUT_OF_SERVICE' || bus.operationalStatus === 'NOT_OPERATING'}
              className="flex-1 sm:flex-initial px-5 py-3 rounded-xl bg-[#E5484D] hover:bg-rose-700 disabled:opacity-40 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-colors"
            >
              <Square className="w-4 h-4 fill-current" />
              <span>End Trip</span>
            </button>
          </div>
        </div>

        {/* 4 Key Live Operational Counters */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-[#F4F7FB] border border-[#E2E8F0] rounded-xl p-3.5 sm:p-4">
            <div className="text-xs text-[#64748B] font-semibold">Available Seats</div>
            <div className="text-2xl sm:text-3xl font-black text-[#159B62] mt-0.5">
              {bus.availableSeats} <span className="text-xs font-normal text-[#64748B]">/ {bus.totalCapacity}</span>
            </div>
          </div>

          <div className="bg-[#F4F7FB] border border-[#E2E8F0] rounded-xl p-3.5 sm:p-4">
            <div className="text-xs text-[#64748B] font-semibold">Occupied Seats</div>
            <div className="text-2xl sm:text-3xl font-black text-[#F59E0B] mt-0.5">{bus.occupiedSeats}</div>
          </div>

          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 sm:p-4">
            <div className="text-xs text-amber-800 font-semibold">Expected Waiting Ahead</div>
            <div className="text-2xl sm:text-3xl font-black text-[#F59E0B] mt-0.5">
              {totalExpectedRemaining} <span className="text-xs font-normal text-[#64748B]">pax</span>
            </div>
            <div className="text-[11px] text-[#64748B]">{totalRequestsRemaining} registered request(s)</div>
          </div>

          <div className="bg-[#F4F7FB] border border-[#E2E8F0] rounded-xl p-3.5 sm:p-4">
            <div className="text-xs text-[#64748B] font-semibold">GPS Location Status</div>
            <div className="text-sm font-extrabold text-[#268DE0] mt-1 flex items-center gap-1.5">
              <Radio className={`w-4 h-4 ${gpsWatchActive ? 'animate-pulse text-[#159B62]' : 'text-[#268DE0]'}`} />
              <span>{gpsWatchActive ? 'Sharing Live GPS' : bus.lastGpsUpdateAt ? 'Active / Synced' : 'No Signal'}</span>
            </div>
            <div className="text-[11px] text-[#64748B] mt-0.5">
              {bus.lastGpsUpdateAt ? new Date(bus.lastGpsUpdateAt).toLocaleTimeString() : 'Not yet transmitted'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Two-Column Driver/Conductor Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Live Passenger Demand Monitor Table & Boarding Confirmation (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* D. Passenger Demand Monitor Table */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 sm:p-6 shadow-card space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-[#102542] flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#268DE0]" />
                  <span>Upcoming Stops — Live Passenger Demand</span>
                </h2>
                <p className="text-xs text-[#64748B]">
                  Real-time waiting counts submitted by passengers for{' '}
                  <strong className="text-[#153E70]">{route?.routeCode}</strong> ({bus.currentDirection}).
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-extrabold">
                Remaining: {totalExpectedRemaining} Pax ({totalRequestsRemaining} Req)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-[#64748B] text-[11px] uppercase">
                    <th className="py-2.5 px-2.5">#</th>
                    <th className="py-2.5 px-2.5">Upcoming Bus Stop</th>
                    <th className="py-2.5 px-2.5 text-right">Requests</th>
                    <th className="py-2.5 px-2.5 text-right">Waiting</th>
                    <th className="py-2.5 px-2.5 text-right">Boarded</th>
                    <th className="py-2.5 px-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {upcomingStops.map((st) => (
                    <tr
                      key={st.stopId}
                      className={`${
                        st.isHighDemand
                          ? 'bg-rose-50/70'
                          : st.expectedPassengers > 0
                          ? 'bg-amber-50/50'
                          : ''
                      } ${st.isPassed ? 'opacity-50' : ''}`}
                    >
                      <td className="py-2.5 px-2.5 font-mono font-bold text-[#64748B]">{st.stopSequence}</td>
                      <td className="py-2.5 px-2.5">
                        <div className="font-bold text-[#102542] flex flex-wrap items-center gap-1.5">
                          <span>{st.stopName}</span>
                          {st.isCurrentOrNext && !st.isPassed && (
                            <span className="px-2 py-0.5 rounded bg-[#EAF4FF] text-[#268DE0] text-[10px] font-extrabold uppercase">
                              NEXT STOP
                            </span>
                          )}
                          {st.isHighDemand && (
                            <span className="px-2 py-0.5 rounded bg-[#E5484D] text-white text-[10px] font-extrabold uppercase">
                              HIGH DEMAND
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#64748B]">{st.stopCode}</div>
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-semibold text-[#64748B]">
                        {st.registeredRequestCount} req
                      </td>
                      <td className="py-2.5 px-2.5 text-right">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-lg font-extrabold text-xs ${
                            st.expectedPassengers >= 8
                              ? 'bg-[#E5484D] text-white'
                              : st.expectedPassengers > 0
                              ? 'bg-[#F59E0B] text-white'
                              : 'bg-[#F4F7FB] text-[#64748B]'
                          }`}
                        >
                          {st.expectedPassengers}
                        </span>
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-extrabold text-[#159B62]">
                        {st.actualBoardedCount}
                      </td>
                      <td className="py-2.5 px-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setBoardingStopId(st.stopId);
                            setActualBoardedInput(st.expectedPassengers > 0 ? st.expectedPassengers : 1);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[#EAF4FF] hover:bg-[#268DE0] text-[#153E70] hover:text-white text-xs font-bold transition-colors"
                        >
                          Select
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Boarding Confirmation Form */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 sm:p-6 shadow-card space-y-4">
            <h3 className="text-base font-extrabold text-[#102542]">
              Confirm Actual Passenger Boarding & Alighting at Stop
            </h3>
            <p className="text-xs text-[#64748B]">
              Separates expected waiting estimates from confirmed boardings, resolves waiting requests at the selected
              stop, and automatically recalculates remaining available seats.
            </p>

            <form onSubmit={handleConfirmBoarding} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-[#64748B] mb-1">Current Stop Reached</label>
                <select
                  value={boardingStopId}
                  onChange={(e) => {
                    setBoardingStopId(e.target.value);
                    const found = upcomingStops.find((u) => u.stopId === e.target.value);
                    if (found) {
                      setActualBoardedInput(found.expectedPassengers);
                    }
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F4F7FB] border border-[#E2E8F0] text-sm font-bold text-[#102542]"
                >
                  {upcomingStops.map((st) => (
                    <option key={st.stopId} value={st.stopId}>
                      #{st.stopSequence} {st.stopName} (Expected Waiting: {st.expectedPassengers} pax)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="bg-[#F4F7FB] border border-[#E2E8F0] rounded-xl p-3.5">
                  <div className="text-xs font-bold text-[#159B62] uppercase mb-2">
                    Actual Passengers Boarded (+)
                  </div>
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setActualBoardedInput((v) => Math.max(0, v - 1))}
                      className="w-10 h-10 rounded-xl bg-white border border-[#E2E8F0] text-[#102542] flex items-center justify-center font-bold"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      min={0}
                      max={bus.totalCapacity}
                      value={actualBoardedInput}
                      onChange={(e) => setActualBoardedInput(Math.max(0, Number(e.target.value)))}
                      className="w-16 text-center bg-transparent text-2xl font-black text-[#102542] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setActualBoardedInput((v) => Math.min(bus.totalCapacity, v + 1))}
                      className="w-10 h-10 rounded-xl bg-[#159B62] text-white flex items-center justify-center font-bold"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="bg-[#F4F7FB] border border-[#E2E8F0] rounded-xl p-3.5">
                  <div className="text-xs font-bold text-[#268DE0] uppercase mb-2">Passengers Alighted (-)</div>
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setAlightedInput((v) => Math.max(0, v - 1))}
                      className="w-10 h-10 rounded-xl bg-white border border-[#E2E8F0] text-[#102542] flex items-center justify-center font-bold"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      min={0}
                      max={bus.totalCapacity}
                      value={alightedInput}
                      onChange={(e) => setAlightedInput(Math.max(0, Number(e.target.value)))}
                      className="w-16 text-center bg-transparent text-2xl font-black text-[#102542] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setAlightedInput((v) => Math.min(bus.totalCapacity, v + 1))}
                      className="w-10 h-10 rounded-xl bg-[#268DE0] text-white flex items-center justify-center font-bold"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-[#0B2545] hover:bg-[#153E70] text-white font-extrabold text-sm shadow-sm transition-colors"
              >
                ✓ Confirm Boarding at Stop & Update Seat Availability
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Manual Seat Control, GPS Controls & Ticket QR Validator (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* C. Update Available Seats Control */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 sm:p-6 shadow-card space-y-4">
            <div>
              <h3 className="text-base font-extrabold text-[#102542]">Manual Seat Availability Control</h3>
              <p className="text-xs text-[#64748B]">
                Directly adjust remaining seats (Capacity: 0 to {bus.totalCapacity} seats). Synchronizes immediately
                with passenger maps.
              </p>
            </div>

            <div className="bg-[#F4F7FB] border border-[#E2E8F0] rounded-2xl p-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleUpdateSeats(bus.availableSeats - 1)}
                disabled={bus.availableSeats <= 0}
                className="w-12 h-12 rounded-xl bg-white border border-[#E2E8F0] hover:bg-slate-100 disabled:opacity-40 text-[#102542] flex items-center justify-center shadow-2xs"
              >
                <Minus className="w-5 h-5" />
              </button>

              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-black text-[#159B62]">{bus.availableSeats}</div>
                <div className="text-[11px] text-[#64748B] font-bold uppercase">
                  Available ({bus.occupiedSeats} Occupied)
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleUpdateSeats(bus.availableSeats + 1)}
                disabled={bus.availableSeats >= bus.totalCapacity}
                className="w-12 h-12 rounded-xl bg-[#159B62] hover:bg-emerald-700 disabled:opacity-40 text-white flex items-center justify-center shadow-2xs"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Adjustment Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handleUpdateSeats(bus.availableSeats - 5)}
                className="py-2 rounded-xl bg-[#F4F7FB] hover:bg-rose-50 border border-[#E2E8F0] text-xs font-extrabold text-[#E5484D]"
              >
                -5 Seats
              </button>
              <button
                type="button"
                onClick={() => handleUpdateSeats(bus.availableSeats + 5)}
                className="py-2 rounded-xl bg-[#F4F7FB] hover:bg-emerald-50 border border-[#E2E8F0] text-xs font-extrabold text-[#159B62]"
              >
                +5 Seats
              </button>
              <button
                type="button"
                onClick={() => handleUpdateSeats(0)}
                className="py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-xs font-extrabold text-[#E5484D] border border-rose-200"
              >
                Mark Full (0)
              </button>
              <button
                type="button"
                onClick={() => handleUpdateSeats(bus.totalCapacity)}
                className="py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-xs font-extrabold text-[#159B62] border border-emerald-200"
              >
                Reset ({bus.totalCapacity})
              </button>
            </div>

            {/* Direct Numeric Input */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="number"
                min={0}
                max={bus.totalCapacity}
                value={manualSeatInput}
                onChange={(e) => setManualSeatInput(Number(e.target.value))}
                className="flex-1 px-3.5 py-2 rounded-xl bg-[#F4F7FB] border border-[#E2E8F0] text-sm font-bold text-[#102542]"
              />
              <button
                type="button"
                onClick={() => handleUpdateSeats(manualSeatInput)}
                className="px-4 py-2 rounded-xl bg-[#268DE0] hover:bg-[#153E70] text-white font-bold text-xs"
              >
                Set Exact Seats
              </button>
            </div>
          </div>

          {/* E. GPS Location Controls */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 sm:p-6 shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-[#102542] flex items-center gap-2">
                <Navigation className="w-5 h-5 text-[#268DE0]" />
                <span>GPS Location Sharing Controls</span>
              </h3>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                  gpsWatchActive ? 'bg-emerald-50 text-[#159B62] border border-emerald-200' : 'bg-[#F4F7FB] text-[#64748B]'
                }`}
              >
                {gpsWatchActive ? 'LIVE GPS ON' : 'GPS STANDBY'}
              </span>
            </div>

            <p className="text-xs text-[#102542] bg-[#F4F7FB] border border-[#E2E8F0] rounded-xl p-3">
              {gpsStatusMessage}
            </p>

            {gpsError && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                {gpsError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={startDeviceGpsSharing}
                className="py-2.5 px-3 rounded-xl bg-[#268DE0] hover:bg-[#153E70] text-white font-bold text-xs flex items-center justify-center gap-1.5"
              >
                <Radio className="w-4 h-4" />
                <span>Share Device GPS</span>
              </button>
              <button
                type="button"
                onClick={stopDeviceGpsSharing}
                className="py-2.5 px-3 rounded-xl bg-[#F4F7FB] hover:bg-slate-200 border border-[#E2E8F0] text-[#102542] font-bold text-xs"
              >
                Pause GPS Sharing
              </button>
            </div>

            {/* Clearly Labeled Development/Demo Mode Stop Check-In Helper */}
            <div className="pt-3 border-t border-[#E2E8F0] space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[11px] font-bold uppercase text-[#153E70]">
                  Dry-Run Simulated GPS & Corridor Controls
                </div>
                {isDryRun && (
                  <button
                    type="button"
                    onClick={() => updateSimulationSettings({ enabled: !simulationSettings.enabled })}
                    className={`px-2.5 py-1 rounded-lg text-xs font-extrabold ${
                      simulationSettings.enabled ? 'bg-[#F59E0B] text-white' : 'bg-[#159B62] text-white'
                    }`}
                  >
                    {simulationSettings.enabled ? '⏸ Pause Sim' : '▶ Resume Sim'}
                  </button>
                )}
              </div>
              <p className="text-[11px] text-[#64748B]">
                Current Position:{' '}
                <strong className="font-mono text-[#102542]">
                  {bus.lastLat?.toFixed(4)}, {bus.lastLng?.toFixed(4)}
                </strong>{' '}
                ({bus.simulationStatus || 'ACTIVE'}). Jump bus to a corridor stop:
              </p>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                {upcomingStops.map((st) => (
                  <button
                    key={st.stopId}
                    type="button"
                    onClick={async () => {
                      await fetch('/api/simulation/bus-control', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ busId: bus.id, stopId: st.stopId }),
                      });
                      fetchDriverDashboard();
                      refreshTransitOverview();
                    }}
                    className="px-2.5 py-1 rounded-lg bg-[#EAF4FF] hover:bg-[#268DE0] text-[#153E70] hover:text-white text-[11px] font-semibold transition-colors"
                  >
                    📍 {st.stopName.split('(')[0].trim()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Conductor Digital Ticket QR Validator */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 sm:p-6 shadow-card space-y-3">
            <h3 className="text-base font-extrabold text-[#102542] flex items-center gap-2">
              <QrCode className="w-5 h-5 text-[#159B62]" />
              <span>Conductor Ticket Validation</span>
            </h3>
            <p className="text-xs text-[#64748B]">
              Enter or scan a passenger's Digital Ticket Reference (e.g.{' '}
              <code className="text-[#153E70] font-bold">CIBUS-TKT-GC8801</code>) to verify payment and confirm
              boarding.
            </p>

            {ticketValidationFeedback && (
              <div
                className={`p-3 rounded-xl text-xs font-bold border ${
                  ticketValidationFeedback.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-[#159B62]'
                    : 'bg-rose-50 border-rose-200 text-[#E5484D]'
                }`}
              >
                {ticketValidationFeedback.text}
              </div>
            )}

            <form onSubmit={handleValidateTicket} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="text"
                placeholder="CIBUS-TKT-GC8801"
                value={ticketRefInput}
                onChange={(e) => setTicketRefInput(e.target.value)}
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#F4F7FB] border border-[#E2E8F0] text-sm font-mono text-[#102542]"
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-[#159B62] hover:bg-emerald-700 text-white font-bold text-xs shrink-0"
              >
                Validate Ticket
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
