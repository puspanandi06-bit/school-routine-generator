import app from './app';
import env from './config/env';
import prisma from './config/db';

const server = app.listen(env.PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Smart School Routine Generator API Server`);
  console.log(`📡 Listening on http://localhost:${env.PORT}`);
  console.log(`🛠️ Environment: ${env.NODE_ENV}`);
  console.log(`💾 Database: ${env.DATABASE_URL.startsWith('file:') ? 'SQLite' : 'PostgreSQL'}`);
  console.log(`=======================================================`);
});

// Graceful shutdown
const shutdown = async () => {
  console.log('\nShutting down gracefully...');
  server.close(async () => {
    await prisma.$disconnect();
    console.log('Database disconnected. Process exited.');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
