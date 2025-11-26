import { Request, Response } from 'express';
import * as authService from '../services/auth.service';

export const register = async (req: Request, res: Response) => {
  try {
    const user = await authService.registerUser(req.body);
    res.status(201).json(user);
  } catch (error) {
    if (error instanceof Error) {
      // Check for specific error message to return a 409 Conflict status
      if(error.message.includes('already exists')) {
        return res.status(409).json({ message: error.message });
      }
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'An unexpected error occurred' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const token = await authService.loginUser(req.body);
    res.status(200).json({ token });
  } catch (error) {
     if (error instanceof Error) {
      // Return a 401 Unauthorized status for invalid credentials
      if(error.message.includes('Invalid credentials')) {
        return res.status(401).json({ message: error.message });
      }
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'An unexpected error occurred' });
  }
};
