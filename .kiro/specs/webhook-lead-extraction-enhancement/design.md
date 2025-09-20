# Webhook Lead Extraction Enhancement - Technical Design

## Overview

This design enhances the webhook processing system to extract company names, store CTA data in dedicated columns, and automatically create contact records from webhook extraction data.

## Architecture Overview

```
Webhook Payload → Enhanced Parser → Database Updates → Analytics Updates
     ↓              ↓                    ↓                ↓
Sample Data    Extract Company      Store in Columns   Update Triggers
               Extract CTAs         Create Contacts    Refresh Analytics
               Extract Contact Info
```

## Database Schema Changes

### 1. Lead Analytics Table Enhancement

```sql
-- Migration: 020_enhance_lead_analytics_extraction.sql
ALTER TABLE lead_analytics 
ADD COLUMN company_name VARCHAR(255),
ADD COLUMN extracted_name VARCHAR(255),
ADD COLUMN extracted_email VARCHAR(255),
ADD COLUMN cta_pricing_clicked BOOLEAN DEFAULT FALSE,
ADD COLUMN cta_demo_clicked BOOLEAN DEFAULT FALSE,
ADD COLUMN cta_followup_clicked BOOLEAN DEFAULT FALSE,
ADD COLUMN cta_sample_clicked BOOLEAN DEFAULT FALSE,
ADD COLUMN cta_escalated_to_human BOOLEAN DEFAULT FALSE;

-- Create indexes for efficient querying
CREATE INDEX idx_lead_analytics_company_name ON lead_analytics(company_name) WHERE company_name IS NOT NULL;
CREATE INDEX idx_lead_analytics_cta_pricing ON lead_analytics(cta_pricing_clicked) WHERE cta_pricing_clicked = TRUE;
CREATE INDEX idx_lead_analytics_cta_demo ON lead_analytics(cta_demo_clicked) WHERE cta_demo_clicked = TRUE;
CREATE INDEX idx_lead_analytics_cta_followup ON lead_analytics(cta_followup_clicked) WHERE cta_followup_clicked = TRUE;

-- Migrate existing CTA data from JSONB to dedicated columns
UPDATE lead_analytics 
SET 
  cta_pricing_clicked = COALESCE((cta_interactions->>'cta_pricing_clicked')::boolean, false),
  cta_demo_clicked = COALESCE((cta_interactions->>'cta_demo_clicked')::boolean, false),
  cta_followup_clicked = COALESCE((cta_interactions->>'cta_followup_clicked')::boolean, false),
  cta_sample_clicked = COALESCE((cta_interactions->>'cta_sample_clicked')::boolean, false),
  cta_escalated_to_human = COALESCE((cta_interactions->>'cta_escalated_to_human')::boolean, false)
WHERE cta_interactions IS NOT NULL;
```

## Enhanced Webhook Processing

### 1. Webhook Data Parser Enhancement

```typescript
// backend/src/services/webhookDataProcessor.ts
export class WebhookDataProcessor {
  static extractEnhancedLeadData(webhookData: any): EnhancedLeadData {
    const analysisData = webhookData.analysis?.data_collection_results?.default;
    if (!analysisData?.value) {
      return null;
    }

    // Parse the Python dictionary string to JSON
    const parsedData = this.parsePythonDict(analysisData.value);
    
    return {
      // Company and contact extraction
      companyName: parsedData.extraction?.company_name || null,
      extractedName: parsedData.extraction?.name || null,
      extractedEmail: parsedData.extraction?.email_address || null,
      
      // CTA extractions
      ctaPricingClicked: parsedData.cta_pricing_clicked === 'Yes',
      ctaDemoClicked: parsedData.cta_demo_clicked === 'Yes',
      ctaFollowupClicked: parsedData.cta_followup_clicked === 'Yes',
      ctaSampleClicked: parsedData.cta_sample_clicked === 'Yes',
      ctaEscalatedToHuman: parsedData.cta_escalated_to_human === 'Yes'
    };
  }

  static parsePythonDict(pythonDictString: string): any {
    try {
      // Convert Python syntax to JSON
      let jsonString = pythonDictString
        .replace(/'/g, '"')
        .replace(/True/g, 'true')
        .replace(/False/g, 'false')
        .replace(/None/g, 'null');
      
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('Failed to parse Python dict:', error);
      return {};
    }
  }
}

interface EnhancedLeadData {
  companyName: string | null;
  extractedName: string | null;
  extractedEmail: string | null;
  ctaPricingClicked: boolean;
  ctaDemoClicked: boolean;
  ctaFollowupClicked: boolean;
  ctaSampleClicked: boolean;
  ctaEscalatedToHuman: boolean;
}
```

### 2. Contact Auto-Creation Service

```typescript
// backend/src/services/contactAutoCreationService.ts
export class ContactAutoCreationService {
  static async createOrUpdateContact(
    userId: string,
    leadData: EnhancedLeadData,
    callId: string,
    phoneNumber?: string
  ): Promise<string | null> {
    
    // Skip if no meaningful contact data
    if (!leadData.extractedName && !leadData.extractedEmail && !phoneNumber) {
      return null;
    }

    try {
      // Check for existing contact by email or phone
      let existingContact = null;
      
      if (leadData.extractedEmail) {
        existingContact = await this.findContactByEmail(userId, leadData.extractedEmail);
      }
      
      if (!existingContact && phoneNumber) {
        existingContact = await this.findContactByPhone(userId, phoneNumber);
      }

      if (existingContact) {
        // Update existing contact with better data
        return await this.updateContactIfBetter(existingContact.id, leadData, phoneNumber);
      } else {
        // Create new contact
        return await this.createNewContact(userId, leadData, phoneNumber, callId);
      }
    } catch (error) {
      console.error('Error in contact auto-creation:', error);
      return null;
    }
  }

  private static async findContactByEmail(userId: string, email: string) {
    const query = `
      SELECT id, name, email, phone_number, company 
      FROM contacts 
      WHERE user_id = $1 AND email = $2
    `;
    const result = await db.query(query, [userId, email]);
    return result.rows[0] || null;
  }

  private static async findContactByPhone(userId: string, phone: string) {
    const query = `
      SELECT id, name, email, phone_number, company 
      FROM contacts 
      WHERE user_id = $1 AND phone_number = $2
    `;
    const result = await db.query(query, [userId, phone]);
    return result.rows[0] || null;
  }

  private static async createNewContact(
    userId: string, 
    leadData: EnhancedLeadData, 
    phoneNumber: string | undefined,
    callId: string
  ): Promise<string> {
    const query = `
      INSERT INTO contacts (user_id, name, email, phone_number, company, notes)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `;
    
    const notes = `Auto-created from call ${callId}`;
    const values = [
      userId,
      leadData.extractedName,
      leadData.extractedEmail,
      phoneNumber,
      leadData.companyName,
      notes
    ];

    const result = await db.query(query, values);
    return result.rows[0].id;
  }

  private static async updateContactIfBetter(
    contactId: string,
    leadData: EnhancedLeadData,
    phoneNumber: string | undefined
  ): Promise<string> {
    // Only update fields that are currently null or empty
    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    if (leadData.extractedName) {
      updateFields.push(`name = COALESCE(NULLIF(name, ''), $${paramIndex})`);
      values.push(leadData.extractedName);
      paramIndex++;
    }

    if (leadData.extractedEmail) {
      updateFields.push(`email = COALESCE(NULLIF(email, ''), $${paramIndex})`);
      values.push(leadData.extractedEmail);
      paramIndex++;
    }

    if (phoneNumber) {
      updateFields.push(`phone_number = COALESCE(NULLIF(phone_number, ''), $${paramIndex})`);
      values.push(phoneNumber);
      paramIndex++;
    }

    if (leadData.companyName) {
      updateFields.push(`company = COALESCE(NULLIF(company, ''), $${paramIndex})`);
      values.push(leadData.companyName);
      paramIndex++;
    }

    if (updateFields.length > 0) {
      values.push(contactId);
      const query = `
        UPDATE contacts 
        SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramIndex}
      `;
      await db.query(query, values);
    }

    return contactId;
  }
}
```

### 3. Enhanced Webhook Service Integration

```typescript
// backend/src/services/webhookService.ts - Enhanced processing
export class WebhookService {
  static async processWebhook(webhookData: any): Promise<void> {
    try {
      // Existing webhook processing...
      const callId = await this.processCallData(webhookData);
      
      // Enhanced lead data extraction
      const enhancedLeadData = WebhookDataProcessor.extractEnhancedLeadData(webhookData);
      
      if (enhancedLeadData) {
        // Store enhanced lead analytics
        await this.storeEnhancedLeadAnalytics(callId, enhancedLeadData);
        
        // Auto-create contact
        const phoneNumber = webhookData.conversation_initiation_client_data?.dynamic_variables?.system__caller_id;
        const userId = await this.getUserIdFromCall(callId);
        
        const contactId = await ContactAutoCreationService.createOrUpdateContact(
          userId,
          enhancedLeadData,
          callId,
          phoneNumber
        );

        // Link contact to call if created
        if (contactId) {
          await this.linkContactToCall(callId, contactId);
        }
      }
    } catch (error) {
      console.error('Enhanced webhook processing error:', error);
      throw error;
    }
  }

  private static async storeEnhancedLeadAnalytics(
    callId: string, 
    leadData: EnhancedLeadData
  ): Promise<void> {
    const query = `
      UPDATE lead_analytics 
      SET 
        company_name = $2,
        extracted_name = $3,
        extracted_email = $4,
        cta_pricing_clicked = $5,
        cta_demo_clicked = $6,
        cta_followup_clicked = $7,
        cta_sample_clicked = $8,
        cta_escalated_to_human = $9,
        updated_at = CURRENT_TIMESTAMP
      WHERE call_id = $1
    `;

    await db.query(query, [
      callId,
      leadData.companyName,
      leadData.extractedName,
      leadData.extractedEmail,
      leadData.ctaPricingClicked,
      leadData.ctaDemoClicked,
      leadData.ctaFollowupClicked,
      leadData.ctaSampleClicked,
      leadData.ctaEscalatedToHuman
    ]);
  }

  private static async linkContactToCall(callId: string, contactId: string): Promise<void> {
    const query = `UPDATE calls SET contact_id = $2 WHERE id = $1`;
    await db.query(query, [callId, contactId]);
  }
}
```

## Analytics Integration

### 1. Updated Analytics Queries

```typescript
// backend/src/services/analyticsService.ts - Updated CTA queries
export class AnalyticsService {
  static async getEnhancedCTAMetrics(userId: string, dateRange: DateRange): Promise<CTAMetrics> {
    const query = `
      SELECT 
        COUNT(CASE WHEN la.cta_pricing_clicked = true THEN 1 END) as pricing_clicks,
        COUNT(CASE WHEN la.cta_demo_clicked = true THEN 1 END) as demo_requests,
        COUNT(CASE WHEN la.cta_followup_clicked = true THEN 1 END) as followup_requests,
        COUNT(CASE WHEN la.cta_sample_clicked = true THEN 1 END) as sample_requests,
        COUNT(CASE WHEN la.cta_escalated_to_human = true THEN 1 END) as human_escalations,
        COUNT(*) as total_leads,
        COUNT(CASE WHEN la.company_name IS NOT NULL THEN 1 END) as leads_with_company
      FROM lead_analytics la
      JOIN calls c ON la.call_id = c.id
      WHERE c.user_id = $1 
        AND c.created_at >= $2 
        AND c.created_at <= $3
    `;

    const result = await db.query(query, [userId, dateRange.start, dateRange.end]);
    return result.rows[0];
  }

  static async getCompanyLeadBreakdown(userId: string): Promise<CompanyLeadData[]> {
    const query = `
      SELECT 
        la.company_name,
        COUNT(*) as lead_count,
        AVG(la.total_score) as avg_score,
        COUNT(CASE WHEN la.cta_demo_clicked = true THEN 1 END) as demo_requests
      FROM lead_analytics la
      JOIN calls c ON la.call_id = c.id
      WHERE c.user_id = $1 
        AND la.company_name IS NOT NULL
      GROUP BY la.company_name
      ORDER BY lead_count DESC
      LIMIT 20
    `;

    const result = await db.query(query, [userId]);
    return result.rows;
  }
}
```

### 2. Updated Database Triggers

```sql
-- Update agent analytics trigger to include CTA metrics
CREATE OR REPLACE FUNCTION update_agent_analytics_from_lead_analytics()
RETURNS TRIGGER AS $
BEGIN
    -- Update agent analytics with CTA metrics from dedicated columns
    INSERT INTO agent_analytics (
        agent_id, user_id, date, hour,
        cta_pricing_clicks, cta_demo_clicks, cta_followup_clicks,
        cta_sample_clicks, cta_human_escalations
    )
    SELECT 
        c.agent_id, c.user_id, DATE(c.created_at), EXTRACT(hour FROM c.created_at),
        CASE WHEN NEW.cta_pricing_clicked THEN 1 ELSE 0 END,
        CASE WHEN NEW.cta_demo_clicked THEN 1 ELSE 0 END,
        CASE WHEN NEW.cta_followup_clicked THEN 1 ELSE 0 END,
        CASE WHEN NEW.cta_sample_clicked THEN 1 ELSE 0 END,
        CASE WHEN NEW.cta_escalated_to_human THEN 1 ELSE 0 END
    FROM calls c
    WHERE c.id = NEW.call_id
    
    ON CONFLICT (agent_id, date, hour)
    DO UPDATE SET
        cta_pricing_clicks = agent_analytics.cta_pricing_clicks + EXCLUDED.cta_pricing_clicks,
        cta_demo_clicks = agent_analytics.cta_demo_clicks + EXCLUDED.cta_demo_clicks,
        cta_followup_clicks = agent_analytics.cta_followup_clicks + EXCLUDED.cta_followup_clicks,
        cta_sample_clicks = agent_analytics.cta_sample_clicks + EXCLUDED.cta_sample_clicks,
        cta_human_escalations = agent_analytics.cta_human_escalations + EXCLUDED.cta_human_escalations;

    RETURN NEW;
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_agent_analytics_from_lead_analytics
    AFTER INSERT ON lead_analytics
    FOR EACH ROW
    EXECUTE FUNCTION update_agent_analytics_from_lead_analytics();
```

## Frontend Integration

### 1. Enhanced Lead Display Components

```typescript
// Frontend/src/components/leads/EnhancedLeadCard.tsx
interface EnhancedLeadCardProps {
  lead: {
    id: string;
    name: string;
    email: string;
    company: string;
    totalScore: number;
    ctaInteractions: {
      pricingClicked: boolean;
      demoClicked: boolean;
      followupClicked: boolean;
      sampleClicked: boolean;
      escalatedToHuman: boolean;
    };
  };
}

export const EnhancedLeadCard: React.FC<EnhancedLeadCardProps> = ({ lead }) => {
  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold">{lead.name}</h3>
          {lead.company && (
            <p className="text-sm text-gray-600">{lead.company}</p>
          )}
          <p className="text-sm text-gray-500">{lead.email}</p>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold">{lead.totalScore}/100</div>
        </div>
      </div>
      
      <div className="flex gap-2 flex-wrap">
        {lead.ctaInteractions.pricingClicked && (
          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
            💰 Pricing
          </span>
        )}
        {lead.ctaInteractions.demoClicked && (
          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
            🎯 Demo
          </span>
        )}
        {lead.ctaInteractions.followupClicked && (
          <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
            📞 Follow-up
          </span>
        )}
        {lead.ctaInteractions.escalatedToHuman && (
          <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
            👤 Human
          </span>
        )}
      </div>
    </div>
  );
};
```

## Implementation Priority

### Phase 1: Database Schema (High Priority)
1. Create migration for new columns
2. Migrate existing CTA data
3. Add indexes for performance

### Phase 2: Webhook Processing (High Priority)
1. Enhance webhook data parser
2. Implement contact auto-creation service
3. Update webhook service integration

### Phase 3: Analytics Integration (Medium Priority)
1. Update analytics queries
2. Update database triggers
3. Test analytics accuracy

### Phase 4: Frontend Integration (Low Priority)
1. Update lead display components
2. Add company filtering
3. Enhance CTA metrics display

## Success Metrics

- 100% company name extraction when available in webhook
- Zero data loss during CTA migration
- Automatic contact creation for all valid extraction data
- No performance degradation in webhook processing
- Improved analytics query performance with dedicated CTA columns

This design provides a focused, minimal approach to enhancing webhook processing while maintaining system stability and performance.