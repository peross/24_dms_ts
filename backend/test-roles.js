const { UserRole, Role } = require('./dist/models/user-role.model');
const { sequelize } = require('./dist/config/database');

async function test() {
  await sequelize.authenticate();
  const userRoles = await UserRole.findAll({
    where: { userId: 1 },
    include: [{
      model: Role,
      as: 'role',
      attributes: ['name'],
    }],
  });
  console.log('UserRoles:', JSON.stringify(userRoles, null, 2));
  const roles = userRoles.map(ur => ur.role?.name).filter(Boolean);
  console.log('Roles:', roles);
  process.exit(0);
}
test().catch(console.error);
