import { Request, Response, NextFunction } from "express";
import ForbiddenError from "../../domain/errors/forbidden-error";


export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
    if (!req?.auth.userId) {
        throw new ForbiddenError("Unauthorized");

    }
    
    next();
};

// this is the authentication middleware 