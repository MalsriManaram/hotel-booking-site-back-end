import { Request, Response, NextFunction } from "express";

const GlobalErrorHandlingMiddleware = (error: Error, req: Request, res: Response, next: NextFunction) => {
    console.log(error);

    //if it is NotFound Error
    if (error.name === "NotFoundError") {
        res.status(404).json({ message: error.message });
        return;
    }
    //if it is validation error
    if (error.name === "ValidationError") {
        res.status(400).json({ message: error.message });
        return;
    }
    //if it is Unauthorized error
    if (error.name === "UnauthorizedError") {
        res.status(401).json({ message: error.message });
        return;
    }

    //if it is Forbidden error
    if (error.name === "ForbiddenError") {
        res.status(403).json({ message: error.message });
        return;
    }
    
    //if any other error
    res.status(500).json({message: "Internal server error"});
}

export default GlobalErrorHandlingMiddleware;