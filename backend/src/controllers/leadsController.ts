import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { AgentOwnershipRequest } from '../middleware/agentOwnership';
import { CallService } from '../services/callService';
import { logger } from '../utils/logger';
import pool from '../config/database';

export class LeadsController {
  /**
   * Get leads data for frontend ChatData/CallData components with filtering
   * GET /api/leads
   */
  async getLeads(req: AgentOwnershipRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const userAgentIds = req.userAgentIds || [];
      const specificAgent = req.agent;

      // Parse query parameters for filtering
      const filters: any = {};
      const options: any = {};

      // Search term filter
      if (req.query.search && typeof req.query.search === 'string') {
        filters.search = req.query.search;
      }

      // Lead type filter
      if (req.query.leadType && typeof req.query.leadType === 'string') {
        filters.leadType = req.query.leadType;
      }

      // Business type filter
      if (req.query.businessType && typeof req.query.businessType === 'string') {
        filters.businessType = req.query.businessType;
      }

      // Lead tag filter (Hot, Warm, Cold)
      if (req.query.leadTag && typeof req.query.leadTag === 'string') {
        filters.leadTag = req.query.leadTag;
      }

      // Platform filter
      if (req.query.platform && typeof req.query.platform === 'string') {
        filters.platform = req.query.platform;
      }

      // Agent filter
      if (req.query.agent && typeof req.query.agent === 'string') {
        filters.agent = req.query.agent;
      }

      // Date range filters
      if (req.query.startDate && typeof req.query.startDate === 'string') {
        filters.startDate = new Date(req.query.startDate);
      }

      if (req.query.endDate && typeof req.query.endDate === 'string') {
        filters.endDate = new Date(req.query.endDate);
      }

      // Engagement level filter
      if (req.query.engagementLevel && typeof req.query.engagementLevel === 'string') {
        filters.engagementLevel = req.query.engagementLevel;
      }

      // Intent level filter
      if (req.query.intentLevel && typeof req.query.intentLevel === 'string') {
        filters.intentLevel = req.query.intentLevel;
      }

      // Pagination options
      if (req.query.limit && typeof req.query.limit === 'string') {
        const limit = parseInt(req.query.limit);
        if (!isNaN(limit) && limit > 0 && limit <= 100) {
          options.limit = limit;
        }
      }

      if (req.query.offset && typeof req.query.offset === 'string') {
        const offset = parseInt(req.query.offset);
        if (!isNaN(offset) && offset >= 0) {
          options.offset = offset;
        }
      }

      // Sorting options
      if (req.query.sortBy && typeof req.query.sortBy === 'string') {
        const validSortFields = ['name', 'interactionDate', 'leadTag', 'engagementLevel', 'intentLevel'];
        if (validSortFields.includes(req.query.sortBy)) {
          options.sortBy = req.query.sortBy;
        }
      }

      if (req.query.sortOrder && typeof req.query.sortOrder === 'string') {
        if (['asc', 'desc'].includes(req.query.sortOrder.toLowerCase())) {
          options.sortOrder = req.query.sortOrder.toLowerCase();
        }
      }

      // Get calls data and transform to leads format
      let calls = await CallService.getUserCalls(userId);
      
      // Apply agent data isolation
      if (userAgentIds.length > 0) {
        calls = calls.filter(call => userAgentIds.includes(call.agent_id));
      } else {
        calls = [];
      }

      // Apply specific agent filter if provided
      if (specificAgent) {
        calls = calls.filter(call => call.agent_id === specificAgent.id);
      }
      
      // Transform calls data to match frontend lead data structure
      let leads = calls.map((call, index) => {
        // Use actual lead analytics data when available, fallback to reasonable defaults
        const leadAnalytics = call.lead_analytics;
        
        // Determine lead tag based on total score
        let leadTag = 'Cold';
        if (leadAnalytics?.total_score) {
          if (leadAnalytics.total_score >= 80) leadTag = 'Hot';
          else if (leadAnalytics.total_score >= 60) leadTag = 'Warm';
        }

        return {
          id: call.id,
          name: call.contact_name || `Lead ${index + 1}`,
          phone: call.phone_number,
          email: call.caller_email || null, // Use actual email or null
          platform: 'Phone', // All calls are phone-based
          leadType: 'Customer', // Default for calls
          businessType: 'SaaS', // Default business type
          useCase: 'Interested in our services', // Summary not stored in call data
          leadTag,
          // For chat data - estimated messages based on call duration
          messages: call.duration_minutes ? Math.floor(call.duration_minutes * 10) : 0,
          // For call data - duration formatted as MM:SS
          duration: call.duration_minutes ? `${Math.floor(call.duration_minutes)}:${String(Math.floor((call.duration_minutes % 1) * 60)).padStart(2, '0')}` : '0:00',
          engagementLevel: leadAnalytics?.engagement_health || 'Medium',
          intentLevel: leadAnalytics?.intent_level || 'Medium',
          budgetConstraint: leadAnalytics?.budget_constraint || 'Unknown',
          timelineUrgency: leadAnalytics?.urgency_level || 'Medium',
          followUpScheduled: '', // Not implemented yet
          demoScheduled: '', // Not implemented yet
          agent: call.agent_name || 'CallAgent-01',
          interactionDate: new Date(call.created_at).toISOString().split('T')[0],
          isLatestInteraction: true,
        };
      });

      // Apply filters
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        leads = leads.filter(lead => 
          lead.name.toLowerCase().includes(searchTerm) ||
          (lead.email && lead.email.toLowerCase().includes(searchTerm)) ||
          lead.phone.includes(searchTerm) ||
          lead.useCase.toLowerCase().includes(searchTerm)
        );
      }

      if (filters.leadType) {
        leads = leads.filter(lead => lead.leadType === filters.leadType);
      }

      if (filters.businessType) {
        leads = leads.filter(lead => lead.businessType === filters.businessType);
      }

      if (filters.leadTag) {
        leads = leads.filter(lead => lead.leadTag === filters.leadTag);
      }

      if (filters.platform) {
        leads = leads.filter(lead => lead.platform === filters.platform);
      }

      if (filters.agent) {
        leads = leads.filter(lead => lead.agent === filters.agent);
      }

      if (filters.engagementLevel) {
        leads = leads.filter(lead => lead.engagementLevel === filters.engagementLevel);
      }

      if (filters.intentLevel) {
        leads = leads.filter(lead => lead.intentLevel === filters.intentLevel);
      }

      if (filters.startDate) {
        leads = leads.filter(lead => new Date(lead.interactionDate) >= filters.startDate);
      }

      if (filters.endDate) {
        leads = leads.filter(lead => new Date(lead.interactionDate) <= filters.endDate);
      }

      // Apply sorting
      if (options.sortBy) {
        leads.sort((a, b) => {
          let aValue = a[options.sortBy as keyof typeof a];
          let bValue = b[options.sortBy as keyof typeof b];

          // Handle date sorting
          if (options.sortBy === 'interactionDate') {
            aValue = new Date(aValue as string).getTime();
            bValue = new Date(bValue as string).getTime();
          }

          // Handle string sorting with null checks
          if (typeof aValue === 'string' && typeof bValue === 'string') {
            aValue = aValue.toLowerCase();
            bValue = bValue.toLowerCase();
          }

          // Handle null values
          if (aValue === null && bValue === null) return 0;
          if (aValue === null) return options.sortOrder === 'desc' ? 1 : -1;
          if (bValue === null) return options.sortOrder === 'desc' ? -1 : 1;

          if (options.sortOrder === 'desc') {
            return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
          } else {
            return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
          }
        });
      } else {
        // Default sort by interaction date (newest first)
        leads.sort((a, b) => new Date(b.interactionDate).getTime() - new Date(a.interactionDate).getTime());
      }

      // Apply pagination
      const total = leads.length;
      const limit = options.limit || 50;
      const offset = options.offset || 0;
      const paginatedLeads = leads.slice(offset, offset + limit);

      res.json({
        success: true,
        data: paginatedLeads,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      });
    } catch (error) {
      logger.error('Error fetching leads:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch leads',
      });
    }
  }

  /**
   * Get single lead details for LeadProfileTab component
   * GET /api/leads/:id
   */
  async getLead(req: AgentOwnershipRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const userAgentIds = req.userAgentIds || [];

      // Get call details and transform to lead format
      const call = await CallService.getCallDetails(id, userId);

      if (!call) {
        res.status(404).json({
          success: false,
          error: 'Lead not found',
        });
        return;
      }

      // Verify the call belongs to one of the user's agents
      if (!userAgentIds.includes(call.agent_id)) {
        res.status(403).json({
          success: false,
          error: 'Access denied to this lead',
        });
        return;
      }

      const leadAnalytics = call.lead_analytics;
      
      // Determine lead tag based on total score
      let leadTag = 'Cold';
      if (leadAnalytics?.total_score) {
        if (leadAnalytics.total_score >= 80) leadTag = 'Hot';
        else if (leadAnalytics.total_score >= 60) leadTag = 'Warm';
      }

      // Create timeline entry for this interaction
      const timelineEntry = {
        id: call.id,
        type: 'call',
        interactionAgent: call.agent_name || 'CallAgent-01',
        interactionDate: new Date(call.created_at).toISOString().split('T')[0],
        platform: 'Phone',
        leadType: 'Customer',
        businessType: 'SaaS',
        status: call.status,
        useCase: 'Interested in our services', // Summary not stored in call data
        messages: null,
        duration: call.duration_minutes ? `${Math.floor(call.duration_minutes)}:${String(Math.floor((call.duration_minutes % 1) * 60)).padStart(2, '0')}` : '0:00',
        engagementLevel: leadAnalytics?.engagement_health || 'Medium',
        intentLevel: leadAnalytics?.intent_level || 'Medium',
        budgetConstraint: leadAnalytics?.budget_constraint || 'Unknown',
        timelineUrgency: leadAnalytics?.urgency_level || 'Medium',
        followUpScheduled: '',
        demoScheduled: '',
        actions: 'Call completed',
        recording: !!call.recording_url,
        transcript: call.transcript?.content || '',
        chatHistory: [], // Calls don't have chat history
        date: new Date(call.created_at).toISOString().split('T')[0]
      };

      // Transform call to lead format with additional profile data
      const lead = {
        id: call.id,
        name: call.contact_name || 'Unknown Lead',
        phone: call.phone_number,
        email: call.caller_email || null, // Use actual email or null
        company: null, // Company information not available from call data
        platform: 'Phone',
        leadType: 'Customer',
        businessType: 'SaaS',
        useCase: 'Interested in our services', // Summary not stored in call data
        leadTag,
        agentType: 'CallAgent',
        interactions: 1, // Single call interaction
        duration: call.duration_minutes ? `${Math.floor(call.duration_minutes)}:${String(Math.floor((call.duration_minutes % 1) * 60)).padStart(2, '0')}` : '0:00',
        engagementLevel: leadAnalytics?.engagement_health || 'Medium',
        intentLevel: leadAnalytics?.intent_level || 'Medium',
        budgetConstraint: leadAnalytics?.budget_constraint || 'Unknown',
        timelineUrgency: leadAnalytics?.urgency_level || 'Medium',
        followUpScheduled: '',
        demoScheduled: '',
        timeline: [timelineEntry], // Timeline with this call interaction
        // Additional profile data for LeadProfileTab
        profile: {
          totalScore: leadAnalytics?.total_score || 0,
          scores: {
            intent: leadAnalytics?.intent_score || 0,
            urgency: leadAnalytics?.urgency_score || 0,
            budget: leadAnalytics?.budget_score || 0,
            fit: leadAnalytics?.fit_score || 0,
            engagement: leadAnalytics?.engagement_score || 0,
          },
          reasoning: leadAnalytics?.reasoning || {
            intent: 'No analysis available',
            urgency: 'No analysis available',
            budget: 'No analysis available',
            fit: 'No analysis available',
            engagement: 'No analysis available',
            cta_behavior: 'No analysis available'
          },
          ctaInteractions: leadAnalytics?.cta_interactions || {
            pricing_clicked: false,
            demo_clicked: false,
            followup_clicked: false,
            sample_clicked: false,
            escalated_to_human: false
          },
        },
      };

      res.json({
        success: true,
        data: lead,
      });
    } catch (error) {
      logger.error('Error fetching lead:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch lead',
      });
    }
  }

  /**
   * Get lead analytics data
   * GET /api/leads/analytics
   */
  async getLeadAnalytics(req: AgentOwnershipRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const userAgentIds = req.userAgentIds || [];
      const specificAgent = req.agent;

      // Get analytics data from calls
      let calls = await CallService.getUserCalls(userId);
      
      // Apply agent data isolation
      if (userAgentIds.length > 0) {
        calls = calls.filter(call => userAgentIds.includes(call.agent_id));
      } else {
        calls = [];
      }

      // Apply specific agent filter if provided
      if (specificAgent) {
        calls = calls.filter(call => call.agent_id === specificAgent.id);
      }
      
      // Calculate analytics
      const totalLeads = calls.length;
      const hotLeads = calls.filter(call => call.lead_analytics?.total_score && call.lead_analytics.total_score >= 80).length;
      const warmLeads = calls.filter(call => call.lead_analytics?.total_score && call.lead_analytics.total_score >= 60 && call.lead_analytics.total_score < 80).length;
      const coldLeads = calls.filter(call => call.lead_analytics?.total_score && call.lead_analytics.total_score < 60).length;
      
      const averageScore = calls.reduce((sum, call) => sum + (call.lead_analytics?.total_score || 0), 0) / totalLeads || 0;
      
      const analytics = {
        totalLeads,
        leadDistribution: {
          hot: hotLeads,
          warm: warmLeads,
          cold: coldLeads,
        },
        averageScore: Math.round(averageScore * 100) / 100,
        conversionRate: Math.round((hotLeads / totalLeads) * 100 * 100) / 100 || 0,
        trends: {
          // Mock trend data - in real implementation, this would come from historical data
          scoreOverTime: Array.from({ length: 7 }, (_, i) => ({
            date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            averageScore: Math.round((Math.random() * 20 + 70) * 100) / 100,
            hotLeads: Math.floor(Math.random() * 10) + 5,
            warmLeads: Math.floor(Math.random() * 15) + 10,
            coldLeads: Math.floor(Math.random() * 8) + 3,
          })),
        },
      };

      res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      logger.error('Error fetching lead analytics:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch lead analytics',
      });
    }
  }

  /**
   * Get lead interaction timeline
   * GET /api/leads/:id/timeline
   */
  async getLeadTimeline(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      // Get call details
      const call = await CallService.getCallDetails(id, userId);

      if (!call) {
        res.status(404).json({
          success: false,
          error: 'Lead not found',
        });
        return;
      }

      const leadAnalytics = call.lead_analytics;

      // Create timeline entry for this interaction
      const timelineEntry = {
        id: call.id,
        type: 'call',
        interactionAgent: call.agent_name || 'CallAgent-01',
        interactionDate: new Date(call.created_at).toISOString().split('T')[0],
        platform: 'Phone',
        leadType: 'Customer',
        businessType: 'SaaS',
        status: call.status,
        useCase: 'Interested in our services', // Summary not stored in call data
        messages: null,
        duration: call.duration_minutes ? `${Math.floor(call.duration_minutes)}:${String(Math.floor((call.duration_minutes % 1) * 60)).padStart(2, '0')}` : '0:00',
        engagementLevel: leadAnalytics?.engagement_health || 'Medium',
        intentLevel: leadAnalytics?.intent_level || 'Medium',
        budgetConstraint: leadAnalytics?.budget_constraint || 'Unknown',
        timelineUrgency: leadAnalytics?.urgency_level || 'Medium',
        followUpScheduled: '',
        demoScheduled: '',
        actions: call.status === 'completed' ? 'Call completed successfully' : `Call ${call.status}`,
        recording: !!call.recording_url,
        transcript: call.transcript?.content || '',
        chatHistory: [], // Calls don't have chat history
        date: new Date(call.created_at).toISOString().split('T')[0]
      };

      res.json({
        success: true,
        data: {
          timeline: [timelineEntry],
          totalInteractions: 1
        }
      });
    } catch (error) {
      logger.error('Error fetching lead timeline:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch lead timeline',
      });
    }
  }

  /**
   * Get lead intelligence data with grouping and aggregation
   * GET /api/leads/intelligence
   */
  async getLeadIntelligence(req: AgentOwnershipRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const userAgentIds = req.userAgentIds || [];

      // Parse query parameters for filtering
      const filters: any = {};
      const options: any = {};

      // Search term filter
      if (req.query.search && typeof req.query.search === 'string') {
        filters.search = req.query.search;
      }

      // Lead type filter (inbound/outbound)
      if (req.query.leadType && typeof req.query.leadType === 'string') {
        filters.leadType = req.query.leadType;
      }

      // Lead tag filter (Hot, Warm, Cold)
      if (req.query.leadTag && typeof req.query.leadTag === 'string') {
        filters.leadTag = req.query.leadTag;
      }

      // Pagination options
      if (req.query.limit && typeof req.query.limit === 'string') {
        const limit = parseInt(req.query.limit);
        if (!isNaN(limit) && limit > 0 && limit <= 100) {
          options.limit = limit;
        }
      }

      if (req.query.offset && typeof req.query.offset === 'string') {
        const offset = parseInt(req.query.offset);
        if (!isNaN(offset) && offset >= 0) {
          options.offset = offset;
        }
      }

      // Get all calls with lead analytics and agent information
      let calls = await CallService.getUserCalls(userId);
      
      // Apply agent data isolation
      if (userAgentIds.length > 0) {
        calls = calls.filter(call => userAgentIds.includes(call.agent_id));
      } else {
        calls = [];
      }

      // Get follow-up data
      const followUps = await this.getFollowUpsForUser(userId);

      // Group calls by lead (phone number first, then email, then individual)
      const leadGroups = new Map<string, any>();

      calls.forEach(call => {
        let groupKey: string;
        let leadName: string;
        let leadEmail: string | null = null;
        let leadPhone: string | null = null;
        let displayInfo: any = {};

        // Extract lead information from lead_analytics if available
        const extractedName = call.lead_analytics?.extracted_name || call.contact_name;
        const extractedEmail = call.lead_analytics?.extracted_email || call.caller_email;
        const extractedPhone = call.phone_number;

        // Determine grouping key and display info
        if (extractedPhone && extractedPhone !== 'unknown') {
          // Group by phone number (priority)
          groupKey = `phone:${extractedPhone}`;
          leadName = extractedName || `Anonymous ${new Date(call.created_at).toLocaleString()}`;
          leadPhone = extractedPhone;
          leadEmail = extractedEmail || null;
          displayInfo = {
            type: 'phone',
            phone: extractedPhone,
            email: extractedEmail
          };
        } else if (extractedEmail) {
          // Group by email (secondary)
          groupKey = `email:${extractedEmail}`;
          leadName = extractedName || `Anonymous ${new Date(call.created_at).toLocaleString()}`;
          leadEmail = extractedEmail;
          displayInfo = {
            type: 'email',
            email: extractedEmail
          };
        } else {
          // Individual entry (no phone or email)
          groupKey = `individual:${call.id}`;
          leadName = extractedName || `Anonymous ${new Date(call.created_at).toLocaleString()}`;
          displayInfo = {
            type: 'internet',
            callId: call.id
          };
        }

        // Initialize or update lead group
        if (!leadGroups.has(groupKey)) {
          leadGroups.set(groupKey, {
            id: groupKey,
            name: leadName,
            email: leadEmail,
            phone: leadPhone,
            company: call.lead_analytics?.company_name || null,
            displayInfo,
            calls: [],
            agents: new Set<string>(),
            interactions: 0,
            lastContact: call.created_at,
            recentLeadTag: 'Cold',
            leadType: call.lead_type || 'outbound',
            demoScheduled: false,
            followUpScheduled: null
          });
        }

        const leadGroup = leadGroups.get(groupKey)!;
        leadGroup.calls.push(call);
        leadGroup.interactions++;
        
        // Track unique agents
        if (call.agent_name) {
          leadGroup.agents.add(call.agent_name);
        }

        // Update last contact date (most recent)
        if (new Date(call.created_at) > new Date(leadGroup.lastContact)) {
          leadGroup.lastContact = call.created_at;
        }

        // Update recent lead tag based on most recent call's analytics
        if (call.lead_analytics?.lead_status_tag) {
          leadGroup.recentLeadTag = call.lead_analytics.lead_status_tag;
        }

        // Check for demo CTA in any call
        if (call.lead_analytics?.cta_demo_clicked) {
          leadGroup.demoScheduled = true;
        }
      });

      // Convert to array and add follow-up information
      const leads = Array.from(leadGroups.values()).map(lead => {
        // Find follow-up for this lead
        const followUp = followUps.find(fu => 
          (lead.phone && fu.lead_phone === lead.phone) ||
          (lead.email && fu.lead_email === lead.email)
        );

        return {
          ...lead,
          interactedAgent: Array.from(lead.agents).join(', '),
          lastContact: new Date(lead.lastContact).toISOString().split('T')[0],
          followUpScheduled: followUp?.follow_up_date || null,
          followUpRemark: followUp?.remark || null
        };
      });

      // Apply filters
      let filteredLeads = leads;

      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        filteredLeads = filteredLeads.filter(lead => 
          lead.name.toLowerCase().includes(searchTerm) ||
          (lead.email && lead.email.toLowerCase().includes(searchTerm)) ||
          (lead.phone && lead.phone.includes(searchTerm)) ||
          (lead.company && lead.company.toLowerCase().includes(searchTerm))
        );
      }

      if (filters.leadType) {
        filteredLeads = filteredLeads.filter(lead => lead.leadType === filters.leadType);
      }

      if (filters.leadTag) {
        filteredLeads = filteredLeads.filter(lead => lead.recentLeadTag === filters.leadTag);
      }

      // Sort by last contact date (newest first)
      filteredLeads.sort((a, b) => new Date(b.lastContact).getTime() - new Date(a.lastContact).getTime());

      // Apply pagination
      const total = filteredLeads.length;
      const limit = options.limit || 50;
      const offset = options.offset || 0;
      const paginatedLeads = filteredLeads.slice(offset, offset + limit);

      res.json({
        success: true,
        data: paginatedLeads,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      });
    } catch (error) {
      logger.error('Error fetching lead intelligence:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch lead intelligence',
      });
    }
  }

  /**
   * Get detailed timeline for a specific lead group
   * GET /api/leads/intelligence/:groupId/timeline
   */
  async getLeadIntelligenceTimeline(req: AgentOwnershipRequest, res: Response): Promise<void> {
    try {
      const { groupId } = req.params;
      const userId = req.user!.id;
      const userAgentIds = req.userAgentIds || [];

      // Parse group ID to determine grouping type
      const [groupType, groupValue] = groupId.split(':', 2);
      
      let calls: any[] = [];
      
      if (groupType === 'phone') {
        calls = await CallService.getCallsByPhone(groupValue, userId);
      } else if (groupType === 'email') {
        calls = await CallService.getCallsByEmail(groupValue, userId);
      } else if (groupType === 'individual') {
        const call = await CallService.getCallDetails(groupValue, userId);
        calls = call ? [call] : [];
      }

      // Apply agent data isolation
      if (userAgentIds.length > 0) {
        calls = calls.filter(call => userAgentIds.includes(call.agent_id));
      }

      // Transform calls to timeline format
      const timeline = calls.map(call => {
        const leadAnalytics = call.lead_analytics;
        
        return {
          id: call.id,
          interactionAgent: call.agent_name || 'Unknown Agent',
          interactionDate: new Date(call.created_at).toISOString().split('T')[0],
          platform: call.metadata?.call_source === 'internet' ? 'Internet' : 'Phone',
          companyName: leadAnalytics?.company_name || null,
          status: leadAnalytics?.lead_status_tag || 'Cold',
          useCase: leadAnalytics?.call_summary_title || 'No summary available',
          duration: call.duration_minutes ? 
            `${Math.floor(call.duration_minutes)}:${String(Math.floor((call.duration_minutes % 1) * 60)).padStart(2, '0')}` : 
            '0:00',
          engagementLevel: leadAnalytics?.engagement_score ? 
            (leadAnalytics.engagement_score >= 80 ? 'High' : leadAnalytics.engagement_score >= 60 ? 'Medium' : 'Low') : 
            'Unknown',
          intentLevel: leadAnalytics?.intent_score ? 
            (leadAnalytics.intent_score >= 80 ? 'High' : leadAnalytics.intent_score >= 60 ? 'Medium' : 'Low') : 
            'Unknown',
          budgetConstraint: leadAnalytics?.budget_score ? 
            (leadAnalytics.budget_score >= 60 ? 'No' : 'Yes') : 
            'Unknown',
          timelineUrgency: leadAnalytics?.urgency_score ? 
            (leadAnalytics.urgency_score >= 80 ? 'High' : leadAnalytics.urgency_score >= 60 ? 'Medium' : 'Low') : 
            'Unknown',
          fitAlignment: leadAnalytics?.fit_score ? 
            (leadAnalytics.fit_score >= 80 ? 'High' : leadAnalytics.fit_score >= 60 ? 'Medium' : 'Low') : 
            'Unknown'
        };
      });

      // Sort by date (newest first)
      timeline.sort((a, b) => new Date(b.interactionDate).getTime() - new Date(a.interactionDate).getTime());

      res.json({
        success: true,
        data: {
          timeline,
          totalInteractions: timeline.length
        }
      });
    } catch (error) {
      logger.error('Error fetching lead intelligence timeline:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch lead timeline',
      });
    }
  }

  /**
   * Create a new follow-up
   * POST /api/follow-ups
   */
  async createFollowUp(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { leadPhone, leadEmail, leadName, followUpDate, remark } = req.body;

      if (!followUpDate) {
        res.status(400).json({
          success: false,
          error: 'Follow-up date is required'
        });
        return;
      }

      if (!leadPhone && !leadEmail) {
        res.status(400).json({
          success: false,
          error: 'Either phone number or email is required'
        });
        return;
      }

      // Create follow-up in database
      const followUp = await this.createFollowUpInDB({
        userId,
        leadPhone,
        leadEmail,
        leadName,
        followUpDate: new Date(followUpDate),
        remark,
        createdBy: userId
      });

      res.json({
        success: true,
        data: followUp
      });
    } catch (error) {
      logger.error('Error creating follow-up:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create follow-up',
      });
    }
  }

  /**
   * Get follow-ups for the current user
   * GET /api/follow-ups
   */
  async getFollowUps(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const followUps = await this.getFollowUpsForUser(userId);

      res.json({
        success: true,
        data: followUps
      });
    } catch (error) {
      logger.error('Error fetching follow-ups:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch follow-ups',
      });
    }
  }

  /**
   * Update follow-up completion status
   * PUT /api/follow-ups/:id/complete
   */
  async completeFollowUp(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const followUp = await this.updateFollowUpCompletion(id, userId);

      if (!followUp) {
        res.status(404).json({
          success: false,
          error: 'Follow-up not found'
        });
        return;
      }

      res.json({
        success: true,
        data: followUp
      });
    } catch (error) {
      logger.error('Error completing follow-up:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to complete follow-up',
      });
    }
  }

  /**
   * Update follow-up status by lead phone/email
   * PATCH /api/follow-ups/status
   */
  async updateFollowUpStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { leadPhone, leadEmail, status } = req.body;
      const userId = req.user!.id;

      if (!leadPhone && !leadEmail) {
        res.status(400).json({
          success: false,
          error: 'Either leadPhone or leadEmail is required'
        });
        return;
      }

      if (!['scheduled', 'completed', 'cancelled'].includes(status)) {
        res.status(400).json({
          success: false,
          error: 'Invalid status. Must be scheduled, completed, or cancelled'
        });
        return;
      }

      let query = `
        UPDATE follow_ups 
        SET follow_up_status = $1, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $2 AND (`;
      
      const params = [status, userId];
      const conditions = [];

      if (leadPhone) {
        conditions.push(`lead_phone = $${params.length + 1}`);
        params.push(leadPhone);
      }

      if (leadEmail) {
        conditions.push(`lead_email = $${params.length + 1}`);
        params.push(leadEmail);
      }

      query += conditions.join(' OR ') + ') RETURNING *';

      const result = await pool.query(query, params);

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Follow-up not found'
        });
        return;
      }

      res.json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      logger.error('Error updating follow-up status:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update follow-up status',
      });
    }
  }

  /**
   * Helper method to get follow-ups for a user
   */
  private async getFollowUpsForUser(userId: string): Promise<any[]> {
    const query = `
      SELECT 
        id,
        user_id,
        lead_phone,
        lead_email,
        lead_name,
        follow_up_date,
        remark,
        is_completed,
        created_at,
        updated_at,
        created_by,
        completed_at,
        completed_by
      FROM follow_ups 
      WHERE user_id = $1
      ORDER BY follow_up_date ASC, created_at DESC;
    `;

    const result = await pool.query(query, [userId]);
    
    return result.rows.map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      leadPhone: row.lead_phone,
      leadEmail: row.lead_email,
      leadName: row.lead_name,
      followUpDate: row.follow_up_date,
      remark: row.remark,
      isCompleted: row.is_completed,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      completedAt: row.completed_at,
      completedBy: row.completed_by
    }));
  }

  /**
   * Helper method to create follow-up in database
   */
  private async createFollowUpInDB(data: any): Promise<any> {
    const query = `
      INSERT INTO follow_ups (
        user_id, 
        lead_phone, 
        lead_email, 
        lead_name, 
        follow_up_date, 
        remark, 
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;

    const result = await pool.query(query, [
      data.userId,
      data.leadPhone || null,
      data.leadEmail || null,
      data.leadName || null,
      data.followUpDate,
      data.remark || null,
      data.createdBy
    ]);

    return {
      id: result.rows[0].id,
      userId: result.rows[0].user_id,
      leadPhone: result.rows[0].lead_phone,
      leadEmail: result.rows[0].lead_email,
      leadName: result.rows[0].lead_name,
      followUpDate: result.rows[0].follow_up_date,
      remark: result.rows[0].remark,
      isCompleted: result.rows[0].is_completed,
      createdAt: result.rows[0].created_at,
      createdBy: result.rows[0].created_by
    };
  }

  /**
   * Helper method to update follow-up completion
   */
  private async updateFollowUpCompletion(id: string, userId: string): Promise<any> {
    const query = `
      UPDATE follow_ups 
      SET 
        is_completed = true,
        completed_at = CURRENT_TIMESTAMP,
        completed_by = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND user_id = $1
      RETURNING *;
    `;

    const result = await pool.query(query, [userId, id]);

    if (result.rows.length === 0) {
      throw new Error('Follow-up not found');
    }

    return {
      id: result.rows[0].id,
      userId: result.rows[0].user_id,
      leadPhone: result.rows[0].lead_phone,
      leadEmail: result.rows[0].lead_email,
      leadName: result.rows[0].lead_name,
      followUpDate: result.rows[0].follow_up_date,
      remark: result.rows[0].remark,
      isCompleted: result.rows[0].is_completed,
      createdAt: result.rows[0].created_at,
      updatedAt: result.rows[0].updated_at,
      createdBy: result.rows[0].created_by,
      completedAt: result.rows[0].completed_at,
      completedBy: result.rows[0].completed_by
    };
  }

  /**
   * Get comprehensive lead profile data for LeadProfileTab
   * GET /api/leads/:id/profile
   */
  async getLeadProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      // Get call details
      const call = await CallService.getCallDetails(id, userId);

      if (!call) {
        res.status(404).json({
          success: false,
          error: 'Lead not found',
        });
        return;
      }

      const leadAnalytics = call.lead_analytics;
      
      // Determine lead tag based on total score
      let leadTag = 'Cold';
      if (leadAnalytics?.total_score) {
        if (leadAnalytics.total_score >= 80) leadTag = 'Hot';
        else if (leadAnalytics.total_score >= 60) leadTag = 'Warm';
      }

      // Create comprehensive profile data
      const profile = {
        // Basic lead information
        id: call.id,
        name: call.contact_name || 'Unknown Lead',
        phone: call.phone_number,
        email: call.caller_email || null, // Use actual email or null
        company: null, // Company information not available from call data
        platform: 'Phone',
        leadType: 'Customer',
        businessType: 'SaaS',
        leadTag,
        agentType: 'CallAgent',
        
        // Interaction summary
        interactions: 1,
        useCase: 'Interested in our services', // Summary not stored in call data
        engagementLevel: leadAnalytics?.engagement_health || 'Medium',
        intentLevel: leadAnalytics?.intent_level || 'Medium',
        budgetConstraint: leadAnalytics?.budget_constraint || 'Unknown',
        timelineUrgency: leadAnalytics?.urgency_level || 'Medium',
        followUpScheduled: '',
        demoScheduled: '',
        
        // Analytics and scoring
        totalScore: leadAnalytics?.total_score || 0,
        scores: {
          intent: leadAnalytics?.intent_score || 0,
          urgency: leadAnalytics?.urgency_score || 0,
          budget: leadAnalytics?.budget_score || 0,
          fit: leadAnalytics?.fit_score || 0,
          engagement: leadAnalytics?.engagement_score || 0,
        },
        reasoning: leadAnalytics?.reasoning || {
          intent: 'No analysis available',
          urgency: 'No analysis available',
          budget: 'No analysis available',
          fit: 'No analysis available',
          engagement: 'No analysis available',
          cta_behavior: 'No analysis available'
        },
        ctaInteractions: leadAnalytics?.cta_interactions || {
          pricing_clicked: false,
          demo_clicked: false,
          followup_clicked: false,
          sample_clicked: false,
          escalated_to_human: false
        },
        
        // Call-specific data
        callData: {
          duration: call.duration_minutes ? `${Math.floor(call.duration_minutes)}:${String(Math.floor((call.duration_minutes % 1) * 60)).padStart(2, '0')}` : '0:00',
          status: call.status,
          recordingUrl: call.recording_url,
          hasTranscript: !!call.transcript,
          transcriptContent: call.transcript?.content || '',
          callDate: new Date(call.created_at).toISOString(),
          agent: call.agent_name || 'CallAgent-01'
        }
      };

      res.json({
        success: true,
        data: profile
      });
    } catch (error) {
      logger.error('Error fetching lead profile:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch lead profile',
      });
    }
  }
}