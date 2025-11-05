import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import File from './file.model';

interface FileVersionAttributes {
  versionId: number;
  fileId: number;
  version: number;
  path: string;
  size: number;
  mimeType: string;
  uploadedBy: number; // userId
  createdAt?: Date;
  updatedAt?: Date;
}

interface FileVersionCreationAttributes extends Optional<FileVersionAttributes, 'versionId' | 'createdAt' | 'updatedAt'> {}

export class FileVersion extends Model<FileVersionAttributes, FileVersionCreationAttributes> implements FileVersionAttributes {
  public versionId!: number;
  public fileId!: number;
  public version!: number;
  public path!: string;
  public size!: number;
  public mimeType!: string;
  public uploadedBy!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Associations
  public file?: File;
}

FileVersion.init(
  {
    versionId: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      field: 'version_id',
    },
    fileId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'file_id',
      references: {
        model: 'files',
        key: 'file_id',
      },
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      field: 'version',
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
    uploadedBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'uploaded_by',
      references: {
        model: 'users',
        key: 'user_id',
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
    tableName: 'file_versions',
    timestamps: true,
    underscored: false,
  }
);

// Associations
FileVersion.belongsTo(File, {
  foreignKey: 'file_id',
  as: 'file',
  onDelete: 'CASCADE', // Delete versions when file is deleted
  onUpdate: 'CASCADE'
});

File.hasMany(FileVersion, {
  foreignKey: 'file_id',
  as: 'versions',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});

export default FileVersion;

