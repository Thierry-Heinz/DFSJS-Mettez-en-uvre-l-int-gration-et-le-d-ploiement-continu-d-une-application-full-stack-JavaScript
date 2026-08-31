import { Request, Response, NextFunction } from 'express';
import logger from '../logger';

export function errorLogger(err: Error, req: Request, _res: Response, next: NextFunction) {
  logger.error(err.message, { stack: err.stack, path: req.originalUrl, method: req.method });
  next(err);
}