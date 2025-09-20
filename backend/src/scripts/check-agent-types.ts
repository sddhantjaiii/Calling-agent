#!/usr/bin/env ts-node

import database from '../config/database';

async function checkAgentTypes() {
  try {
    await database.initialize();
    
    const result = await database.query(`
      SELECT DISTINCT agent_type 
      FROM agents 
      ORDER BY agent_type;
    `);
    
    console.log('Existing agent types:');
    result.rows.forEach((row: any) => {
      console.log(`  - ${row.agent_type}`);
    });
    
    // Also check the constraint
    const constraintResult = await database.query(`
      SELECT conname, pg_get_constraintdef(oid) as definition
      FROM pg_constraint 
      WHERE conname = 'agents_agent_type_check';
    `);
    
    if (constraintResult.rows.length > 0) {
      console.log('\nAgent type constraint:');
      console.log(`  ${constraintResult.rows[0].definition}`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await database.close();
  }
}

checkAgentTypes();