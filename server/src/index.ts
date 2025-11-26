import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';

import authRoutes from './routes/auth.routes';
import transactionRoutes from './routes/transaction.routes';
import cardRoutes from './routes/card.routes';
import dashboardRoutes from './routes/dashboard.routes';
import newsRoutes from './routes/news.routes';
import { errorHandler } from './middlewares/errorHandler.middleware';

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3001;

// Middlewares
app.use(express.json());

// Swagger Documentation
const swaggerDocument = YAML.load('./swagger.yaml');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/cards', cardRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/news', newsRoutes);

// Health Check Route
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'UP', timestamp: new Date().toISOString() });
});

// Error Handling Middleware - should be the last middleware
app.use(errorHandler);

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
  console.log(`[server]: API Docs available at http://localhost:${port}/api-docs`);
});

export default app;
