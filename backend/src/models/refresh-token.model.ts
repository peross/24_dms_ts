import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import User from './user.model';

interface RefreshTokenAttributes {
  refreshTokenId: number;
  userId: number;
  token: string;
  expiresAt: Date;
  revoked: boolean;
  userAgent?: string;
  ipAddress?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface RefreshTokenCreationAttributes extends Optional<RefreshTokenAttributes, 'refreshTokenId' | 'createdAt' | 'updatedAt' | 'revoked'> {}

export class RefreshToken extends Model<RefreshTokenAttributes, RefreshTokenCreationAttributes> implements RefreshTokenAttributes {
  public refreshTokenId!: number;
  public userId!: number;
  public token!: string;
  public expiresAt!: Date;
  public revoked!: boolean;
  public userAgent?: string;
  public ipAddress?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Associations
  public user?: User;
}

RefreshToken.init(
  {
    refreshTokenId: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      field: 'refresh_token_id',
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
    token: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      field: 'token',
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'expires_at',
    },
    revoked: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'revoked',
    },
    userAgent: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'user_agent',
    },
    ipAddress: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'ip_address',
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
    tableName: 'refresh_tokens',
    timestamps: true,
    underscored: false,
    indexes: [
      {
        fields: ['user_id'],
      },
      {
        fields: ['token'],
      },
    ],
  }
);

// Associations
RefreshToken.belongsTo(User, { 
  foreignKey: 'user_id', 
  as: 'user',
  onDelete: 'CASCADE', // Delete refresh tokens when user is deleted
  onUpdate: 'CASCADE'
});
User.hasMany(RefreshToken, { 
  foreignKey: 'user_id', 
  as: 'refreshTokens',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});

export default RefreshToken;

