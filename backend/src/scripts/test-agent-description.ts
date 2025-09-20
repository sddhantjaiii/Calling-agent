import database from '../config/database';

async function testAgentDescription() {
  try {
    console.log('🧪 Testing agent description functionality...');
    
    // Check if description column exists
    const columnCheck = await database.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'agents' AND column_name = 'description'
    `);
    
    console.log('📋 Description column info:', columnCheck.rows);
    
    if (columnCheck.rows.length === 0) {
      console.error('❌ Description column does not exist!');
      return;
    }
    
    // Check existing agents
    const existingAgents = await database.query(`
      SELECT id, name, description, created_at 
      FROM agents 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    console.log('📊 Recent agents:');
    existingAgents.rows.forEach((agent: any) => {
      console.log(`  - ${agent.name}: "${agent.description}" (ID: ${agent.id})`);
    });
    
    // Test direct insert
    const testUserId = '00000000-0000-0000-0000-000000000001'; // Use a test UUID
    const testDescription = 'Test description from script';
    
    const insertResult = await database.query(`
      INSERT INTO agents (user_id, elevenlabs_agent_id, name, description, agent_type, is_active)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, name, description
    `, [testUserId, 'test-agent-' + Date.now(), 'Test Agent', testDescription, 'call', true]);
    
    console.log('✅ Direct insert result:', insertResult.rows[0]);
    
    // Clean up test agent
    await database.query('DELETE FROM agents WHERE id = $1', [insertResult.rows[0].id]);
    console.log('🧹 Cleaned up test agent');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await database.close();
  }
}

testAgentDescription();