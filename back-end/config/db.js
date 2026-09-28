const mongoose = require('mongoose');
const dns = require('dns');

// Use Google/Cloudflare DNS for Windows SRV lookup fix
dns.setServers(['8.8.8.8', '1.1.1.1']);

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`[MongoDB Atlas] Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[MongoDB Error] Connection failed: ${error.message}`);
    console.warn(`[MongoDB Warning] Server will run, but database features will fail until MongoDB is connected.`);
  }
};

module.exports = connectDB;
