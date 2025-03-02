import express from "express";
import { createUser } from '../application/user.js';


const userRouter = express.Router();

// Create a user route
userRouter.route("/").post(createUser);

// Export the router
export default userRouter;