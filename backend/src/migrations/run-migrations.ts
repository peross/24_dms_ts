import dotenv from 'dotenv';
import { connectDatabase, sequelize } from '../config/database';
import { addCurrentVersionToFiles } from './add-current-version-to-files';
import { addFileVersionsTable } from './add-file-versions';
import { fixUtf8Encoding } from './fix-utf8-encoding';

dotenv.config();

async function runMigrations() {
  try {
    console.log('🔄 Connecting to database...');
    await connectDatabase();
    
    console.log('🔄 Running migrations...\n');
    
    // Add current_version column to files table
    await addCurrentVersionToFiles();
    
    // Add file_versions table
    await addFileVersionsTable();
    
    // Fix UTF-8 encoding for tables
    await fixUtf8Encoding();
    
    console.log('\n✅ All migrations completed successfully!');
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message || error);
    process.exit(1);
  }
}

runMigrations();

