const { Client } = require('pg');

async function updateUserToAdmin() {
  const client = new Client({
    connectionString: 'postgresql://neondb_owner:npg_d6qDxYFghA0J@ep-wandering-sun-a1it7q5i-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Update the specific user to admin
    const email = 'test3@gmail.com';
    const userId = '789895c8-4bd6-43e9-bfea-a4171ec47197';
    
    console.log(`🔧 Updating user ${email} to admin role...`);
    
    const result = await client.query(
      'UPDATE users SET role = $1, is_active = true WHERE email = $2 OR id = $3 RETURNING id, email, name, role, is_active',
      ['admin', email, userId]
    );

    if (result.rows.length > 0) {
      console.log('✅ User updated successfully:');
      console.log('📧 Email:', result.rows[0].email);
      console.log('👤 Name:', result.rows[0].name);
      console.log('🔐 Role:', result.rows[0].role);
      console.log('✓ Active:', result.rows[0].is_active);
      console.log('🆔 ID:', result.rows[0].id);
    } else {
      console.log('❌ User not found');
      
      // Let's check what users exist
      const allUsers = await client.query(
        'SELECT id, email, name, role, is_active FROM users ORDER BY created_at DESC LIMIT 5'
      );
      console.log('\n📋 Recent users in database:');
      allUsers.rows.forEach((user, i) => {
        console.log(`${i+1}. ${user.email} (${user.name || 'No name'}) - Role: ${user.role} - Active: ${user.is_active}`);
      });
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

updateUserToAdmin();