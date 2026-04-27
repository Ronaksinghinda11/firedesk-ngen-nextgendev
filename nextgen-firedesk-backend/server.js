require('dotenv').config();
const app = require('./app');
const http = require('http');
const { Server } = require('socket.io'); // Socket.IO server
const registerSocketHandlers = require('./src/sockets'); // Socket handlers

// Get port from environment or use default
const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// ============================================
// SOCKET.IO INITIALIZATION
// ============================================

// Initialize Socket.IO
const io = new Server(server, {
    cors: {
        origin: "*", // TODO: restrict in production
        methods: ["GET", "POST"],
        credentials: true,
    },
});

// Make io globally available
global.io = io;

// Register Socket.IO handlers
registerSocketHandlers(io);
console.log('🔌 Socket.IO initialized and handlers registered');

// Attach io to app for use in routes/controllers
app.set('io', io);

// ============================================
// SERVER START
// ============================================

// Start server
server.listen(PORT, () => {
    console.log(`🚀 Server running with Socket.IO on port ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 API URL: http://localhost:${PORT}/api`);
    console.log(`❤️  Health check: http://localhost:${PORT}/health`);
});

// Handle server errors
server.on('error', (error) => {
    if (error.syscall !== 'listen') {
        throw error;
    }

    switch (error.code) {
        case 'EACCES':
            console.error(`❌ Port ${PORT} requires elevated privileges`);
            process.exit(1);
            break;
        case 'EADDRINUSE':
            console.error(`❌ Port ${PORT} is already in use`);
            process.exit(1);
            break;
        default:
            throw error;
    }
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('⚠️  SIGTERM received, closing server...');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('⚠️  SIGINT received, closing server...');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});

module.exports = server;
