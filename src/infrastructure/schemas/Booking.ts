import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema({
    hotelId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "Hotel", // get the hotel id from the Hotel schema
    },
    userId: {
        type: String,
        required: true,
    },
    checkIn: {
        type: Date,
        required: true,
    },
    checkOut: {
        type: Date,
        required: true,
    },
    roomNumber: {
        type: Number,
        required: true,
    },

});

// Create a model based on the schema and export it
export default mongoose.model("Booking", bookingSchema);


// const Booking = mongoose.model("Booking", bookingSchema);
// export default Booking;