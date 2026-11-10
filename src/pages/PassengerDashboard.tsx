import React, { useState, useEffect, useCallback } from 'react';
import {
  Bus as BusIcon,
  MapPin,
  Users,
  CreditCard,
  Ticket,
  AlertCircle,
  CheckCircle2,
  Plus,
  Minus,
  Trash2,
  Navigation,
  Map as MapIcon,
  Armchair,
  GitFork,
  ClipboardList,
  Bell,
  ShieldCheck,
  Clock,
  User as UserIcon,
} from 'lucide-react';
import { useRealtime } from '../context/RealtimeContext';
import { useAuth } from '../context/AuthContext';
import { LiveMap } from '../components/LiveMap';
import { WaitingRequestModal } from '../components/WaitingRequestModal';
import { DigitalTicketCard } from '../components/DigitalTicketCard';
import { PassengerSection } from '../components/Sidebar';
import {
  Bus,
  DigitalTicket,
  PassengerWaitingRequest,
  PaymentMethodType,
  PaymentProviderConfigStatus,
  PaymentRecord,
} from '../types/cibus';

interface PassengerDashboardProps {
  activeSection: PassengerSection;
  onChangeSection: (section: PassengerSection) => void;
  onRequireAuth: () => void;
  externalWaitingModalTrigger?: number;
  onTicketCountChange?: (count: number) => void;
  onWaitingCountChange?: (count: number) => void;
}

export const PassengerDashboard: React.FC<PassengerDashboardProps> = ({
  activeSection,
  onChangeSection,
  onRequireAuth,
  externalWaitingModalTrigger = 0,
  onTicketCountChange,
  onWaitingCountChange,
}) => {
  const { simulationSettings, buses, routes, stops, lastEventTimestamp, refreshTransitOverview } = useRealtime();
  const { user, token, refreshUser } = useAuth();
  const isDryRun = simulationSettings.operatingMode === 'DRY_RUN';

  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [selectedBusId, setSelectedBusId] = useState<string | null>(null);
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);

  // Waiting Modal State
  const [waitingModalOpen, setWaitingModalOpen] = useState(false);
  const [modalInitialStopId, setModalInitialStopId] = useState<string | undefined>(undefined);
  const [modalTargetBusId, setModalTargetBusId] = useState<string | null>(null);
  const [myWaitingRequests, setMyWaitingRequests] = useState<PassengerWaitingRequest[]>([]);

  // Payment & Tickets State
  const [providerConfig, setProviderConfig] = useState<PaymentProviderConfigStatus | null>(null);
  const [payRouteId, setPayRouteId] = useState<string>('');
  const [payOriginStopId, setPayOriginStopId] = useState<string>('');
  const [payDestStopId, setPayDestStopId] = useState<string>('');
  const [payPassengerCount, setPayPassengerCount] = useState<number>(1);
  const [payMethod, setPayMethod] = useState<PaymentMethodType>('GCASH');
  const [fareQuote, setFareQuote] = useState<{
    unitFarePhp: number;
    totalFarePhp: number;
    distanceKm: number;
    discountApplied: string;
  } | null>(null);
  const [myPayments, setMyPayments] = useState<PaymentRecord[]>([]);
  const [myTickets, setMyTickets] = useState<DigitalTicket[]>([]);
  const [paymentFeedback, setPaymentFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [autoVerifyMockPaymongo, setAutoVerifyMockPaymongo] = useState<boolean>(true);

  // Profile State
  const [profileName, setProfileName] = useState(user?.fullName || '');
  const [profilePhone, setProfilePhone] = useState(user?.phone || '');
  const [profileDiscount, setProfileDiscount] = useState<'REGULAR' | 'STUDENT' | 'SENIOR' | 'PWD'>(
    user?.discountType || 'REGULAR'
  );
  const [profileSavedMsg, setProfileSavedMsg] = useState<string | null>(null);

  // Default to Northbound route if available (matches screenshot CIBUS-01-NB active first)
  useEffect(() => {
    if (routes.length > 0 && !selectedRouteId) {
      const nbRoute = routes.find((r) => r.direction === 'NORTHBOUND') || routes[0];
      setSelectedRouteId(nbRoute.id);
      setPayRouteId(nbRoute.id);
    }
  }, [routes, selectedRouteId]);

  // Open waiting modal when triggered from TopBar
  useEffect(() => {
    if (externalWaitingModalTrigger > 0) {
      setModalInitialStopId(selectedStopId || undefined);
      setModalTargetBusId(selectedBusId);
      setWaitingModalOpen(true);
    }
  }, [externalWaitingModalTrigger]);

  const payRoute = routes.find((r) => r.id === payRouteId) || routes[0];
  const payOrderedStops = [...(payRoute?.stops || [])].sort((a, b) => a.stopSequence - b.stopSequence);

  useEffect(() => {
    if (payOrderedStops.length >= 2) {
      if (!payOrderedStops.some((rs) => rs.stopId === payOriginStopId)) {
        setPayOriginStopId(payOrderedStops[0].stopId);
      }
      const originSeq = payOrderedStops.find((rs) => rs.stopId === payOriginStopId)?.stopSequence || 1;
      const validDests = payOrderedStops.filter((rs) => rs.stopSequence > originSeq);
      if (validDests.length > 0 && !validDests.some((rs) => rs.stopId === payDestStopId)) {
        setPayDestStopId(validDests[validDests.length - 1].stopId);
      }
    }
  }, [payRouteId, payOriginStopId, payOrderedStops.length]);

  const fetchMyPassengerData = useCallback(async () => {
    try {
      const cfgRes = await fetch('/api/payments/config');
      if (cfgRes.ok) {
        setProviderConfig(await cfgRes.json());
      }
    } catch {
      // ignore
    }

    try {
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;

      const wRes = await fetch('/api/waiting/my', { headers });
      if (wRes.ok) {
        const wData = await wRes.json();
        const reqs: PassengerWaitingRequest[] = wData.requests || [];
        setMyWaitingRequests(reqs);
        onWaitingCountChange?.(reqs.filter((r) => r.status === 'WAITING').length);
      }

      const pRes = await fetch('/api/payments/my', { headers });
      if (pRes.ok) {
        const pData = await pRes.json();
        setMyPayments(pData.payments || []);
        const tkts: DigitalTicket[] = pData.tickets || [];
        setMyTickets(tkts);
        onTicketCountChange?.(tkts.length);
      }
    } catch (err) {
      console.error('Error fetching passenger records:', err);
    }
  }, [token, onTicketCountChange, onWaitingCountChange]);

  useEffect(() => {
    fetchMyPassengerData();
  }, [fetchMyPassengerData, lastEventTimestamp]);

  // Fetch fare quote whenever route/origin/dest/count changes
  useEffect(() => {
    if (!payRouteId || !payOriginStopId || !payDestStopId) return;
    const discount = user?.discountType || 'REGULAR';
    fetch(
      `/api/payments/fare-quote?routeId=${payRouteId}&originStopId=${payOriginStopId}&destinationStopId=${payDestStopId}&passengerCount=${payPassengerCount}&discountType=${discount}`
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setFareQuote(data);
      })
      .catch(() => {});
  }, [payRouteId, payOriginStopId, payDestStopId, payPassengerCount, user?.discountType]);

  const handleOpenWaitingModal = (stopId?: string, busId?: string | null) => {
    if (!user && !isDryRun) {
      onRequireAuth();
      return;
    }
    setModalInitialStopId(stopId || selectedStopId || undefined);
    setModalTargetBusId(busId !== undefined ? busId : selectedBusId);
    setWaitingModalOpen(true);
  };

  const handleUpdateWaitingCount = async (reqId: string, newCount: number) => {
    if ((!token && !isDryRun) || newCount < 1 || newCount > 20) return;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    await fetch(`/api/waiting/${reqId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ passengerCount: newCount }),
    });
    fetchMyPassengerData();
    refreshTransitOverview();
  };

  const handleCancelWaiting = async (reqId: string) => {
    if (!token && !isDryRun) return;
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    await fetch(`/api/waiting/${reqId}`, {
      method: 'DELETE',
      headers,
    });
    fetchMyPassengerData();
    refreshTransitOverview();
  };

  const handleInitiatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentFeedback(null);
    if (!token && !isDryRun) {
      onRequireAuth();
      return;
    }

    setSubmittingPayment(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch('/api/payments/initiate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          routeId: payRouteId,
          originStopId: payOriginStopId,
          destinationStopId: payDestStopId,
          busId: selectedBusId,
          passengerCount: payPassengerCount,
          paymentMethod: payMethod,
          autoVerifyMockCallback: autoVerifyMockPaymongo,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPaymentFeedback({ type: 'error', text: data.error || 'Payment initiation failed.' });
      } else {
        setPaymentFeedback({ type: 'success', text: data.message });
        fetchMyPassengerData();
        if (payMethod === 'CASH' || autoVerifyMockPaymongo) {
          onChangeSection('TICKETS_HISTORY');
        }
      }
    } catch {
      setPaymentFeedback({ type: 'error', text: 'Network error initiating payment.' });
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleWebhookVerifySimulation = async (
    paymentId: string,
    outcome: 'PAID' | 'FAILED' | 'CANCELLED' | 'REFUNDED'
  ) => {
    if (!token && !isDryRun) return;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch('/api/payments/webhook-verify', {
      method: 'POST',
      headers,
      body: JSON.stringify({ paymentId, outcome }),
    });
    const data = await res.json();
    if (res.ok) {
      setPaymentFeedback({ type: 'success', text: data.message });
      fetchMyPassengerData();
      if (outcome === 'PAID') {
        onChangeSection('TICKETS_HISTORY');
      }
    } else {
      setPaymentFeedback({ type: 'error', text: data.error || 'Verification error' });
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    const res = await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        fullName: profileName,
        phone: profilePhone,
        discountType: profileDiscount,
      }),
    });
    if (res.ok) {
      await refreshUser();
      setProfileSavedMsg('Passenger profile updated successfully.');
      setTimeout(() => setProfileSavedMsg(null), 3000);
    }
  };

  // Sort routes so Northbound (CIBUS-01-NB) appears first and Southbound (CIBUS-01-SB) second, matching screenshot
  const sortedRoutes = [...routes].sort((a, b) => {
    if (a.direction === 'NORTHBOUND' && b.direction !== 'NORTHBOUND') return -1;
    if (a.direction !== 'NORTHBOUND' && b.direction === 'NORTHBOUND') return 1;
    return a.routeCode.localeCompare(b.routeCode);
  });

  const activeRouteObj = routes.find((r) => r.id === selectedRouteId) || sortedRoutes[0];
  const activeRouteOrderedStops = [...(activeRouteObj?.stops || [])].sort(
    (a, b) => a.stopSequence - b.stopSequence
  );
  const inServiceBusesCount = buses.filter(
    (b) => b.operationalStatus === 'IN_SERVICE' || b.operationalStatus === 'DELAYED'
  ).length;
  const activeWaitingCount = myWaitingRequests.filter((r) => r.status === 'WAITING').length;

  const getCorridorSummaryString = (bus: Bus) => {
    if (bus.currentDirection === 'SOUTHBOUND') {
      return 'IT Park → N. Escario → Fuente Osmeña → Downtown → Il Corso (SRP)';
    }
    return 'Il Corso (SRP) → Downtown → Fuente Osmeña → N. Escario → IT Park';
  };

  const renderFleetCard = (bus: Bus) => {
    const occupancyRatio = bus.totalCapacity > 0 ? bus.occupiedSeats / bus.totalCapacity : 0;
    const occupancyPct = Math.min(100, Math.round(occupancyRatio * 100));
    const isSelected = selectedBusId === bus.id;
    const isFull = bus.availableSeats === 0;
    const isNearlyFull = !isFull && bus.availableSeats <= Math.ceil(bus.totalCapacity * 0.2);

    const barColor = isFull ? 'bg-[#E5484D]' : isNearlyFull ? 'bg-[#F59E0B]' : 'bg-[#159B62]';
    const statusBadge =
      bus.operationalStatus === 'IN_SERVICE'
        ? { label: 'In Service', cls: 'bg-[#159B62] text-white' }
        : bus.operationalStatus === 'DELAYED'
        ? { label: 'Delayed', cls: 'bg-[#F59E0B] text-white' }
        : { label: bus.operationalStatus.replace(/_/g, ' '), cls: 'bg-slate-400 text-white' };

    return (
      <div
        key={bus.id}
        onClick={() => setSelectedBusId(bus.id)}
        className={`bg-white rounded-2xl p-4 sm:p-5 border transition-all cursor-pointer ${
          isSelected
            ? 'border-[#268DE0] ring-2 ring-[#268DE0]/20 shadow-elevated'
            : 'border-[#E2E8F0] hover:border-[#268DE0]/60 shadow-card'
        }`}
      >
        {/* Top Row: Bus Icon, Code, DEMO GPS Badge, and Service Status Pill */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#EAF4FF] text-[#1D63DC] flex items-center justify-center shrink-0">
              <BusIcon className="w-5 h-5" />
            </div>
            <span className="font-extrabold text-base sm:text-lg text-[#102542] tracking-tight">
              {bus.busCode}
            </span>
            {(bus.isDemoData || isDryRun) && (
              <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/80 text-[10px] font-extrabold uppercase tracking-wide shrink-0">
                DEMO GPS
              </span>
            )}
          </div>

          <span className={`px-3 py-0.5 rounded-full text-xs font-bold shrink-0 ${statusBadge.cls}`}>
            {statusBadge.label}
          </span>
        </div>

        {/* Route Path Subtitle */}
        <div className="text-[11.5px] font-medium text-[#64748B] mt-1.5 truncate">
          {getCorridorSummaryString(bus)}
        </div>

        {/* 3-Column Capacity / Occupied / Available Metrics */}
        <div className="grid grid-cols-3 gap-2 pt-3.5 pb-2.5">
          <div className="flex items-center gap-2">
            <Armchair className="w-4 h-4 text-[#64748B] shrink-0" />
            <div>
              <div className="text-[11px] text-[#64748B] leading-tight">Total Capacity</div>
              <div className="text-sm sm:text-[15px] font-extrabold text-[#102542] leading-tight mt-0.5">
                {bus.totalCapacity} seats
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#64748B] shrink-0" />
            <div>
              <div className="text-[11px] text-[#64748B] leading-tight">Occupied</div>
              <div className="text-sm sm:text-base font-extrabold text-[#F59E0B] leading-tight mt-0.5">
                {bus.occupiedSeats}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Armchair className="w-4 h-4 text-[#64748B] shrink-0" />
            <div>
              <div className="text-[11px] text-[#64748B] leading-tight">Available</div>
              <div className="text-sm sm:text-base font-extrabold text-[#159B62] leading-tight mt-0.5">
                {bus.availableSeats}
              </div>
            </div>
          </div>
        </div>

        {/* Horizontal Occupancy Progress Bar */}
        <div className="w-full h-2.5 rounded-full bg-[#E2E8F0] overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${occupancyPct}%` }}
          />
        </div>

        {/* Footer: Next Stop & Last GPS Timestamp */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 mt-3 border-t border-[#E2E8F0] text-[11.5px]">
          <div className="flex items-center gap-1.5 text-[#102542] min-w-0">
            <MapPin className="w-3.5 h-3.5 text-[#159B62] shrink-0" />
            <span className="text-[#64748B]">Next Stop:</span>
            <span className="font-bold truncate">
              {bus.nextStopName ? bus.nextStopName.replace(' (Natalio Bacalso Avenue)', ' (Natalio Bacalso Ave)') : 'Terminal'}
            </span>
          </div>
          <div className="text-[#64748B] font-medium shrink-0">
            Last GPS:{' '}
            <span className="text-[#102542] font-semibold">
              {bus.lastGpsUpdateAt ? new Date(bus.lastGpsUpdateAt).toLocaleTimeString() : 'Standby'}
            </span>
          </div>
        </div>

        {/* Quick Action Row when selected */}
        {isSelected && (
          <div className="flex flex-wrap items-center gap-2 pt-3 mt-3 border-t border-[#E2E8F0]">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenWaitingModal(bus.nextStopId || undefined, bus.id);
              }}
              className="flex-1 py-2 px-3 rounded-xl bg-[#268DE0] hover:bg-[#153E70] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <Users className="w-3.5 h-3.5" />
              <span>I'm Waiting for {bus.busCode}</span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (bus.assignedRouteId) setPayRouteId(bus.assignedRouteId);
                onChangeSection('PAY_FARE');
              }}
              className="py-2 px-3 rounded-xl bg-[#EAF4FF] hover:bg-[#268DE0]/20 text-[#153E70] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Pay Fare</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-[1440px] mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-5">
      {/* HERO BANNER — Matches Reference Image */}
      <div className="relative rounded-2xl overflow-hidden border border-[#CFE4FA] bg-gradient-to-r from-[#DCEEFF] via-[#EAF4FF] to-[#D6EBFF] shadow-card">
        {/* Right-side Cebu Landmark / Heritage Pavilion Architectural Illustration */}
        <div className="hidden md:block absolute right-0 top-0 bottom-0 w-[44%] pointer-events-none overflow-hidden">
          <svg
            viewBox="0 0 520 180"
            className="w-full h-full object-cover"
            preserveAspectRatio="xMaxYMid slice"
          >
            <defs>
              <linearGradient id="heroFade" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#EAF4FF" stopOpacity="1" />
                <stop offset="28%" stopColor="#EAF4FF" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#EAF4FF" stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* Sky & Subtle Clouds */}
            <rect width="520" height="180" fill="#CFE7FF" />
            <ellipse cx="420" cy="42" rx="68" ry="20" fill="rgba(255,255,255,0.65)" />
            <ellipse cx="290" cy="30" rx="52" ry="15" fill="rgba(255,255,255,0.55)" />
            {/* Background Cebu Heritage Plaza Building */}
            <rect x="250" y="96" width="260" height="84" fill="#E8DFD1" stroke="#C7B9A3" strokeWidth="1.5" />
            <polygon points="240,96 380,58 520,96" fill="#B85D3B" />
            {/* Windows on Heritage Building */}
            <rect x="275" y="114" width="22" height="34" rx="11" fill="#2C4C6B" />
            <rect x="312" y="114" width="22" height="34" rx="11" fill="#2C4C6B" />
            <rect x="448" y="114" width="22" height="34" rx="11" fill="#2C4C6B" />
            <rect x="482" y="114" width="22" height="34" rx="11" fill="#2C4C6B" />
            {/* Cebu Magellan's Cross Octagonal Pavilion Kiosk */}
            <g transform="translate(335, 16)">
              {/* Terracotta Tiled Octagonal Roof */}
              <polygon points="60,4 14,52 106,52" fill="#A84A2B" stroke="#7C3219" strokeWidth="1.5" />
              <polygon points="60,4 36,52 84,52" fill="#BF5B38" />
              <line x1="60" y1="0" x2="60" y2="10" stroke="#7C3219" strokeWidth="2.5" />
              {/* Cornice */}
              <rect x="12" y="52" width="96" height="8" rx="2" fill="#EDE4D3" stroke="#C5B69E" strokeWidth="1" />
              {/* Octagonal Stone Body */}
              <rect x="18" y="60" width="84" height="104" fill="#F5EFE4" stroke="#C5B69E" strokeWidth="1.5" />
              {/* Archways */}
              <rect x="26" y="72" width="24" height="44" rx="12" fill="#3B4D5E" />
              <rect x="58" y="70" width="28" height="48" rx="14" fill="#2A3947" />
              <rect x="92" y="74" width="8" height="40" rx="4" fill="#3B4D5E" />
            </g>
            {/* Lush Cebu Tropical Foliage */}
            <circle cx="220" cy="145" r="42" fill="#2E6F40" />
            <circle cx="255" cy="152" r="36" fill="#3B854E" />
            <circle cx="190" cy="160" r="30" fill="#255B34" />
            <circle cx="495" cy="148" r="38" fill="#2E6F40" />
            {/* Smooth left fade into banner background */}
            <rect width="220" height="180" fill="url(#heroFade)" />
          </svg>
        </div>

        <div className="relative z-10 px-5 sm:px-8 py-5 sm:py-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="max-w-xl">
            <div className="flex items-center gap-3">
              <span className="text-[11px] sm:text-xs font-extrabold uppercase tracking-[0.14em] text-[#268DE0]">
                COMMUTER HUB
              </span>
              <span className="w-10 h-[2px] bg-[#268DE0] rounded-full" />
            </div>
            <h1 className="text-2xl sm:text-[30px] font-black text-[#102542] tracking-tight mt-1 leading-tight">
              Live CIBUS Cebu Tracker
            </h1>
            <p className="text-xs sm:text-sm text-[#102542]/80 mt-1.5 leading-relaxed">
              Track buses in real time, check seat availability, and plan your trip across{' '}
              <strong className="font-extrabold text-[#0B2545]">Cebu IT Park</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => handleOpenWaitingModal()}
              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-[#0B2545] hover:bg-[#153E70] text-white font-extrabold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition-all"
            >
              <Users className="w-4 h-4 text-[#F59E0B]" />
              <span>I'm Waiting for This Bus</span>
            </button>
          </div>
        </div>
      </div>

      {/* HORIZONTAL MAIN DASHBOARD TABS — Matches Reference Image */}
      <div className="bg-[#E8F0F8] p-1.5 rounded-2xl border border-[#D8E4F0]">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
          {[
            {
              id: 'DASHBOARD' as PassengerSection,
              matchIds: ['DASHBOARD', 'LIVE_TRACKER'] as PassengerSection[],
              label: 'Live Map',
              icon: MapIcon,
            },
            {
              id: 'SEAT_AVAILABILITY' as PassengerSection,
              matchIds: ['SEAT_AVAILABILITY'] as PassengerSection[],
              label: 'Seat Availability',
              icon: Armchair,
            },
            {
              id: 'ROUTES_STOPS' as PassengerSection,
              matchIds: ['ROUTES_STOPS'] as PassengerSection[],
              label: 'Routes & Stops',
              icon: GitFork,
            },
            {
              id: 'MY_REQUESTS' as PassengerSection,
              matchIds: ['MY_REQUESTS'] as PassengerSection[],
              label: 'My Requests',
              icon: ClipboardList,
              badge: activeWaitingCount > 0 ? activeWaitingCount : undefined,
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const isTabActive = tab.matchIds.includes(activeSection);
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onChangeSection(tab.id)}
                className={`py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
                  isTabActive
                    ? 'bg-[#153E70] text-white shadow-sm'
                    : 'bg-white/80 hover:bg-white text-[#102542]'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                      isTabActive ? 'bg-[#F59E0B] text-[#0B2545]' : 'bg-[#EAF4FF] text-[#153E70]'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ===================================================================
          VIEW 1: MAIN DASHBOARD / LIVE MAP + CIBUS FLEET (60% / 40% SPLIT)
         =================================================================== */}
      {(activeSection === 'DASHBOARD' || activeSection === 'LIVE_TRACKER') && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT 60% COLUMN: ACTIVE ROUTE CORRIDOR & INTERACTIVE MAP */}
          <div className="lg:col-span-7 bg-white border border-[#E2E8F0] rounded-2xl p-4 sm:p-5 shadow-card space-y-3.5">
            {/* Corridor Switcher Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <span className="text-xs sm:text-sm font-extrabold text-[#102542] shrink-0">
                Active Route Corridor
              </span>

              <div className="flex flex-wrap items-center gap-1.5">
                {sortedRoutes.map((rt) => {
                  const isSelected = (selectedRouteId || sortedRoutes[0]?.id) === rt.id;
                  const shortDesc =
                    rt.direction === 'NORTHBOUND'
                      ? 'Northbound (Il Corso → IT Park)'
                      : rt.direction === 'SOUTHBOUND'
                      ? 'Southbound (IT Park → Il Corso)'
                      : `${rt.originName} → ${rt.destinationName}`;

                  return (
                    <button
                      key={rt.id}
                      type="button"
                      onClick={() => setSelectedRouteId(rt.id)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all ${
                        isSelected
                          ? 'bg-[#1D63DC] text-white shadow-2xs'
                          : 'bg-[#F4F7FB] hover:bg-[#EAF4FF] text-[#102542] border border-[#E2E8F0]'
                      }`}
                    >
                      <span className="font-extrabold">{rt.routeCode}</span>{' '}
                      <span className={isSelected ? 'text-sky-100 font-medium' : 'text-[#64748B] font-medium'}>
                        {shortDesc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Interactive Leaflet Map */}
            <LiveMap
              buses={buses}
              routes={routes}
              stops={stops}
              selectedBusId={selectedBusId}
              selectedStopId={selectedStopId}
              selectedRouteId={selectedRouteId || sortedRoutes[0]?.id || null}
              onSelectBus={(bId) => setSelectedBusId(bId)}
              onSelectStop={(sId) => setSelectedStopId(sId)}
              onOpenWaitingModalForStop={(sId) => handleOpenWaitingModal(sId)}
            />

            {/* Map Legend Bar — Matches Reference Image */}
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-[11px] font-semibold text-[#102542]">
              <div className="flex items-center gap-2">
                <span className="w-6 h-1.5 rounded-full bg-[#1D63DC] inline-block" />
                <span>CIBUS Route (Verified)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-white border-[2.5px] border-[#1D63DC] inline-block" />
                <span>Bus Stop</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-white border-[2.5px] border-[#159B62] inline-block" />
                <span>Terminal</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded bg-[#268DE0] text-white text-[9px] flex items-center justify-center">
                  🚌
                </span>
                <span>CIBUS Bus (Live)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 border-b-2 border-dashed border-[#64748B] inline-block" />
                <span className="text-[#64748B]">Provisional Segment</span>
              </div>
            </div>
          </div>

          {/* RIGHT 40% COLUMN: CIBUS FLEET & SEAT AVAILABILITY */}
          <div className="lg:col-span-5 bg-white border border-[#E2E8F0] rounded-2xl p-4 sm:p-5 shadow-card space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#0B2545] text-white flex items-center justify-center shrink-0">
                  <BusIcon className="w-4 h-4" />
                </div>
                <h2 className="text-base sm:text-lg font-extrabold text-[#102542]">
                  CIBUS Fleet & Seat Availability
                </h2>
              </div>
              <span className="px-3 py-1 rounded-full bg-[#F4F7FB] border border-[#E2E8F0] text-xs font-bold text-[#102542] shrink-0">
                {inServiceBusesCount} Buses in Service
              </span>
            </div>

            <div className="space-y-3.5">{buses.map((bus) => renderFleetCard(bus))}</div>
          </div>
        </div>
      )}

      {/* ===================================================================
          VIEW 2: SEAT AVAILABILITY MONITOR
         =================================================================== */}
      {activeSection === 'SEAT_AVAILABILITY' && (
        <div className="space-y-5">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-card flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-extrabold text-[#102542]">
                Real-Time CIBUS Seat Availability & Capacity Monitor
              </h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                Live seating breakdown per bus. Distinguishes conductor manual reports from automated boarding counts.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleOpenWaitingModal()}
              className="px-4 py-2.5 rounded-xl bg-[#268DE0] hover:bg-[#153E70] text-white font-bold text-xs flex items-center gap-2"
            >
              <Users className="w-4 h-4" />
              <span>Report Waiting Passengers</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {buses.map((bus) => (
              <div key={bus.id} className="space-y-2">
                {renderFleetCard(bus)}
                <div className="bg-white border border-[#E2E8F0] rounded-xl px-4 py-2.5 flex items-center justify-between text-xs">
                  <span className="text-[#64748B] font-medium">Data Source:</span>
                  <span className="font-bold text-[#153E70]">
                    {bus.seatSource === 'MANUAL_REPORT'
                      ? 'Conductor Manual Update'
                      : bus.seatSource === 'BOARDING_CALCULATED'
                      ? 'Auto Boarding Recalculated'
                      : isDryRun
                      ? 'Dry-Run Simulation Feed'
                      : 'Initial Capacity'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===================================================================
          VIEW 3: ROUTES & STOPS EXPLORER
         =================================================================== */}
      {activeSection === 'ROUTES_STOPS' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5 bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-extrabold text-[#102542]">CIBUS Corridor Route Map</h2>
              <div className="flex gap-1.5">
                {sortedRoutes.map((rt) => (
                  <button
                    key={rt.id}
                    onClick={() => setSelectedRouteId(rt.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                      (selectedRouteId || sortedRoutes[0]?.id) === rt.id
                        ? 'bg-[#1D63DC] text-white'
                        : 'bg-[#F4F7FB] text-[#64748B] border border-[#E2E8F0]'
                    }`}
                  >
                    {rt.routeCode}
                  </button>
                ))}
              </div>
            </div>

            <LiveMap
              buses={buses}
              routes={routes}
              stops={stops}
              selectedBusId={selectedBusId}
              selectedStopId={selectedStopId}
              selectedRouteId={selectedRouteId || sortedRoutes[0]?.id || null}
              onSelectBus={(bId) => setSelectedBusId(bId)}
              onSelectStop={(sId) => setSelectedStopId(sId)}
              onOpenWaitingModalForStop={(sId) => handleOpenWaitingModal(sId)}
            />
          </div>

          <div className="lg:col-span-7 bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-card space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-[#102542]">
                  [{activeRouteObj?.routeCode}] {activeRouteObj?.routeName}
                </h2>
                <p className="text-xs text-[#64748B]">
                  Direction: <strong>{activeRouteObj?.direction}</strong> • Operating Hours:{' '}
                  {activeRouteObj?.operatingHours} • Base Fare: ₱{activeRouteObj?.baseFarePhp}
                </p>
              </div>
            </div>

            <div className="space-y-2.5 max-h-[540px] overflow-y-auto pr-1">
              {activeRouteOrderedStops.map((rs) => {
                const enriched = stops.find((s) => s.id === rs.stopId);
                if (!enriched) return null;
                const isSelected = selectedStopId === enriched.id;
                const isProvisional = enriched.verificationStatus === 'PROVISIONAL';

                return (
                  <div
                    key={rs.id}
                    onClick={() => setSelectedStopId(enriched.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-[#EAF4FF]/60 border-[#268DE0]'
                        : 'bg-[#F4F7FB]/70 hover:bg-[#F4F7FB] border-[#E2E8F0]'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-[#153E70] text-white font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5">
                        {rs.stopSequence}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-extrabold text-sm text-[#102542]">{enriched.stopName}</span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                              isProvisional
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-emerald-50 text-[#159B62] border border-emerald-200'
                            }`}
                          >
                            {isProvisional ? 'Provisional' : 'Verified Launch Stop'}
                          </span>
                        </div>
                        <p className="text-xs text-[#64748B] mt-0.5">{enriched.landmarkNotes}</p>
                        {enriched.approachingBuses.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-1.5">
                            {enriched.approachingBuses.map((ab) => (
                              <span
                                key={ab.busId}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-[#E2E8F0] text-[11px] font-semibold text-[#153E70]"
                              >
                                🚌 {ab.busCode}:{' '}
                                <strong className="text-[#268DE0]">
                                  {ab.etaMinutes !== null ? `~${ab.etaMinutes} min` : ab.statusNote}
                                </strong>{' '}
                                ({ab.availableSeats} seats)
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0">
                      {enriched.expectedWaitingPassengers > 0 && (
                        <span className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-[#F59E0B] font-extrabold text-xs">
                          {enriched.expectedWaitingPassengers} waiting
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenWaitingModal(enriched.id);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#268DE0] hover:bg-[#153E70] text-white font-bold text-xs transition-colors"
                      >
                        I'm Waiting Here
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          VIEW 4: MY WAITING REQUESTS
         =================================================================== */}
      {activeSection === 'MY_REQUESTS' && (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 sm:p-6 shadow-card space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-[#102542]">
                My "I'm Waiting for This Bus" Commuter Reports
              </h2>
              <p className="text-xs text-[#64748B]">
                Update your waiting group size or cancel your report before the bus arrives.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleOpenWaitingModal()}
              className="px-4 py-2.5 rounded-xl bg-[#268DE0] hover:bg-[#153E70] text-white font-bold text-xs flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>New Waiting Report</span>
            </button>
          </div>

          {myWaitingRequests.length === 0 ? (
            <div className="text-center py-12 bg-[#F4F7FB] rounded-2xl border border-[#E2E8F0] space-y-3">
              <Users className="w-10 h-10 text-[#64748B] mx-auto" />
              <div className="text-sm font-bold text-[#102542]">No Active Waiting Requests</div>
              <p className="text-xs text-[#64748B] max-w-md mx-auto">
                Let approaching CIBUS drivers and conductors know how many commuters are waiting at your bus stop.
              </p>
              <button
                type="button"
                onClick={() => handleOpenWaitingModal()}
                className="px-5 py-2.5 rounded-xl bg-[#0B2545] text-white font-bold text-xs"
              >
                ✋ Report "I'm Waiting for This Bus"
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myWaitingRequests.map((req) => (
                <div
                  key={req.id}
                  className="bg-[#F4F7FB] border border-[#E2E8F0] rounded-2xl p-4 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#EAF4FF] text-[#153E70] text-xs font-extrabold">
                        {req.routeCode || req.routeId} ({req.direction})
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          req.status === 'WAITING'
                            ? 'bg-amber-100 text-amber-800'
                            : req.status === 'BOARDED'
                            ? 'bg-emerald-100 text-[#159B62]'
                            : 'bg-slate-200 text-[#64748B]'
                        }`}
                      >
                        {req.status}
                      </span>
                    </div>

                    <div className="text-sm font-extrabold text-[#102542]">
                      Boarding: {req.boardingStopName || req.boardingStopId}
                    </div>
                    <div className="text-xs text-[#64748B]">
                      Destination: <strong className="text-[#102542]">{req.destinationStopName}</strong>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-[#E2E8F0]">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[#64748B]">Passengers:</span>
                      {req.status === 'WAITING' ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleUpdateWaitingCount(req.id, req.passengerCount - 1)}
                            disabled={req.passengerCount <= 1}
                            className="w-7 h-7 rounded-lg bg-white border border-[#E2E8F0] flex items-center justify-center text-[#102542] disabled:opacity-40"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-6 text-center font-extrabold text-sm text-[#0B2545]">
                            {req.passengerCount}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateWaitingCount(req.id, req.passengerCount + 1)}
                            disabled={req.passengerCount >= 20}
                            className="w-7 h-7 rounded-lg bg-[#268DE0] text-white flex items-center justify-center disabled:opacity-40"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="font-extrabold text-sm text-[#102542]">{req.passengerCount} pax</span>
                      )}
                    </div>

                    {req.status === 'WAITING' && (
                      <button
                        type="button"
                        onClick={() => handleCancelWaiting(req.id)}
                        className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-[#E5484D] font-bold text-xs flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Cancel</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================
          VIEW 5: PAY FARE (CASHLESS FARE CALCULATOR & PAYMONGO SANDBOX)
         =================================================================== */}
      {activeSection === 'PAY_FARE' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white border border-[#E2E8F0] rounded-2xl p-5 sm:p-6 shadow-card space-y-5">
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#268DE0]">
                CIBUS Cashless Fare & Ticketing
              </span>
              <h2 className="text-xl font-extrabold text-[#102542]">Calculate Fare & Pay Trip</h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                Supports GCash, Maya, QR Ph, In-App Card, and Cash on Board with built-in PayMongo Mock Sandbox.
              </p>
            </div>

            {paymentFeedback && (
              <div
                className={`p-3.5 rounded-xl text-xs font-bold flex items-center gap-2 border ${
                  paymentFeedback.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-[#159B62]'
                    : 'bg-rose-50 border-rose-200 text-[#E5484D]'
                }`}
              >
                {paymentFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{paymentFeedback.text}</span>
              </div>
            )}

            <form onSubmit={handleInitiatePayment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-[#64748B] mb-1">
                  1. Select CIBUS Route
                </label>
                <select
                  value={payRouteId}
                  onChange={(e) => setPayRouteId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F4F7FB] border border-[#E2E8F0] text-sm font-semibold text-[#102542]"
                >
                  {sortedRoutes.map((r) => (
                    <option key={r.id} value={r.id}>
                      [{r.routeCode}] {r.routeName} ({r.direction})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-[#64748B] mb-1">
                    2. Origin Boarding Stop
                  </label>
                  <select
                    value={payOriginStopId}
                    onChange={(e) => setPayOriginStopId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F4F7FB] border border-[#E2E8F0] text-sm font-semibold text-[#102542]"
                  >
                    {payOrderedStops.slice(0, -1).map((rs) => (
                      <option key={rs.stopId} value={rs.stopId}>
                        #{rs.stopSequence} {rs.stop?.stopName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-[#64748B] mb-1">
                    3. Destination Stop
                  </label>
                  <select
                    value={payDestStopId}
                    onChange={(e) => setPayDestStopId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F4F7FB] border border-[#E2E8F0] text-sm font-semibold text-[#102542]"
                  >
                    {payOrderedStops
                      .filter(
                        (rs) =>
                          rs.stopSequence >
                          (payOrderedStops.find((o) => o.stopId === payOriginStopId)?.stopSequence || 0)
                      )
                      .map((rs) => (
                        <option key={rs.stopId} value={rs.stopId}>
                          #{rs.stopSequence} {rs.stop?.stopName}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Passenger Count */}
              <div className="bg-[#F4F7FB] border border-[#E2E8F0] rounded-xl p-3.5 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#102542]">Number of Passengers</div>
                  <div className="text-[11px] text-[#64748B]">
                    Fare Category: <strong>{user?.discountType || 'REGULAR'}</strong>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setPayPassengerCount((c) => Math.max(1, c - 1))}
                    className="w-8 h-8 rounded-lg bg-white border border-[#E2E8F0] flex items-center justify-center font-bold text-[#102542]"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-6 text-center font-extrabold text-base text-[#0B2545]">
                    {payPassengerCount}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPayPassengerCount((c) => Math.min(20, c + 1))}
                    className="w-8 h-8 rounded-lg bg-[#268DE0] text-white flex items-center justify-center font-bold"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Payment Method Selection */}
              <div>
                <label className="block text-xs font-bold uppercase text-[#64748B] mb-2">
                  4. Select Payment Method
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {(providerConfig?.methods || []).map((m) => {
                    const active = payMethod === m.method;
                    return (
                      <button
                        type="button"
                        key={m.method}
                        onClick={() => setPayMethod(m.method)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          active
                            ? 'bg-[#EAF4FF] border-[#268DE0] ring-2 ring-[#268DE0]/20'
                            : 'bg-[#F4F7FB] hover:bg-white border-[#E2E8F0]'
                        }`}
                      >
                        <div className="text-xs font-extrabold text-[#102542]">{m.label}</div>
                        <div className="text-[10px] font-semibold text-[#159B62] mt-0.5">
                          {m.method === 'CASH' ? 'Pay Conductor' : 'PayMongo Ready'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {payMethod !== 'CASH' && (
                <label className="flex items-start gap-2.5 p-3 rounded-xl bg-[#EAF4FF] border border-[#268DE0]/30 text-xs text-[#153E70] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoVerifyMockPaymongo}
                    onChange={(e) => setAutoVerifyMockPaymongo(e.target.checked)}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="font-bold">Instant Mock PayMongo Callback Verification (Zero .env Needed)</div>
                    <div className="text-[11px] text-[#64748B]">
                      Automatically completes the simulated PayMongo webhook and issues your QR ticket immediately.
                    </div>
                  </div>
                </label>
              )}

              {/* Fare Summary Box */}
              {fareQuote && (
                <div className="bg-[#0B2545] text-white rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] text-sky-200 uppercase font-bold">Estimated Total Fare</div>
                    <div className="text-xs text-slate-300 mt-0.5">
                      {fareQuote.distanceKm} km • ₱{fareQuote.unitFarePhp.toFixed(2)} / pax ({payPassengerCount} pax)
                    </div>
                  </div>
                  <div className="text-2xl font-black text-white">₱{fareQuote.totalFarePhp.toFixed(2)}</div>
                </div>
              )}

              <button
                type="submit"
                disabled={submittingPayment}
                className="w-full py-3 rounded-xl bg-[#268DE0] hover:bg-[#153E70] text-white font-extrabold text-sm shadow-sm transition-colors"
              >
                {submittingPayment
                  ? 'Processing Payment...'
                  : `Pay ₱${fareQuote?.totalFarePhp.toFixed(2) || '0.00'} via ${payMethod}`}
              </button>
            </form>
          </div>

          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-card space-y-3">
              <h3 className="text-base font-extrabold text-[#102542]">Recent Payment Transactions</h3>
              {myPayments.length === 0 ? (
                <p className="text-xs text-[#64748B]">No transactions yet.</p>
              ) : (
                <div className="space-y-2.5">
                  {myPayments.map((p) => (
                    <div key={p.id} className="bg-[#F4F7FB] border border-[#E2E8F0] rounded-xl p-3 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-[#153E70]">{p.referenceCode}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                            p.status === 'PAID'
                              ? 'bg-emerald-100 text-[#159B62]'
                              : p.status === 'PENDING'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-[#E5484D]'
                          }`}
                        >
                          {p.status}
                        </span>
                      </div>
                      <div className="flex justify-between text-[#102542] font-semibold">
                        <span>
                          {p.originStopName} → {p.destinationStopName}
                        </span>
                        <span className="font-extrabold text-[#159B62]">₱{p.amountPhp.toFixed(2)}</span>
                      </div>
                      {p.status === 'PENDING' && (
                        <div className="flex items-center gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() => handleWebhookVerifySimulation(p.id, 'PAID')}
                            className="flex-1 py-1.5 rounded-lg bg-[#159B62] text-white font-bold text-[11px]"
                          >
                            Verify PAID (Webhook)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleWebhookVerifySimulation(p.id, 'FAILED')}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-100 text-[#E5484D] font-bold text-[11px]"
                          >
                            Fail
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          VIEW 6: DIGITAL QR TICKETS & HISTORY
         =================================================================== */}
      {activeSection === 'TICKETS_HISTORY' && (
        <div className="space-y-5">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-card flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-[#102542]">My Digital QR Tickets & Fare History</h2>
              <p className="text-xs text-[#64748B]">
                Present your QR code ticket to the CIBUS conductor upon boarding for validation.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onChangeSection('PAY_FARE')}
              className="px-4 py-2 rounded-xl bg-[#268DE0] hover:bg-[#153E70] text-white font-bold text-xs flex items-center gap-1.5"
            >
              <CreditCard className="w-4 h-4" />
              <span>Purchase New Ticket</span>
            </button>
          </div>

          {myTickets.length === 0 ? (
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-10 text-center space-y-3">
              <Ticket className="w-10 h-10 text-[#64748B] mx-auto" />
              <div className="text-sm font-bold text-[#102542]">No Digital Tickets Found</div>
              <button
                type="button"
                onClick={() => onChangeSection('PAY_FARE')}
                className="px-4 py-2 rounded-xl bg-[#0B2545] text-white font-bold text-xs"
              >
                Go to Pay Fare
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {myTickets.map((t) => (
                <DigitalTicketCard key={t.id} ticket={t} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================
          VIEW 7: ANNOUNCEMENTS & COMMUTER ADVISORIES
         =================================================================== */}
      {(activeSection === 'ANNOUNCEMENTS' || activeSection === 'PROFILE') && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7 bg-white border border-[#E2E8F0] rounded-2xl p-5 sm:p-6 shadow-card space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#EAF4FF] text-[#268DE0] flex items-center justify-center">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-[#102542]">CIBUS Cebu Service Announcements</h2>
                <p className="text-xs text-[#64748B]">Corridor advisories, operating hours, and route updates</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-[#EAF4FF]/70 border border-[#268DE0]/30 space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-[#153E70]">
                  <span>CORRIDOR ROUTE VERIFICATION NOTICE</span>
                  <span>ACTIVE</span>
                </div>
                <p className="text-xs text-[#102542] leading-relaxed">
                  The southern launch corridor from <strong>Il Corso (SRP)</strong> through{' '}
                  <strong>SM Seaside, Mambaling, N. Bacalso Ave, Cebu South Bus Terminal, and Osmeña Blvd</strong> uses
                  verified historical CIBUS launch stops (solid blue line). The northern extension via{' '}
                  <strong>the Capitol, N. Escario Street and Ayala Center Cebu to Cebu IT Park</strong> is marked as a provisional segment
                  (dashed line) configurable by dispatchers.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#F4F7FB] border border-[#E2E8F0] space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-[#159B62]">
                  <span>CASHLESS PAYMONGO SANDBOX & QR TICKETING</span>
                  <span>ENABLED</span>
                </div>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  Commuters can pay fares using GCash, Maya, QR Ph, In-App Card, or Cash on Board. Digital QR tickets
                  are validated on board by CIBUS conductors.
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 bg-white border border-[#E2E8F0] rounded-2xl p-5 sm:p-6 shadow-card space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#F4F7FB] text-[#102542] flex items-center justify-center">
                <UserIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[#102542]">Commuter Profile & Fare Discount</h3>
                <p className="text-xs text-[#64748B]">Manage your commuter details and 20% statutory discount</p>
              </div>
            </div>

            {profileSavedMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-[#159B62]">
                {profileSavedMsg}
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase text-[#64748B] mb-1">Full Name</label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="Bea Alcantara"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#F4F7FB] border border-[#E2E8F0] text-sm text-[#102542]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-[#64748B] mb-1">Mobile Number</label>
                <input
                  type="text"
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                  placeholder="+639171000010"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#F4F7FB] border border-[#E2E8F0] text-sm text-[#102542]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-[#64748B] mb-1">Discount Category</label>
                <select
                  value={profileDiscount}
                  onChange={(e) => setProfileDiscount(e.target.value as any)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#F4F7FB] border border-[#E2E8F0] text-sm text-[#102542]"
                >
                  <option value="REGULAR">Regular Commuter</option>
                  <option value="STUDENT">Student (20% Discount)</option>
                  <option value="SENIOR">Senior Citizen (20% Discount)</option>
                  <option value="PWD">PWD (20% Discount)</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#0B2545] hover:bg-[#153E70] text-white font-bold text-xs"
              >
                Save Commuter Profile
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Waiting Request Modal */}
      <WaitingRequestModal
        isOpen={waitingModalOpen}
        onClose={() => setWaitingModalOpen(false)}
        routes={routes}
        initialRouteId={selectedRouteId || sortedRoutes[0]?.id}
        initialBoardingStopId={modalInitialStopId}
        initialTargetBusId={modalTargetBusId}
        onSuccess={() => {
          fetchMyPassengerData();
          refreshTransitOverview();
        }}
      />
    </div>
  );
};
