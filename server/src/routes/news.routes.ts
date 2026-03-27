import { Router } from 'express';
import * as newsController from '../controllers/news.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateToken);

// GET /api/news/search?q=...
router.get('/search', newsController.search);

export default router;
