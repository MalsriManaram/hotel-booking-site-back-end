import express from "express";
import { getAllHotels, getHotelById, createHotel, deleteHotel, updateHotel, genarateResponse } from "./../application/hotel";
import { isAuthenticated } from "./middlewares/authentication-middleware";
import { isAdmin } from "./middlewares/authorization-middleware";
import { createEmbeddings } from "../application/embedding";
import { retrieve } from "../application/retrieve";

const hotelsRouter = express.Router();


// Create the routes
hotelsRouter.route("/").get(getAllHotels).post( isAuthenticated, isAdmin, createHotel);
hotelsRouter.route("/:id").get(getHotelById).delete(deleteHotel).put(updateHotel);

hotelsRouter.route("/embeddings/create").post(createEmbeddings);
hotelsRouter.route("/search/retrieve").get(retrieve);
    
// Export the router
export default hotelsRouter;



// // Get all hotels route
// hotelsRouter.get("/", getAllHotels);

// // Get a specific hotel route
// hotelsRouter.get("/:id", getHotelById);

// // Add a new hotel route
// hotelsRouter.post("/", createHotel);

// // Delete a hotel route
// hotelsRouter.delete("/:id", deleteHotel);

// // Update a hotel route
// hotelsRouter.put("/:id", updateHotel);

