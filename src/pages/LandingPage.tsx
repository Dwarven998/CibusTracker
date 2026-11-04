import React from 'react';
import {
  Users,
  Smartphone,
  ArrowRight,
  Radio,
  CheckCircle2,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { useRealtime } from '../context/RealtimeContext';
import { useAuth } from '../context/AuthContext';
import { AppView } from '../components/Sidebar';

interface LandingPageProps {
  onNavigate: (view: AppView) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  const { buses, routes, stops, waitingRequests } = useRealtime();
  const { user } = useAuth();

  const inServiceCount = buses.filter(
    (b) => b.operationalStatus === 'IN_SERVICE' || b.operationalStatus === 'DELAYED'
  ).length;
  const totalWaitingCount = waitingRequests.reduce((sum, r) => sum + r.passengerCount, 0);

  return (
    <div className="min-h-screen bg-[#F4F7FB] text-[#102542]">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-[#DCEEFF] via-[#EAF4FF] to-[#D6EBFF] border-b border-[#CFE4FA] py-10 sm:py-16">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[#268DE0]/30 text-[#153E70] text-xs font-extrabold uppercase tracking-wider shadow-2xs">
              <Radio className="w-3.5 h-3.5 animate-pulse text-[#268DE0]" />
              <span>Cebu Interim Bus Service (CIBUS) • Smart Transit Network</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-[#102542] leading-[1.15]">
              Real-Time Bus Tracking, Live Seat Counts &{' '}
              <span className="text-[#268DE0]">Commuter Demand Reporting</span> for Cebu City.
            </h1>

            <p className="text-sm sm:text-base text-[#102542]/80 max-w-2xl leading-relaxed">
              Track active CIBUS buses along the{' '}
              <strong>Il Corso (SRP) — SM Seaside — CSBT — Fuente Osmeña — Cebu IT Park</strong> corridor, check
              available seats before boarding, notify drivers with{' '}
              <strong className="text-[#0B2545]">"I'm Waiting for This Bus"</strong>, and pay your fare with verified
              digital QR tickets.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => onNavigate('PASSENGER')}
                className="px-6 py-3.5 rounded-xl bg-[#0B2545] hover:bg-[#153E70] text-white font-extrabold text-sm sm:text-base shadow-md flex items-center gap-2 transition-all"
              >
                <span>Open Live Commuter Tracker</span>
                <ArrowRight className="w-5 h-5" />
              </button>

              {!user ? (
                <button
                  onClick={() => onNavigate('AUTH')}
                  className="px-5 py-3.5 rounded-xl bg-white hover:bg-[#F4F7FB] text-[#102542] font-bold text-sm sm:text-base border border-[#E2E8F0] shadow-2xs transition-colors"
                >
                  Sign In / Switch Role
                </button>
              ) : (
                <button
                  onClick={() =>
                    onNavigate(
                      user.role === 'ADMIN'
                        ? 'ADMIN'
                        : user.role === 'DRIVER' || user.role === 'CONDUCTOR'
                        ? 'DRIVER'
                        : 'PASSENGER'
                    )
                  }
                  className="px-5 py-3.5 rounded-xl bg-[#159B62] hover:bg-emerald-700 text-white font-bold text-sm sm:text-base transition-colors"
                >
                  Go to My {user.role} Console
                </button>
              )}
            </div>

            {/* Live Corridor Snapshot Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-3.5 shadow-card">
                <div className="text-xs font-semibold text-[#64748B]">CIBUS Fleet Tracked</div>
                <div className="text-2xl font-black text-[#102542] mt-0.5">
                  {inServiceCount} <span className="text-xs font-normal text-[#64748B]">/ {buses.length} active</span>
                </div>
              </div>
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-3.5 shadow-card">
                <div className="text-xs font-semibold text-[#64748B]">CIBUS Corridor Stops</div>
                <div className="text-2xl font-black text-[#268DE0] mt-0.5">{stops.length}</div>
              </div>
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-3.5 shadow-card">
                <div className="text-xs font-semibold text-[#64748B]">Active Corridor Routes</div>
                <div className="text-2xl font-black text-[#159B62] mt-0.5">{routes.length}</div>
              </div>
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-3.5 shadow-card">
                <div className="text-xs font-semibold text-[#64748B]">Waiting Commuters</div>
                <div className="text-2xl font-black text-[#F59E0B] mt-0.5">{totalWaitingCount} pax</div>
              </div>
            </div>
          </div>

          {/* Right Highlight Card */}
          <div className="lg:col-span-5">
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 sm:p-6 shadow-elevated space-y-4">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
                <div>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#268DE0]">
                    CIBUS Cebu Corridor Stops
                  </span>
                  <h3 className="text-lg font-extrabold text-[#102542]">Il Corso (SRP) ↔ Fuente ↔ IT Park</h3>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-[#159B62] border border-emerald-200 text-xs font-bold">
                  {stops.length} Stops
                </span>
              </div>

              <div className="space-y-2 max-h-[290px] overflow-y-auto pr-1">
                {stops.map((st, idx) => (
                  <div
                    key={st.id}
                    className="flex items-center justify-between gap-3 bg-[#F4F7FB] border border-[#E2E8F0] rounded-xl p-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-[#153E70] text-white font-bold text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-bold text-[#102542] truncate">{st.stopName}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-mono text-[#64748B]">{st.stopCode}</span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                              st.verificationStatus === 'PROVISIONAL'
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-emerald-50 text-[#159B62] border border-emerald-200'
                            }`}
                          >
                            {st.verificationStatus === 'PROVISIONAL' ? 'Provisional' : 'Verified Stop'}
                          </span>
                        </div>
                      </div>
                    </div>
                    {st.expectedWaitingPassengers > 0 && (
                      <span className="px-2 py-1 rounded-lg bg-amber-50 border border-amber-200 text-[#F59E0B] font-extrabold text-xs shrink-0">
                        {st.expectedWaitingPassengers} waiting
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <div className="p-3.5 rounded-xl bg-[#EAF4FF] border border-[#268DE0]/25 text-xs text-[#153E70] flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-[#268DE0] shrink-0 mt-0.5" />
                <span>
                  <strong>Data Integrity Guarantee:</strong> Distinguishes verified historical launch stops from
                  provisional northern segments, and clearly labels Dry-Run Simulation vs. Live GPS feeds.
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Role Cards Section */}
      <section className="py-12 max-w-[1440px] mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <h2 className="text-2xl sm:text-3xl font-black text-[#102542]">Built for Every CIBUS Cebu Role</h2>
          <p className="text-sm text-[#64748B] mt-2">
            One synchronized platform connecting commuters at bus stops, drivers and conductors on board, and CIBUS
            dispatchers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Passenger Card */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-card flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-[#EAF4FF] text-[#268DE0] flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-extrabold text-[#102542]">1. Passengers & Commuters</h3>
              <ul className="space-y-2 text-xs sm:text-sm text-[#64748B]">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#268DE0] shrink-0" />
                  <span>Track live CIBUS bus icons & approaching stop ETAs</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#268DE0] shrink-0" />
                  <span>Check real-time Available vs. Occupied seats</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#268DE0] shrink-0" />
                  <span>Report waiting group counts via "I'm Waiting for This Bus"</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#268DE0] shrink-0" />
                  <span>Pay fares & generate QR Code Digital Tickets</span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => onNavigate('PASSENGER')}
              className="mt-6 w-full py-2.5 rounded-xl bg-[#268DE0] hover:bg-[#153E70] text-white font-bold text-sm transition-colors"
            >
              Launch Commuter Interface
            </button>
          </div>

          {/* Driver/Conductor Card */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-card flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-[#159B62] flex items-center justify-center">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-extrabold text-[#102542]">2. Drivers & Conductors</h3>
              <ul className="space-y-2 text-xs sm:text-sm text-[#64748B]">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#159B62] shrink-0" />
                  <span>Touch-friendly Start Trip / End Trip & Live GPS sharing</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#159B62] shrink-0" />
                  <span>Quick +/- buttons to update remaining available seats</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#159B62] shrink-0" />
                  <span>Live Passenger Demand table per upcoming stop</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#159B62] shrink-0" />
                  <span>Confirm actual passenger boarding & validate QR tickets</span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => onNavigate('DRIVER')}
              className="mt-6 w-full py-2.5 rounded-xl bg-[#159B62] hover:bg-emerald-700 text-white font-bold text-sm transition-colors"
            >
              Open Driver / Conductor Console
            </button>
          </div>

          {/* Admin/Dispatcher Card */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-card flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-[#EAF4FF] text-[#0B2545] flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-extrabold text-[#102542]">3. Dispatchers & Admins</h3>
              <ul className="space-y-2 text-xs sm:text-sm text-[#64748B]">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#0B2545] shrink-0" />
                  <span>8 real-time operational KPI cards & occupancy charts</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#0B2545] shrink-0" />
                  <span>Dry-Run Simulation speed, dwell duration, & fleet controls</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#0B2545] shrink-0" />
                  <span>Manage buses, routes, stop coordinates, and staff</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#0B2545] shrink-0" />
                  <span>Audit PayMongo digital transactions & export CSV reports</span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => onNavigate('ADMIN')}
              className="mt-6 w-full py-2.5 rounded-xl bg-[#0B2545] hover:bg-[#153E70] text-white font-bold text-sm transition-colors"
            >
              Open Dispatcher Admin Console
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
