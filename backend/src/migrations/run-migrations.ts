import dotenv from 'dotenv';
import { connectDatabase } from '../config/database';
import { addCurrentVersionToFiles } from './add-current-version-to-files';
import { addFileVersionsTable } from './add-file-versions';
import { fixUtf8Encoding } from './fix-utf8-encoding';
import { addSystemFolderType } from './add-system-folder-type';
import { refactorSystemFolders } from './refactor-system-folders';
import { createUserSystemFolderTable } from './create-user-system-folder-table';
import { refactorSystemFoldersSimple } from './refactor-system-folders-simple';
import { createNotificationsTable } from './create-notifications-table';

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
    
    // Add system_folder_type column and initialize system folders
    await addSystemFolderType();
    
    // Refactor system folders into separate table
    await refactorSystemFolders();
    
    // Create user_system_folders junction table
    await createUserSystemFolderTable();
    
    // Refactor to make system folders conceptual only (no folder records for system folders)
    await refactorSystemFoldersSimple();

    // Create notifications table
    await createNotificationsTable();
    
    console.log('\n✅ All migrations completed successfully!');
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message || error);
    process.exit(1);
  }
}

runMigrations();

