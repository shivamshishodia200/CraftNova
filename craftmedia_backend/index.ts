import dotenv from 'dotenv';
import { createBackendApp } from './serverApp';

dotenv.config();

const PORT = Number(process.env.PORT) || 5055;

async function bootstrap() {
  try {
    const app = await createBackendApp();
    
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log('====================================================');
      console.log(`🚀 Craft Media Hub CRM Enterprise Server running on: http://localhost:${PORT}`);
      console.log(`📡 Health check endpoint: http://localhost:${PORT}/api/health`);
      console.log(`🔒 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('====================================================');
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM signal received: closing HTTP server');
      server.close(() => {
        console.log('HTTP server closed');
      });
    });
  } catch (error) {
    console.error('❌ Failed to start Craft Media Hub CRM Backend Server:', error);
    process.exit(1);
  }
}

bootstrap();
