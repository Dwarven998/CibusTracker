import express from 'express';
import cors from 'cors';
import http from 'http';
import dotenv from 'dotenv';
import path from 'path';
import { realtimeHub } from './ws';
import { simulationEngine } from './simulation';
import authRoutes from './routes/auth.routes';
import transitRoutes from './routes/transit.routes';
import waitingRoutes from './routes/waiting.routes';
import driverRoutes from './routes/driver.routes';
import paymentRoutes from './routes/payment.routes';
import adminRoutes from './routes/admin.routes';
import simulationRoutes from './routes/simulation.routes';

dotenv.config();

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({
      service: 'CIBUS Cebu Real-Time Platform API',
      status: 'OK',
      timestamp: new Date().toISOString(),
    });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/transit', transitRoutes);
  app.use('/api/waiting', waitingRoutes);
  app.use('/api/driver', driverRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/simulation', simulationRoutes);

  // Serve built static frontend in production if dist exists
  const distPath = path.resolve(process.cwd(), 'dist');
  app.use(express.static(distPath));

  return app;
}

const PORT = Number(process.env.PORT) || 3001;
const isDirectMain = process.argv[1]?.replace(/\\/g, '/').endsWith('server/index.ts');

if (isDirectMain) {
  const app = createApp();
  const server = http.createServer(app);
  realtimeHub.attach(server);
  simulationEngine.start();

  server.listen(PORT, () => {
    console.log(`[CIBUS Cebu Server] HTTP, WebSocket & Dry-Run Simulation listening on http://localhost:${PORT}`);
  });
}
