import express from "express";
import { getAllHotels, getHotelById, createHotel, deleteHotel, updateHotel, genarateResponse } from "./../application/hotel";
import { isAuthenticated } from "./middlewares/authentication-middleware";
import { isAdmin } from "./middlewares/authorization-middleware";
import { createEmbeddings } from "../application/embedding";
import { retrieve } from "../application/retrieve";

const hotelsRouter = express.Router();


// Create the routes
hotelsRouter.route("/").get(getAllHotels).post( isAuthenticated, isAdmin, createHotel);
hotelsRouter.route("/generate-response").post(genarateResponse);
hotelsRouter.route("/:id").get(getHotelById).delete(deleteHotel).put(updateHotel);

hotelsRouter.route("/embeddings/create").post(createEmbeddings);
hotelsRouter.route("/search/retrieve").get(retrieve);
    
// Export the router
export default hotelsRouter;

