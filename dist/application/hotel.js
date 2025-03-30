"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
const getAllHotels = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const hotels = yield Hotel_1.default.find();
        res.status(200).json(hotels);
        return;
    }
    catch (error) {
        next(error);
    }
});
exports.getAllHotels = getAllHotels;
// Get a specific hotel logic
const getHotelById = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const hotelId = req.params.id;
        const hotel = yield Hotel_1.default.findById(hotelId);
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
});
exports.getHotelById = getHotelById;
//  get a response from chatGPT.  
const genarateResponse = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { messages } = req.body;
    const client = new openai_1.default({
        apiKey: process.env.OPENAI_API_KEY,
    });
    const completion = yield client.chat.completions.create({
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
});
exports.genarateResponse = genarateResponse;
// Add a new hotel logic
const createHotel = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const hotel = hotel_1.CreateHotelDTO.safeParse(req.body);
        // Validate the request data
        if (!hotel.success) {
            throw new validation_error_1.default(hotel.error.message);
        }
        // Add the hotel
        yield Hotel_1.default.create({
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
});
exports.createHotel = createHotel;
// Delete a hotel logic
const deleteHotel = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const hotelId = req.params.id;
        // Delete the hotel
        yield Hotel_1.default.findByIdAndDelete(hotelId);
        // Return the response
        res.status(200).send();
        return;
    }
    catch (error) {
        next(error);
    }
});
exports.deleteHotel = deleteHotel;
// Update a hotel logic
const updateHotel = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
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
        yield Hotel_1.default.findByIdAndUpdate(hotelId, updatedHotel);
        // Return the response
        res.status(200).send();
        return;
    }
    catch (error) {
        next(error);
    }
});
exports.updateHotel = updateHotel;
