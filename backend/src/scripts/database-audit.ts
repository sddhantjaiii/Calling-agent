import database from '../config/database';
import { logger } from '../utils/logger';

interface TableInfo {
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
  constraint_type?: string;
}

interface IndexInfo {
  table_name: string;
  index_name: string;
  column_name: string;
  is_unique: boolean;
}

interface ForeignKeyInfo {
  table_name: string;
  column_name: string;
  foreign_table_name: string;
  foreign_column_name: string;
  constraint_name: string;
}

interface TriggerInfo {
  trigger_name: string;
  table_name: string;
  event_manipulation: string;
  action_timing: string;
  action_statement: string;
}

class DatabaseAuditor {
  
  async runFullAudit(): Promise<void> {
    console.log('🔍 Starting comprehensive database audit...\n');
    
    try {
      await database.initialize();
      
      // 1. Check all tables and their structure
      await this.auditTableStructure();
      
      // 2. Check for duplicate tables or similar structures
      await this.checkForDuplicates();
      
      // 3. Verify foreign key relationships
      await this.auditForeignKeys();
      
      // 4. Check indexes and constraints
      await this.auditIndexes();
      
      // 5. Verify triggers and functions
      await this.auditTriggers();
      
      // 6. Check data consistency
      await this.auditDataConsistency();
      
      // 7. Analyze table sizes and performance
      await this.auditPerformance();
      
      // 8. Check migration status
      await this.auditMigrations();
      
      console.log('\n✅ Database audit completed successfully!');
      
    } catch (error: any) {
      console.error('❌ Database audit failed:', error);
      logger.error('Database audit failed', { error });
    } finally {
      await database.close();
    }
  }

  private async auditTableStructure(): Promise<void> {
    console.log('📋 1. AUDITING TABLE STRUCTURE');
    console.log('=' .repeat(50));
    
    // Get all tables in the database
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;
    
    const tablesResult = await database.query(tablesQuery);
    const tables = tablesResult.rows.map((row: any) => row.table_name);
    
    console.log(`Found ${tables.length} tables:`);
    tables.forEach((table: any, index: any) => {
      console.log(`  ${index + 1}. ${table}`);
    });
    
    // Get detailed structure for each table
    for (const tableName of tables) {
      await this.analyzeTableStructure(tableName);
    }
    
    console.log('');
  }

  private async analyzeTableStructure(tableName: string): Promise<void> {
    const structureQuery = `
      SELECT 
        c.column_name,
        c.data_type,
        c.is_nullable,
        c.column_default,
        tc.constraint_type
      FROM information_schema.columns c
      LEFT JOIN information_schema.key_column_usage kcu 
        ON c.table_name = kcu.table_name AND c.column_name = kcu.column_name
      LEFT JOIN information_schema.table_constraints tc 
        ON kcu.constraint_name = tc.constraint_name
      WHERE c.table_name = $1
      ORDER BY c.ordinal_position
    `;
    
    const result = await database.query(structureQuery, [tableName]);
    const columns = result.rows;
    
    console.log(`\n📊 Table: ${tableName.toUpperCase()}`);
    console.log(`   Columns: ${columns.length}`);
    
    // Check for common patterns and potential issues
    const hasId = columns.some((col: any) => col.column_name === 'id');
    const hasTimestamps = columns.some((col: any) => col.column_name === 'created_at') && 
                         columns.some((col: any) => col.column_name === 'updated_at');
    const hasUserId = columns.some((col: any) => col.column_name === 'user_id');
    
    if (!hasId) console.log(`   ⚠️  Missing 'id' primary key`);
    if (!hasTimestamps) console.log(`   ⚠️  Missing timestamp columns`);
    if (tableName !== 'users' && !hasUserId && !tableName.includes('system')) {
      console.log(`   ⚠️  Missing 'user_id' foreign key (might be intentional)`);
    }
    
    // Show column details for important tables
    if (['users', 'agents', 'calls', 'agent_analytics'].includes(tableName)) {
      columns.forEach((col: any) => {
        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const constraint = col.constraint_type ? ` [${col.constraint_type}]` : '';
        console.log(`     - ${col.column_name}: ${col.data_type} ${nullable}${constraint}`);
      });
    }
  }

  private async checkForDuplicates(): Promise<void> {
    console.log('\n🔍 2. CHECKING FOR DUPLICATE TABLES OR SIMILAR STRUCTURES');
    console.log('=' .repeat(50));
    
    // Check for tables with similar names
    const similarTablesQuery = `
      SELECT t1.table_name as table1, t2.table_name as table2
      FROM information_schema.tables t1
      JOIN information_schema.tables t2 ON t1.table_name < t2.table_name
      WHERE t1.table_schema = 'public' AND t2.table_schema = 'public'
        AND t1.table_type = 'BASE TABLE' AND t2.table_type = 'BASE TABLE'
        AND (
          similarity(t1.table_name, t2.table_name) > 0.6
          OR t1.table_name LIKE '%' || t2.table_name || '%'
          OR t2.table_name LIKE '%' || t1.table_name || '%'
        )
    `;
    
    try {
      const similarResult = await database.query(similarTablesQuery);
      
      if (similarResult.rows.length > 0) {
        console.log('⚠️  Found potentially similar table names:');
        similarResult.rows.forEach((row: any) => {
          console.log(`   - ${row.table1} ↔ ${row.table2}`);
        });
      } else {
        console.log('✅ No duplicate or similar table names found');
      }
    } catch (error) {
      // Similarity function might not be available, check manually
      console.log('📝 Checking for similar table names manually...');
      
      const tablesResult = await database.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `);
      
      const tables = tablesResult.rows.map((row: any) => row.table_name);
      const potentialDuplicates: string[] = [];
      
      for (let i = 0; i < tables.length; i++) {
        for (let j = i + 1; j < tables.length; j++) {
          const table1 = tables[i];
          const table2 = tables[j];
          
          // Check for similar patterns
          if (table1.includes(table2) || table2.includes(table1) ||
              table1.replace('_', '') === table2.replace('_', '') ||
              table1.endsWith('s') && table2 === table1.slice(0, -1)) {
            potentialDuplicates.push(`${table1} ↔ ${table2}`);
          }
        }
      }
      
      if (potentialDuplicates.length > 0) {
        console.log('⚠️  Found potentially similar table names:');
        potentialDuplicates.forEach(dup => console.log(`   - ${dup}`));
      } else {
        console.log('✅ No obvious duplicate table names found');
      }
    }
    
    // Check for duplicate column structures
    await this.checkDuplicateStructures();
  }

  private async checkDuplicateStructures(): Promise<void> {
    console.log('\n🔍 Checking for duplicate table structures...');
    
    const structureQuery = `
      SELECT 
        table_name,
        string_agg(column_name || ':' || data_type, ',' ORDER BY ordinal_position) as structure
      FROM information_schema.columns
      WHERE table_schema = 'public'
      GROUP BY table_name
    `;
    
    const result = await database.query(structureQuery);
    const structures = new Map<string, string[]>();
    
    result.rows.forEach((row: any) => {
      const structure = row.structure;
      if (!structures.has(structure)) {
        structures.set(structure, []);
      }
      structures.get(structure)!.push(row.table_name);
    });
    
    let foundDuplicates = false;
    structures.forEach((tables, structure) => {
      if (tables.length > 1) {
        console.log(`⚠️  Tables with identical structure: ${tables.join(', ')}`);
        foundDuplicates = true;
      }
    });
    
    if (!foundDuplicates) {
      console.log('✅ No tables with identical structures found');
    }
  }

  private async auditForeignKeys(): Promise<void> {
    console.log('\n🔗 3. AUDITING FOREIGN KEY RELATIONSHIPS');
    console.log('=' .repeat(50));
    
    const fkQuery = `
      SELECT 
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        tc.constraint_name
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
      ORDER BY tc.table_name, kcu.column_name
    `;
    
    const result = await database.query(fkQuery);
    const foreignKeys = result.rows as ForeignKeyInfo[];
    
    console.log(`Found ${foreignKeys.length} foreign key relationships:`);
    
    const fkByTable = new Map<string, ForeignKeyInfo[]>();
    foreignKeys.forEach(fk => {
      if (!fkByTable.has(fk.table_name)) {
        fkByTable.set(fk.table_name, []);
      }
      fkByTable.get(fk.table_name)!.push(fk);
    });
    
    fkByTable.forEach((fks, tableName) => {
      console.log(`\n📊 ${tableName}:`);
      fks.forEach(fk => {
        console.log(`   ${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
      });
    });
    
    // Check for orphaned records
    await this.checkOrphanedRecords(foreignKeys);
  }

  private async checkOrphanedRecords(foreignKeys: ForeignKeyInfo[]): Promise<void> {
    console.log('\n🔍 Checking for orphaned records...');
    
    for (const fk of foreignKeys.slice(0, 5)) { // Check first 5 to avoid too many queries
      try {
        const orphanQuery = `
          SELECT COUNT(*) as orphan_count
          FROM ${fk.table_name} t
          LEFT JOIN ${fk.foreign_table_name} f ON t.${fk.column_name} = f.${fk.foreign_column_name}
          WHERE t.${fk.column_name} IS NOT NULL AND f.${fk.foreign_column_name} IS NULL
        `;
        
        const result = await database.query(orphanQuery);
        const orphanCount = parseInt(result.rows[0].orphan_count);
        
        if (orphanCount > 0) {
          console.log(`⚠️  ${orphanCount} orphaned records in ${fk.table_name}.${fk.column_name}`);
        }
      } catch (error) {
        console.log(`❌ Could not check orphans for ${fk.table_name}.${fk.column_name}`);
      }
    }
  }

  private async auditIndexes(): Promise<void> {
    console.log('\n📇 4. AUDITING INDEXES AND CONSTRAINTS');
    console.log('=' .repeat(50));
    
    const indexQuery = `
      SELECT 
        t.relname as table_name,
        i.relname as index_name,
        a.attname as column_name,
        ix.indisunique as is_unique
      FROM pg_class t
      JOIN pg_index ix ON t.oid = ix.indrelid
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
      WHERE t.relkind = 'r'
        AND t.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      ORDER BY t.relname, i.relname, a.attname
    `;
    
    const result = await database.query(indexQuery);
    const indexes = result.rows as IndexInfo[];
    
    const indexByTable = new Map<string, IndexInfo[]>();
    indexes.forEach(idx => {
      if (!indexByTable.has(idx.table_name)) {
        indexByTable.set(idx.table_name, []);
      }
      indexByTable.get(idx.table_name)!.push(idx);
    });
    
    console.log(`Found indexes on ${indexByTable.size} tables:`);
    
    indexByTable.forEach((idxs, tableName) => {
      console.log(`\n📊 ${tableName}:`);
      const uniqueIndexes = idxs.filter(idx => idx.is_unique);
      const regularIndexes = idxs.filter(idx => !idx.is_unique);
      
      if (uniqueIndexes.length > 0) {
        console.log(`   Unique indexes: ${uniqueIndexes.length}`);
        uniqueIndexes.forEach(idx => {
          console.log(`     - ${idx.index_name} (${idx.column_name})`);
        });
      }
      
      if (regularIndexes.length > 0) {
        console.log(`   Regular indexes: ${regularIndexes.length}`);
        regularIndexes.slice(0, 3).forEach(idx => { // Show first 3
          console.log(`     - ${idx.index_name} (${idx.column_name})`);
        });
        if (regularIndexes.length > 3) {
          console.log(`     ... and ${regularIndexes.length - 3} more`);
        }
      }
    });
  }

  private async auditTriggers(): Promise<void> {
    console.log('\n⚡ 5. AUDITING TRIGGERS AND FUNCTIONS');
    console.log('=' .repeat(50));
    
    const triggerQuery = `
      SELECT 
        trigger_name,
        event_object_table as table_name,
        event_manipulation,
        action_timing,
        action_statement
      FROM information_schema.triggers
      WHERE trigger_schema = 'public'
      ORDER BY event_object_table, trigger_name
    `;
    
    const result = await database.query(triggerQuery);
    const triggers = result.rows as TriggerInfo[];
    
    console.log(`Found ${triggers.length} triggers:`);
    
    const triggersByTable = new Map<string, TriggerInfo[]>();
    triggers.forEach(trigger => {
      if (!triggersByTable.has(trigger.table_name)) {
        triggersByTable.set(trigger.table_name, []);
      }
      triggersByTable.get(trigger.table_name)!.push(trigger);
    });
    
    triggersByTable.forEach((trigs, tableName) => {
      console.log(`\n📊 ${tableName}:`);
      trigs.forEach(trigger => {
        console.log(`   ${trigger.trigger_name}: ${trigger.action_timing} ${trigger.event_manipulation}`);
      });
    });
    
    // Check for custom functions
    const functionQuery = `
      SELECT routine_name, routine_type
      FROM information_schema.routines
      WHERE routine_schema = 'public' AND routine_type = 'FUNCTION'
      ORDER BY routine_name
    `;
    
    const funcResult = await database.query(functionQuery);
    console.log(`\nFound ${funcResult.rows.length} custom functions:`);
    funcResult.rows.forEach((func: any) => {
      console.log(`   - ${func.routine_name}`);
    });
  }

  private async auditDataConsistency(): Promise<void> {
    console.log('\n🔍 6. AUDITING DATA CONSISTENCY');
    console.log('=' .repeat(50));
    
    // Check record counts
    const tables = ['users', 'agents', 'calls', 'contacts', 'agent_analytics', 'lead_analytics'];
    
    for (const table of tables) {
      try {
        const countResult = await database.query(`SELECT COUNT(*) as count FROM ${table}`);
        const count = parseInt(countResult.rows[0].count);
        console.log(`📊 ${table}: ${count.toLocaleString()} records`);
        
        // Check for null IDs
        const nullIdResult = await database.query(`SELECT COUNT(*) as null_ids FROM ${table} WHERE id IS NULL`);
        const nullIds = parseInt(nullIdResult.rows[0].null_ids);
        if (nullIds > 0) {
          console.log(`   ⚠️  ${nullIds} records with NULL id`);
        }
        
      } catch (error) {
        console.log(`❌ Could not check ${table}: table might not exist`);
      }
    }
    
    // Check agent analytics consistency
    await this.checkAgentAnalyticsConsistency();
  }

  private async checkAgentAnalyticsConsistency(): Promise<void> {
    console.log('\n🔍 Checking agent analytics consistency...');
    
    try {
      // Check if agent_analytics data matches calls data
      const consistencyQuery = `
        SELECT 
          'calls_vs_analytics' as check_type,
          c.agent_count as calls_agents,
          aa.agent_count as analytics_agents
        FROM 
          (SELECT COUNT(DISTINCT agent_id) as agent_count FROM calls WHERE agent_id IS NOT NULL) c,
          (SELECT COUNT(DISTINCT agent_id) as analytics_agents FROM agent_analytics) aa
        
        UNION ALL
        
        SELECT 
          'user_consistency' as check_type,
          c.user_count as calls_users,
          aa.user_count as analytics_users
        FROM 
          (SELECT COUNT(DISTINCT user_id) as user_count FROM calls WHERE user_id IS NOT NULL) c,
          (SELECT COUNT(DISTINCT user_id) as user_count FROM agent_analytics) aa
      `;
      
      const result = await database.query(consistencyQuery);
      result.rows.forEach((row: any) => {
        if (row.check_type === 'calls_vs_analytics') {
          if (row.calls_agents !== row.analytics_agents) {
            console.log(`⚠️  Agent count mismatch: calls(${row.calls_agents}) vs analytics(${row.analytics_agents})`);
          } else {
            console.log(`✅ Agent count consistent: ${row.calls_agents} agents`);
          }
        } else if (row.check_type === 'user_consistency') {
          if (row.calls_users !== row.analytics_users) {
            console.log(`⚠️  User count mismatch: calls(${row.calls_users}) vs analytics(${row.analytics_users})`);
          } else {
            console.log(`✅ User count consistent: ${row.calls_users} users`);
          }
        }
      });
      
    } catch (error) {
      console.log('❌ Could not check agent analytics consistency - tables might not exist yet');
    }
  }

  private async auditPerformance(): Promise<void> {
    console.log('\n⚡ 7. AUDITING PERFORMANCE METRICS');
    console.log('=' .repeat(50));
    
    // Check table sizes
    const sizeQuery = `
      SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
        pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
    `;
    
    const result = await database.query(sizeQuery);
    console.log('📊 Table sizes (largest first):');
    result.rows.forEach((row: any) => {
      console.log(`   ${row.tablename}: ${row.size}`);
    });
    
    // Check for missing indexes on foreign keys
    console.log('\n🔍 Checking for missing indexes on foreign keys...');
    
    const missingIndexQuery = `
      SELECT 
        tc.table_name,
        kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND NOT EXISTS (
          SELECT 1 FROM pg_indexes 
          WHERE tablename = tc.table_name 
            AND indexdef LIKE '%' || kcu.column_name || '%'
        )
    `;
    
    try {
      const missingResult = await database.query(missingIndexQuery);
      if (missingResult.rows.length > 0) {
        console.log('⚠️  Foreign keys without indexes:');
        missingResult.rows.forEach((row: any) => {
          console.log(`   ${row.table_name}.${row.column_name}`);
        });
      } else {
        console.log('✅ All foreign keys have indexes');
      }
    } catch (error) {
      console.log('❌ Could not check for missing indexes');
    }
  }

  private async auditMigrations(): Promise<void> {
    console.log('\n📋 8. AUDITING MIGRATION STATUS');
    console.log('=' .repeat(50));
    
    try {
      // Check if migrations table exists
      const migrationTableQuery = `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'migrations'
        ) as exists
      `;
      
      const tableResult = await database.query(migrationTableQuery);
      
      if (tableResult.rows[0].exists) {
        const migrationsQuery = `
          SELECT migration_name, executed_at 
          FROM migrations 
          ORDER BY executed_at DESC
        `;
        
        const result = await database.query(migrationsQuery);
        console.log(`✅ Found ${result.rows.length} executed migrations:`);
        
        result.rows.forEach((row: any, index: any) => {
          const date = new Date(row.executed_at).toLocaleDateString();
          console.log(`   ${index + 1}. ${row.migration_name} (${date})`);
        });
        
        // Check for pending migrations by looking at migration files
        console.log('\n🔍 Checking for pending migrations...');
        console.log('   (This would require file system access to migration directory)');
        
      } else {
        console.log('❌ Migrations table not found - migrations might not be set up');
      }
      
    } catch (error) {
      console.log('❌ Could not check migration status:', error);
    }
  }
}

// Run the audit
async function runDatabaseAudit() {
  const auditor = new DatabaseAuditor();
  await auditor.runFullAudit();
}

// Execute if run directly
if (require.main === module) {
  runDatabaseAudit().catch(console.error);
}

export { DatabaseAuditor, runDatabaseAudit };