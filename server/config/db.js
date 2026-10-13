const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    // MONGO_URI comes from .env so the password is never inside the code
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection failed: ${error.message}`);
    process.exit(1); // the app is useless without a database, so stop
  }
};

module.exports = connectDB;
