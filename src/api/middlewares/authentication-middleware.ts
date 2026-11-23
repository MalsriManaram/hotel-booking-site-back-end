import { Request, Response, NextFunction } from "express";
import UnauthorizedError from "../../domain/errors/unauthorized-error";

export const isAuthenticated = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = (req as any)?.auth?.userId;
  if (!userId) {
    return next(new UnauthorizedError("Authentication required"));
  }
  next();
};
