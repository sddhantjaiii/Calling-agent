import { DatabaseConnection } from '../config/database';

async function verifyIndexes() {
    const db = new DatabaseConnection();
    
    try {
        await db.initialize();
        console.log('🔍 Verifying composite indexes...');
        
        // Query to check if our new indexes exist
        const indexQuery = `
            SELECT 
                schemaname,
                tablename,
                indexname,
                indexdef
            FROM pg_indexes 
            WHERE schemaname = 'public' 
            AND (
                indexname LIKE 'idx_calls_user_%' OR
                indexname LIKE 'idx_agent_analytics_user_%' OR
                indexname LIKE 'idx_lead_analytics_%' OR
                indexname LIKE 'idx_dashboard_cache_%'
            )
            ORDER BY tablename, indexname;
        `;
        
        const result = await db.query(indexQuery);
        
        console.log(`\n📊 Found ${result.rows.length} composite indexes:`);
        console.log('=' .repeat(80));
        
        result.rows.forEach((row: any) => {
            console.log(`Table: ${row.tablename}`);
            console.log(`Index: ${row.indexname}`);
            console.log(`Definition: ${row.indexdef}`);
            console.log('-'.repeat(80));
        });
        
        // Check index usage statistics
        const usageQuery = `
            SELECT 
                schemaname,
                relname as tablename,
                indexrelname as indexname,
                idx_scan,
                idx_tup_read,
                idx_tup_fetch
            FROM pg_stat_user_indexes 
            WHERE schemaname = 'public' 
            AND (
                indexrelname LIKE 'idx_calls_user_%' OR
                indexrelname LIKE 'idx_agent_analytics_user_%' OR
                indexrelname LIKE 'idx_lead_analytics_%' OR
                indexrelname LIKE 'idx_dashboard_cache_%'
            )
            ORDER BY idx_scan DESC;
        `;
        
        const usageResult = await db.query(usageQuery);
        
        console.log(`\n📈 Index usage statistics:`);
        console.log('=' .repeat(80));
        
        if (usageResult.rows.length === 0) {
            console.log('No usage statistics yet (indexes just created)');
        } else {
            usageResult.rows.forEach((row: any) => {
                console.log(`${row.tablename}.${row.indexname}: ${row.idx_scan} scans, ${row.idx_tup_read} tuples read`);
            });
        }
        
        // Verify specific indexes from our task
        const requiredIndexes = [
            'idx_calls_user_created_status',
            'idx_calls_user_status_created', 
            'idx_agent_analytics_user_date_hour',
            'idx_agent_analytics_user_date_daily',
            'idx_lead_analytics_score_created',
            'idx_lead_analytics_call_score_quality'
        ];
        
        console.log(`\n✅ Checking required indexes:`);
        console.log('=' .repeat(80));
        
        for (const indexName of requiredIndexes) {
            const found = result.rows.some((row: any) => row.indexname === indexName);
            console.log(`${found ? '✅' : '❌'} ${indexName}`);
        }
        
        console.log('\n🎉 Index verification complete!');
        
    } catch (error) {
        console.error('❌ Error verifying indexes:', error);
    } finally {
        await db.close();
    }
}

verifyIndexes().catch(console.error);