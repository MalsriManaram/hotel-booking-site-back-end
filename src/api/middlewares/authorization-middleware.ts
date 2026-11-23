import { Request, Response, NextFunction } from "express";
import { clerkClient } from "@clerk/express";
import ForbiddenError from "../../domain/errors/forbidden-error";
import UnauthorizedError from "../../domain/errors/unauthorized-error";

// Short-lived cache for Clerk publicMetadata role lookups when JWT claims omit metadata
const roleCache = new Map<string, { isAdmin: boolean; expiresAt: number }>();
const CACHE_TTL_MS = 60_000;

export const checkIsAdminRequest = async (req: Request): Promise<boolean> => {
  const auth = (req as any)?.auth;
  const userId: string | undefined = auth?.userId;
  if (!userId) return false;

  const claims = auth?.sessionClaims;
  if (
    claims?.metadata?.role === "admin" ||
    claims?.publicMetadata?.role === "admin" ||
    claims?.role === "admin"
  ) {
    return true;
  }

  const cached = roleCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.isAdmin;
  }

  try {
    const user = await clerkClient.users.getUser(userId);
    const isUserAdmin = user?.publicMetadata?.role === "admin";
    roleCache.set(userId, {
      isAdmin: isUserAdmin,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
    return isUserAdmin;
  } catch {
    return false;
  }
};

export const isAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any)?.auth?.userId;
    if (!userId) {
      return next(new UnauthorizedError("Authentication required"));
    }

    const adminAllowed = await checkIsAdminRequest(req);
    if (!adminAllowed) {
      return next(new ForbiddenError("Admin privileges required"));
    }

    next();
  } catch (error) {
    next(error);
  }
};
