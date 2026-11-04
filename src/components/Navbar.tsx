import React from 'react';
import {
  Bus as BusIcon,
  Radio,
  LogOut,
  UserCheck,
  Shield,
  Compass,
  Smartphone,
  Play,
  Pause,
  RotateCcw,
  FlaskConical,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../context/RealtimeContext';

interface NavbarProps {
  activeView: 'LANDING' | 'AUTH' | 'PASSENGER' | 'DRIVER' | 'ADMIN';
  setActiveView: (v: 'LANDING' | 'AUTH' | 'PASSENGER' | 'DRIVER' | 'ADMIN') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeView, setActiveView }) => {
  const { user, logout } = useAuth();
  const { wsConnected, simulationSettings, updateSimulationSettings, resetSimulation } = useRealtime();

  const isDryRun = simulationSettings.operatingMode === 'DRY_RUN';

  return (
    <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-md border-b border-slate-800">
      {/* System-Level Operating Mode Banner */}
      <div
        className={`px-4 py-1.5 text-xs font-bold border-b transition-colors ${
          isDryRun
            ? 'bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 border-amber-500/30 text-amber-200'
            : 'bg-emerald-950/90 border-emerald-500/30 text-emerald-200'
        }`}
      >
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FlaskConical className={`w-4 h-4 ${isDryRun ? 'text-amber-400 animate-pulse' : 'text-emerald-400'}`} />
            {isDryRun ? (
              <span className="tracking-wide uppercase font-black text-amber-300">
                DEMO MODE – SIMULATED DATA
              </span>
            ) : (
              <span className="tracking-wide uppercase font-black text-emerald-300">
                LIVE MODE – STANDBY (AWAITING REAL GPS FEEDS)
              </span>
            )}
            <span className="hidden md:inline text-[11px] font-medium text-slate-300">
              {isDryRun
                ? '• Predefined CIBUS corridor, placeholder buses (CIBUS-001/002/003), and sample commuter demand active.'
                : '• Simulation disabled. Only verified real GPS devices and live commuter requests are displayed.'}
            </span>
          </div>

          {/* Operating Mode Switch & Quick Simulation Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {isDryRun && (
              <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-700/80 rounded-lg px-2 py-0.5">
                <button
                  onClick={() => updateSimulationSettings({ enabled: !simulationSettings.enabled })}
                  className={`px-2 py-0.5 rounded text-[11px] font-extrabold flex items-center gap-1 ${
                    simulationSettings.enabled
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-emerald-600 text-white'
                  }`}
                  title={simulationSettings.enabled ? 'Pause Simulated Buses' : 'Resume Simulated Buses'}
                >
                  {simulationSettings.enabled ? (
                    <>
                      <Pause className="w-3 h-3 fill-current" />
                      <span>Pause Sim</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3 fill-current" />
                      <span>Resume Sim</span>
                    </>
                  )}
                </button>

                <select
                  value={simulationSettings.speedMultiplier}
                  onChange={(e) => updateSimulationSettings({ speedMultiplier: Number(e.target.value) })}
                  className="bg-slate-900 text-slate-200 text-[11px] font-bold rounded px-1.5 py-0.5 border border-slate-700"
                  title="Simulation Speed Multiplier"
                >
                  <option value={0.5}>0.5x Speed</option>
                  <option value={1}>1x Speed</option>
                  <option value={1.5}>1.5x Speed</option>
                  <option value={2.5}>2.5x Speed</option>
                  <option value={4}>4x Fast</option>
                </select>

                <button
                  onClick={resetSimulation}
                  className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
                  title="Reset Simulation Positions"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Mode Switch Toggle */}
            <div className="flex items-center bg-slate-950 border border-slate-700 rounded-lg p-0.5 text-[11px]">
              <button
                onClick={() => updateSimulationSettings({ operatingMode: 'DRY_RUN' })}
                className={`px-2.5 py-0.5 rounded-md font-extrabold transition-colors ${
                  isDryRun ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                Dry-Run Mode
              </button>
              <button
                onClick={() => updateSimulationSettings({ operatingMode: 'LIVE' })}
                className={`px-2.5 py-0.5 rounded-md font-extrabold transition-colors ${
                  !isDryRun ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Live Mode
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Header Row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
        {/* Brand Logo */}
        <button
          onClick={() => setActiveView('LANDING')}
          className="flex items-center gap-3 text-left group focus:outline-none"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-700 flex items-center justify-center shadow-lg shadow-sky-900/40 group-hover:scale-105 transition-transform">
            <BusIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight text-white">CIBUS CEBU</span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                Transit Platform
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Il Corso (SRP) ↔ Downtown / Fuente ↔ N. Escario ↔ Cebu IT Park
            </p>
          </div>
        </button>

        {/* Navigation Links & Status */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
              wsConnected
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
            }`}
            title={wsConnected ? 'Real-Time WebSocket Connected' : 'Reconnecting to Real-Time Server...'}
          >
            <Radio className={`w-3.5 h-3.5 ${wsConnected ? 'animate-pulse text-emerald-400' : 'text-amber-400'}`} />
            <span className="hidden md:inline">{wsConnected ? 'Live Sync Active' : 'Connecting...'}</span>
          </div>

          <button
            onClick={() => setActiveView('PASSENGER')}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors ${
              activeView === 'PASSENGER'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Commuter Map</span>
          </button>

          <button
            onClick={() => setActiveView('DRIVER')}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors ${
              activeView === 'DRIVER'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Driver / Conductor</span>
          </button>

          <button
            onClick={() => setActiveView('ADMIN')}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors ${
              activeView === 'ADMIN'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Dispatcher Admin</span>
          </button>

          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="hidden lg:block text-right">
                <div className="text-xs font-semibold text-white leading-tight">{user.fullName}</div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-sky-400">{user.role}</div>
              </div>
              <button
                onClick={() => {
                  logout();
                  setActiveView('AUTH');
                }}
                className="p-2 rounded-lg bg-slate-800 hover:bg-rose-950/80 text-slate-300 hover:text-rose-300 border border-slate-700 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setActiveView('AUTH')}
              className="px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white shadow-md flex items-center gap-1.5"
            >
              <UserCheck className="w-4 h-4" />
              <span>Sign In / Role Switch</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
