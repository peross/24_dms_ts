import { QueryInterface, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

const TABLE_NAME = 'notifications';

export const createNotificationsTable = async (): Promise<void> => {
  const queryInterface: QueryInterface = sequelize.getQueryInterface();

  const tables = await queryInterface.showAllTables();
  if (tables.includes(TABLE_NAME)) {
    console.log(`ℹ️  Table "${TABLE_NAME}" already exists, skipping creation.`);
    return;
  }

  console.log(`🛠️  Creating "${TABLE_NAME}" table...`);

  await queryInterface.createTable(TABLE_NAME, {
    notification_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    type: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    read: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  console.log(`✅  "${TABLE_NAME}" table created successfully.`);
};

