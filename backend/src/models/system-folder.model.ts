import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export enum SystemFolderType {
  GENERAL = 'GENERAL',
  MY_FOLDERS = 'MY_FOLDERS',
  SHARED_WITH_ME = 'SHARED_WITH_ME',
}

interface SystemFolderAttributes {
  systemFolderId: number;
  name: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface SystemFolderCreationAttributes extends Optional<SystemFolderAttributes, 'systemFolderId' | 'createdAt' | 'updatedAt'> {}

export class SystemFolder extends Model<SystemFolderAttributes, SystemFolderCreationAttributes> implements SystemFolderAttributes {
  public systemFolderId!: number;
  public name!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

SystemFolder.init(
  {
    systemFolderId: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      field: 'system_folder_id',
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      field: 'name',
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
    tableName: 'system_folders',
    timestamps: true,
    underscored: false,
  }
);

export default SystemFolder;

