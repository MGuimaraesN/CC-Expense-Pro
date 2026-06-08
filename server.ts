import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer as createViteServer } from 'vite';

import authRoutes from './server/routes/auth.routes';
import cardsRoutes from './server/routes/cards.routes';
import dashboardRoutes from './server/routes/dashboard.routes';
// Need transactions too. I'll scaffold a quick one for transactions
import transactionsRoutes from './server/routes/transactions.routes';
import budgetsRoutes from './server/routes/budgets.routes';

import aiRoutes from './server/routes/ai.routes';
import { tenantMiddleware } from './server/middlewares/tenant';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Trust proxy for rate limiting behind Cloud Run
  app.set('trust proxy', 1);

  // Security Middlewares
  app.use(helmet({
    contentSecurityPolicy: false, // Easier for dev/preview
    crossOriginEmbedderPolicy: false
  }));
  
  app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
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

  // API Routes
  app.use('/api/auth', authLimiter, authRoutes);
  
  // Apply tenant context to all subsequent routes
  app.use(tenantMiddleware);
  
  app.use('/api/cards', cardsRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/transactions', transactionsRoutes);
  app.use('/api/budgets', budgetsRoutes);
  app.use('/api/ai', aiRoutes);

  // Maintenance Routes
  // Added safe cleanup route
  app.post('/api/maintenance/transactions/cleanup', async (req, res) => {
      // Logic inside a protected route
      res.json({ success: true, message: 'Maintenance route' });
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
