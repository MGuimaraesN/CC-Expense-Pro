import { Request, Response } from 'express';
import * as newsService from '../services/news.service';

export const search = async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    if (!query) {
      return res.status(400).json({ message: 'Query parameter "q" is required.' });
    }
    const articles = await newsService.searchNews(query);
    res.status(200).json(articles);
  } catch (error) {
     if (error instanceof Error) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'An unexpected error occurred' });
  }
};
