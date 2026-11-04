import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  Bell,
  User as UserIcon,
  ChevronDown,
  Play,
  Pause,
  RotateCcw,
  Radio,
  LogOut,
  Smartphone,
  Shield,
  Compass,
  UserCheck,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../context/RealtimeContext';
import { AppView, PassengerSection } from './Sidebar';

interface TopBarProps {
  activeView: AppView;
  setActiveView: (v: AppView) => void;
  setActivePassengerSection: (s: PassengerSection) => void;
  onToggleSidebar: () => void;
  onOpenQuickWaiting?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeView,
  setActiveView,
  setActivePassengerSection,
  onToggleSidebar,
  onOpenQuickWaiting,
}) => {
  const { user, logout } = useAuth();
  const { wsConnected, simulationSettings, updateSimulationSettings, resetSimulation, waitingRequests } =
    useRealtime();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const isDryRun = simulationSettings.operatingMode === 'DRY_RUN';

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[#E2E8F0] shadow-2xs">
      <div className="px-3 sm:px-6 h-14 flex items-center justify-between gap-2">
        {/* Left: Sidebar Toggle & Compact Simulation Status/Controls */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-lg text-[#102542] hover:bg-[#F4F7FB] border border-transparent hover:border-[#E2E8F0] transition-colors"
            title="Toggle Navigation Sidebar"
            aria-label="Toggle Navigation Sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Compact Operating Mode & Dry-Run Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-1">
            <div className="inline-flex items-center bg-[#F4F7FB] border border-[#E2E8F0] rounded-lg p-0.5 text-[11px] shrink-0">
              <button
                onClick={() => updateSimulationSettings({ operatingMode: 'DRY_RUN' })}
                className={`px-2 py-1 rounded-md font-bold transition-colors ${
                  isDryRun
                    ? 'bg-[#0B2545] text-white shadow-2xs'
                    : 'text-[#64748B] hover:text-[#102542]'
                }`}
              >
                Dry-Run Sim
              </button>
              <button
                onClick={() => updateSimulationSettings({ operatingMode: 'LIVE' })}
                className={`px-2 py-1 rounded-md font-bold transition-colors ${
                  !isDryRun
                    ? 'bg-[#159B62] text-white shadow-2xs'
                    : 'text-[#64748B] hover:text-[#102542]'
                }`}
              >
                Live GPS
              </button>
            </div>

            {isDryRun && (
              <div className="hidden sm:flex items-center gap-1 bg-[#EAF4FF] border border-[#268DE0]/25 rounded-lg px-2 py-1 text-[11px] shrink-0">
                <button
                  onClick={() => updateSimulationSettings({ enabled: !simulationSettings.enabled })}
                  className={`px-2 py-0.5 rounded font-bold flex items-center gap-1 transition-colors ${
                    simulationSettings.enabled
                      ? 'bg-[#268DE0] text-white'
                      : 'bg-[#159B62] text-white'
                  }`}
                  title={simulationSettings.enabled ? 'Pause Simulated Buses' : 'Resume Simulated Buses'}
                >
                  {simulationSettings.enabled ? (
                    <>
                      <Pause className="w-3 h-3 fill-current" />
                      <span className="hidden md:inline">Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3 fill-current" />
                      <span className="hidden md:inline">Resume</span>
                    </>
                  )}
                </button>

                <select
                  value={simulationSettings.speedMultiplier}
                  onChange={(e) => updateSimulationSettings({ speedMultiplier: Number(e.target.value) })}
                  className="bg-white text-[#102542] text-[11px] font-bold rounded px-1.5 py-0.5 border border-[#E2E8F0] focus:outline-none"
                  title="Simulation Speed"
                >
                  <option value={0.5}>0.5x</option>
                  <option value={1}>1x</option>
                  <option value={1.5}>1.5x</option>
                  <option value={2.5}>2.5x</option>
                  <option value={4}>4x</option>
                </select>

                <button
                  onClick={resetSimulation}
                  className="p-1 rounded hover:bg-white text-[#153E70] transition-colors"
                  title="Reset Simulated Buses & Sample Demand"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Live WebSocket Indicator */}
            <div
              className={`hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                wsConnected
                  ? 'bg-emerald-50 text-[#159B62] border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              <Radio className={`w-3 h-3 ${wsConnected ? 'animate-pulse text-[#159B62]' : 'text-amber-500'}`} />
              <span>{wsConnected ? 'Live Sync' : 'Syncing...'}</span>
            </div>
          </div>
        </div>

        {/* Right: Quick Waiting CTA, Notification Bell & User Account Menu */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {onOpenQuickWaiting && activeView === 'PASSENGER' && (
            <button
              onClick={onOpenQuickWaiting}
              className="px-3 py-1.5 rounded-lg bg-[#F59E0B] hover:bg-amber-500 text-[#0B2545] font-extrabold text-xs flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              <Users className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden sm:inline">I'm Waiting</span>
              <span className="sm:hidden">Waiting</span>
            </button>
          )}

          {/* Notification Bell */}
          <button
            onClick={() => {
              setActiveView('PASSENGER');
              setActivePassengerSection('ANNOUNCEMENTS');
            }}
            className="relative p-2 rounded-full text-[#102542] hover:bg-[#F4F7FB] transition-colors"
            title="CIBUS Service Announcements & Active Alerts"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-[#E5484D] border-2 border-white" />
            {waitingRequests.length > 0 && (
              <span className="sr-only">{waitingRequests.length} active waiting reports</span>
            )}
          </button>

          {/* Profile & Role Switch Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((o) => !o)}
              className="flex items-center gap-2 pl-1.5 pr-2 py-1 rounded-full hover:bg-[#F4F7FB] border border-transparent hover:border-[#E2E8F0] transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-[#EAF4FF] border border-[#268DE0]/30 text-[#153E70] flex items-center justify-center font-bold text-xs">
                {user ? user.fullName.charAt(0).toUpperCase() : <UserIcon className="w-4 h-4 text-[#64748B]" />}
              </div>
              <div className="hidden md:block text-left">
                <div className="text-xs font-bold text-[#102542] leading-tight max-w-[130px] truncate">
                  {user ? user.fullName : 'Commuter Guest'}
                </div>
                <div className="text-[10px] font-semibold text-[#64748B] leading-tight">
                  {user ? user.role : isDryRun ? 'Dry-Run Mode' : 'Passenger'}
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-[#64748B]" />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-[#E2E8F0] rounded-2xl shadow-elevated py-2 z-50 text-xs">
                <div className="px-4 py-2.5 border-b border-[#E2E8F0]">
                  <div className="font-extrabold text-[#102542] text-sm">
                    {user ? user.fullName : 'CIBUS Cebu Demo User'}
                  </div>
                  <div className="text-[#64748B] text-[11px] truncate">
                    {user ? user.email : 'Zero-setup Dry-Run testing active'}
                  </div>
                </div>

                <div className="py-1">
                  <div className="px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                    Switch Platform View
                  </div>
                  <button
                    onClick={() => {
                      setActiveView('PASSENGER');
                      setActivePassengerSection('DASHBOARD');
                      setDropdownOpen(false);
                    }}
                    className={`w-full px-4 py-2 text-left flex items-center gap-2.5 font-semibold hover:bg-[#F4F7FB] ${
                      activeView === 'PASSENGER' ? 'text-[#268DE0] bg-[#EAF4FF]/60' : 'text-[#102542]'
                    }`}
                  >
                    <Compass className="w-4 h-4" />
                    <span>Commuter Tracker Dashboard</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveView('DRIVER');
                      setDropdownOpen(false);
                    }}
                    className={`w-full px-4 py-2 text-left flex items-center gap-2.5 font-semibold hover:bg-[#F4F7FB] ${
                      activeView === 'DRIVER' ? 'text-[#268DE0] bg-[#EAF4FF]/60' : 'text-[#102542]'
                    }`}
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>Driver / Conductor Console</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveView('ADMIN');
                      setDropdownOpen(false);
                    }}
                    className={`w-full px-4 py-2 text-left flex items-center gap-2.5 font-semibold hover:bg-[#F4F7FB] ${
                      activeView === 'ADMIN' ? 'text-[#268DE0] bg-[#EAF4FF]/60' : 'text-[#102542]'
                    }`}
                  >
                    <Shield className="w-4 h-4" />
                    <span>Dispatcher Admin Console</span>
                  </button>
                </div>

                {isDryRun && (
                  <div className="px-4 py-2 border-t border-[#E2E8F0] bg-[#F4F7FB]/70 sm:hidden space-y-1.5">
                    <div className="text-[10px] font-bold uppercase text-[#64748B]">Simulation Controls</div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => updateSimulationSettings({ enabled: !simulationSettings.enabled })}
                        className="flex-1 py-1.5 rounded-lg bg-[#268DE0] text-white font-bold text-center"
                      >
                        {simulationSettings.enabled ? 'Pause Sim' : 'Resume Sim'}
                      </button>
                      <button
                        onClick={resetSimulation}
                        className="px-2.5 py-1.5 rounded-lg bg-white border border-[#E2E8F0] text-[#102542] font-bold"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                )}

                <div className="border-t border-[#E2E8F0] pt-1 mt-1">
                  <button
                    onClick={() => {
                      setActiveView('AUTH');
                      setDropdownOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left flex items-center gap-2.5 font-semibold text-[#153E70] hover:bg-[#F4F7FB]"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>{user ? 'Switch Role / Account' : 'Sign In / Role Switcher'}</span>
                  </button>
                  {user && (
                    <button
                      onClick={() => {
                        logout();
                        setDropdownOpen(false);
                        setActiveView('AUTH');
                      }}
                      className="w-full px-4 py-2 text-left flex items-center gap-2.5 font-semibold text-[#E5484D] hover:bg-rose-50"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

