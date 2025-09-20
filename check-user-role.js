const fs = require('fs');
const path = require('path');

// Read the backend directory to get the database config
const backendEnvPath = path.join(__dirname, 'backend', '.env');

let databaseUrl = '';
if (fs.existsSync(backendEnvPath)) {
  const envContent = fs.readFileSync(backendEnvPath, 'utf8');
  const match = envContent.match(/DATABASE_URL=(.+)/);
  if (match) {
    databaseUrl = match[1];
  }
}

console.log('🔧 User Role Management Script');
console.log('===============================\n');

if (!databaseUrl) {
  console.log('❌ Could not find DATABASE_URL in backend/.env');
  console.log('Please run this script from the project root directory');
  process.exit(1);
}

console.log('📋 Instructions:');
console.log('1. Install pg package: npm install pg');
console.log('2. Run: node check-user-role.js');
console.log('3. This will check and update your user role to admin\n');

console.log('💡 Quick Fix Options:');
console.log('A. If you know your email, add it below and run the script');
console.log('B. Or update your role directly in the database admin panel\n');

// Template for updating user role
const updateUserRole = `
// Update user role to admin
const { Client } = require('pg');

async function updateUserToAdmin() {
  const client = new Client({
    connectionString: '${databaseUrl}'
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Replace 'your-email@example.com' with your actual email
    const email = 'your-email@example.com'; // <-- UPDATE THIS
    
    const result = await client.query(
      'UPDATE users SET role = $1, is_active = true WHERE email = $2 RETURNING id, email, name, role, is_active',
      ['admin', email]
    );

    if (result.rows.length > 0) {
      console.log('✅ User updated successfully:');
      console.log(result.rows[0]);
    } else {
      console.log('❌ User not found with email:', email);
      
      // List all users to help find the right one
      const allUsers = await client.query('SELECT id, email, name, role, is_active FROM users ORDER BY created_at DESC LIMIT 10');
      console.log('\\nRecent users:');
      allUsers.rows.forEach((user, i) => {
        console.log(\`\${i+1}. \${user.email} (\${user.name || 'No name'}) - Role: \${user.role}\`);
      });
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

updateUserToAdmin();
`;

// Write the update script
fs.writeFileSync('update-user-role.js', updateUserRole);
console.log('✅ Created update-user-role.js');
console.log('📝 Edit the email in update-user-role.js and run it to fix your role\n');

console.log('🔍 Alternative: Check browser console');
console.log('Open browser DevTools and run:');
console.log('localStorage.getItem("auth_token") || localStorage.getItem("user")');
console.log('This will show your current user info\n');