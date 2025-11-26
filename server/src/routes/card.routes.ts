import { Router } from 'express';
import * as cardController from '../controllers/card.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateToken);

// GET /api/cards
router.get('/', cardController.listCards);

export default router;
