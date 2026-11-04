import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Bus, BusRoute, BusStop, PassengerWaitingRequest, SimulationSettings } from '../types/cibus';

export interface EnrichedStopWithEta extends BusStop {
  expectedWaitingPassengers: number;
  activeRequestCount: number;
  approachingBuses: {
    busId: string;
    busCode: string;
    routeCode: string | null;
    routeName: string | null;
    operationalStatus: string;
    availableSeats: number;
    totalCapacity: number;
    seatSource: string;
    lastGpsUpdateAt: string | null;
    isDemoData: boolean;
    etaMinutes: number | null;
    distanceKm: number | null;
    isLiveConfirmed: boolean;
    statusNote: string;
  }[];
}

interface RealtimeContextValue {
  simulationSettings: SimulationSettings;
  buses: Bus[];
  routes: BusRoute[];
  stops: EnrichedStopWithEta[];
  waitingRequests: PassengerWaitingRequest[];
  wsConnected: boolean;
  lastEventTimestamp: string | null;
  refreshTransitOverview: () => Promise<void>;
  updateSimulationSettings: (updates: Partial<SimulationSettings>) => Promise<void>;
  resetSimulation: () => Promise<void>;
}

const defaultSimSettings: SimulationSettings = {
  operatingMode: 'DRY_RUN',
  enabled: true,
  speedMultiplier: 1.5,
  stopDurationSeconds: 6,
  busCount: 3,
  autoReturn: true,
  updateIntervalMs: 1500,
  liveSourceConfigured: false,
};

const RealtimeContext = createContext<RealtimeContextValue | undefined>(undefined);

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [simulationSettings, setSimulationSettings] = useState<SimulationSettings>(defaultSimSettings);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [routes, setRoutes] = useState<BusRoute[]>([]);
  const [stops, setStops] = useState<EnrichedStopWithEta[]>([]);
  const [waitingRequests, setWaitingRequests] = useState<PassengerWaitingRequest[]>([]);
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [lastEventTimestamp, setLastEventTimestamp] = useState<string | null>(null);

  const refreshTransitOverview = useCallback(async () => {
    try {
      const res = await fetch('/api/transit/overview');
      if (res.ok) {
        const data = await res.json();
        if (data.simulationSettings) setSimulationSettings(data.simulationSettings);
        setBuses(data.buses || []);
        setRoutes(data.routes || []);
        setStops(data.stops || []);
        setWaitingRequests(data.waitingRequests || []);
      }
    } catch (err) {
      console.error('Failed to fetch transit overview:', err);
    }
  }, []);

  const updateSimulationSettings = useCallback(
    async (updates: Partial<SimulationSettings>) => {
      try {
        const res = await fetch('/api/simulation/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.settings) setSimulationSettings(data.settings);
          await refreshTransitOverview();
        }
      } catch (err) {
        console.error('Failed to update simulation settings:', err);
      }
    },
    [refreshTransitOverview]
  );

  const resetSimulation = useCallback(async () => {
    try {
      const res = await fetch('/api/simulation/reset', { method: 'POST' });
      if (res.ok) {
        await refreshTransitOverview();
      }
    } catch (err) {
      console.error('Failed to reset simulation:', err);
    }
  }, [refreshTransitOverview]);

  useEffect(() => {
    refreshTransitOverview();

    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connectWs = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setWsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          setLastEventTimestamp(payload.timestamp || new Date().toISOString());
          refreshTransitOverview();
        } catch (e) {
          console.error('WS parse error:', e);
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
        reconnectTimer = setTimeout(connectWs, 3000);
      };

      ws.onerror = () => {
        ws?.close();
      };
    };

    connectWs();

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, [refreshTransitOverview]);

  return (
    <RealtimeContext.Provider
      value={{
        simulationSettings,
        buses,
        routes,
        stops,
        waitingRequests,
        wsConnected,
        lastEventTimestamp,
        refreshTransitOverview,
        updateSimulationSettings,
        resetSimulation,
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
};

export function useRealtime() {
  const ctx = useContext(RealtimeContext);
  if (!ctx) throw new Error('useRealtime must be used within RealtimeProvider');
  return ctx;
}
