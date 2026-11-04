import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { db } from './db';

export type RealtimeEventType =
  | 'INITIAL_STATE'
  | 'BUS_GPS_UPDATED'
  | 'SEAT_AVAILABILITY_UPDATED'
  | 'WAITING_REQUEST_UPDATED'
  | 'BOARDING_CONFIRMED'
  | 'TRIP_STATUS_CHANGED'
  | 'PAYMENT_AND_TICKET_UPDATED'
  | 'ADMIN_CONFIG_UPDATED';

export interface RealtimePayload {
  type: RealtimeEventType;
  timestamp: string;
  data?: unknown;
}

class RealtimeHub {
  private wss: WebSocketServer | null = null;

  public attach(server: Server): void {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket) => {
      db.expireOutdatedWaitingRequests();
      ws.send(
        JSON.stringify({
          type: 'INITIAL_STATE',
          timestamp: new Date().toISOString(),
          data: this.buildSnapshot(),
        })
      );
    });
  }

  public buildSnapshot() {
    db.expireOutdatedWaitingRequests();
    return {
      simulationSettings: db.state.simulationSettings,
      buses: db.getEnrichedBuses(),
      routes: db.getEnrichedRoutes(),
      stops: db.state.busStops,
      waitingRequests: db.state.waitingRequests.map((r) => ({
        ...r,
        boardingStopName: db.state.busStops.find((s) => s.id === r.boardingStopId)?.stopName,
        destinationStopName: db.state.busStops.find((s) => s.id === r.destinationStopId)?.stopName,
        routeCode: db.state.busRoutes.find((rt) => rt.id === r.routeId)?.routeCode,
      })),
      activeTrips: db.state.trips.filter((t) => t.status === 'ACTIVE'),
      boardingRecords: db.state.boardingRecords.slice(-50).reverse(),
    };
  }

  public broadcast(type: RealtimeEventType, extraData?: unknown): void {
    if (!this.wss) return;
    const message = JSON.stringify({
      type,
      timestamp: new Date().toISOString(),
      data: {
        snapshot: this.buildSnapshot(),
        event: extraData,
      },
    });

    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
}

export const realtimeHub = new RealtimeHub();
