import { sequelize } from '../config/database';

/**
 * Migration to add user_agent and ip_address columns to refresh_tokens table
 */
export async function addDeviceInfoToRefreshTokens(): Promise<void> {
  try {
    console.log('🔄 Adding device info columns to refresh_tokens table...');

    // Try to add user_agent column - catch duplicate column errors
    try {
      await sequelize.query(
        "ALTER TABLE refresh_tokens ADD COLUMN user_agent VARCHAR(500) NULL AFTER revoked"
      );
      console.log('✅ Added user_agent column');
    } catch (error: any) {
      if (error.message?.includes('Duplicate column name') || 
          error.message?.includes('Duplicate') ||
          error.message?.includes('already exists')) {
        console.log('⏭️  user_agent column already exists');
      } else if (error.message?.includes("doesn't exist") || 
                 error.message?.includes("Unknown table")) {
        console.log('⏭️  Table doesn\'t exist yet, columns will be added when table is created');
        return;
      } else {
        throw error;
      }
    }

    // Try to add ip_address column - catch duplicate column errors
    try {
      await sequelize.query(
        "ALTER TABLE refresh_tokens ADD COLUMN ip_address VARCHAR(45) NULL AFTER user_agent"
      );
      console.log('✅ Added ip_address column');
    } catch (error: any) {
      if (error.message?.includes('Duplicate column name') || 
          error.message?.includes('Duplicate') ||
          error.message?.includes('already exists')) {
        console.log('⏭️  ip_address column already exists');
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

