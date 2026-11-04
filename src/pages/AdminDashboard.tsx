import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  Bus as BusIcon,
  MapPin,
  Navigation,
  Users,
  CreditCard,
  Plus,
  Download,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../context/RealtimeContext';
import { LiveMap } from '../components/LiveMap';
import { Bus, BusRoute, BusStop, PaymentRecord, User } from '../types/cibus';

interface AnalyticsPayload {
  metrics: {
    totalRegisteredPassengers: number;
    activeBuses: number;
    busesInService: number;
    totalDriversAndConductors: number;
    totalActiveRoutes: number;
    totalRegisteredBusStops: number;
    totalWaitingRequests: number;
    totalWaitingPassengers: number;
    totalSuccessfulTransactions: number;
    totalRevenuePhp: number;
  };
  buses: Bus[];
  routes: BusRoute[];
  stops: BusStop[];
  users: User[];
  payments: PaymentRecord[];
  stopDemandAnalytics: {
    stopId: string;
    stopCode: string;
    stopName: string;
    stopType: string;
    isVerifiedCibus: boolean;
    currentExpectedPassengers: number;
    totalHistoricalExpected: number;
    totalActualBoarded: number;
    requestCount: number;
  }[];
  routeDemandAnalytics: {
    routeId: string;
    routeCode: string;
    routeName: string;
    direction: string;
    expectedPassengersTotal: number;
    actualBoardedTotal: number;
    paidRevenuePhp: number;
  }[];
}

export const AdminDashboard: React.FC = () => {
  const { token } = useAuth();
  const {
    simulationSettings,
    buses: liveBuses,
    routes: liveRoutes,
    stops: liveStops,
    lastEventTimestamp,
    refreshTransitOverview,
    updateSimulationSettings,
    resetSimulation,
  } = useRealtime();

  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'SIMULATION' | 'BUSES' | 'ROUTES' | 'STOPS' | 'USERS' | 'PAYMENTS'>('OVERVIEW');
  const [previewRouteId, setPreviewRouteId] = useState<string>('');
  const [editingStopId, setEditingStopId] = useState<string | null>(null);
  const [editLat, setEditLat] = useState<string>('');
  const [editLng, setEditLng] = useState<string>('');
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Bus Form State
  const [newBusCode, setNewBusCode] = useState('');
  const [newPlateNumber, setNewPlateNumber] = useState('');
  const [newBusCapacity, setNewBusCapacity] = useState(40);
  const [newBusRouteId, setNewBusRouteId] = useState('');

  // Stop Form State
  const [newStopCode, setNewStopCode] = useState('');
  const [newStopName, setNewStopName] = useState('');
  const [newStopLat, setNewStopLat] = useState('10.3150');
  const [newStopLng, setNewStopLng] = useState('123.8950');
  const [newStopType, setNewStopType] = useState<'CIBUS_DESIGNATED' | 'AUTHORIZED_BRT_LANE'>('CIBUS_DESIGNATED');
  const [newStopVerified, setNewStopVerified] = useState(true);
  const [newStopNotes, setNewStopNotes] = useState('');

  // Route Form State
  const [newRouteCode, setNewRouteCode] = useState('');
  const [newRouteName, setNewRouteName] = useState('');
  const [newRouteOrigin, setNewRouteOrigin] = useState('');
  const [newRouteDest, setNewRouteDest] = useState('');
  const [newRouteDirection, setNewRouteDirection] = useState<'SOUTHBOUND' | 'NORTHBOUND' | 'LOOP'>('SOUTHBOUND');
  const [newRouteBaseFare, setNewRouteBaseFare] = useState(15);
  const [newRouteStopIds, setNewRouteStopIds] = useState<string[]>([]);

  // User Form State
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('+63917');
  const [newUserRole, setNewUserRole] = useState<'DRIVER' | 'CONDUCTOR' | 'PASSENGER' | 'ADMIN'>('DRIVER');
  const [newUserBusId, setNewUserBusId] = useState('');

  const canOperateWithoutToken = simulationSettings.operatingMode === 'DRY_RUN';
  const getAuthHeaders = useCallback(
    (includeJsonContentType = false): Record<string, string> => {
      const headers: Record<string, string> = {};
      if (includeJsonContentType) headers['Content-Type'] = 'application/json';
      if (token) headers.Authorization = `Bearer ${token}`;
      return headers;
    },
    [token]
  );

  const fetchAdminAnalytics = useCallback(async () => {
    if (!token && !canOperateWithoutToken) return;
    try {
      const res = await fetch('/api/admin/analytics', {
        headers: getAuthHeaders(false),
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
        if (!newBusRouteId && json.routes?.[0]) {
          setNewBusRouteId(json.routes[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load admin analytics:', err);
    }
  }, [token, canOperateWithoutToken, getAuthHeaders, newBusRouteId]);

  useEffect(() => {
    fetchAdminAnalytics();
  }, [fetchAdminAnalytics, lastEventTimestamp]);

  const handleAddBus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token && !canOperateWithoutToken) return;
    setFeedback(null);
    const res = await fetch('/api/admin/buses', {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: JSON.stringify({
        busCode: newBusCode,
        plateNumber: newPlateNumber,
        totalCapacity: newBusCapacity,
        assignedRouteId: newBusRouteId,
      }),
    });
    const resData = await res.json();
    if (res.ok) {
      setFeedback({ type: 'success', text: resData.message });
      setNewBusCode('');
      setNewPlateNumber('');
      fetchAdminAnalytics();
      refreshTransitOverview();
    } else {
      setFeedback({ type: 'error', text: resData.error || 'Failed to add bus.' });
    }
  };

  const handleUpdateBusAssignment = async (
    busId: string,
    updates: { assignedRouteId?: string; operationalStatus?: string; totalCapacity?: number }
  ) => {
    if (!token && !canOperateWithoutToken) return;
    const res = await fetch(`/api/admin/buses/${busId}`, {
      method: 'PUT',
      headers: getAuthHeaders(true),
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      fetchAdminAnalytics();
      refreshTransitOverview();
    }
  };

  const handleAddStop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token && !canOperateWithoutToken) return;
    setFeedback(null);
    const res = await fetch('/api/admin/stops', {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: JSON.stringify({
        stopCode: newStopCode,
        stopName: newStopName,
        latitude: Number(newStopLat),
        longitude: Number(newStopLng),
        stopType: newStopType,
        isVerifiedCibus: newStopVerified,
        landmarkNotes: newStopNotes,
      }),
    });
    const resData = await res.json();
    if (res.ok) {
      setFeedback({ type: 'success', text: resData.message });
      setNewStopCode('');
      setNewStopName('');
      setNewStopNotes('');
      fetchAdminAnalytics();
      refreshTransitOverview();
    } else {
      setFeedback({ type: 'error', text: resData.error || 'Failed to create stop.' });
    }
  };

  const handleToggleStopFlags = async (stop: BusStop, field: 'isVerifiedCibus' | 'isActive') => {
    if (!token && !canOperateWithoutToken) return;
    await fetch(`/api/admin/stops/${stop.id}`, {
      method: 'PUT',
      headers: getAuthHeaders(true),
      body: JSON.stringify({ [field]: !stop[field] }),
    });
    fetchAdminAnalytics();
    refreshTransitOverview();
  };

  const handleAddRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token && !canOperateWithoutToken) return;
    setFeedback(null);
    const res = await fetch('/api/admin/routes', {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: JSON.stringify({
        routeCode: newRouteCode,
        routeName: newRouteName,
        originName: newRouteOrigin,
        destinationName: newRouteDest,
        direction: newRouteDirection,
        baseFarePhp: newRouteBaseFare,
        stopIds: newRouteStopIds,
      }),
    });
    const resData = await res.json();
    if (res.ok) {
      setFeedback({ type: 'success', text: resData.message });
      setNewRouteCode('');
      setNewRouteName('');
      setNewRouteOrigin('');
      setNewRouteDest('');
      setNewRouteStopIds([]);
      fetchAdminAnalytics();
      refreshTransitOverview();
    } else {
      setFeedback({ type: 'error', text: resData.error || 'Failed to create route.' });
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token && !canOperateWithoutToken) return;
    setFeedback(null);
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: JSON.stringify({
        fullName: newUserName,
        email: newUserEmail,
        phone: newUserPhone,
        role: newUserRole,
        assignedBusId: newUserBusId || null,
      }),
    });
    const resData = await res.json();
    if (res.ok) {
      setFeedback({ type: 'success', text: resData.message });
      setNewUserName('');
      setNewUserEmail('');
      fetchAdminAnalytics();
    } else {
      setFeedback({ type: 'error', text: resData.error || 'Failed to create user.' });
    }
  };

  const handleUpdateUser = async (userId: string, updates: { status?: string; role?: string; assignedBusId?: string | null }) => {
    if (!token && !canOperateWithoutToken) return;
    await fetch(`/api/admin/users/${userId}`, {
      method: 'PUT',
      headers: getAuthHeaders(true),
      body: JSON.stringify(updates),
    });
    fetchAdminAnalytics();
    refreshTransitOverview();
  };

  const handleExportTransactionsCsv = () => {
    if (!data?.payments.length) return;
    const headers = ['Reference', 'Passenger', 'Route', 'Origin', 'Destination', 'Pax', 'Amount_PHP', 'Method', 'Status', 'Created_At'];
    const rows = data.payments.map((p) => [
      p.referenceCode,
      `"${p.passengerName}"`,
      p.routeCode || p.routeId,
      `"${p.originStopName || p.originStopId}"`,
      `"${p.destinationStopName || p.destinationStopId}"`,
      p.passengerCount,
      p.amountPhp.toFixed(2),
      p.paymentMethod,
      p.status,
      p.createdAt,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cibus-cebu-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  if (!data) {
    return (
      <div className="max-w-7xl mx-auto p-6 text-center text-[#64748B] text-sm font-semibold">
        Loading CIBUS Cebu Dispatcher & Administration Console...
      </div>
    );
  }

  const { metrics } = data;

  return (
    <div className="max-w-[1440px] mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-5">
      {/* Header */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 sm:p-5 shadow-card flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-wider text-[#268DE0]">
            CIBUS Cebu Central Dispatch & Operations
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-[#102542]">Administrator & Dispatcher Dashboard</h1>
        </div>
        <button
          onClick={fetchAdminAnalytics}
          className="px-4 py-2 rounded-xl bg-[#EAF4FF] hover:bg-[#268DE0] text-[#153E70] hover:text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh Analytics</span>
        </button>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-xl text-xs font-bold flex items-center gap-2 border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-[#159B62]'
              : 'bg-rose-50 border-rose-200 text-[#E5484D]'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-[#159B62]" />
          ) : (
            <AlertCircle className="w-4 h-4 text-[#E5484D]" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* 8 Top KPI Cards (Requirement 5) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-3.5 shadow-card">
          <div className="text-[11px] font-semibold text-[#64748B]">Passengers</div>
          <div className="text-xl font-black text-[#102542] mt-0.5">{metrics.totalRegisteredPassengers}</div>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-3.5 shadow-card">
          <div className="text-[11px] font-semibold text-[#64748B]">Active Fleet</div>
          <div className="text-xl font-black text-[#268DE0] mt-0.5">{metrics.activeBuses}</div>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-3.5 shadow-card">
          <div className="text-[11px] font-semibold text-[#64748B]">In Service</div>
          <div className="text-xl font-black text-[#159B62] mt-0.5">{metrics.busesInService}</div>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-3.5 shadow-card">
          <div className="text-[11px] font-semibold text-[#64748B]">Drivers/Cond.</div>
          <div className="text-xl font-black text-[#153E70] mt-0.5">{metrics.totalDriversAndConductors}</div>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-3.5 shadow-card">
          <div className="text-[11px] font-semibold text-[#64748B]">Active Routes</div>
          <div className="text-xl font-black text-[#0B2545] mt-0.5">{metrics.totalActiveRoutes}</div>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-3.5 shadow-card">
          <div className="text-[11px] font-semibold text-[#64748B]">CIBUS Stops</div>
          <div className="text-xl font-black text-[#268DE0] mt-0.5">{metrics.totalRegisteredBusStops}</div>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-3.5 shadow-card">
          <div className="text-[11px] font-semibold text-[#64748B]">Waiting Pax</div>
          <div className="text-xl font-black text-[#F59E0B] mt-0.5">{metrics.totalWaitingPassengers}</div>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-3.5 shadow-card">
          <div className="text-[11px] font-semibold text-[#64748B]">Paid Digital Tx</div>
          <div className="text-xl font-black text-[#159B62] mt-0.5">
            {metrics.totalSuccessfulTransactions} <span className="text-[10px] text-[#64748B]">(₱{metrics.totalRevenuePhp})</span>
          </div>
        </div>
      </div>

      {/* Module Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar border-b border-[#E2E8F0] pb-3">
        {[
          { id: 'OVERVIEW', label: 'Demand & Occupancy', icon: BarChart3 },
          { id: 'SIMULATION', label: 'Dry-Run Simulation & Map', icon: RefreshCw },
          { id: 'BUSES', label: 'Bus Fleet', icon: BusIcon },
          { id: 'ROUTES', label: 'Routes', icon: Navigation },
          { id: 'STOPS', label: 'CIBUS & BRT Stops', icon: MapPin },
          { id: 'USERS', label: 'Users & Staff', icon: Users },
          { id: 'PAYMENTS', label: 'Transactions', icon: CreditCard },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shrink-0 transition-colors ${
                activeTab === t.id
                  ? 'bg-[#153E70] text-white shadow-2xs'
                  : 'bg-white border border-[#E2E8F0] text-[#102542] hover:bg-[#EAF4FF]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* MODULE 1.B: DRY-RUN SIMULATION SETTINGS & INTERACTIVE ROUTE MAP PREVIEW */}
      {activeTab === 'SIMULATION' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5 bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-card space-y-5">
            <div>
              <h2 className="text-lg font-extrabold text-[#102542]">Dry-Run Simulation Engine Controls</h2>
              <p className="text-xs text-[#64748B] mt-1">
                Configure placeholder bus speed, stop dwell duration, active simulated fleet count, and operating mode.
              </p>
            </div>

            <div className="bg-[#F4F7FB] border border-[#E2E8F0] rounded-xl p-4 space-y-4 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-[#102542]">System Operating Mode</span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => updateSimulationSettings({ operatingMode: 'DRY_RUN' })}
                    className={`px-3 py-1.5 rounded-lg font-extrabold ${
                      simulationSettings.operatingMode === 'DRY_RUN'
                        ? 'bg-[#0B2545] text-white'
                        : 'bg-white border border-[#E2E8F0] text-[#64748B]'
                    }`}
                  >
                    Dry-Run (Demo)
                  </button>
                  <button
                    onClick={() => updateSimulationSettings({ operatingMode: 'LIVE' })}
                    className={`px-3 py-1.5 rounded-lg font-extrabold ${
                      simulationSettings.operatingMode === 'LIVE'
                        ? 'bg-[#159B62] text-white'
                        : 'bg-white border border-[#E2E8F0] text-[#64748B]'
                    }`}
                  >
                    Live Mode
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-[#102542]">Simulation Movement State</span>
                <button
                  onClick={() => updateSimulationSettings({ enabled: !simulationSettings.enabled })}
                  className={`px-4 py-1.5 rounded-lg font-extrabold ${
                    simulationSettings.enabled ? 'bg-[#268DE0] text-white' : 'bg-[#159B62] text-white'
                  }`}
                >
                  {simulationSettings.enabled ? '⏸ Pause Simulation' : '▶ Resume Simulation'}
                </button>
              </div>

              <div>
                <div className="flex justify-between font-bold text-[#102542] mb-1">
                  <span>Movement Speed Multiplier</span>
                  <span className="text-[#268DE0]">{simulationSettings.speedMultiplier}x</span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={5}
                  step={0.5}
                  value={simulationSettings.speedMultiplier}
                  onChange={(e) => updateSimulationSettings({ speedMultiplier: Number(e.target.value) })}
                  className="w-full"
                />
              </div>

              <div>
                <div className="flex justify-between font-bold text-[#102542] mb-1">
                  <span>Bus Stop Dwell Duration (Seconds)</span>
                  <span className="text-[#F59E0B]">{simulationSettings.stopDurationSeconds}s</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={25}
                  step={1}
                  value={simulationSettings.stopDurationSeconds}
                  onChange={(e) => updateSimulationSettings({ stopDurationSeconds: Number(e.target.value) })}
                  className="w-full"
                />
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-[#102542]">Simulated Placeholder Buses Active</span>
                <select
                  value={simulationSettings.busCount}
                  onChange={(e) => updateSimulationSettings({ busCount: Number(e.target.value) })}
                  className="px-3 py-1.5 rounded-lg bg-white border border-[#E2E8F0] text-[#102542] font-bold"
                >
                  <option value={1}>1 Bus (CIBUS-001)</option>
                  <option value={2}>2 Buses (CIBUS-001, CIBUS-002)</option>
                  <option value={3}>3 Buses (CIBUS-001, CIBUS-002, CIBUS-003)</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-bold text-[#102542]">Auto-Reverse Direction at Terminal</span>
                <input
                  type="checkbox"
                  checked={simulationSettings.autoReturn}
                  onChange={(e) => updateSimulationSettings({ autoReturn: e.target.checked })}
                />
              </div>

              <button
                onClick={resetSimulation}
                className="w-full py-2.5 rounded-xl bg-[#0B2545] hover:bg-[#153E70] text-white font-bold text-xs"
              >
                ↺ Reset All Simulated Buses & Sample Passenger Demand
              </button>
            </div>
          </div>

          <div className="lg:col-span-7 bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-card space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-extrabold text-[#102542]">CIBUS Corridor & Geometry Map Preview</h2>
                <p className="text-xs text-[#64748B]">
                  Preview Northbound and Southbound road-following GeoJSON segments and live simulated bus positions.
                </p>
              </div>
              <div className="flex gap-1.5">
                {liveRoutes.map((rt) => (
                  <button
                    key={rt.id}
                    onClick={() => setPreviewRouteId(rt.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold ${
                      (previewRouteId || liveRoutes[0]?.id) === rt.id
                        ? 'bg-[#1D63DC] text-white'
                        : 'bg-[#F4F7FB] text-[#64748B] border border-[#E2E8F0]'
                    }`}
                  >
                    {rt.routeCode} ({rt.direction})
                  </button>
                ))}
              </div>
            </div>

            <LiveMap
              buses={liveBuses}
              routes={liveRoutes}
              stops={liveStops}
              selectedBusId={null}
              selectedStopId={null}
              selectedRouteId={previewRouteId || liveRoutes[0]?.id || null}
              onSelectBus={() => {}}
              onSelectStop={() => {}}
            />
          </div>
        </div>
      )}

      {/* MODULE 1: DEMAND & OCCUPANCY ANALYTICS */}
      {activeTab === 'OVERVIEW' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Stop Demand Comparison Table */}
          <div className="lg:col-span-7 bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-card space-y-4">
            <h2 className="text-base sm:text-lg font-extrabold text-[#102542]">
              Passenger Demand Analytics per Stop (Expected vs. Actual Boarded)
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-[#64748B] uppercase">
                    <th className="py-2.5 px-3">Stop</th>
                    <th className="py-2.5 px-3">Classification</th>
                    <th className="py-2.5 px-3 text-right">Live Waiting</th>
                    <th className="py-2.5 px-3 text-right">Total Expected</th>
                    <th className="py-2.5 px-3 text-right">Actual Boarded</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {data.stopDemandAnalytics.map((st) => (
                    <tr key={st.stopId}>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-[#102542]">{st.stopName}</div>
                        <div className="text-[10px] font-mono text-[#64748B]">{st.stopCode}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            st.stopType === 'AUTHORIZED_BRT_LANE'
                              ? 'bg-emerald-50 text-[#159B62] border border-emerald-200'
                              : 'bg-[#EAF4FF] text-[#153E70]'
                          }`}
                        >
                          {st.stopType === 'AUTHORIZED_BRT_LANE' ? 'Authorized BRT' : 'CIBUS Stop'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-[#F59E0B]">
                        {st.currentExpectedPassengers} pax
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-[#64748B]">
                        {st.totalHistoricalExpected} pax ({st.requestCount} req)
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-[#159B62]">
                        {st.totalActualBoarded} pax
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Fleet Occupancy & Route Demand */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-card space-y-4">
              <h2 className="text-base sm:text-lg font-extrabold text-[#102542]">Bus Occupancy Overview</h2>
              <div className="space-y-3">
                {data.buses.map((b) => {
                  const pct = Math.round((b.occupiedSeats / b.totalCapacity) * 100);
                  return (
                    <div key={b.id} className="bg-[#F4F7FB] border border-[#E2E8F0] rounded-xl p-3.5 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-extrabold text-[#102542]">
                          {b.busCode} ({b.routeCode || 'Unassigned'})
                        </span>
                        <span className="text-[#64748B]">
                          Occupied: <strong className="text-[#F59E0B]">{b.occupiedSeats}</strong> / {b.totalCapacity}{' '}
                          ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[#E2E8F0] overflow-hidden">
                        <div className="h-full bg-[#159B62]" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-card space-y-3">
              <h2 className="text-base sm:text-lg font-extrabold text-[#102542]">Route Demand Summary</h2>
              {data.routeDemandAnalytics.map((r) => (
                <div key={r.routeId} className="bg-[#F4F7FB] border border-[#E2E8F0] rounded-xl p-3.5 text-xs space-y-1">
                  <div className="font-bold text-[#102542]">
                    [{r.routeCode}] {r.routeName}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[#64748B] pt-1">
                    <span>Expected: {r.expectedPassengersTotal} pax</span>
                    <span>Boarded: {r.actualBoardedTotal} pax</span>
                    <span className="text-[#159B62] font-bold">Revenue: ₱{r.paidRevenuePhp.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODULE 2: BUS FLEET MANAGEMENT */}
      {activeTab === 'BUSES' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-4 bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-card space-y-4">
            <h3 className="text-base font-extrabold text-[#102542] flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#268DE0]" />
              <span>Register New CIBUS Bus</span>
            </h3>
            <form onSubmit={handleAddBus} className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase text-[#64748B] mb-1">Bus Code</label>
                <input
                  type="text"
                  required
                  placeholder="CIBUS-004"
                  value={newBusCode}
                  onChange={(e) => setNewBusCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#F4F7FB] border border-[#E2E8F0] text-sm text-[#102542]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-[#64748B] mb-1">Plate Number</label>
                <input
                  type="text"
                  required
                  placeholder="GAW-4044"
                  value={newPlateNumber}
                  onChange={(e) => setNewPlateNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#F4F7FB] border border-[#E2E8F0] text-sm text-[#102542]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-[#64748B] mb-1">Seating Capacity</label>
                <input
                  type="number"
                  min={10}
                  max={80}
                  required
                  value={newBusCapacity}
                  onChange={(e) => setNewBusCapacity(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[#F4F7FB] border border-[#E2E8F0] text-sm text-[#102542]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-[#64748B] mb-1">Assigned Route</label>
                <select
                  value={newBusRouteId}
                  onChange={(e) => setNewBusRouteId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#F4F7FB] border border-[#E2E8F0] text-sm text-[#102542]"
                >
                  {data.routes.map((r) => (
                    <option key={r.id} value={r.id}>
                      [{r.routeCode}] {r.direction}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#268DE0] hover:bg-[#153E70] text-white font-bold text-xs"
              >
                Add Bus to CIBUS Fleet
              </button>
            </form>
          </div>

          <div className="lg:col-span-8 bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-card space-y-4">
            <h3 className="text-base font-extrabold text-[#102542]">CIBUS Fleet Configuration & Assignments</h3>
            <div className="space-y-3">
              {data.buses.map((b) => (
                <div
                  key={b.id}
                  className="bg-[#F4F7FB] border border-[#E2E8F0] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-black text-base text-[#102542]">{b.busCode}</span>
                      <span className="text-xs font-mono text-[#64748B]">({b.plateNumber})</span>
                      <span className="px-2 py-0.5 rounded bg-[#EAF4FF] text-xs font-bold text-[#153E70]">
                        {b.availableSeats}/{b.totalCapacity} seats
                      </span>
                    </div>
                    <div className="text-xs text-[#64748B]">
                      Driver: <strong className="text-[#102542]">{b.driverName || 'Unassigned'}</strong> • Conductor:{' '}
                      <strong className="text-[#102542]">{b.conductorName || 'Unassigned'}</strong>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={b.assignedRouteId || ''}
                      onChange={(e) => handleUpdateBusAssignment(b.id, { assignedRouteId: e.target.value })}
                      className="px-2.5 py-1.5 rounded-lg bg-white border border-[#E2E8F0] text-xs font-semibold text-[#102542]"
                    >
                      {data.routes.map((r) => (
                        <option key={r.id} value={r.id}>
                          Route: {r.routeCode} ({r.direction})
                        </option>
                      ))}
                    </select>

                    <select
                      value={b.operationalStatus}
                      onChange={(e) => handleUpdateBusAssignment(b.id, { operationalStatus: e.target.value })}
                      className="px-2.5 py-1.5 rounded-lg bg-white border border-[#E2E8F0] text-xs font-semibold text-[#102542]"
                    >
                      <option value="IN_SERVICE">IN SERVICE</option>
                      <option value="DELAYED">DELAYED</option>
                      <option value="OFFLINE">OFFLINE</option>
                      <option value="OUT_OF_SERVICE">OUT OF SERVICE</option>
                      <option value="NOT_OPERATING">NOT OPERATING</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODULE 3: ROUTE MANAGEMENT */}
      {activeTab === 'ROUTES' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5 bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-card space-y-4">
            <h3 className="text-base font-extrabold text-[#102542]">Create New CIBUS Route</h3>
            <form onSubmit={handleAddRoute} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold uppercase text-[#64748B] mb-1">Route Code</label>
                  <input
                    type="text"
                    required
                    placeholder="CIBUS-02-SB"
                    value={newRouteCode}
                    onChange={(e) => setNewRouteCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#F4F7FB] border border-[#E2E8F0] text-xs text-[#102542]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-[#64748B] mb-1">Direction</label>
                  <select
                    value={newRouteDirection}
                    onChange={(e) => setNewRouteDirection(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-[#F4F7FB] border border-[#E2E8F0] text-xs text-[#102542]"
                  >
                    <option value="SOUTHBOUND">SOUTHBOUND</option>
                    <option value="NORTHBOUND">NORTHBOUND</option>
                    <option value="LOOP">LOOP</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-[#64748B] mb-1">Route Name</label>
                <input
                  type="text"
                  required
                  placeholder="IT Park to SM Seaside Express"
                  value={newRouteName}
                  onChange={(e) => setNewRouteName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#F4F7FB] border border-[#E2E8F0] text-xs text-[#102542]"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold uppercase text-[#64748B] mb-1">Origin Terminal</label>
                  <input
                    type="text"
                    required
                    value={newRouteOrigin}
                    onChange={(e) => setNewRouteOrigin(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#F4F7FB] border border-[#E2E8F0] text-xs text-[#102542]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-[#64748B] mb-1">Destination Terminal</label>
                  <input
                    type="text"
                    required
                    value={newRouteDest}
                    onChange={(e) => setNewRouteDest(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#F4F7FB] border border-[#E2E8F0] text-xs text-[#102542]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-[#64748B] mb-1">
                  Select Ordered Stops ({newRouteStopIds.length} selected)
                </label>
                <div className="max-h-40 overflow-y-auto space-y-1 bg-[#F4F7FB] border border-[#E2E8F0] rounded-xl p-2">
                  {data.stops.map((st) => {
                    const idx = newRouteStopIds.indexOf(st.id);
                    return (
                      <button
                        type="button"
                        key={st.id}
                        onClick={() =>
                          setNewRouteStopIds((prev) =>
                            prev.includes(st.id) ? prev.filter((i) => i !== st.id) : [...prev, st.id]
                          )
                        }
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between ${
                          idx >= 0 ? 'bg-[#EAF4FF] text-[#153E70] font-bold' : 'text-[#64748B] hover:bg-white'
                        }`}
                      >
                        <span>{st.stopName}</span>
                        {idx >= 0 && <span className="px-1.5 py-0.2 rounded bg-[#268DE0] text-white">#{idx + 1}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#0B2545] hover:bg-[#153E70] text-white font-bold text-xs"
              >
                Save CIBUS Route Configuration
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-card space-y-4">
            <h3 className="text-base font-extrabold text-[#102542]">Configured CIBUS Cebu Routes</h3>
            <div className="space-y-4">
              {data.routes.map((rt) => (
                <div key={rt.id} className="bg-[#F4F7FB] border border-[#E2E8F0] rounded-xl p-4 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-black text-sm text-[#153E70]">
                      [{rt.routeCode}] {rt.routeName}
                    </span>
                    <span className="text-xs font-bold text-[#159B62]">
                      Base Fare: ₱{rt.baseFarePhp} (+₱{rt.perKmFarePhp}/km)
                    </span>
                  </div>
                  <div className="text-xs text-[#64748B]">
                    Direction: <strong>{rt.direction}</strong> • Hours: {rt.operatingHours}
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {(rt.stops || []).map((rs) => (
                      <span
                        key={rs.id}
                        className="px-2 py-0.5 rounded bg-white border border-[#E2E8F0] text-[11px] font-medium text-[#102542]"
                      >
                        {rs.stopSequence}. {rs.stop?.stopName.split('(')[0].trim()}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODULE 4: BUS STOP & AUTHORIZED BRT LANE MANAGEMENT */}
      {activeTab === 'STOPS' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-4 bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-card space-y-4">
            <h3 className="text-base font-extrabold text-[#102542]">Add CIBUS or Authorized BRT Stop</h3>
            <form onSubmit={handleAddStop} className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase text-[#64748B] mb-1">Stop Code</label>
                <input
                  type="text"
                  required
                  placeholder="CIBUS-STP-08"
                  value={newStopCode}
                  onChange={(e) => setNewStopCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#F4F7FB] border border-[#E2E8F0] text-xs text-[#102542]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-[#64748B] mb-1">Stop Name</label>
                <input
                  type="text"
                  required
                  placeholder="Robinsons Fuente CIBUS Curbside"
                  value={newStopName}
                  onChange={(e) => setNewStopName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#F4F7FB] border border-[#E2E8F0] text-xs text-[#102542]"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold uppercase text-[#64748B] mb-1">Latitude</label>
                  <input
                    type="text"
                    required
                    value={newStopLat}
                    onChange={(e) => setNewStopLat(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#F4F7FB] border border-[#E2E8F0] text-xs text-[#102542]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-[#64748B] mb-1">Longitude</label>
                  <input
                    type="text"
                    required
                    value={newStopLng}
                    onChange={(e) => setNewStopLng(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#F4F7FB] border border-[#E2E8F0] text-xs text-[#102542]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-[#64748B] mb-1">Stop Facility Type</label>
                <select
                  value={newStopType}
                  onChange={(e) => setNewStopType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-[#F4F7FB] border border-[#E2E8F0] text-xs text-[#102542]"
                >
                  <option value="CIBUS_DESIGNATED">CIBUS Designated Stop</option>
                  <option value="AUTHORIZED_BRT_LANE">Authorized BRT Corridor Stop</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-[#64748B] mb-1">Landmark Notes</label>
                <input
                  type="text"
                  value={newStopNotes}
                  onChange={(e) => setNewStopNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#F4F7FB] border border-[#E2E8F0] text-xs text-[#102542]"
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-[#102542] font-medium">
                <input
                  type="checkbox"
                  checked={newStopVerified}
                  onChange={(e) => setNewStopVerified(e.target.checked)}
                />
                <span>Confirmed Official / Verified for CIBUS Operations</span>
              </label>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#159B62] hover:bg-emerald-700 text-white font-bold text-xs"
              >
                Create Bus Stop
              </button>
            </form>
          </div>

          <div className="lg:col-span-8 bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-card space-y-4">
            <h3 className="text-base font-extrabold text-[#102542]">
              Registered Stops (CIBUS Designated vs. Authorized BRT Lanes)
            </h3>
            <div className="space-y-2.5">
              {data.stops.map((st) => (
                <div
                  key={st.id}
                  className="bg-[#F4F7FB] border border-[#E2E8F0] rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#268DE0]">{st.stopCode}</span>
                      <span className="font-bold text-sm text-[#102542]">{st.stopName}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                          st.verificationStatus === 'PROVISIONAL'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-emerald-50 text-[#159B62] border border-emerald-200'
                        }`}
                      >
                        {st.verificationStatus || 'VERIFIED'}
                      </span>
                    </div>
                    <div className="text-xs text-[#64748B] mt-0.5">
                      Coords: {st.latitude.toFixed(4)}, {st.longitude.toFixed(4)} • {st.landmarkNotes}
                    </div>
                    {editingStopId === st.id && (
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <input
                          type="text"
                          value={editLat}
                          onChange={(e) => setEditLat(e.target.value)}
                          placeholder="Latitude"
                          className="w-28 px-2 py-1 rounded bg-white border border-[#E2E8F0] text-xs text-[#102542]"
                        />
                        <input
                          type="text"
                          value={editLng}
                          onChange={(e) => setEditLng(e.target.value)}
                          placeholder="Longitude"
                          className="w-28 px-2 py-1 rounded bg-white border border-[#E2E8F0] text-xs text-[#102542]"
                        />
                        <button
                          onClick={async () => {
                            await fetch(`/api/admin/stops/${st.id}`, {
                              method: 'PUT',
                              headers: getAuthHeaders(true),
                              body: JSON.stringify({ latitude: Number(editLat), longitude: Number(editLng) }),
                            });
                            setEditingStopId(null);
                            fetchAdminAnalytics();
                            refreshTransitOverview();
                          }}
                          className="px-2.5 py-1 rounded bg-[#268DE0] text-white text-xs font-bold"
                        >
                          Save Coords
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        if (editingStopId === st.id) {
                          setEditingStopId(null);
                        } else {
                          setEditingStopId(st.id);
                          setEditLat(String(st.latitude));
                          setEditLng(String(st.longitude));
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white border border-[#E2E8F0] hover:bg-[#EAF4FF] text-[#153E70] text-xs font-bold"
                    >
                      Edit Coords
                    </button>
                    <button
                      onClick={async () => {
                        const nextVer = st.verificationStatus === 'PROVISIONAL' ? 'VERIFIED' : 'PROVISIONAL';
                        await fetch(`/api/admin/stops/${st.id}`, {
                          method: 'PUT',
                          headers: getAuthHeaders(true),
                          body: JSON.stringify({ verificationStatus: nextVer }),
                        });
                        fetchAdminAnalytics();
                        refreshTransitOverview();
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white border border-[#E2E8F0] hover:bg-[#EAF4FF] text-xs font-bold text-[#102542]"
                    >
                      Toggle Verified/Provisional
                    </button>
                    <button
                      onClick={() => handleToggleStopFlags(st, 'isActive')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                        st.isActive
                          ? 'bg-emerald-50 text-[#159B62] border border-emerald-200'
                          : 'bg-rose-50 text-[#E5484D] border border-rose-200'
                      }`}
                    >
                      {st.isActive ? 'Active' : 'Deactivated'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODULE 5: USER & STAFF MANAGEMENT */}
      {activeTab === 'USERS' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-4 bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-card space-y-4">
            <h3 className="text-base font-extrabold text-[#102542]">Add Driver / Conductor / Staff Account</h3>
            <form onSubmit={handleAddUser} className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase text-[#64748B] mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#F4F7FB] border border-[#E2E8F0] text-xs text-[#102542]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-[#64748B] mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#F4F7FB] border border-[#E2E8F0] text-xs text-[#102542]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-[#64748B] mb-1">Role</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-[#F4F7FB] border border-[#E2E8F0] text-xs text-[#102542]"
                >
                  <option value="DRIVER">DRIVER</option>
                  <option value="CONDUCTOR">CONDUCTOR</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="PASSENGER">PASSENGER</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-[#64748B] mb-1">Assigned Bus (Optional)</label>
                <select
                  value={newUserBusId}
                  onChange={(e) => setNewUserBusId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#F4F7FB] border border-[#E2E8F0] text-xs text-[#102542]"
                >
                  <option value="">None</option>
                  {data.buses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.busCode}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#268DE0] hover:bg-[#153E70] text-white font-bold text-xs"
              >
                Create Account (Default PW: cibus123)
              </button>
            </form>
          </div>

          <div className="lg:col-span-8 bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-card space-y-4">
            <h3 className="text-base font-extrabold text-[#102542]">Platform Accounts & Role Permissions</h3>
            <div className="space-y-2.5">
              {data.users.map((u) => (
                <div
                  key={u.id}
                  className="bg-[#F4F7FB] border border-[#E2E8F0] rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3"
                >
                  <div>
                    <div className="font-bold text-sm text-[#102542]">{u.fullName}</div>
                    <div className="text-xs text-[#64748B]">
                      {u.email} • {u.phone}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={u.role}
                      onChange={(e) => handleUpdateUser(u.id, { role: e.target.value })}
                      className="px-2 py-1 rounded-lg bg-white border border-[#E2E8F0] text-xs font-semibold text-[#102542]"
                    >
                      <option value="PASSENGER">PASSENGER</option>
                      <option value="DRIVER">DRIVER</option>
                      <option value="CONDUCTOR">CONDUCTOR</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>

                    {(u.role === 'DRIVER' || u.role === 'CONDUCTOR') && (
                      <select
                        value={u.assignedBusId || ''}
                        onChange={(e) => handleUpdateUser(u.id, { assignedBusId: e.target.value || null })}
                        className="px-2 py-1 rounded-lg bg-white border border-[#E2E8F0] text-xs font-semibold text-[#159B62]"
                      >
                        <option value="">Unassigned Bus</option>
                        {data.buses.map((b) => (
                          <option key={b.id} value={b.id}>
                            Bus: {b.busCode}
                          </option>
                        ))}
                      </select>
                    )}

                    <select
                      value={u.status}
                      onChange={(e) => handleUpdateUser(u.id, { status: e.target.value })}
                      className="px-2 py-1 rounded-lg bg-white border border-[#E2E8F0] text-xs font-semibold text-[#102542]"
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="SUSPENDED">SUSPENDED</option>
                      <option value="DEACTIVATED">DEACTIVATED</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODULE 6: PAYMENT & TRANSACTION RECORDS */}
      {activeTab === 'PAYMENTS' && (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-card space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-[#102542]">Administrative Fare Transaction Ledger</h2>
              <p className="text-xs text-[#64748B]">
                Monitor paid, pending, failed, and refunded transactions across GCash, Maya, QR Ph, In-App, and Cash.
              </p>
            </div>
            <button
              onClick={handleExportTransactionsCsv}
              disabled={data.payments.length === 0}
              className="px-4 py-2 rounded-xl bg-[#159B62] hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV Report</span>
            </button>
          </div>

          {data.payments.length === 0 ? (
            <p className="text-xs text-[#64748B] py-8 text-center">No transactions recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-[#64748B] uppercase">
                    <th className="py-2.5 px-3">Ref</th>
                    <th className="py-2.5 px-3">Passenger</th>
                    <th className="py-2.5 px-3">Route & Stops</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Method</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Callback Verified</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {data.payments.map((p) => (
                    <tr key={p.id}>
                      <td className="py-2.5 px-3 font-mono font-bold text-[#153E70]">{p.referenceCode}</td>
                      <td className="py-2.5 px-3 text-[#102542] font-semibold">{p.passengerName}</td>
                      <td className="py-2.5 px-3 text-[#64748B]">
                        [{p.routeCode}] {p.originStopName} → {p.destinationStopName} ({p.passengerCount} pax)
                      </td>
                      <td className="py-2.5 px-3 font-bold text-[#159B62]">₱{p.amountPhp.toFixed(2)}</td>
                      <td className="py-2.5 px-3 font-semibold text-[#102542]">{p.paymentMethod}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                            p.status === 'PAID'
                              ? 'bg-emerald-50 text-[#159B62] border border-emerald-200'
                              : p.status === 'PENDING' || p.status === 'CASH_ON_BOARD_PENDING'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-rose-50 text-[#E5484D] border border-rose-200'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[#64748B]">
                        {p.verifiedViaCallback ? 'Yes (Verified)' : 'No'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
