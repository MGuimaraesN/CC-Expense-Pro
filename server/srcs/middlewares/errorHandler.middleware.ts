import { Request, Response, NextFunction } from 'express';

interface HttpError extends Error {
  statusCode?: number;
}

export const errorHandler = (err: HttpError, req: Request, res: Response, next: NextFunction) => {
  // Log the error for debugging purposes
  console.error(`[ERROR] ${new Date().toISOString()} - ${err.stack}`);

  // Determine the status code - default to 500
  const statusCode = err.statusCode || 500;

  // Send a standardized error response
  res.status(statusCode).json({
    message: err.message || 'Internal Server Error',
    // Optionally, you can hide the stack trace in production
    stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack,
  });
};
