// Quick database query to check admin users
const { Client } = require('pg');

async function checkAdminUsersQuick() {
  const client = new Client({
    connectionString: 'postgresql://neondb_owner:npg_d6qDxYFghA0J@ep-wandering-sun-a1it7q5i-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
  });

  try {
    await client.connect();
    console.log('Connected to database');

    const result = await client.query(`
      SELECT id, email, name, role, is_active, created_at 
      FROM users 
      WHERE role IN ('admin', 'super_admin') 
      ORDER BY created_at DESC
    `);

    console.log('\n=== Admin Users ===');
    if (result.rows.length === 0) {
      console.log('No admin users found');
    } else {
      result.rows.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email}`);
        console.log(`   Name: ${user.name || 'N/A'}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Active: ${user.is_active}`);
        console.log(`   ID: ${user.id}`);
        console.log('');
      });
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkAdminUsersQuick();