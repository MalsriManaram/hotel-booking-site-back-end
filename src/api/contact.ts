import express from "express";
import { createContact } from "../application/contact";

const contactRouter = express.Router();

contactRouter.route("/").post(createContact);

export default contactRouter;
