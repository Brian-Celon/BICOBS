const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');

// 1. Load environment variables
dotenv.config();

// 2. Connect to MongoDB
connectDB();

// 3. Initialize Express app
const app = express();

// 4. Core Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 5. Health Check Route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'BICOBS Backend API is operational',
    timestamp: new Date().toISOString()
  });
});

// 6. Routes
app.use('/api/auth', require('./routes/authRoutes'));

// 7. 404 Route Handler
app.use((req, res, next) => {
  res.status(404).json({
    status: 'error',
    message: `Route not found: ${req.originalUrl}`
  });
});

// 7. Global Error Middleware
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]', err);
  res.status(err.status || 500).json({
    status: 'error',
    message: err.message || 'Internal Server Error'
  });
});

// 8. Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`[Server] Running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
