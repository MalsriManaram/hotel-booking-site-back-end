import { Request, Response, NextFunction } from "express";
import UnauthorizedError  from "../../domain/errors/unauthorized-error";


export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (!(req?.auth?.sessionClaims?.role !== "admin")) {
        throw new UnauthorizedError("Forbidden");

    }
    next();
};

// this is the authorization middleware 