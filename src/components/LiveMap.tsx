import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Plus, Minus, Navigation, Layers } from 'lucide-react';
import { Bus, BusRoute } from '../types/cibus';
import { EnrichedStopWithEta } from '../context/RealtimeContext';

interface LiveMapProps {
  buses: Bus[];
  routes: BusRoute[];
  stops: EnrichedStopWithEta[];
  selectedBusId: string | null;
  selectedStopId: string | null;
  selectedRouteId: string | null;
  onSelectBus: (busId: string) => void;
  onSelectStop: (stopId: string) => void;
  onOpenWaitingModalForStop?: (stopId: string) => void;
}

function createBusIcon(bus: Bus, isSelected: boolean): L.DivIcon {
  const isDelayed = bus.operationalStatus === 'DELAYED';
  const bg = isDelayed ? '#F59E0B' : '#268DE0';
  const ring = isSelected
    ? '0 0 0 4px rgba(38, 141, 224, 0.45), 0 6px 16px rgba(11, 37, 69, 0.35)'
    : '0 4px 12px rgba(11, 37, 69, 0.28)';

  return L.divIcon({
    className: 'custom-cibus-bus-marker',
    html: `
      <div style="
        display:inline-flex;
        align-items:center;
        gap:6px;
        background:${bg};
        color:#ffffff;
        padding:5px 11px;
        border-radius:9999px;
        border:2px solid #ffffff;
        box-shadow:${ring};
        font-family:'Inter',system-ui,sans-serif;
        font-size:11.5px;
        font-weight:800;
        letter-spacing:0.01em;
        white-space:nowrap;
        transform:translate(-50%, -50%);
        transition: all 0.35s linear;
      ">
        <span style="display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;background:rgba(255,255,255,0.22);border-radius:4px;font-size:10px;">🚌</span>
        <span>${bus.busCode}</span>
      </div>
    `,
    iconSize: [112, 30],
    iconAnchor: [56, 15],
  });
}

function createStopIcon(
  stop: EnrichedStopWithEta,
  role: 'START_TERMINAL' | 'DESTINATION' | 'STOP',
  isSelected: boolean
): L.DivIcon {
  if (role === 'START_TERMINAL' || role === 'DESTINATION') {
    const isOrigin = role === 'START_TERMINAL';
    const dotBg = isOrigin ? '#E5484D' : '#159B62';
    const shortLabel = stop.stopName.includes('Il Corso')
      ? 'Il Corso (SRP)'
      : stop.stopName.includes('IT Park')
      ? 'IT Park (Terminal)'
      : stop.stopName.split('(')[0].trim();

    return L.divIcon({
      className: 'custom-cibus-terminal-marker',
      html: `
        <div style="
          display:inline-flex;
          align-items:center;
          gap:6px;
          transform:translate(-14px, -50%);
          white-space:nowrap;
          pointer-events:auto;
        ">
          <div style="
            width:22px;
            height:22px;
            border-radius:50%;
            background:${dotBg};
            border:3px solid #ffffff;
            box-shadow:0 3px 8px rgba(11,37,69,0.35);
            display:flex;
            align-items:center;
            justify-content:center;
            flex-shrink:0;
          ">
            <div style="width:6px;height:6px;border-radius:50%;background:#ffffff;"></div>
          </div>
          <div style="
            background:#ffffff;
            color:#102542;
            font-family:'Inter',system-ui,sans-serif;
            font-size:12px;
            font-weight:800;
            padding:4px 10px;
            border-radius:9999px;
            border:1px solid #E2E8F0;
            box-shadow:0 4px 12px rgba(11,37,69,0.16);
          ">${shortLabel}</div>
        </div>
      `,
      iconSize: [160, 28],
      iconAnchor: [14, 14],
    });
  }

  const isProvisional = stop.verificationStatus === 'PROVISIONAL';
  const size = isSelected ? 18 : 13;
  const borderColor = isSelected ? '#0B2545' : isProvisional ? '#64748B' : '#1D63DC';
  const fillColor = isSelected ? '#268DE0' : '#FFFFFF';

  const badge =
    stop.expectedWaitingPassengers > 0
      ? `<span style="
          position:absolute;
          top:-10px;
          right:-12px;
          background:#F59E0B;
          color:#0B2545;
          font-weight:800;
          font-size:9.5px;
          padding:0.5px 4.5px;
          border-radius:999px;
          border:1.5px solid #FFFFFF;
          box-shadow:0 2px 4px rgba(0,0,0,0.2);
        ">${stop.expectedWaitingPassengers}</span>`
      : '';

  return L.divIcon({
    className: 'custom-cibus-stop-marker',
    html: `
      <div style="
        position:relative;
        width:${size}px;
        height:${size}px;
        background:${fillColor};
        border:${isSelected ? '3.5px' : '3px'} solid ${borderColor};
        border-radius:50%;
        box-shadow:0 2px 6px rgba(11,37,69,0.28);
        transform:translate(-50%, -50%);
      ">
        ${badge}
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

const MapControllerAndCustomControls: React.FC<{
  activeRoute?: BusRoute;
  selectedBus?: Bus;
  selectedStop?: EnrichedStopWithEta;
}> = ({ activeRoute, selectedBus, selectedStop }) => {
  const map = useMap();
  const lastFittedRouteIdRef = useRef<string | null>(null);

  const fitRouteBounds = () => {
    if (activeRoute?.geometrySegments && activeRoute.geometrySegments.length > 0) {
      const allCoords: [number, number][] = [];
      activeRoute.geometrySegments.forEach((seg) => {
        seg.coordinates.forEach((c) => allCoords.push(c));
      });
      if (allCoords.length > 1) {
        const bounds = L.latLngBounds(allCoords);
        map.fitBounds(bounds, { padding: [38, 38] });
      }
    }
  };

  // Fit map when initially opened or when activeRoute changes
  useEffect(() => {
    if (activeRoute && lastFittedRouteIdRef.current !== activeRoute.id) {
      fitRouteBounds();
      lastFittedRouteIdRef.current = activeRoute.id;
    }
  }, [activeRoute, map]);

  // Handle window/container resize smoothly
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 220);
    return () => clearTimeout(timer);
  });

  // Pan to user-selected stop
  useEffect(() => {
    if (selectedStop) {
      map.flyTo([selectedStop.latitude, selectedStop.longitude], 15, { duration: 0.65 });
    }
  }, [selectedStop?.id, map]);

  // Pan to user-selected bus when clicked
  useEffect(() => {
    if (selectedBus && selectedBus.lastLat !== null && selectedBus.lastLng !== null) {
      map.panTo([selectedBus.lastLat, selectedBus.lastLng], { animate: true });
    }
  }, [selectedBus?.id, map]);

  return (
    <>
      {/* Top-Left Custom Zoom & Recenter Controls matching Reference Image */}
      <div className="leaflet-top leaflet-left !top-3.5 !left-3.5 pointer-events-auto z-[400]">
        <div className="flex flex-col gap-2">
          <div className="bg-white rounded-xl shadow-md border border-[#E2E8F0] overflow-hidden flex flex-col">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                map.zoomIn();
              }}
              className="w-9 h-9 flex items-center justify-center text-[#102542] hover:bg-[#F4F7FB] border-b border-[#E2E8F0] transition-colors"
              title="Zoom In"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                map.zoomOut();
              }}
              className="w-9 h-9 flex items-center justify-center text-[#102542] hover:bg-[#F4F7FB] transition-colors"
              title="Zoom Out"
            >
              <Minus className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              fitRouteBounds();
            }}
            className="w-9 h-9 bg-white rounded-xl shadow-md border border-[#E2E8F0] flex items-center justify-center text-[#102542] hover:bg-[#F4F7FB] transition-colors"
            title="Fit Complete CIBUS Corridor"
          >
            <Navigation className="w-4 h-4 text-[#153E70] fill-current" />
          </button>
        </div>
      </div>

      {/* Top-Right Custom Layer / Reset View Button matching Reference Image */}
      <div className="leaflet-top leaflet-right !top-3.5 !right-3.5 pointer-events-auto z-[400]">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            fitRouteBounds();
          }}
          className="w-9 h-9 bg-white rounded-xl shadow-md border border-[#E2E8F0] flex items-center justify-center text-[#102542] hover:bg-[#F4F7FB] transition-colors"
          title="Recenter Route View"
        >
          <Layers className="w-4 h-4 text-[#102542]" />
        </button>
      </div>
    </>
  );
};

export const LiveMap: React.FC<LiveMapProps> = ({
  buses,
  routes,
  stops,
  selectedBusId,
  selectedStopId,
  selectedRouteId,
  onSelectBus,
  onSelectStop,
  onOpenWaitingModalForStop,
}) => {
  const cebuCenter: [number, number] = [10.301, 123.893];

  const activeRoute = routes.find((r) => r.id === selectedRouteId) || routes[0];
  const orderedRouteStops = [...(activeRoute?.stops || [])].sort((a, b) => a.stopSequence - b.stopSequence);
  const startStopId = orderedRouteStops[0]?.stopId;
  const destStopId = orderedRouteStops[orderedRouteStops.length - 1]?.stopId;

  const selectedBus = buses.find((b) => b.id === selectedBusId);
  const selectedStop = stops.find((s) => s.id === selectedStopId);

  const fallbackPolyline: [number, number][] = orderedRouteStops
    .filter((rs) => rs.stop)
    .map((rs) => [rs.stop!.latitude, rs.stop!.longitude]);

  return (
    <div className="cibus-clean-map relative w-full h-[380px] sm:h-[460px] lg:h-[510px] rounded-xl overflow-hidden border border-[#E2E8F0]">
      <MapContainer
        center={cebuCenter}
        zoom={13}
        scrollWheelZoom={true}
        zoomControl={false}
        className="w-full h-full z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapControllerAndCustomControls
          activeRoute={activeRoute}
          selectedBus={selectedBus}
          selectedStop={selectedStop}
        />

        {/* Road-Following Route Segments (Solid Blue = Verified Launch Corridor, Dashed = Provisional Extension) */}
        {activeRoute?.geometrySegments && activeRoute.geometrySegments.length > 0 ? (
          activeRoute.geometrySegments.map((seg) => {
            const isVerified = seg.verificationStatus === 'VERIFIED';
            return (
              <React.Fragment key={seg.id}>
                {/* Subtle white halo for road line readability */}
                <Polyline
                  positions={seg.coordinates}
                  pathOptions={{
                    color: '#FFFFFF',
                    weight: isVerified ? 9 : 7,
                    opacity: 0.85,
                  }}
                />
                <Polyline
                  positions={seg.coordinates}
                  pathOptions={{
                    color: isVerified ? '#1D63DC' : '#64748B',
                    weight: isVerified ? 5.5 : 4.5,
                    opacity: 0.96,
                    dashArray: isVerified ? undefined : '8, 8',
                  }}
                />
              </React.Fragment>
            );
          })
        ) : (
          fallbackPolyline.length > 1 && (
            <Polyline
              positions={fallbackPolyline}
              pathOptions={{
                color: '#1D63DC',
                weight: 5,
                opacity: 0.9,
              }}
            />
          )
        )}

        {/* Bus Stop Markers along the Route */}
        {stops.map((stop) => {
          const role: 'START_TERMINAL' | 'DESTINATION' | 'STOP' =
            stop.id === startStopId
              ? 'START_TERMINAL'
              : stop.id === destStopId
              ? 'DESTINATION'
              : 'STOP';

          const routeSeqObj = orderedRouteStops.find((rs) => rs.stopId === stop.id);

          return (
            <Marker
              key={stop.id}
              position={[stop.latitude, stop.longitude]}
              icon={createStopIcon(stop, role, stop.id === selectedStopId)}
              zIndexOffset={role !== 'STOP' ? 400 : 100}
              eventHandlers={{
                click: () => onSelectStop(stop.id),
              }}
            >
              <Popup className="cibus-popup">
                <div className="min-w-[240px] text-[#102542] p-1">
                  <div className="flex items-center justify-between gap-1.5 mb-1">
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[#EAF4FF] text-[#153E70]">
                      {routeSeqObj ? `Stop #${routeSeqObj.stopSequence}` : stop.stopCode}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                        stop.verificationStatus === 'PROVISIONAL'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-emerald-50 text-[#159B62] border border-emerald-200'
                      }`}
                    >
                      {stop.verificationStatus === 'PROVISIONAL' ? 'Provisional' : 'Verified Stop'}
                    </span>
                  </div>

                  <div className="font-extrabold text-sm text-[#102542]">{stop.stopName}</div>
                  <div className="text-[11px] font-semibold text-[#268DE0] mb-1">
                    {activeRoute?.originName} → {activeRoute?.destinationName}
                  </div>
                  <p className="text-xs text-[#64748B] mb-2 leading-snug">{stop.landmarkNotes}</p>

                  <div className="bg-[#F4F7FB] border border-[#E2E8F0] rounded-lg p-2 mb-2 text-xs">
                    <div className="flex justify-between font-bold text-[#102542]">
                      <span>Waiting Commuters:</span>
                      <span className="text-[#F59E0B] font-extrabold">{stop.expectedWaitingPassengers} pax</span>
                    </div>
                  </div>

                  {stop.approachingBuses.length > 0 && (
                    <div className="mb-2">
                      <div className="text-[10px] font-bold uppercase text-[#64748B] mb-1">Approaching Buses</div>
                      <div className="space-y-1">
                        {stop.approachingBuses.map((ab) => (
                          <div
                            key={ab.busId}
                            className="flex items-center justify-between text-xs bg-white border border-[#E2E8F0] rounded px-2 py-1"
                          >
                            <div>
                              <span className="font-bold text-[#102542]">{ab.busCode}</span>
                              <span className="text-[10px] text-[#64748B] block">
                                {ab.availableSeats}/{ab.totalCapacity} seats avail.
                              </span>
                            </div>
                            <div className="text-right">
                              {ab.etaMinutes !== null ? (
                                <span className="font-extrabold text-[#268DE0]">~{ab.etaMinutes} min</span>
                              ) : (
                                <span className="text-[10px] text-[#64748B]">{ab.statusNote}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {onOpenWaitingModalForStop && (
                    <button
                      onClick={() => onOpenWaitingModalForStop(stop.id)}
                      className="w-full py-1.5 px-3 rounded-lg bg-[#268DE0] hover:bg-[#153E70] text-white font-bold text-xs transition-colors"
                    >
                      ✋ I'm Waiting at This Stop
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Simulated / Active CIBUS Buses */}
        {buses
          .filter((b) => b.lastLat !== null && b.lastLng !== null)
          .map((bus) => {
            const nextStopEta = stops
              .find((s) => s.id === bus.nextStopId)
              ?.approachingBuses.find((ab) => ab.busId === bus.id)?.etaMinutes;

            return (
              <Marker
                key={bus.id}
                position={[bus.lastLat!, bus.lastLng!]}
                icon={createBusIcon(bus, bus.id === selectedBusId)}
                zIndexOffset={700}
                eventHandlers={{
                  click: () => onSelectBus(bus.id),
                }}
              >
                <Popup>
                  <div className="min-w-[240px] text-[#102542] p-1">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-black text-sm text-[#0B2545]">{bus.busCode}</span>
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-50 text-[#159B62] border border-emerald-200">
                        {bus.operationalStatus === 'IN_SERVICE' ? 'In Service' : bus.operationalStatus}
                      </span>
                    </div>

                    <div className="text-xs font-bold text-[#102542] mb-0.5">
                      {bus.routeName || 'CIBUS Corridor'}
                    </div>
                    <div className="text-[11px] font-semibold text-[#268DE0] mb-2">
                      {bus.currentDirection} • {bus.isDemoData ? 'DEMO GPS' : 'LIVE GPS'}
                    </div>

                    <div className="text-xs bg-[#F4F7FB] border border-[#E2E8F0] rounded-lg p-2 space-y-1 mb-2">
                      <div className="flex justify-between">
                        <span className="text-[#64748B]">Next Stop:</span>
                        <span className="font-bold text-[#102542]">
                          {bus.nextStopName?.split('(')[0] || 'Terminal'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#64748B]">Estimated Arrival:</span>
                        <span className="font-bold text-[#268DE0]">
                          {nextStopEta !== undefined && nextStopEta !== null ? `~${nextStopEta} min` : 'Approaching'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#64748B]">Available Seats:</span>
                        <span className="font-extrabold text-[#159B62]">
                          {bus.availableSeats} / {bus.totalCapacity}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#64748B]">Occupied Seats:</span>
                        <span className="font-extrabold text-[#F59E0B]">{bus.occupiedSeats}</span>
                      </div>
                    </div>

                    {onOpenWaitingModalForStop && bus.nextStopId && (
                      <button
                        onClick={() => onOpenWaitingModalForStop(bus.nextStopId!)}
                        className="w-full py-1.5 px-3 rounded-lg bg-[#268DE0] hover:bg-[#153E70] text-white font-bold text-xs transition-colors"
                      >
                        Notify {bus.busCode}: I'm Waiting
                      </button>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
      </MapContainer>
    </div>
  );
};
