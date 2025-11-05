import { sequelize } from '../config/database';

export async function addFileVersionsTable(): Promise<void> {
  try {
    // Create file_versions table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS file_versions (
        version_id INT AUTO_INCREMENT PRIMARY KEY,
        file_id INT NOT NULL,
        version INT NOT NULL DEFAULT 1,
        path VARCHAR(500) NOT NULL,
        size BIGINT NOT NULL DEFAULT 0,
        mime_type VARCHAR(255) NOT NULL DEFAULT 'application/octet-stream',
        uploaded_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (file_id) REFERENCES files(file_id) ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY (uploaded_by) REFERENCES users(user_id) ON DELETE RESTRICT ON UPDATE CASCADE,
        UNIQUE KEY unique_file_version (file_id, version),
        INDEX idx_file_id (file_id),
        INDEX idx_uploaded_by (uploaded_by)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('✅ File versions table created or already exists');
  } catch (error: any) {
    if (error.message.includes('Duplicate column name') || error.message.includes('already exists')) {
      console.log('⏭️  File versions table already exists, skipping...');
    } else if (error.message.includes("Table 'files' doesn't exist")) {
      console.log('⚠️  Files table does not exist yet. Please create files table first.');
    } else {
      console.error('❌ Error creating file_versions table:', error.message);
      throw error;
    }
  }
}

