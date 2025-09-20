#!/usr/bin/env ts-node

import database from '../config/database';

async function checkAgentsSchema() {
  try {
    await database.initialize();
    
    const result = await database.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'agents' 
      ORDER BY ordinal_position;
    `);
    
    console.log('Agents table columns:');
    result.rows.forEach((row: any) => {
      console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await database.close();
  }
}

checkAgentsSchema();