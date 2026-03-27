import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import * as dashboardService from '../services/dashboard.service';

export const getStats = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    const stats = await dashboardService.getDashboardStats(req.user.userId);
    res.status(200).json(stats);
  } catch (error) {
     if (error instanceof Error) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'An unexpected error occurred' });
  }
};
