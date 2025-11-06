import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import User from './user.model';
import SystemFolder from './system-folder.model';
import Folder from './folder.model';

interface UserSystemFolderAttributes {
  userSystemFolderId: number;
  userId: number;
  systemFolderId: number;
  folderId: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface UserSystemFolderCreationAttributes extends Optional<UserSystemFolderAttributes, 'userSystemFolderId' | 'createdAt' | 'updatedAt'> {}

export class UserSystemFolder extends Model<UserSystemFolderAttributes, UserSystemFolderCreationAttributes> implements UserSystemFolderAttributes {
  public userSystemFolderId!: number;
  public userId!: number;
  public systemFolderId!: number;
  public folderId!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Associations
  public user?: User;
  public systemFolder?: SystemFolder;
  public folder?: Folder;
}

UserSystemFolder.init(
  {
    userSystemFolderId: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      field: 'user_system_folder_id',
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'user_id',
      },
    },
    systemFolderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'system_folder_id',
      references: {
        model: 'system_folders',
        key: 'system_folder_id',
      },
    },
    folderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true, // Each folder can only be assigned to one system folder for one user
      field: 'folder_id',
      references: {
        model: 'folders',
        key: 'folder_id',
      },
    },
    createdAt: {
      type: DataTypes.DATE,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      field: 'updated_at',
    },
  },
  {
    sequelize,
    tableName: 'user_system_folders',
    timestamps: true,
    underscored: false,
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'system_folder_id'], // One system folder per user
        name: 'unique_user_system_folder',
      },
    ],
  }
);

// Associations
UserSystemFolder.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});
User.hasMany(UserSystemFolder, {
  foreignKey: 'user_id',
  as: 'userSystemFolders',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});

UserSystemFolder.belongsTo(SystemFolder, {
  foreignKey: 'system_folder_id',
  as: 'systemFolder',
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE',
});
SystemFolder.hasMany(UserSystemFolder, {
  foreignKey: 'system_folder_id',
  as: 'userSystemFolders',
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE',
});

UserSystemFolder.belongsTo(Folder, {
  foreignKey: 'folder_id',
  as: 'folder',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});
Folder.hasOne(UserSystemFolder, {
  foreignKey: 'folder_id',
  as: 'userSystemFolder',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});

export default UserSystemFolder;

