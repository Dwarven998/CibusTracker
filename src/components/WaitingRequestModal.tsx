import React, { useState, useEffect } from 'react';
import { X, Users, Plus, Minus, MapPin, Navigation, AlertCircle, CheckCircle2 } from 'lucide-react';
import { BusRoute } from '../types/cibus';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../context/RealtimeContext';

interface WaitingRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  routes: BusRoute[];
  initialRouteId?: string;
  initialBoardingStopId?: string;
  initialTargetBusId?: string | null;
  onSuccess: () => void;
}

export const WaitingRequestModal: React.FC<WaitingRequestModalProps> = ({
  isOpen,
  onClose,
  routes,
  initialRouteId,
  initialBoardingStopId,
  initialTargetBusId,
  onSuccess,
}) => {
  const { token } = useAuth();
  const { simulationSettings } = useRealtime();
  const [routeId, setRouteId] = useState<string>(initialRouteId || routes[0]?.id || '');
  const [boardingStopId, setBoardingStopId] = useState<string>(initialBoardingStopId || '');
  const [destinationStopId, setDestinationStopId] = useState<string>('');
  const [passengerCount, setPassengerCount] = useState<number>(1);
  const [notes, setNotes] = useState<string>('');
  const [demoPassengerName, setDemoPassengerName] = useState<string>('Demo Commuter (Dry-Run)');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const selectedRoute = routes.find((r) => r.id === routeId) || routes[0];
  const orderedStops = [...(selectedRoute?.stops || [])].sort((a, b) => a.stopSequence - b.stopSequence);

  useEffect(() => {
    if (initialRouteId) setRouteId(initialRouteId);
    else if (routes[0] && !routeId) setRouteId(routes[0].id);
  }, [initialRouteId, routes]);

  useEffect(() => {
    if (initialBoardingStopId && orderedStops.some((rs) => rs.stopId === initialBoardingStopId)) {
      setBoardingStopId(initialBoardingStopId);
    } else if (orderedStops.length > 0 && !orderedStops.some((rs) => rs.stopId === boardingStopId)) {
      setBoardingStopId(orderedStops[0].stopId);
    }
  }, [routeId, initialBoardingStopId, orderedStops.length]);

  const currentBoardingSeq = orderedStops.find((rs) => rs.stopId === boardingStopId)?.stopSequence || 0;
  const validDestinationStops = orderedStops.filter((rs) => rs.stopSequence > currentBoardingSeq);

  useEffect(() => {
    if (validDestinationStops.length > 0 && !validDestinationStops.some((rs) => rs.stopId === destinationStopId)) {
      setDestinationStopId(validDestinationStops[validDestinationStops.length - 1].stopId);
    } else if (validDestinationStops.length === 0) {
      setDestinationStopId('');
    }
  }, [boardingStopId, routeId, validDestinationStops.length]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token && simulationSettings.operatingMode !== 'DRY_RUN') {
      setError('Please sign in to your CIBUS passenger account to submit a waiting report.');
      return;
    }

    if (!routeId || !boardingStopId || !destinationStopId) {
      setError('Please select a valid route, boarding stop, and destination stop.');
      return;
    }

    setSubmitting(true);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch('/api/waiting', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          routeId,
          boardingStopId,
          destinationStopId,
          targetBusId: initialTargetBusId || null,
          passengerCount,
          notes,
          demoPassengerName: !token ? demoPassengerName : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to submit waiting request.');
      } else {
        onSuccess();
        onClose();
      }
    } catch {
      setError('Network error while submitting waiting request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0B2545]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-[#E2E8F0] rounded-2xl max-w-lg w-full shadow-elevated overflow-hidden my-auto">
        {/* Header */}
        <div className="bg-[#0B2545] px-5 sm:px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#268DE0] flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-white stroke-[2.2]" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg leading-tight">I'm Waiting for This Bus</h3>
              <p className="text-xs text-sky-200/90 mt-0.5">
                Notify approaching CIBUS drivers & conductors of waiting commuters
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-[#E5484D] text-xs font-medium flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Select Route & Direction */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#64748B] mb-1.5">
              1. Intended CIBUS Route & Travel Direction
            </label>
            <div className="relative">
              <Navigation className="w-4 h-4 text-[#268DE0] absolute left-3.5 top-3" />
              <select
                value={routeId}
                onChange={(e) => setRouteId(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F4F7FB] border border-[#E2E8F0] text-sm font-semibold text-[#102542] focus:border-[#268DE0] focus:bg-white focus:outline-none"
              >
                {routes.map((r) => (
                  <option key={r.id} value={r.id}>
                    [{r.routeCode}] {r.routeName} ({r.direction})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 2. Boarding Stop */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#64748B] mb-1.5">
              2. Boarding Bus Stop (Where You Are Waiting)
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-[#E5484D] absolute left-3.5 top-3" />
              <select
                value={boardingStopId}
                onChange={(e) => setBoardingStopId(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F4F7FB] border border-[#E2E8F0] text-sm font-semibold text-[#102542] focus:border-[#268DE0] focus:bg-white focus:outline-none"
              >
                {orderedStops.slice(0, -1).map((rs) => (
                  <option key={rs.stopId} value={rs.stopId}>
                    Stop #{rs.stopSequence}: {rs.stop?.stopName} ({rs.stop?.stopCode})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 3. Destination Stop */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#64748B] mb-1.5">
              3. Intended Destination Bus Stop
            </label>
            <select
              value={destinationStopId}
              onChange={(e) => setDestinationStopId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-[#F4F7FB] border border-[#E2E8F0] text-sm font-semibold text-[#102542] focus:border-[#268DE0] focus:bg-white focus:outline-none"
            >
              {validDestinationStops.map((rs) => (
                <option key={rs.stopId} value={rs.stopId}>
                  Stop #{rs.stopSequence}: {rs.stop?.stopName}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Passenger Counter with +/- Buttons (Default = 1) */}
          <div className="bg-[#F4F7FB] border border-[#E2E8F0] rounded-xl p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-extrabold text-[#102542]">Expected Passengers</div>
                <p className="text-xs text-[#64748B]">How many commuters are waiting in your group?</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setPassengerCount((c) => Math.max(1, c - 1))}
                  disabled={passengerCount <= 1}
                  className="w-10 h-10 rounded-xl bg-white border border-[#E2E8F0] hover:bg-slate-100 disabled:opacity-40 text-[#102542] flex items-center justify-center font-bold transition-colors shadow-2xs"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-8 text-center font-black text-2xl text-[#0B2545]">{passengerCount}</span>
                <button
                  type="button"
                  onClick={() => setPassengerCount((c) => Math.min(20, c + 1))}
                  disabled={passengerCount >= 20}
                  className="w-10 h-10 rounded-xl bg-[#268DE0] hover:bg-[#153E70] disabled:opacity-40 text-white flex items-center justify-center font-bold transition-colors shadow-2xs"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Notice */}
          <div className="p-3 rounded-xl bg-[#EAF4FF] border border-[#268DE0]/25 text-xs text-[#153E70] flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#268DE0] shrink-0 mt-0.5" />
            <span>
              Your waiting count is broadcast immediately to CIBUS drivers & conductors on{' '}
              <strong>{selectedRoute?.routeCode}</strong>. This reports live stop demand and does not reserve a seat.
            </span>
          </div>

          {/* Submit */}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-[#F4F7FB] hover:bg-slate-200/70 text-[#64748B] hover:text-[#102542] text-sm font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !destinationStopId}
              className="px-6 py-2.5 rounded-xl bg-[#268DE0] hover:bg-[#153E70] text-white font-extrabold text-sm shadow-sm disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Submitting...' : `Submit Waiting Report (${passengerCount} Pax)`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
