import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { connectDatabase, sequelize } from './config/database';
import { setupAssociations } from './models';
import authRoutes from './routes/auth.route';
import folderRoutes from './routes/folder.route';
import fileRoutes from './routes/file.route';
import adminRoutes from './routes/admin.route';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3000;

// Middleware
// Allow multiple origins in development
const allowedOrigins = process.env.FRONTEND_URL 
  ? [process.env.FRONTEND_URL]
  : ['http://localhost:5173', 'http://localhost:5174'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies
}));
app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'DMS API is running' });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/admin', adminRoutes);

// API info endpoint
app.get('/api', (_req: Request, res: Response) => {
  res.json({ message: 'DMS API v1.0' });
});

// Initialize database and start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDatabase();
    
    // Setup model associations
    setupAssociations();

    // Sync database (create tables if they don't exist)
    // In production, use migrations instead
    if (process.env.NODE_ENV === 'development') {
      // Use force: true to drop and recreate tables (only in development)
      // Set DROP_DB_ON_START=true in .env to enable this
      if (process.env.DROP_DB_ON_START === 'true') {
        console.log('⚠️  Dropping and recreating all tables...');
        await sequelize.sync({ force: true });
      } else {
        // Use sync without alter to avoid index conflicts
        // alter: true can cause issues with MySQL's 64 index limit
        // Tables will be created if they don't exist, but won't be modified
        // Wrap in try-catch to handle index errors gracefully
        try {
          await sequelize.sync({ 
            alter: false,
            // Don't try to create indexes - they're managed via migrations
            // This prevents "Too many keys" errors
          });
          console.log('✅ Database synchronized (tables created if needed).');
        } catch (error: any) {
          // Check all possible error locations for "Too many keys" error
          const errorMessage = error?.message || '';
          const parentMessage = error?.parent?.message || '';
          const sqlMessage = error?.sql || '';
          const parentCode = error?.parent?.code || '';
          const parentErrno = error?.parent?.errno;
          
          // If it's an index error, tables likely already exist - just warn and continue
          if (errorMessage.includes('Too many keys') || 
              parentMessage.includes('Too many keys') ||
              sqlMessage.includes('Too many keys') ||
              error.code === 'ER_TOO_MANY_KEYS' ||
              parentCode === 'ER_TOO_MANY_KEYS' ||
              parentErrno === 1069 ||
              (error.name === 'SequelizeDatabaseError' && 
               (error.parent?.code === 'ER_TOO_MANY_KEYS' || error.parent?.errno === 1069))) {
            console.log('⚠️  Database tables already exist (skipping index creation due to MySQL 64 index limit).');
            console.log('⚠️  Note: Use migrations for schema changes in production.');
            // Continue anyway - tables exist, just couldn't add indexes
          } else {
            // Re-throw other errors
            console.error('❌ Database sync error:', error.message || error);
            throw error;
          }
        }
      }

      // Run migrations to add new columns to existing tables
      try {
        const { addDeviceInfoToRefreshTokens } = await import('./migrations/add-device-info-to-refresh-tokens');
        await addDeviceInfoToRefreshTokens();
      } catch (error: any) {
        // Migration might fail if table doesn't exist yet - that's okay, sync created it
        if (error.message?.includes("doesn't exist") || error.message?.includes("Unknown table")) {
          console.log('⏭️  Table doesn\'t exist yet, columns will be added on next sync');
        } else {
          console.warn('⚠️  Migration warning:', error.message);
        }
      }

      // Run migration to add username column
      try {
        const { addUsernameToUsers } = await import('./migrations/add-username-to-users');
        await addUsernameToUsers();
      } catch (error: any) {
        // Migration might fail if table doesn't exist yet - that's okay, sync created it
        if (error.message?.includes("doesn't exist") || error.message?.includes("Unknown table")) {
          console.log('⏭️  Table doesn\'t exist yet, columns will be added on next sync');
        } else {
          console.warn('⚠️  Migration warning:', error.message);
        }
      }

      // Run migration to add 2FA columns
      try {
        const { add2FAToUsers } = await import('./migrations/add-2fa-to-users');
        await add2FAToUsers();
      } catch (error: any) {
        // Migration might fail if table doesn't exist yet - that's okay, sync created it
        if (error.message?.includes("doesn't exist") || error.message?.includes("Unknown table")) {
          console.log('⏭️  Table doesn\'t exist yet, columns will be added on next sync');
        } else {
          console.warn('⚠️  Migration warning:', error.message);
        }
      }

      // Add file versioning support
      try {
        const { addCurrentVersionToFiles } = await import('./migrations/add-current-version-to-files');
        await addCurrentVersionToFiles();
      } catch (error: any) {
        if (error.message?.includes("doesn't exist") || error.message?.includes("Unknown table")) {
          console.log('⏭️  Files table doesn\'t exist yet, columns will be added on next sync');
        } else {
          console.warn('⚠️  Migration warning:', error.message);
        }
      }

      try {
        const { addFileVersionsTable } = await import('./migrations/add-file-versions');
        await addFileVersionsTable();
      } catch (error: any) {
        if (error.message?.includes("doesn't exist") || error.message?.includes("Unknown table")) {
          console.log('⏭️  Files table doesn\'t exist yet, file_versions table will be created on next sync');
        } else {
          console.warn('⚠️  Migration warning:', error.message);
        }
      }

      // Fix UTF-8 encoding for tables
      try {
        const { fixUtf8Encoding } = await import('./migrations/fix-utf8-encoding');
        await fixUtf8Encoding();
      } catch (error: any) {
        console.warn('⚠️  UTF-8 encoding migration warning:', error.message);
      }

      // Clean up expired refresh tokens on startup
      try {
        const AuthService = (await import('./services/auth.service')).default;
        const deletedCount = await AuthService.cleanupExpiredTokens();
        if (deletedCount > 0) {
          console.log(`🧹 Cleaned up ${deletedCount} expired refresh token(s)`);
        }
      } catch (error: any) {
        console.warn('⚠️  Could not clean up expired tokens:', error.message);
      }
    }
    
    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on http://localhost:${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  await sequelize.close();
  process.exit(0);
});
