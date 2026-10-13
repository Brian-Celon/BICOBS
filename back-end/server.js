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
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Serve frontend and assets static files
const frontendPath = path.join(__dirname, '../frontend');
const assetsPath = path.join(__dirname, '../assets');
app.use('/frontend', express.static(frontendPath));
app.use('/assets', express.static(assetsPath));
app.use(express.static(frontendPath));

// Root redirect to Admin dashboard
app.get('/', (req, res) => {
  res.redirect('/frontend/pages/Admin/dashboard.html');
});

// Convenient page route for tickets
app.get(['/tickets', '/tickets.html'], (req, res) => {
  res.sendFile(path.join(frontendPath, 'pages/Admin/tickets.html'));
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
apiRouter.use('/tickets', require('./routes/ticketRoutes'));
// Direct aliases so /api/login, /api/register, /api/verify-otp, /api/me work directly
apiRouter.use('/', require('./routes/authRoutes'));

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
