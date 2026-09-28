const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`[MongoDB] Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[MongoDB Error] Connection failed: ${error.message}`);
    // Do not crash hard if DB connection fails so developer can still run server without local mongo
    console.warn(`[MongoDB Warning] Server will run, but database features will fail until MongoDB is connected.`);
  }
};

module.exports = connectDB;
