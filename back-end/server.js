const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const { connectDB } = require('./config/db');
const { runHealthChecks, printHealthReport } = require('./utils/systemHealth');

// 1. Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

// 2. Connect to PostgreSQL (Supabase)
connectDB();

// 3. Initialize Express app
const app = express();

// 4. Core Middlewares
app.use(cors());
// Vercel-safe body parser: If req.body is already parsed by Vercel serverless runtime, skip raw-body stream reading
app.use((req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    return next();
  }
  express.json({ limit: '15mb' })(req, res, (err) => {
    if (err) return next(err);
    express.urlencoded({ extended: true, limit: '15mb' })(req, res, next);
  });
});

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

// 5b. Detailed System Health: reports which component is working / not working
// (environment, database, tables, email/SMTP, frontend). Returns 503 if anything is in error.
app.get('/api/health/system', async (req, res) => {
  const report = await runHealthChecks();
  res.status(report.status === 'error' ? 503 : 200).json(report);
});


// Convenient page route for tickets and admin
app.get(['/tickets', '/tickets.html'], (req, res) => {
  res.sendFile(path.join(frontendPath, 'pages/Admin/tickets.html'));
});
app.get(['/admin', '/admin.html'], (req, res) => {
  res.sendFile(path.join(frontendPath, 'pages/Admin/dashboard.html'));
});

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
  console.error(`[Unhandled Error] ${req.method} ${req.originalUrl}`, err);

  let status = err.status || 500;
  let message = err.message || 'Internal Server Error';
  let component;

  let hint = err.hint;

  if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Invalid JSON in request body';
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    status = 401;
    component = 'auth';
  } else if (err.code === 'EMAIL_NOT_CONFIGURED' || err.command || err.code === 'EAUTH' || err.code === 'EENVELOPE' || err.code === 'ESOCKET') {
    status = 502;
    component = 'email';
    message = `Email service error${err.code ? ` (${err.code})` : ''}: ${err.message}`;
  } else if (err.code && /^(ECONNREFUSED|ENOTFOUND|ETIMEDOUT|28P01|57P01|08\w{3})$/.test(err.code)) {
    status = 503;
    component = 'database';
    message = `Database error (${err.code}): ${err.message}`;
    hint = hint || 'Check DATABASE_URL and that the database is running. See /api/health/system';
  }

  res.status(status).json({
    status: 'error',
    ...(component && { component }),
    message,
    ...(hint && { hint })
  });
});


// Prevent silent crashes: log clearly which kind of failure happened
process.on('unhandledRejection', (reason) => {
  console.error('[Unhandled Promise Rejection]', reason);
});
process.on('uncaughtException', (error) => {
  console.error('[Uncaught Exception]', error);
});

// 9. Start Server (Only listen if run directly or outside Vercel serverless environment)
const PORT = process.env.PORT || 5000;
if (require.main === module || (!process.env.VERCEL && process.env.NODE_ENV !== 'production')) {
  app.listen(PORT, () => {
    console.log(`[Server] Running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    // Startup self-test: prints exactly what is (not) working
    runHealthChecks().then(printHealthReport).catch((e) => console.error('[System Check] Failed to run:', e.message));
  });
}

module.exports = app;

