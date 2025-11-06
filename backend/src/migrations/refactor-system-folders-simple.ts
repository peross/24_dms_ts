import { sequelize } from '../config/database';
import { QueryTypes } from 'sequelize';

/**
 * Migration to refactor system folders to be conceptual only
 * - Add system_folder_id to folders table (required field)
 * - Remove user_system_folders table (no longer needed)
 * - System folders are now just types, not actual folder records
 */
export async function refactorSystemFoldersSimple(): Promise<void> {
  const transaction = await sequelize.transaction();

  try {
    console.log('🔄 Refactoring system folders to be conceptual only...');

    // Step 1: Add system_folder_id column to folders table (if it doesn't exist)
    console.log('🔄 Adding system_folder_id column to folders table...');
    try {
      await sequelize.query(
        `ALTER TABLE folders ADD COLUMN system_folder_id INTEGER NOT NULL DEFAULT 2`,
        { transaction }
      );
      console.log('✅ Added system_folder_id column');
    } catch (error: any) {
      if (error.message?.includes('Duplicate column') || 
          error.message?.includes('already exists')) {
        console.log('⏭️  system_folder_id column already exists');
      } else {
        throw error;
      }
    }

    // Step 2: Set default system_folder_id for existing folders
    // Default to "My Folders" (system_folder_id = 2) for existing folders
    console.log('🔄 Setting default system_folder_id for existing folders...');
    const myFoldersSystemFolder = await sequelize.query<{ system_folder_id: number }>(
      `SELECT system_folder_id FROM system_folders WHERE name = 'My Folders' LIMIT 1`,
      { type: QueryTypes.SELECT, transaction }
    );
    
    if (myFoldersSystemFolder.length > 0) {
      const myFoldersId = myFoldersSystemFolder[0].system_folder_id;
      await sequelize.query(
        `UPDATE folders SET system_folder_id = :myFoldersId WHERE system_folder_id = 0 OR system_folder_id IS NULL`,
        {
          replacements: { myFoldersId },
          type: QueryTypes.UPDATE,
          transaction,
        }
      );
      console.log('✅ Set default system_folder_id for existing folders');
    }

    // Step 3: Migrate data from user_system_folders to folders table
    // If there are folders linked via user_system_folders, update their system_folder_id
    console.log('🔄 Migrating data from user_system_folders...');
    try {
      const userSystemFolders = await sequelize.query<{ folder_id: number; system_folder_id: number }>(
        `SELECT folder_id, system_folder_id FROM user_system_folders`,
        { type: QueryTypes.SELECT, transaction }
      );

      for (const usf of userSystemFolders) {
        await sequelize.query(
          `UPDATE folders SET system_folder_id = :systemFolderId WHERE folder_id = :folderId`,
          {
            replacements: {
              systemFolderId: usf.system_folder_id,
              folderId: usf.folder_id,
            },
            type: QueryTypes.UPDATE,
            transaction,
          }
        );
      }
      console.log(`✅ Migrated ${userSystemFolders.length} folder assignments`);
    } catch (error: any) {
      if (error.message?.includes("doesn't exist") || 
          error.message?.includes("Unknown table")) {
        console.log('⏭️  user_system_folders table does not exist (already removed)');
      } else {
        console.log(`⚠️  Could not migrate from user_system_folders: ${error.message}`);
      }
    }

    // Step 4: Add foreign key constraint
    console.log('🔄 Adding foreign key constraint...');
    try {
      // Check if constraint already exists
      const constraints = await sequelize.query<{ CONSTRAINT_NAME: string }>(
        `SELECT CONSTRAINT_NAME 
         FROM information_schema.TABLE_CONSTRAINTS 
         WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'folders' 
         AND CONSTRAINT_NAME = 'fk_folders_system_folder'`,
        { type: QueryTypes.SELECT, transaction }
      );
      
      if (constraints.length === 0) {
        await sequelize.query(
          `ALTER TABLE folders ADD CONSTRAINT fk_folders_system_folder 
           FOREIGN KEY (system_folder_id) REFERENCES system_folders(system_folder_id) 
           ON DELETE RESTRICT ON UPDATE CASCADE`,
          { transaction }
        );
        console.log('✅ Added foreign key constraint');
      } else {
        console.log('⏭️  Foreign key constraint already exists');
      }
    } catch (error: any) {
      if (error.message?.includes('Duplicate') || 
          error.message?.includes('already exists') ||
          error.message?.includes('ER_FK_DUP_NAME')) {
        console.log('⏭️  Foreign key constraint already exists');
      } else {
        console.log(`⚠️  Could not add foreign key constraint: ${error.message}`);
      }
    }

    // Step 5: Remove DEFAULT from system_folder_id (make it truly required)
    console.log('🔄 Making system_folder_id required (removing default)...');
    try {
      await sequelize.query(
        `ALTER TABLE folders MODIFY COLUMN system_folder_id INTEGER NOT NULL`,
        { transaction }
      );
      console.log('✅ Made system_folder_id required');
    } catch (error: any) {
      console.log(`⚠️  Could not remove default: ${error.message}`);
    }

    // Step 6: Drop user_system_folders table (no longer needed)
    console.log('🔄 Dropping user_system_folders table...');
    try {
      await sequelize.query(
        `DROP TABLE IF EXISTS user_system_folders`,
        { transaction }
      );
      console.log('✅ Dropped user_system_folders table');
    } catch (error: any) {
      console.log(`⚠️  Could not drop user_system_folders table: ${error.message}`);
    }

    await transaction.commit();
    console.log('✅ Successfully refactored system folders to be conceptual only');
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error refactoring system folders:', error);
    throw error;
  }
}

