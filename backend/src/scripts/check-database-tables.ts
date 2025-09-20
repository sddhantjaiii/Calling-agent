#!/usr/bin/env ts-node

import database from '../config/database';

async function checkTables() {
  try {
    await database.initialize();
    
    const result = await database.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log('Database tables:');
    result.rows.forEach((row: any) => {
      console.log(`  - ${row.table_name}`);
    });
    
    // Check specifically for performance monitoring tables
    const performanceTables = result.rows.filter((row: any) => 
      row.table_name.includes('trigger_performance') || 
      row.table_name.includes('trigger_execution')
    );
    
    console.log('\nPerformance monitoring tables:');
    if (performanceTables.length === 0) {
      console.log('  - None found');
    } else {
      performanceTables.forEach((row: any) => {
        console.log(`  - ${row.table_name}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await database.close();
  }
}

checkTables();