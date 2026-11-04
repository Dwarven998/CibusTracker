import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RealtimeProvider, useRealtime } from './context/RealtimeContext';
import { Sidebar, AppView, PassengerSection } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { PassengerDashboard } from './pages/PassengerDashboard';
import { DriverDashboard } from './pages/DriverDashboard';
import { AdminDashboard } from './pages/AdminDashboard';

const AppShell: React.FC = () => {
  const { user } = useAuth();
  const { simulationSettings } = useRealtime();
  const [activeView, setActiveView] = useState<AppView>('PASSENGER');
  const [activePassengerSection, setActivePassengerSection] = useState<PassengerSection>('DASHBOARD');
  const [isSidebarOpenDesktop, setIsSidebarOpenDesktop] = useState<boolean>(true);
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState<boolean>(false);
  const [waitingTrigger, setWaitingTrigger] = useState<number>(0);
  const [ticketCount, setTicketCount] = useState<number>(0);
  const [waitingCount, setWaitingCount] = useState<number>(0);

  const isDryRun = simulationSettings.operatingMode === 'DRY_RUN';

  const handleToggleSidebar = () => {
    if (window.innerWidth < 1024) {
      setIsSidebarOpenMobile((prev) => !prev);
    } else {
      setIsSidebarOpenDesktop((prev) => !prev);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F7FB] text-[#102542] flex">
      {/* Left Vertical Navigation Sidebar (Desktop Sticky + Mobile Slide-over Drawer) */}
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        activePassengerSection={activePassengerSection}
        setActivePassengerSection={setActivePassengerSection}
        isOpenDesktop={isSidebarOpenDesktop}
        isOpenMobile={isSidebarOpenMobile}
        onCloseMobile={() => setIsSidebarOpenMobile(false)}
        waitingRequestCount={waitingCount}
        ticketCount={ticketCount}
      />

      {/* Right Main Column: Minimal White TopBar + Active Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          activeView={activeView}
          setActiveView={setActiveView}
          setActivePassengerSection={setActivePassengerSection}
          onToggleSidebar={handleToggleSidebar}
          onOpenQuickWaiting={() => {
            setActiveView('PASSENGER');
            setWaitingTrigger((n) => n + 1);
          }}
        />

        <main className="flex-1">
          {activeView === 'LANDING' && <LandingPage onNavigate={setActiveView} />}
          {activeView === 'AUTH' && (
            <AuthPage
              onSuccessNavigate={(loggedInUser) => {
                if (loggedInUser.role === 'ADMIN') setActiveView('ADMIN');
                else if (loggedInUser.role === 'DRIVER' || loggedInUser.role === 'CONDUCTOR') setActiveView('DRIVER');
                else setActiveView('PASSENGER');
              }}
            />
          )}
          {activeView === 'PASSENGER' && (
            <PassengerDashboard
              activeSection={activePassengerSection}
              onChangeSection={setActivePassengerSection}
              onRequireAuth={() => setActiveView('AUTH')}
              externalWaitingModalTrigger={waitingTrigger}
              onTicketCountChange={setTicketCount}
              onWaitingCountChange={setWaitingCount}
            />
          )}
          {activeView === 'DRIVER' &&
            (isDryRun || user?.role === 'DRIVER' || user?.role === 'CONDUCTOR' || user?.role === 'ADMIN' ? (
              <DriverDashboard />
            ) : (
              <AuthPage onSuccessNavigate={() => setActiveView('DRIVER')} />
            ))}
          {activeView === 'ADMIN' &&
            (isDryRun || user?.role === 'ADMIN' ? (
              <AdminDashboard />
            ) : (
              <AuthPage onSuccessNavigate={() => setActiveView('ADMIN')} />
            ))}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <RealtimeProvider>
        <AppShell />
      </RealtimeProvider>
    </AuthProvider>
  );
}
