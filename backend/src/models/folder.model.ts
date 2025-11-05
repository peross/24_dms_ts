import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import User from './user.model';

interface FolderAttributes {
  folderId: number;
  name: string;
  path: string;
  parentId?: number;
  userId: number;
  permissions: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface FolderCreationAttributes extends Optional<FolderAttributes, 'folderId' | 'createdAt' | 'updatedAt' | 'parentId'> {}

export class Folder extends Model<FolderAttributes, FolderCreationAttributes> implements FolderAttributes {
  public folderId!: number;
  public name!: string;
  public path!: string;
  public parentId?: number;
  public userId!: number;
  public permissions!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Associations
  public parent?: Folder;
  public children?: Folder[];
  public user?: User;
}

Folder.init(
  {
    folderId: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      field: 'folder_id',
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
    parentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'parent_id',
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
      defaultValue: '755',
      field: 'permissions',
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
    tableName: 'folders',
    timestamps: true,
    underscored: false,
  }
);

// Self-referential association for parent-child folder relationship
Folder.hasMany(Folder, { 
  as: 'children', 
  foreignKey: 'parent_id',
  onDelete: 'CASCADE', // Delete children when parent is deleted
  onUpdate: 'CASCADE'
});
Folder.belongsTo(Folder, { 
  as: 'parent', 
  foreignKey: 'parent_id',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});

// User association
Folder.belongsTo(User, { 
  foreignKey: 'user_id', 
  as: 'user',
  onDelete: 'RESTRICT', // Prevent deleting user if they have folders
  onUpdate: 'CASCADE'
});
User.hasMany(Folder, { 
  foreignKey: 'user_id', 
  as: 'folders',
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE'
});

export default Folder;

