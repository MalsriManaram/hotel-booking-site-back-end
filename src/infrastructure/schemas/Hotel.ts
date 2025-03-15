import mongoose from "mongoose";


const hotelSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    location: {
        type: String,
        required: true,
    },
    rating: {
        type: Number,
        min: 1,
        max: 5,
    },
    reviews: {
        type: Number,

    },
    image: {
        type: String,
        required: true,
    },
    price: {
        type: Number,
        required: true,
    },
    description: {
        type: String,
        required: true,
    }
});

// Create a model based on the schema and export it
export default mongoose.model("Hotel", hotelSchema);


// const Hotel = mongoose.model("Hotel", hotelSchema);
// export default Hotel;