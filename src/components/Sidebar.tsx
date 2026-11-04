import React from 'react';
import {
  Bus as BusIcon,
  Home,
  MapPin,
  GitFork,
  Armchair,
  CreditCard,
  Ticket,
  Bell,
  Users,
  Smartphone,
  Shield,
  X,
  Compass,
} from 'lucide-react';

export type PassengerSection =
  | 'DASHBOARD'
  | 'LIVE_TRACKER'
  | 'ROUTES_STOPS'
  | 'SEAT_AVAILABILITY'
  | 'PAY_FARE'
  | 'TICKETS_HISTORY'
  | 'ANNOUNCEMENTS'
  | 'MY_REQUESTS'
  | 'PROFILE';

export type AppView = 'LANDING' | 'AUTH' | 'PASSENGER' | 'DRIVER' | 'ADMIN';

interface SidebarProps {
  activeView: AppView;
  setActiveView: (view: AppView) => void;
  activePassengerSection: PassengerSection;
  setActivePassengerSection: (section: PassengerSection) => void;
  isOpenDesktop: boolean;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  waitingRequestCount?: number;
  ticketCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  setActiveView,
  activePassengerSection,
  setActivePassengerSection,
  isOpenDesktop,
  isOpenMobile,
  onCloseMobile,
  waitingRequestCount = 0,
  ticketCount = 0,
}) => {
  const commuterNavItems: {
    id: PassengerSection;
    label: string;
    icon: React.FC<{ className?: string }>;
    badge?: number | 'dot';
  }[] = [
    { id: 'DASHBOARD', label: 'Dashboard', icon: Home },
    { id: 'LIVE_TRACKER', label: 'Live Tracker', icon: MapPin },
    { id: 'ROUTES_STOPS', label: 'Routes & Stops', icon: GitFork },
    { id: 'SEAT_AVAILABILITY', label: 'Seat Availability', icon: Armchair },
    { id: 'PAY_FARE', label: 'Pay Fare', icon: CreditCard },
    {
      id: 'TICKETS_HISTORY',
      label: 'Tickets & History',
      icon: Ticket,
      badge: ticketCount > 0 ? ticketCount : undefined,
    },
    { id: 'ANNOUNCEMENTS', label: 'Announcements', icon: Bell, badge: 'dot' },
  ];

  const handleSelectPassengerSection = (section: PassengerSection) => {
    setActiveView('PASSENGER');
    setActivePassengerSection(section);
    onCloseMobile();
  };

  const handleSelectRoleView = (view: AppView) => {
    setActiveView(view);
    onCloseMobile();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#0B2545] text-white select-none overflow-y-auto no-scrollbar">
      {/* Top Brand Header */}
      <div className="px-5 pt-6 pb-5 flex items-center justify-between">
        <button
          onClick={() => handleSelectPassengerSection('DASHBOARD')}
          className="flex items-center gap-3 text-left group focus:outline-none"
        >
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-md shrink-0 group-hover:scale-105 transition-transform">
            <BusIcon className="w-6 h-6 text-[#0B2545]" />
          </div>
          <div>
            <div className="font-extrabold text-[17px] tracking-tight text-white leading-none">
              CIBUS CEBU
            </div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-200/80 mt-1">
              TRANSIT PLATFORM
            </div>
          </div>
        </button>

        {/* Close button on mobile drawer */}
        <button
          onClick={onCloseMobile}
          className="lg:hidden p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Close navigation menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Commuter Navigation */}
      <nav className="px-3.5 space-y-1 flex-1">
        {commuterNavItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            activeView === 'PASSENGER' &&
            (activePassengerSection === item.id ||
              (item.id === 'DASHBOARD' && activePassengerSection === 'MY_REQUESTS'));

          return (
            <button
              key={item.id}
              onClick={() => handleSelectPassengerSection(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[13.5px] font-semibold transition-all ${
                isActive
                  ? 'bg-[#268DE0] text-white shadow-sm'
                  : 'text-slate-200/90 hover:bg-[#153E70]/70 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="relative flex items-center justify-center">
                  <Icon className="w-[18px] h-[18px] shrink-0" />
                  {item.badge === 'dot' && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#E5484D] ring-2 ring-[#0B2545]" />
                  )}
                </div>
                <span>{item.label}</span>
              </div>
              {typeof item.badge === 'number' && item.badge > 0 && (
                <span
                  className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                    isActive ? 'bg-white text-[#0B2545]' : 'bg-[#153E70] text-sky-200'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* Operations & Role Consoles Switcher */}
        <div className="pt-4 mt-4 border-t border-white/10">
          <div className="px-3.5 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-sky-200/60">
            Operations & Roles
          </div>
          <button
            onClick={() => handleSelectRoleView('DRIVER')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-semibold transition-all ${
              activeView === 'DRIVER'
                ? 'bg-[#268DE0] text-white shadow-sm'
                : 'text-slate-300 hover:bg-[#153E70]/70 hover:text-white'
            }`}
          >
            <Smartphone className="w-[18px] h-[18px] shrink-0" />
            <span>Driver / Conductor</span>
          </button>

          <button
            onClick={() => handleSelectRoleView('ADMIN')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-semibold transition-all mt-1 ${
              activeView === 'ADMIN'
                ? 'bg-[#268DE0] text-white shadow-sm'
                : 'text-slate-300 hover:bg-[#153E70]/70 hover:text-white'
            }`}
          >
            <Shield className="w-[18px] h-[18px] shrink-0" />
            <span>Dispatcher Admin</span>
          </button>

          <button
            onClick={() => handleSelectRoleView('LANDING')}
            className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-[12.5px] font-medium transition-all mt-1 ${
              activeView === 'LANDING'
                ? 'bg-[#268DE0] text-white shadow-sm'
                : 'text-slate-300/80 hover:bg-[#153E70]/70 hover:text-white'
            }`}
          >
            <Compass className="w-[17px] h-[17px] shrink-0" />
            <span>Platform Overview</span>
          </button>
        </div>
      </nav>

      {/* Bottom Commuter Hub Card & CIBUS Bus Showcase */}
      <div className="mt-4 px-3.5 pb-4 space-y-3">
        <button
          onClick={() => handleSelectPassengerSection('DASHBOARD')}
          className="w-full text-left rounded-xl bg-[#153E70]/90 hover:bg-[#153E70] border border-white/10 p-3.5 flex items-center gap-3 transition-colors shadow-sm"
        >
          <div className="w-9 h-9 rounded-lg bg-[#268DE0]/25 border border-[#268DE0]/40 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-sky-300" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-white leading-snug">Commuter Hub</div>
            <div className="text-[11px] text-sky-200/80 truncate">
              Track • Plan • Ride {waitingRequestCount > 0 ? `(${waitingRequestCount} active)` : ''}
            </div>
          </div>
        </button>

        {/* Bottom CIBUS Cebu Bus & CCLEX Visual Banner */}
        <div className="relative rounded-xl overflow-hidden border border-white/10 h-28 bg-gradient-to-b from-[#153E70] to-[#081A33]">
          <svg
            viewBox="0 0 260 120"
            className="w-full h-full object-cover"
            preserveAspectRatio="xMidYMid slice"
          >
            <defs>
              <linearGradient id="cebuSky" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1E4E8C" />
                <stop offset="65%" stopColor="#3B82F6" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#0B2545" />
              </linearGradient>
            </defs>
            <rect width="260" height="120" fill="url(#cebuSky)" />
            {/* Subtle CCLEX cable-stayed bridge silhouette in background */}
            <path
              d="M160 82 L185 26 L190 26 L195 82 Z"
              fill="rgba(255,255,255,0.22)"
            />
            <line x1="187" y1="30" x2="135" y2="82" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
            <line x1="187" y1="38" x2="148" y2="82" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
            <line x1="188" y1="30" x2="240" y2="82" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
            <line x1="188" y1="38" x2="225" y2="82" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
            {/* Roadway */}
            <polygon points="0,85 260,82 260,120 0,120" fill="#0F294A" />
            <line x1="0" y1="102" x2="260" y2="95" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" strokeDasharray="8,6" />
            {/* Modern Blue & White CIBUS Cebu Transit Bus */}
            <g transform="translate(22, 46)">
              <rect x="0" y="6" width="142" height="38" rx="6" fill="#E2E8F0" />
              <path d="M0 24 L142 24 L142 38 C142 41 140 44 136 44 L6 44 C2 44 0 41 0 38 Z" fill="#268DE0" />
              {/* Bus Windows */}
              <rect x="6" y="10" width="22" height="13" rx="2" fill="#0B2545" />
              <rect x="31" y="10" width="24" height="13" rx="2" fill="#0B2545" />
              <rect x="58" y="10" width="24" height="13" rx="2" fill="#0B2545" />
              <rect x="85" y="10" width="24" height="13" rx="2" fill="#0B2545" />
              <rect x="112" y="9" width="25" height="16" rx="2.5" fill="#081A33" />
              {/* Headlights & CIBUS Label */}
              <rect x="136" y="32" width="5" height="4" rx="1" fill="#FDE047" />
              <text x="58" y="35" fill="#FFFFFF" fontSize="7.5" fontWeight="800" letterSpacing="0.8">
                CIBUS CEBU
              </text>
              {/* Wheels */}
              <circle cx="30" cy="44" r="7.5" fill="#081A33" stroke="#94A3B8" strokeWidth="2.5" />
              <circle cx="108" cy="44" r="7.5" fill="#081A33" stroke="#94A3B8" strokeWidth="2.5" />
            </g>
          </svg>
          <div className="absolute bottom-1.5 left-2.5 right-2.5 flex items-center justify-between text-[10px] font-bold text-white/90 drop-shadow">
            <span>SRP • Fuente • IT Park</span>
            <span className="px-1.5 py-0.5 rounded bg-[#0B2545]/80 text-sky-300">CBRT Link</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar */}
      <aside
        className={`hidden lg:block shrink-0 transition-all duration-300 ease-in-out bg-[#0B2545] border-r border-[#153E70]/50 ${
          isOpenDesktop ? 'w-64' : 'w-0 overflow-hidden border-r-0'
        }`}
      >
        <div className="w-64 h-screen sticky top-0">{sidebarContent}</div>
      </aside>

      {/* Mobile & Tablet Off-Canvas Drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-[#0B2545]/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <aside className="relative z-10 w-64 max-w-[82vw] h-full shadow-2xl">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
};

