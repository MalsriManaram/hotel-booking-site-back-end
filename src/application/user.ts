import { Request, Response } from "express";
import User from "./../infrastructure/schemas/User";


export const createUser = async (req: Request, res: Response) => {
    const user = req.body;

    // Validate the request data
    if (!user.name || !user.email) {
        res.status(400).send();
        return;
    }

    // Add the user
    await User.create({
        name: user.name,
        email: user.email,

    });

    // Return the response
    res.status(201).send();
    return;
};