"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateHotel = exports.deleteHotel = exports.createHotel = exports.genarateResponse = exports.getHotelById = exports.getAllHotels = void 0;
const Hotel_1 = __importDefault(require("./../infrastructure/schemas/Hotel"));
const not_found_error_1 = __importDefault(require("../domain/errors/not-found-error"));
const validation_error_1 = __importDefault(require("../domain/errors/validation-error"));
const hotel_1 = require("../domain/dtos/hotel");
const openai_1 = __importDefault(require("openai"));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
// Get all hotels logic
const getAllHotels = async (req, res, next) => {
    try {
        const hotels = await Hotel_1.default.find();
        res.status(200).json(hotels);
        return;
    }
    catch (error) {
        next(error);
    }
};
exports.getAllHotels = getAllHotels;
// Get a specific hotel logic
const getHotelById = async (req, res, next) => {
    try {
        const hotelId = req.params.id;
        const hotel = await Hotel_1.default.findById(hotelId);
        // Validate the request
        if (!hotel) {
            throw new not_found_error_1.default("Hotel not found");
        }
        res.status(200).json(hotel);
        return;
    }
    catch (error) {
        next(error);
    }
};
exports.getHotelById = getHotelById;
//  get a response from chatGPT.  
const genarateResponse = async (req, res, next) => {
    const { messages } = req.body;
    const client = new openai_1.default({
        apiKey: process.env.OPENAI_API_KEY,
    });
    const completion = await client.chat.completions.create({
        model: "gpt-4o",
        messages: messages.length === 1 ?
            [
                {
                    role: "system",
                    content: "you are a assistant that work as a receptionist in a hotel and you are going to talk to users and help them find the right entertainment options."
                },
                ...messages,
            ]
            : messages,
        store: true,
    });
    // console.log(completion.choices[0].message);
    res.status(200).json({
        message: [
            ...messages,
            { role: "assistant", content: completion.choices[0].message.content },
        ]
    });
};
exports.genarateResponse = genarateResponse;
// Add a new hotel logic
const createHotel = async (req, res, next) => {
    try {
        const hotel = hotel_1.CreateHotelDTO.safeParse(req.body);
        // Validate the request data
        if (!hotel.success) {
            throw new validation_error_1.default(hotel.error.message);
        }
        // Add the hotel
        await Hotel_1.default.create({
            name: hotel.data.name,
            location: hotel.data.location,
            image: hotel.data.image,
            price: parseInt(hotel.data.price),
            description: hotel.data.description,
        });
        // Return the response
        res.status(201).send();
        return;
    }
    catch (error) {
        next(error);
    }
};
exports.createHotel = createHotel;
// Delete a hotel logic
const deleteHotel = async (req, res, next) => {
    try {
        const hotelId = req.params.id;
        // Delete the hotel
        await Hotel_1.default.findByIdAndDelete(hotelId);
        // Return the response
        res.status(200).send();
        return;
    }
    catch (error) {
        next(error);
    }
};
exports.deleteHotel = deleteHotel;
// Update a hotel logic
const updateHotel = async (req, res, next) => {
    try {
        const hotelId = req.params.id;
        const updatedHotel = req.body;
        // Validate the request data
        if (!updatedHotel.name ||
            !updatedHotel.location ||
            !updatedHotel.image ||
            !updatedHotel.price ||
            !updatedHotel.description) {
            throw new validation_error_1.default("Invalid hotel data");
        }
        // Update the hotel
        await Hotel_1.default.findByIdAndUpdate(hotelId, updatedHotel);
        // Return the response
        res.status(200).send();
        return;
    }
    catch (error) {
        next(error);
    }
};
exports.updateHotel = updateHotel;
