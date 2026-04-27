const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const path = require('path');
const { sequelize } = require('./config/config');

// Initialize express app
const app = express();

// ============================================
// MIDDLEWARE
// ============================================

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
    origin: function (origin, callback) {
        return callback(null, true);
    },
    optionsSuccessStatus: 200,
    credentials: true
}));

// Cookie parser for JWT tokens
app.use(cookieParser());

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan('dev'));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Audit Middleware
const auditMiddleware = require('./src/middleware/audit_middleware');
app.use(auditMiddleware);

// ============================================
// ROUTES IMPORT
// ============================================

// Routes
const routes = require('./src/routes');

// ============================================
// API ROUTES REGISTRATION
// ============================================

// Middleware to attach io to requests (will be set by server.js)
app.use((req, res, next) => {
    req.io = app.get('io');
    next();
});

// Health check
app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString()
    });
});

// All routes
app.use('/api', routes);

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use((req, res, next) => {
    res.status(404).json({
        success: false,
        message: 'Route not found',
        path: req.originalUrl
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    if (process.env.NODE_ENV === 'development') {
        console.error(err.stack);
    }

    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// ============================================
// DATABASE CONNECTION & SCHEDULER INITIALIZATION
// ============================================

// Import schedulers
const { initAllSchedulers } = require('./src/schedulers');

const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connected successfully');
        // NOTE: Using sync() without alter to avoid PostgreSQL USING clause syntax errors
        // Run migrations separately for schema changes
        //await sequelize.sync();
        //console.log('✅ Database synchronized successfully');

        // Initialize schedulers after successful DB connection
        console.log('\n🔄 Starting scheduler initialization...');
        initAllSchedulers();
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        process.exit(1);
    }
};

connectDB();


module.exports = app;
