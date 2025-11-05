import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import User from './user.model';
import Folder from './folder.model';

interface FileAttributes {
  fileId: number;
  name: string;
  path: string;
  size: number;
  mimeType: string;
  folderId?: number;
  userId: number;
  permissions: string;
  currentVersion: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface FileCreationAttributes extends Optional<FileAttributes, 'fileId' | 'createdAt' | 'updatedAt' | 'folderId'> {}

export class File extends Model<FileAttributes, FileCreationAttributes> implements FileAttributes {
  public fileId!: number;
  public name!: string;
  public path!: string;
  public size!: number;
  public mimeType!: string;
  public folderId?: number;
  public userId!: number;
  public permissions!: string;
  public currentVersion!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Associations
  public folder?: Folder;
  public user?: User;
}

File.init(
  {
    fileId: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      field: 'file_id',
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'name',
    },
    path: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'path',
    },
    size: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: 0,
      field: 'size',
    },
    mimeType: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'application/octet-stream',
      field: 'mime_type',
    },
    folderId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'folder_id',
      references: {
        model: 'folders',
        key: 'folder_id',
      },
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
    permissions: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '644',
      field: 'permissions',
    },
    currentVersion: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      field: 'current_version',
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
    tableName: 'files',
    timestamps: true,
    underscored: false,
  }
);

// Associations
File.belongsTo(Folder, { 
  foreignKey: 'folder_id', 
  as: 'folder',
  onDelete: 'SET NULL', // Allow file to exist without folder
  onUpdate: 'CASCADE'
});
Folder.hasMany(File, { 
  foreignKey: 'folder_id', 
  as: 'files',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE'
});

File.belongsTo(User, { 
  foreignKey: 'user_id', 
  as: 'user',
  onDelete: 'RESTRICT', // Prevent deleting user if they have files
  onUpdate: 'CASCADE'
});
User.hasMany(File, { 
  foreignKey: 'user_id', 
  as: 'files',
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE'
});

export default File;

