import { sequelize } from '../config/database';
import { QueryTypes } from 'sequelize';

/**
 * Migration to refactor system folders into a separate table
 * 1. Create system_folders table
 * 2. Insert the 3 system folders
 * 3. Add system_folder_id column to folders table
 * 4. Migrate existing data
 * 5. Remove system_folder_type column
 */
export async function refactorSystemFolders(): Promise<void> {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('🔄 Refactoring system folders...');

    // Step 1: Create system_folders table
    console.log('🔄 Creating system_folders table...');
    try {
      await sequelize.query(
        `CREATE TABLE IF NOT EXISTS system_folders (
          system_folder_id INTEGER PRIMARY KEY AUTO_INCREMENT,
          name VARCHAR(255) NOT NULL UNIQUE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )`,
        { transaction }
      );
      console.log('✅ Created system_folders table');
    } catch (error: any) {
      if (error.message?.includes('already exists') || error.message?.includes('Duplicate')) {
        console.log('⏭️  system_folders table already exists');
      } else {
        throw error;
      }
    }

    // Step 2: Insert the 3 system folders if they don't exist
    console.log('🔄 Inserting system folders...');
    const systemFolders = [
      { name: 'General' },
      { name: 'My Folders' },
      { name: 'Shared With Me' },
    ];

    for (const folder of systemFolders) {
      try {
        // Check if folder already exists
        const existing = await sequelize.query<{ count: number }>(
          `SELECT COUNT(*) as count FROM system_folders WHERE name = :name`,
          {
            replacements: { name: folder.name },
            type: QueryTypes.SELECT,
            transaction,
          }
        );
        
        if (existing[0]?.count === 0) {
          await sequelize.query(
            `INSERT INTO system_folders (name) VALUES (:name)`,
            {
              replacements: { name: folder.name },
              type: QueryTypes.INSERT,
              transaction,
            }
          );
          console.log(`✅ Inserted ${folder.name} system folder`);
        } else {
          console.log(`⏭️  ${folder.name} system folder already exists`);
        }
      } catch (error: any) {
        if (error.message?.includes('Duplicate entry') || error.message?.includes('UNIQUE constraint')) {
          console.log(`⏭️  ${folder.name} system folder already exists`);
        } else {
          throw error;
        }
      }
    }

    // Step 3: Add system_folder_id column to folders table
    console.log('🔄 Adding system_folder_id column to folders table...');
    try {
      await sequelize.query(
        `ALTER TABLE folders ADD COLUMN system_folder_id INTEGER NULL DEFAULT NULL`,
        { transaction }
      );
      console.log('✅ Added system_folder_id column');
    } catch (error: any) {
      if (error.message?.includes('Duplicate column name') || error.message?.includes('already exists')) {
        console.log('⏭️  system_folder_id column already exists');
      } else {
        throw error;
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
      if (error.message?.includes('Duplicate key name') || 
          error.message?.includes('already exists') ||
          error.message?.includes('ER_FK_DUP_NAME')) {
        console.log('⏭️  Foreign key constraint already exists');
      } else {
        throw error;
      }
    }

    // Step 5: Migrate existing data
    console.log('🔄 Migrating existing system folder data...');
    
    // Get system folder IDs mapped by name
    const systemFolderMap = await sequelize.query<{ system_folder_id: number; name: string }>(
      `SELECT system_folder_id, name FROM system_folders`,
      { type: QueryTypes.SELECT, transaction }
    );

    const nameToIdMap: Record<string, number> = {};
    for (const sf of systemFolderMap) {
      nameToIdMap[sf.name] = sf.system_folder_id;
    }

    // Map old system_folder_type enum values to names
    const typeToNameMap: Record<string, string> = {
      'GENERAL': 'General',
      'MY_FOLDERS': 'My Folders',
      'SHARED_WITH_ME': 'Shared With Me',
    };

    // Update folders that have system_folder_type to use system_folder_id
    for (const [type, name] of Object.entries(typeToNameMap)) {
      const id = nameToIdMap[name];
      if (id) {
        await sequelize.query(
          `UPDATE folders 
           SET system_folder_id = :id 
           WHERE system_folder_type = :type AND system_folder_id IS NULL`,
          {
            replacements: { id, type },
            type: QueryTypes.UPDATE,
            transaction,
          }
        );
        console.log(`✅ Migrated ${type} folders to use system_folder_id`);
      }
    }

    // Step 6: Remove system_folder_type column (no longer needed)
    console.log('🔄 Removing system_folder_type column...');
    try {
      await sequelize.query(
        `ALTER TABLE folders DROP COLUMN system_folder_type`,
        { transaction }
      );
      console.log('✅ Removed system_folder_type column');
    } catch (error: any) {
      if (error.message?.includes("doesn't exist") || 
          error.message?.includes("Unknown column") ||
          error.message?.includes("Unknown column name")) {
        console.log('⏭️  system_folder_type column does not exist (already removed)');
      } else {
        // Log but don't fail - column might not exist
        console.log(`⚠️  Could not remove system_folder_type column: ${error.message}`);
      }
    }

    await transaction.commit();
    console.log('✅ Successfully refactored system folders');
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error refactoring system folders:', error);
    throw error;
  }
}

