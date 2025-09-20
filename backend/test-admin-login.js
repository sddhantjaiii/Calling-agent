const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function testAdminLogin() {
    try {
        console.log('🔍 Testing admin login and users endpoint...');

        // Get an admin user from database
        const client = await pool.connect();
        const result = await client.query("SELECT * FROM users WHERE role = 'admin' LIMIT 1");

        if (result.rows.length === 0) {
            console.log('❌ No admin users found');
            client.release();
            return;
        }

        const adminUser = result.rows[0];
        console.log(`✅ Found admin user: ${adminUser.email}`);

        // First, login to get a valid session token
        const fetch = (await import('node-fetch')).default;

        console.log('🔑 Attempting login...');
        const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: adminUser.email,
                password: 'Siddhant@22' // Assuming this is the test password
            })
        });

        const loginData = await loginResponse.json();
        console.log('📊 Login response:');
        console.log(JSON.stringify(loginData, null, 2));

        if (!loginData.token) {
            console.log('❌ Login failed - no token received');
            client.release();
            return;
        }

        const token = loginData.token;
        console.log('✅ Login successful, got token');

        // Now test the admin users endpoint with the valid token
        console.log('🔍 Testing admin users endpoint...');
        const adminResponse = await fetch('http://localhost:3000/api/admin/users', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const adminData = await adminResponse.json();
        console.log('📊 Admin users endpoint response:');
        console.log(JSON.stringify(adminData, null, 2));

        client.release();
        await pool.end();
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testAdminLogin();