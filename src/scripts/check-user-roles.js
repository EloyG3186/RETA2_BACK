const { User } = require('../models');

async function checkUserRoles() {
  try {
    console.log('🔍 Verificando roles de usuarios...\n');
    
    const users = await User.findAll({
      attributes: ['id', 'username', 'fullName', 'role'],
      order: [['username', 'ASC']]
    });
    
    console.log('👥 Usuarios encontrados:');
    users.forEach(user => {
      console.log(`- ${user.username} (${user.fullName}): rol = "${user.role}"`);
    });
    
    console.log('\n📊 Resumen por roles:');
    const roleCount = {};
    users.forEach(user => {
      roleCount[user.role] = (roleCount[user.role] || 0) + 1;
    });
    
    Object.entries(roleCount).forEach(([role, count]) => {
      console.log(`- ${role}: ${count} usuarios`);
    });
    
    console.log('\n🔍 Usuarios que deberían aparecer en leaderboard (rol="user"):');
    const regularUsers = users.filter(user => user.role === 'user');
    regularUsers.forEach(user => {
      console.log(`✅ ${user.username} (${user.fullName})`);
    });
    
    console.log('\n🚫 Usuarios que NO deberían aparecer (rol="admin"):');
    const adminUsers = users.filter(user => user.role === 'admin');
    adminUsers.forEach(user => {
      console.log(`❌ ${user.username} (${user.fullName})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkUserRoles();
