import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface UserAttributes {
  userId: number;
  email: string;
  username?: string;
  password: string;
  firstName?: string;
  lastName?: string;
  twoFactorEnabled?: boolean;
  twoFactorSecret?: string;
  twoFactorBackupCodes?: string; // JSON string of backup codes
  createdAt?: Date;
  updatedAt?: Date;
}

interface UserCreationAttributes extends Optional<UserAttributes, 'userId' | 'createdAt' | 'updatedAt'> {}

export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public userId!: number;
  public email!: string;
  public username?: string;
  public password!: string;
  public firstName?: string;
  public lastName?: string;
  public twoFactorEnabled?: boolean;
  public twoFactorSecret?: string;
  public twoFactorBackupCodes?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

User.init(
  {
    userId: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      field: 'user_id',
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      // Note: unique constraint should be managed via database migrations
      // Not defining here to avoid "Too many keys" error during sync
      field: 'email',
      validate: {
        isEmail: true,
      },
    },
    username: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false, // Unique constraint will be managed via migration
      field: 'username',
      validate: {
        len: [3, 30],
        is: /^[a-zA-Z0-9_]+$/, // Only alphanumeric and underscore
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'password',
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'first_name',
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'last_name',
    },
    twoFactorEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'two_factor_enabled',
    },
    twoFactorSecret: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'two_factor_secret',
    },
    twoFactorBackupCodes: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'two_factor_backup_codes',
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
    tableName: 'users',
    timestamps: true,
    underscored: false,
    // Note: Indexes are managed via database migrations to avoid "Too many keys" error
    // The unique constraint on email should already exist in the database
  }
);

export default User;
