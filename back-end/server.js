const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const { connectDB } = require('./config/db');

// 1. Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

// 2. Connect to PostgreSQL (Supabase)
connectDB();

// 3. Initialize Express app
const app = express();

// 4. Core Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files at both /frontend and /
const frontendPath = path.join(__dirname, '../frontend');
app.use('/frontend', express.static(frontendPath, { dotfiles: 'allow' }));
app.use(express.static(frontendPath, { dotfiles: 'allow' }));

// Root redirect to landing page
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendPath, 'pages/index.html'), { dotfiles: 'allow' });
});

// 5. Health Check Route
const healthCheckHandler = (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'BICOBS Backend API is operational',
    timestamp: new Date().toISOString()
  });
};
app.get('/api/health', healthCheckHandler);
app.get('/health', healthCheckHandler);

// 6. Routes
const apiRouter = express.Router();
apiRouter.use('/auth', require('./routes/authRoutes'));
apiRouter.use('/products', require('./routes/productRoutes'));
apiRouter.use('/categories', require('./routes/categoryRoutes'));
apiRouter.use('/orders', require('./routes/orderRoutes'));
apiRouter.use('/billing', require('./routes/billingRoutes'));
apiRouter.use('/dashboard', require('./routes/dashboardRoutes'));
apiRouter.use('/users', require('./routes/userRoutes'));
apiRouter.use('/repairs', require('./routes/repairRoutes'));

// Mount routes on /api and root router for Vercel serverless rewrite compatibility
app.use('/api', apiRouter);
app.use(apiRouter);

// 7. 404 Route Handler
app.use((req, res, next) => {
  res.status(404).json({
    status: 'error',
    message: `Route not found: ${req.originalUrl}`
  });
});

// 8. Global Error Middleware
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]', err);
  res.status(err.status || 500).json({
    status: 'error',
    message: err.message || 'Internal Server Error'
  });
});

// 9. Start Server (Only listen if run directly or outside Vercel serverless environment)
const PORT = process.env.PORT || 5000;
if (require.main === module || (!process.env.VERCEL && process.env.NODE_ENV !== 'production')) {
  app.listen(PORT, () => {
    console.log(`[Server] Running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
}

module.exports = app;
