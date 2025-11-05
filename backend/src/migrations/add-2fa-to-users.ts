import { sequelize } from '../config/database';

/**
 * Migration to add 2FA columns to users table
 */
export async function add2FAToUsers(): Promise<void> {
  try {
    console.log('🔄 Adding 2FA columns to users table...');

    // Try to add two_factor_enabled column
    try {
      await sequelize.query(
        "ALTER TABLE users ADD COLUMN two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE AFTER last_name"
      );
      console.log('✅ Added two_factor_enabled column');
    } catch (error: any) {
      if (error.message?.includes('Duplicate column name') || 
          error.message?.includes('Duplicate') ||
          error.message?.includes('already exists')) {
        console.log('⏭️  two_factor_enabled column already exists');
      } else if (error.message?.includes("doesn't exist") || 
                 error.message?.includes("Unknown table")) {
        console.log('⏭️  Table doesn\'t exist yet, column will be added when table is created');
        return;
      } else {
        throw error;
      }
    }

    // Try to add two_factor_secret column
    try {
      await sequelize.query(
        "ALTER TABLE users ADD COLUMN two_factor_secret VARCHAR(255) NULL AFTER two_factor_enabled"
      );
      console.log('✅ Added two_factor_secret column');
    } catch (error: any) {
      if (error.message?.includes('Duplicate column name') || 
          error.message?.includes('Duplicate') ||
          error.message?.includes('already exists')) {
        console.log('⏭️  two_factor_secret column already exists');
      } else if (error.message?.includes("doesn't exist") || 
                 error.message?.includes("Unknown table")) {
        console.log('⏭️  Table doesn\'t exist yet');
      } else {
        throw error;
      }
    }

    // Try to add two_factor_backup_codes column
    try {
      await sequelize.query(
        "ALTER TABLE users ADD COLUMN two_factor_backup_codes TEXT NULL AFTER two_factor_secret"
      );
      console.log('✅ Added two_factor_backup_codes column');
    } catch (error: any) {
      if (error.message?.includes('Duplicate column name') || 
          error.message?.includes('Duplicate') ||
          error.message?.includes('already exists')) {
        console.log('⏭️  two_factor_backup_codes column already exists');
      } else if (error.message?.includes("doesn't exist") || 
                 error.message?.includes("Unknown table")) {
        console.log('⏭️  Table doesn\'t exist yet');
      } else {
        throw error;
      }
    }

    console.log('✅ Migration completed!');
  } catch (error: any) {
    // Check if table doesn't exist - that's okay, sync will create it
    if (error.message?.includes("doesn't exist") || 
        error.message?.includes("Unknown table")) {
      console.log('⏭️  Table doesn\'t exist yet, columns will be added when table is created');
      return;
    }
    console.error('❌ Migration failed:', error.message || error);
    throw error;
  }
}

