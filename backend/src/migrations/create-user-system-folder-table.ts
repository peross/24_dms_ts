import { sequelize } from '../config/database';
import { QueryTypes } from 'sequelize';

/**
 * Migration to create user_system_folders junction table
 * This table links users to system folders and stores which folder_id represents each system folder for each user
 */
export async function createUserSystemFolderTable(): Promise<void> {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('🔄 Creating user_system_folders table...');

    // Step 1: Create user_system_folders table
    try {
      await sequelize.query(
        `CREATE TABLE IF NOT EXISTS user_system_folders (
          user_system_folder_id INTEGER PRIMARY KEY AUTO_INCREMENT,
          user_id INTEGER NOT NULL,
          system_folder_id INTEGER NOT NULL,
          folder_id INTEGER NOT NULL UNIQUE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY unique_user_system_folder (user_id, system_folder_id),
          FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
          FOREIGN KEY (system_folder_id) REFERENCES system_folders(system_folder_id) ON DELETE RESTRICT ON UPDATE CASCADE,
          FOREIGN KEY (folder_id) REFERENCES folders(folder_id) ON DELETE CASCADE ON UPDATE CASCADE
        )`,
        { transaction }
      );
      console.log('✅ Created user_system_folders table');
    } catch (error: any) {
      if (error.message?.includes('already exists') || error.message?.includes('Duplicate')) {
        console.log('⏭️  user_system_folders table already exists');
      } else {
        throw error;
      }
    }

    // Step 2: Migrate existing data from folders.system_folder_id to user_system_folders
    console.log('🔄 Migrating existing system folder assignments...');
    
    // Get all folders that have system_folder_id
    const foldersWithSystemFolder = await sequelize.query<{ folder_id: number; user_id: number; system_folder_id: number }>(
      `SELECT folder_id, user_id, system_folder_id 
       FROM folders 
       WHERE system_folder_id IS NOT NULL`,
      { type: QueryTypes.SELECT, transaction }
    );

    let migratedCount = 0;
    for (const folder of foldersWithSystemFolder) {
      try {
        // Check if assignment already exists
        const existing = await sequelize.query<{ count: number }>(
          `SELECT COUNT(*) as count 
           FROM user_system_folders 
           WHERE user_id = :userId AND system_folder_id = :systemFolderId`,
          {
            replacements: { userId: folder.user_id, systemFolderId: folder.system_folder_id },
            type: QueryTypes.SELECT,
            transaction,
          }
        );

        if (existing[0]?.count === 0) {
          await sequelize.query(
            `INSERT INTO user_system_folders (user_id, system_folder_id, folder_id) 
             VALUES (:userId, :systemFolderId, :folderId)`,
            {
              replacements: {
                userId: folder.user_id,
                systemFolderId: folder.system_folder_id,
                folderId: folder.folder_id,
              },
              type: QueryTypes.INSERT,
              transaction,
            }
          );
          migratedCount++;
        }
      } catch (error: any) {
        if (error.message?.includes('Duplicate entry') || error.message?.includes('UNIQUE constraint')) {
          console.log(`⏭️  Assignment already exists for folder ${folder.folder_id}`);
        } else {
          console.error(`⚠️  Failed to migrate folder ${folder.folder_id}:`, error.message);
        }
      }
    }

    console.log(`✅ Migrated ${migratedCount} system folder assignments`);

    // Step 2.5: Initialize system folders for all existing users who don't have them
    console.log('🔄 Initializing system folders for existing users...');
    const allUsers = await sequelize.query<{ user_id: number }>(
      `SELECT DISTINCT user_id FROM folders`,
      { type: QueryTypes.SELECT, transaction }
    );

    const systemFolders = await sequelize.query<{ system_folder_id: number; name: string }>(
      `SELECT system_folder_id, name FROM system_folders`,
      { type: QueryTypes.SELECT, transaction }
    );

    const nameToIdMap: Record<string, number> = {};
    for (const sf of systemFolders) {
      nameToIdMap[sf.name] = sf.system_folder_id;
    }

    let initializedCount = 0;
    for (const user of allUsers) {
      for (const [name, systemFolderId] of Object.entries(nameToIdMap)) {
        // Check if user already has this system folder assigned
        const existing = await sequelize.query<{ count: number }>(
          `SELECT COUNT(*) as count 
           FROM user_system_folders 
           WHERE user_id = :userId AND system_folder_id = :systemFolderId`,
          {
            replacements: { userId: user.user_id, systemFolderId },
            type: QueryTypes.SELECT,
            transaction,
          }
        );

        if (existing[0]?.count === 0) {
          // Check if folder already exists for this user with this name
          const existingFolder = await sequelize.query<{ folder_id: number }>(
            `SELECT folder_id FROM folders 
             WHERE user_id = :userId AND name = :name AND parent_id IS NULL
             LIMIT 1`,
            {
              replacements: { userId: user.user_id, name },
              type: QueryTypes.SELECT,
              transaction,
            }
          );

          let folderId: number;
          if (existingFolder.length > 0) {
            folderId = existingFolder[0].folder_id;
          } else {
            // Create the folder
            const result = await sequelize.query(
              `INSERT INTO folders (name, path, user_id, permissions, parent_id) 
               VALUES (:name, :name, :userId, '755', NULL)`,
              {
                replacements: { name, userId: user.user_id },
                type: QueryTypes.INSERT,
                transaction,
              }
            );
            folderId = (result as any).insertId || (result[0] as any)?.insertId;
          }

          // Create the assignment
          await sequelize.query(
            `INSERT INTO user_system_folders (user_id, system_folder_id, folder_id) 
             VALUES (:userId, :systemFolderId, :folderId)`,
            {
              replacements: {
                userId: user.user_id,
                systemFolderId,
                folderId,
              },
              type: QueryTypes.INSERT,
              transaction,
            }
          );
          initializedCount++;
        }
      }
    }
    console.log(`✅ Initialized ${initializedCount} system folder assignments for existing users`);

    // Step 3: Remove system_folder_id column from folders table
    console.log('🔄 Removing system_folder_id column from folders table...');
    try {
      // First, drop the foreign key constraint if it exists
      try {
        await sequelize.query(
          `ALTER TABLE folders DROP FOREIGN KEY fk_folders_system_folder`,
          { transaction }
        );
        console.log('✅ Dropped foreign key constraint');
      } catch (error: any) {
        if (error.message?.includes("doesn't exist") || error.message?.includes("Unknown key")) {
          console.log('⏭️  Foreign key constraint does not exist');
        }
      }

      // Then drop the column
      await sequelize.query(
        `ALTER TABLE folders DROP COLUMN system_folder_id`,
        { transaction }
      );
      console.log('✅ Removed system_folder_id column from folders table');
    } catch (error: any) {
      if (error.message?.includes("doesn't exist") || 
          error.message?.includes("Unknown column") ||
          error.message?.includes("Unknown column name")) {
        console.log('⏭️  system_folder_id column does not exist (already removed)');
      } else {
        console.log(`⚠️  Could not remove system_folder_id column: ${error.message}`);
      }
    }

    await transaction.commit();
    console.log('✅ Successfully created user_system_folders table and migrated data');
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error creating user_system_folders table:', error);
    throw error;
  }
}

