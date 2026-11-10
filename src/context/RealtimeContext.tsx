import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Bus, BusRoute, BusStop, PassengerWaitingRequest, SimulationSettings } from '../types/cibus';
import { clientStandaloneEngine, installStandaloneApiInterceptor } from '../services/clientStandaloneEngine';

installStandaloneApiInterceptor();

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

const initialOverview = clientStandaloneEngine.getOverviewPayload();

const RealtimeContext = createContext<RealtimeContextValue | undefined>(undefined);

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [simulationSettings, setSimulationSettings] = useState<SimulationSettings>(
    initialOverview.simulationSettings
  );
  const [buses, setBuses] = useState<Bus[]>(initialOverview.buses);
  const [routes, setRoutes] = useState<BusRoute[]>(initialOverview.routes);
  const [stops, setStops] = useState<EnrichedStopWithEta[]>(initialOverview.stops);
  const [waitingRequests, setWaitingRequests] = useState<PassengerWaitingRequest[]>(
    initialOverview.waitingRequests
  );
  const [wsConnected, setWsConnected] = useState<boolean>(true);
  const [lastEventTimestamp, setLastEventTimestamp] = useState<string | null>(initialOverview.serverTimestamp);
  const hasRealBackendWsRef = useRef<boolean>(false);

  const syncFromStandaloneEngine = useCallback(() => {
    const snap = clientStandaloneEngine.getOverviewPayload();
    setSimulationSettings({ ...snap.simulationSettings });
    setBuses([...snap.buses]);
    setRoutes([...snap.routes]);
    setStops([...snap.stops]);
    setWaitingRequests([...snap.waitingRequests]);
    setLastEventTimestamp(snap.serverTimestamp);
  }, []);

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
    } catch {
      syncFromStandaloneEngine();
    }
  }, [syncFromStandaloneEngine]);

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
      } catch {
        clientStandaloneEngine.state.simulationSettings = {
          ...clientStandaloneEngine.state.simulationSettings,
          ...updates,
        };
        syncFromStandaloneEngine();
      }
    },
    [refreshTransitOverview, syncFromStandaloneEngine]
  );

  const resetSimulation = useCallback(async () => {
    try {
      const res = await fetch('/api/simulation/reset', { method: 'POST' });
      if (res.ok) {
        await refreshTransitOverview();
      }
    } catch {
      clientStandaloneEngine.resetToDryRunSeed();
      syncFromStandaloneEngine();
    }
  }, [refreshTransitOverview, syncFromStandaloneEngine]);

  // Subscribe to clientStandaloneEngine updates
  useEffect(() => {
    return clientStandaloneEngine.subscribe(() => {
      if (!hasRealBackendWsRef.current) {
        syncFromStandaloneEngine();
      }
    });
  }, [syncFromStandaloneEngine]);

  // Client-side autonomous bus movement timer when deployed on Vercel (or whenever WebSocket server isn't active)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!hasRealBackendWsRef.current) {
        clientStandaloneEngine.tick();
      }
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  // Connect to local Express WebSocket when running `npm run dev` locally
  useEffect(() => {
    refreshTransitOverview();

    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;

    const connectWs = () => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          hasRealBackendWsRef.current = true;
          setWsConnected(true);
          attempts = 0;
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
          hasRealBackendWsRef.current = false;
          // Keep wsConnected true because clientStandaloneEngine is actively ticking in the browser
          setWsConnected(true);
          attempts += 1;
          if (attempts <= 3) {
            reconnectTimer = setTimeout(connectWs, 5000);
          }
        };

        ws.onerror = () => {
          ws?.close();
        };
      } catch {
        hasRealBackendWsRef.current = false;
      }
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
