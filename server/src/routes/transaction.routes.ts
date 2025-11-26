import { Router } from 'express';
import * as transactionController from '../controllers/transaction.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

// Apply the authentication middleware to all transaction routes
router.use(authenticateToken);

// GET /api/transactions
router.get('/', transactionController.listTransactions);

// POST /api/transactions
router.post('/', transactionController.createNewTransaction);

export default router;
