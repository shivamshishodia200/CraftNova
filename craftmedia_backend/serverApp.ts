import path from 'path';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { db } from './database/db';
import apiRoutes from './routes/apiRoutes';
import { IntegrationSchedulerService } from './integrations/scheduler.service';
import { sessionReconciliationService } from './services/sessionReconciliationService';
import { runMultiTenantMigration } from './database/migration';
import { runMongoMigration } from './database/mongoMigration';

export async function createBackendApp() {
  const app = express();

  // Initialize in-memory mock/seed database
  await db.init();

  // Run Multi-Tenant database and historical data migration
  await runMultiTenantMigration();

  // Run MongoDB migration/sync if MONGODB_URI is provided
  if (process.env.MONGODB_URI) {
    runMongoMigration().catch(err => {
      console.warn('[MongoDB Migration] Non-blocking notice:', err.message);
    });
  }

  // Initialize background Enterprise Integrations Scheduler
  IntegrationSchedulerService.start();

  // Initialize background Work Session Reconciliation Engine
  sessionReconciliationService.start();

  // Security Headers via Helmet
  app.use(helmet({
    contentSecurityPolicy: false, // Allow frontend SPA assets and embedded media
    crossOriginResourcePolicy: { policy: "cross-origin" }
  }));

  // Serve static uploads (logos, attachments, avatars)
  app.use('/uploads', express.static(path.resolve(__dirname, 'uploads')));

  // Basic Middlewares
  app.use(cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Root welcome endpoint
  app.get('/', (req, res) => {
    res.json({
      status: 'online',
      service: 'Craft Media Hub CRM Enterprise Multi-Tenant Server API',
      health: '/api/health',
      version: '2.0.0'
    });
  });

  // API Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'Craft Media Hub CRM Enterprise Multi-Tenant Server',
      timestamp: new Date().toISOString(),
      database: db.initialized ? 'connected' : 'initializing',
      architecture: 'Multi-Tenant Isolated SaaS'
    });
  });

  // Mount central API router
  app.use('/api', apiRoutes);

  // Centralized Error Handling Middleware (Sanitized)
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error(`[Server Error] ${req.method} ${req.originalUrl}:`, err);
    const statusCode = err.status || err.statusCode || 500;
    const message = process.env.NODE_ENV === 'production' 
      ? 'An unexpected internal server error occurred' 
      : err.message || 'Internal Server Error';

    res.status(statusCode).json({
      success: false,
      message,
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
  });

  return app;
}
