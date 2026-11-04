import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { CheckCircle2, ShieldCheck, Bus, MapPin, ArrowRight } from 'lucide-react';
import { DigitalTicket } from '../types/cibus';

interface DigitalTicketCardProps {
  ticket: DigitalTicket;
}

export const DigitalTicketCard: React.FC<DigitalTicketCardProps> = ({ ticket }) => {
  const isPaid = ticket.paymentStatus === 'PAID';
  const isValidated = ticket.validationStatus === 'VALIDATED_ON_BOARD';

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-card">
      {/* Top Banner */}
      <div
        className={`px-5 py-3 flex items-center justify-between ${
          isValidated
            ? 'bg-[#159B62] text-white'
            : isPaid
            ? 'bg-[#0B2545] text-white'
            : 'bg-[#F59E0B] text-[#0B2545]'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <Bus className="w-5 h-5" />
          <div>
            <div className="text-xs font-extrabold uppercase tracking-wider">CIBUS CEBU DIGITAL TICKET</div>
            <div className="text-[11px] opacity-90 font-mono">{ticket.ticketReference}</div>
          </div>
        </div>
        <span
          className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
            isValidated
              ? 'bg-white/20 text-white'
              : isPaid
              ? 'bg-[#268DE0] text-white'
              : 'bg-black/15 text-[#0B2545]'
          }`}
        >
          {isValidated ? 'VALIDATED ON BOARD' : ticket.paymentStatus.replace(/_/g, ' ')}
        </span>
      </div>

      {/* Body */}
      <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
        <div className="sm:col-span-2 space-y-3">
          <div>
            <div className="text-[11px] font-bold uppercase text-[#64748B]">Route Corridor</div>
            <div className="text-sm font-extrabold text-[#102542]">
              {ticket.routeCode ? `[${ticket.routeCode}] ` : ''}
              {ticket.routeName || 'CIBUS Cebu Corridor'}
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs bg-[#F4F7FB] border border-[#E2E8F0] rounded-xl p-3">
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-[#64748B] uppercase font-bold flex items-center gap-1">
                <MapPin className="w-3 h-3 text-[#268DE0]" /> Origin
              </div>
              <div className="font-bold text-[#102542] truncate">{ticket.originStopName || ticket.originStopId}</div>
            </div>
            <ArrowRight className="w-4 h-4 text-[#64748B] shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-[#64748B] uppercase font-bold flex items-center gap-1">
                <MapPin className="w-3 h-3 text-[#159B62]" /> Destination
              </div>
              <div className="font-bold text-[#102542] truncate">
                {ticket.destinationStopName || ticket.destinationStopId}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="bg-[#F4F7FB] border border-[#E2E8F0] rounded-lg p-2.5">
              <div className="text-[10px] text-[#64748B] font-semibold">Fare Paid</div>
              <div className="font-extrabold text-sm text-[#159B62]">₱{ticket.farePaidPhp.toFixed(2)}</div>
            </div>
            <div className="bg-[#F4F7FB] border border-[#E2E8F0] rounded-lg p-2.5">
              <div className="text-[10px] text-[#64748B] font-semibold">Passengers</div>
              <div className="font-extrabold text-sm text-[#102542]">{ticket.passengerCount} Pax</div>
            </div>
            <div className="bg-[#F4F7FB] border border-[#E2E8F0] rounded-lg p-2.5">
              <div className="text-[10px] text-[#64748B] font-semibold">Method</div>
              <div className="font-extrabold text-sm text-[#268DE0]">{ticket.paymentMethod}</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#64748B] pt-1">
            <span>Tx Ref: {ticket.transactionReference}</span>
            <span>Issued: {new Date(ticket.issuedAt).toLocaleString()}</span>
          </div>
        </div>

        {/* QR Code Validation Box */}
        <div className="flex flex-col items-center justify-center bg-[#F4F7FB] border border-[#E2E8F0] rounded-xl p-3.5 text-[#102542]">
          <div className="bg-white p-2 rounded-lg border border-[#E2E8F0]">
            <QRCodeSVG value={ticket.ticketReference} size={114} level="M" />
          </div>
          <div className="mt-2 text-[11px] font-mono font-bold text-[#0B2545]">{ticket.ticketReference}</div>
          <div className="text-[10px] text-[#64748B] flex items-center gap-1 mt-0.5">
            {isValidated ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-[#159B62]" />
                <span className="text-[#159B62] font-bold">Scanned by Conductor</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-[#268DE0]" />
                <span className="font-semibold">Present QR to Conductor</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
