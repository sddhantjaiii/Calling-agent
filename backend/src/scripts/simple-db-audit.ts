import database from '../config/database';

async function runDatabaseAudit() {
  console.log('🔍 Starting Database Audit...\n');
  
  try {
    await database.initialize();
    
    // 1. List all tables
    console.log('📋 1. ALL TABLES IN DATABASE');
    console.log('=' .repeat(50));
    
    const tablesQuery = `
      SELECT table_name, 
             (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;
    
    const tablesResult = await database.query(tablesQuery);
    console.log(`Found ${tablesResult.rows.length} tables:\n`);
    
    tablesResult.rows.forEach((row: any, index: number) => {
      console.log(`${index + 1}. ${row.table_name} (${row.column_count} columns)`);
    });
    
    // 2. Check for duplicate or similar table names
    console.log('\n🔍 2. CHECKING FOR DUPLICATE TABLES');
    console.log('=' .repeat(50));
    
    const tableNames = tablesResult.rows.map((row: any) => row.table_name);
    const potentialDuplicates: string[] = [];
    
    for (let i = 0; i < tableNames.length; i++) {
      for (let j = i + 1; j < tableNames.length; j++) {
        const table1 = tableNames[i];
        const table2 = tableNames[j];
        
        if (table1.includes(table2) || table2.includes(table1) ||
            table1.replace('_', '') === table2.replace('_', '') ||
            (table1.endsWith('s') && table2 === table1.slice(0, -1))) {
          potentialDuplicates.push(`${table1} ↔ ${table2}`);
        }
      }
    }
    
    if (potentialDuplicates.length > 0) {
      console.log('⚠️  Found potentially similar table names:');
      potentialDuplicates.forEach(dup => console.log(`   - ${dup}`));
    } else {
      console.log('✅ No duplicate table names found');
    }
    
    // 3. Check key tables structure
    console.log('\n📊 3. KEY TABLES STRUCTURE');
    console.log('=' .repeat(50));
    
    const keyTables = ['users', 'agents', 'calls', 'contacts', 'agent_analytics', 'lead_analytics', 'user_daily_analytics', 'dashboard_cache'];
    
    for (const tableName of keyTables) {
      try {
        const structureQuery = `
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns
          WHERE table_name = $1
          ORDER BY ordinal_position
        `;
        
        const result = await database.query(structureQuery, [tableName]);
        
        if (result.rows.length > 0) {
          console.log(`\n📋 ${tableName.toUpperCase()} (${result.rows.length} columns):`);
          result.rows.forEach((col: any) => {
            const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
            console.log(`   - ${col.column_name}: ${col.data_type} ${nullable}`);
          });
        } else {
          console.log(`\n❌ ${tableName.toUpperCase()}: Table not found`);
        }
      } catch (error) {
        console.log(`\n❌ ${tableName.toUpperCase()}: Error reading structure`);
      }
    }
    
    // 4. Check record counts
    console.log('\n📊 4. RECORD COUNTS');
    console.log('=' .repeat(50));
    
    for (const tableName of keyTables) {
      try {
        const countResult = await database.query(`SELECT COUNT(*) as count FROM ${tableName}`);
        const count = parseInt(countResult.rows[0].count);
        console.log(`${tableName}: ${count.toLocaleString()} records`);
      } catch (error) {
        console.log(`${tableName}: Table not found or error`);
      }
    }
    
    // 5. Check foreign key relationships
    console.log('\n🔗 5. FOREIGN KEY RELATIONSHIPS');
    console.log('=' .repeat(50));
    
    const fkQuery = `
      SELECT 
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
      ORDER BY tc.table_name
    `;
    
    const fkResult = await database.query(fkQuery);
    console.log(`Found ${fkResult.rows.length} foreign key relationships:\n`);
    
    fkResult.rows.forEach((fk: any) => {
      console.log(`${fk.table_name}.${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
    });
    
    // 6. Check indexes
    console.log('\n📇 6. INDEXES');
    console.log('=' .repeat(50));
    
    const indexQuery = `
      SELECT 
        t.relname as table_name,
        i.relname as index_name,
        ix.indisunique as is_unique
      FROM pg_class t
      JOIN pg_index ix ON t.oid = ix.indrelid
      JOIN pg_class i ON i.oid = ix.indexrelid
      WHERE t.relkind = 'r'
        AND t.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      ORDER BY t.relname
    `;
    
    const indexResult = await database.query(indexQuery);
    const indexesByTable: { [key: string]: any[] } = {};
    
    indexResult.rows.forEach((idx: any) => {
      if (!indexesByTable[idx.table_name]) {
        indexesByTable[idx.table_name] = [];
      }
      indexesByTable[idx.table_name].push(idx);
    });
    
    Object.keys(indexesByTable).forEach(tableName => {
      const indexes = indexesByTable[tableName];
      const uniqueCount = indexes.filter(idx => idx.is_unique).length;
      const regularCount = indexes.filter(idx => !idx.is_unique).length;
      console.log(`${tableName}: ${uniqueCount} unique, ${regularCount} regular indexes`);
    });
    
    // 7. Check triggers
    console.log('\n⚡ 7. TRIGGERS');
    console.log('=' .repeat(50));
    
    const triggerQuery = `
      SELECT 
        trigger_name,
        event_object_table as table_name,
        event_manipulation,
        action_timing
      FROM information_schema.triggers
      WHERE trigger_schema = 'public'
      ORDER BY event_object_table
    `;
    
    const triggerResult = await database.query(triggerQuery);
    console.log(`Found ${triggerResult.rows.length} triggers:\n`);
    
    triggerResult.rows.forEach((trigger: any) => {
      console.log(`${trigger.table_name}: ${trigger.trigger_name} (${trigger.action_timing} ${trigger.event_manipulation})`);
    });
    
    // 8. Check migration status
    console.log('\n📋 8. MIGRATION STATUS');
    console.log('=' .repeat(50));
    
    try {
      const migrationResult = await database.query(`
        SELECT migration_name, executed_at 
        FROM migrations 
        ORDER BY executed_at DESC
      `);
      
      console.log(`✅ Found ${migrationResult.rows.length} executed migrations:\n`);
      migrationResult.rows.forEach((row: any, index: number) => {
        const date = new Date(row.executed_at).toLocaleDateString();
        console.log(`${index + 1}. ${row.migration_name} (${date})`);
      });
      
    } catch (error) {
      console.log('❌ Migrations table not found or error accessing it');
    }
    
    // 9. Data consistency checks
    console.log('\n🔍 9. DATA CONSISTENCY CHECKS');
    console.log('=' .repeat(50));
    
    // Check for null IDs in key tables
    const tablesWithIds = ['users', 'agents', 'calls', 'contacts'];
    for (const table of tablesWithIds) {
      try {
        const nullIdResult = await database.query(`SELECT COUNT(*) as null_count FROM ${table} WHERE id IS NULL`);
        const nullCount = parseInt(nullIdResult.rows[0].null_count);
        if (nullCount > 0) {
          console.log(`⚠️  ${table}: ${nullCount} records with NULL id`);
        } else {
          console.log(`✅ ${table}: No NULL ids found`);
        }
      } catch (error) {
        console.log(`❌ ${table}: Could not check for NULL ids`);
      }
    }
    
    // Check agent analytics consistency
    try {
      const agentConsistencyQuery = `
        SELECT 
          (SELECT COUNT(DISTINCT agent_id) FROM calls WHERE agent_id IS NOT NULL) as calls_agents,
          (SELECT COUNT(DISTINCT agent_id) FROM agent_analytics) as analytics_agents
      `;
      
      const consistencyResult = await database.query(agentConsistencyQuery);
      const row = consistencyResult.rows[0];
      
      if (row.calls_agents === row.analytics_agents) {
        console.log(`✅ Agent consistency: ${row.calls_agents} agents in both calls and analytics`);
      } else {
        console.log(`⚠️  Agent inconsistency: calls(${row.calls_agents}) vs analytics(${row.analytics_agents})`);
      }
      
    } catch (error) {
      console.log('❌ Could not check agent analytics consistency');
    }
    
    console.log('\n✅ Database audit completed successfully!');
    
  } catch (error) {
    console.error('❌ Database audit failed:', error);
  } finally {
    // Close database connection
    try {
      await database.query('SELECT 1'); // Simple query to check if connection is still active
      console.log('\n📝 Database connection verified');
    } catch (error) {
      console.log('\n❌ Database connection issue');
    }
  }
}

// Run the audit
runDatabaseAudit().catch(console.error);