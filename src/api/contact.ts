import express from "express";
import {
  createContact,
  getAllContacts,
  updateContactStatus,
} from "../application/contact";
import { isAuthenticated } from "./middlewares/authentication-middleware";
import { isAdmin } from "./middlewares/authorization-middleware";
import { createRateLimiter } from "./middlewares/rate-limit-middleware";

const contactRouter = express.Router();
const contactLimiter = createRateLimiter(5, 60_000);

contactRouter
  .route("/")
  .post(contactLimiter, createContact)
  .get(isAuthenticated, isAdmin, getAllContacts);

contactRouter
  .route("/:id/status")
  .patch(isAuthenticated, isAdmin, updateContactStatus);

export default contactRouter;
