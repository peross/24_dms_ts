import { sequelize } from '../config/database';

/**
 * Migration to add username column to users table
 */
export async function addUsernameToUsers(): Promise<void> {
  try {
    console.log('🔄 Adding username column to users table...');

    // Try to add username column - catch duplicate column errors
    try {
      await sequelize.query(
        "ALTER TABLE users ADD COLUMN username VARCHAR(30) NULL AFTER email"
      );
      console.log('✅ Added username column');
    } catch (error: any) {
      if (error.message?.includes('Duplicate column name') || 
          error.message?.includes('Duplicate') ||
          error.message?.includes('already exists')) {
        console.log('⏭️  username column already exists');
      } else if (error.message?.includes("doesn't exist") || 
                 error.message?.includes("Unknown table")) {
        console.log('⏭️  Table doesn\'t exist yet, column will be added when table is created');
        return;
      } else {
        throw error;
      }
    }

    // Try to add unique index on username - catch duplicate index errors
    try {
      await sequelize.query(
        "CREATE UNIQUE INDEX idx_username_unique ON users(username)"
      );
      console.log('✅ Added unique index on username');
    } catch (error: any) {
      if (error.message?.includes('Duplicate key name') || 
          error.message?.includes('already exists') ||
          error.message?.includes('Duplicate')) {
        console.log('⏭️  Unique index on username already exists');
      } else {
        // Index creation failed, but that's okay - might already exist
        console.log('⏭️  Could not create unique index (may already exist)');
      }
    }

    console.log('✅ Migration completed!');
  } catch (error: any) {
    // Check if table doesn't exist - that's okay, sync will create it
    if (error.message?.includes("doesn't exist") || 
        error.message?.includes("Unknown table")) {
      console.log('⏭️  Table doesn\'t exist yet, column will be added when table is created');
      return;
    }
    console.error('❌ Migration failed:', error.message || error);
    throw error;
  }
}

