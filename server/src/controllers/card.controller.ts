import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import * as cardService from '../services/card.service';

export const listCards = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    const cards = await cardService.getCards(req.user.userId);
    res.status(200).json(cards);
  } catch (error) {
     if (error instanceof Error) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'An unexpected error occurred' });
  }
};
