import express from "express";
import { getAllHotels, getHotelById, createHotel, deleteHotel, updateHotel } from "./../application/hotel";

const hotelsRouter = express.Router();


// Create the routes
hotelsRouter.route("/").get(getAllHotels).post(createHotel);
hotelsRouter.route("/:id").get(getHotelById).delete(deleteHotel).put(updateHotel);
    
// Export the routerq
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

