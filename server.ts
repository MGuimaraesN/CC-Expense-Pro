import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer as createViteServer } from 'vite';

import authRoutes from './server/routes/auth.routes';
import cardsRoutes from './server/routes/cards.routes';
import dashboardRoutes from './server/routes/dashboard.routes';
import transactionsRoutes from './server/routes/transactions.routes';
import budgetsRoutes from './server/routes/budgets.routes';
import aiRoutes from './server/routes/ai.routes';
import importRoutes from './server/routes/import.routes';
import recurringRoutes from './server/routes/recurring.routes';

import { requireAuth } from './server/middlewares/requireAuth';
import { requirePermission } from './server/middlewares/permissions';
import { prisma } from './server/services/prisma';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);

  // Trust proxy for rate limiting behind Cloud Run
  app.set('trust proxy', 1);

  // Security Middlewares
  app.use(helmet({
    contentSecurityPolicy: false, // Easier for dev/preview
    crossOriginEmbedderPolicy: false
  }));
  
  app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? (process.env.CORS_ORIGIN || false) : (process.env.CORS_ORIGIN || 'http://localhost:5173'),
    credentials: true
  }));
  app.use(express.json());

  // Rate limiting for auth
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP
    message: { error: 'Too many requests from this IP, please try again after 15 minutes' },
    validate: { xForwardedForHeader: false, trustProxy: false }
  });

  // Rate limiting for API generally
  const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 300,
    message: { error: 'Too many requests, please try again later.' },
    validate: { xForwardedForHeader: false, trustProxy: false }
  });

  // API Routes
  app.use('/api/', apiLimiter);
  app.use('/api/auth', authLimiter, authRoutes);
  
  app.use('/api/cards', cardsRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/transactions', transactionsRoutes);
  app.use('/api/budgets', budgetsRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/import', importRoutes);
  app.use('/api/recurring-rules', recurringRoutes);

  // Diagnostic Routes
  app.get('/api/diagnostics', requireAuth, requirePermission('settings.view'), async (req: any, res) => {
    try {
      const stats = await prisma.transaction.count({ where: { tenantId: req.user.tenantId } });
      const cards = await prisma.creditCard.count({ where: { tenantId: req.user.tenantId } });
      const budgets = await prisma.budget.count({ where: { tenantId: req.user.tenantId } });
      res.json({
         status: 'ok',
         database: 'PostgreSQL/SQLite',
         dbSize: 1024,
         environment: process.env.NODE_ENV,
         stats: { transactions: stats, cards, budgets }
      });
    } catch (e: any) {
      res.status(500).json({ status: 'error', error: e.message });
    }
  });

  app.get('/api/audit-logs', requireAuth, requirePermission('settings.view'), async (req: any, res) => {
    try {
      const logs = await prisma.auditLog.findMany({
         where: { tenantId: req.user.tenantId },
         orderBy: { createdAt: 'desc' },
         take: 100
      });
      res.json(logs);
    } catch(e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/backup/export', requireAuth, requirePermission('exports.create'), async (req: any, res) => {
    try {
      const tenantId = req.user.tenantId;

      await prisma.auditLog.create({
         data: { tenantId, userId: req.user.id, action: 'CREATE', entity: 'Backup', entityId: 'all' }
      });

      const cards = await prisma.creditCard.findMany({ where: { tenantId }});
      const txs = await prisma.transaction.findMany({ where: { tenantId }});
      const budgets = await prisma.budget.findMany({ where: { tenantId }});

      res.setHeader('Content-disposition', 'attachment; filename=backup.json');
      res.setHeader('Content-type', 'application/json');
      res.write(JSON.stringify({ cards, transactions: txs, budgets }, null, 2));
      res.end();
    } catch(e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Added safe cleanup route
  app.post('/api/maintenance/transactions/cleanup', requireAuth, requirePermission('settings.update'), async (req: any, res) => {
      try {
        const date = req.body.beforeDate;
        const result = await prisma.transaction.deleteMany({
          where: { tenantId: req.user.tenantId, date: { lt: new Date(date) } }
        });
        
        await prisma.auditLog.create({
           data: { tenantId: req.user.tenantId, userId: req.user.id, action: 'DELETE_BULK', entity: 'Transaction', entityId: 'cleanup' }
        });

        res.json({ success: true, count: result.count });
      } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
      }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(console.error);
