import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import User from './user.model';
import Role from './role.model';

interface UserRoleAttributes {
  userRoleId: number;
  userId: number;
  roleId: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface UserRoleCreationAttributes extends Optional<UserRoleAttributes, 'userRoleId' | 'createdAt' | 'updatedAt'> {}

export class UserRole extends Model<UserRoleAttributes, UserRoleCreationAttributes> implements UserRoleAttributes {
  public userRoleId!: number;
  public userId!: number;
  public roleId!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Associations
  public user?: User;
  public role?: Role;
}

UserRole.init(
  {
    userRoleId: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      field: 'user_role_id',
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
    roleId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'role_id',
      references: {
        model: 'roles',
        key: 'role_id',
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
    tableName: 'user_roles',
    timestamps: true,
    underscored: false,
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'role_id'],
        name: 'unique_user_role',
      },
    ],
  }
);

// Associations
UserRole.belongsTo(User, { 
  foreignKey: 'user_id', 
  as: 'user',
  onDelete: 'CASCADE', // Delete user-role entries when user is deleted
  onUpdate: 'CASCADE'
});
UserRole.belongsTo(Role, { 
  foreignKey: 'role_id', 
  as: 'role',
  onDelete: 'CASCADE', // Delete user-role entries when role is deleted
  onUpdate: 'CASCADE'
});

User.belongsToMany(Role, {
  through: UserRole,
  foreignKey: 'user_id',
  otherKey: 'role_id',
  as: 'roles',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});

Role.belongsToMany(User, {
  through: UserRole,
  foreignKey: 'role_id',
  otherKey: 'user_id',
  as: 'users',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});

export default UserRole;

