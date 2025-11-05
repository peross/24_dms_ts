import { sequelize } from '../config/database';

/**
 * Migration to ensure files table uses UTF-8 encoding
 */
export async function fixUtf8Encoding(): Promise<void> {
  try {
    console.log('🔄 Ensuring UTF-8 encoding for files table...');

    // Convert files table to utf8mb4
    try {
      await sequelize.query(
        "ALTER TABLE files CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
      );
      console.log('✅ Files table converted to utf8mb4');
    } catch (error: any) {
      if (error.message?.includes("doesn't exist") || 
          error.message?.includes("Unknown table")) {
        console.log('⏭️  Files table doesn\'t exist yet, will use utf8mb4 when created');
        return;
      } else {
        console.warn('⚠️  Warning converting files table:', error.message);
      }
    }

    // Convert file_versions table to utf8mb4
    try {
      await sequelize.query(
        "ALTER TABLE file_versions CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
      );
      console.log('✅ File_versions table converted to utf8mb4');
    } catch (error: any) {
      if (error.message?.includes("doesn't exist") || 
          error.message?.includes("Unknown table")) {
        console.log('⏭️  File_versions table doesn\'t exist yet, will use utf8mb4 when created');
      } else {
        console.warn('⚠️  Warning converting file_versions table:', error.message);
      }
    }

    console.log('✅ UTF-8 encoding migration completed!');
  } catch (error: any) {
    console.error('❌ UTF-8 encoding migration failed:', error.message || error);
    throw error;
  }
}

