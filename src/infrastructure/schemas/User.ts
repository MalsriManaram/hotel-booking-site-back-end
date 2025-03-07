import mongoose from "mongoose";


const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
});

// Create a model based on the schema and export it
export default mongoose.model("User", userSchema);



// const User = mongoose.model("User", userSchema);
// export default User;