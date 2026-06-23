import http from 'http';
import app from './app.js';
import dotenv from 'dotenv';
import connectDB from './DB/connection.js';
import { initSocket, getIo } from './modules/sockets/index.js';

dotenv.config();

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

let server = null;

// ================= ENV VALIDATION =================
const validateEnv = () => {
  const requiredEnvVars = ['MONGODB_URI'];
  const missingVars = requiredEnvVars.filter((v) => !process.env[v]);

  if (missingVars.length > 0) {
    console.error(`❌ Missing env vars: ${missingVars.join(', ')}`);
    process.exit(1);
  }
};

validateEnv();

// ================= GRACEFUL SHUTDOWN =================
const gracefulShutdown = async () => {
  console.log('\n🛑 Shutting down gracefully...');

  if (server) {
    server.close(async () => {
      console.log('✅ HTTP server closed');

      try {
        const io = getIo();
        if (io) {
          io.close(() => {
            console.log('✅ Socket.IO closed');
          });
        }

        console.log('👋 Shutdown completed');
        process.exit(0);
      } catch (err) {
        console.error('❌ Shutdown error:', err);
        process.exit(1);
      }
    });

    // Force shutdown after 10s
    setTimeout(() => {
      console.error('❌ Forced shutdown');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
};

// ================= PROCESS EVENTS =================
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown();
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Rejection:', reason);
  gracefulShutdown();
});

// ================= START SERVER =================
const start = async () => {
  try {
    await connectDB();
    console.log('✅ Database connected');

    server = http.createServer(app);

    initSocket(server);
    console.log('✅ Socket.IO initialized');

    server.listen(PORT, HOST, () => {
      console.log(`🚀 Server running on http://${HOST}:${PORT}`);
      console.log(`📡 Env: ${process.env.NODE_ENV || 'development'}`);
    });

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use`);
        process.exit(1);
      }

      console.error('❌ Server error:', error);
      process.exit(1);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

start();

export { server };