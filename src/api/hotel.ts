import express from "express";
import {
  getAllHotels,
  getHotelById,
  createHotel,
  deleteHotel,
  updateHotel,
  getHotelLocations,
  getHotelAvailability,
  getAdminDashboardStats,
} from "./../application/hotel";
import { isAuthenticated } from "./middlewares/authentication-middleware";
import { isAdmin } from "./middlewares/authorization-middleware";
import { createEmbeddings } from "../application/embedding";
import { retrieve, conciergeChat } from "../application/retrieve";

const hotelsRouter = express.Router();

hotelsRouter.route("/locations").get(getHotelLocations);
hotelsRouter.route("/admin/stats").get(isAuthenticated, isAdmin, getAdminDashboardStats);
hotelsRouter
  .route("/embeddings/create")
  .post(isAuthenticated, isAdmin, createEmbeddings);
hotelsRouter.route("/search/retrieve").get(retrieve);
hotelsRouter.route("/concierge").post(conciergeChat);

hotelsRouter
  .route("/")
  .get(getAllHotels)
  .post(isAuthenticated, isAdmin, createHotel);

hotelsRouter.route("/:id/availability").get(getHotelAvailability);

hotelsRouter
  .route("/:id")
  .get(getHotelById)
  .put(isAuthenticated, isAdmin, updateHotel)
  .delete(isAuthenticated, isAdmin, deleteHotel);

export default hotelsRouter;
