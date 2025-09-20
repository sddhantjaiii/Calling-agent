import { useState, useEffect } from 'react';
import apiService from '../services/apiService';
import { dataFlowDebugger } from '../utils/dataFlowDebugger';
import { validateLeadProfile, detectMockData } from '../utils/typeValidation';
import type { LeadProfile, Lead } from '../types/api';

interface UseLeadProfileReturn {
  leadProfile: LeadProfile | null;
  timeline: LeadProfile['timeline'] | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useLeadProfile = (leadId: string | null): UseLeadProfileReturn => {
  const [leadProfile, setLeadProfile] = useState<LeadProfile | null>(null);
  const [timeline, setTimeline] = useState<LeadProfile['timeline'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLeadProfile = async () => {
    if (!leadId) {
      setLeadProfile(null);
      setTimeline(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch lead profile data
      const profileResponse = await apiService.getLeadProfile(leadId);
      
      // Enhanced debug logging with validation
      dataFlowDebugger.logHookData('useLeadProfile.fetchProfile', profileResponse);
      
      if (profileResponse.success && profileResponse.data) {
        const profileData = profileResponse.data;
        
        // Validate profile data structure
        const validation = validateLeadProfile(profileData);
        if (!validation.isValid) {
          dataFlowDebugger.logDataIntegrationIssue(
            'useLeadProfile.fetchProfile',
            `Profile validation failed: ${validation.errors.join(', ')}`,
            profileData
          );
        }
        
        // Check for mock data
        const mockDetection = detectMockData(profileData);
        if (mockDetection.isMock) {
          dataFlowDebugger.logMockDataUsage('useLeadProfile.fetchProfile', 'Lead Profile Data', mockDetection.reasons.join(', '));
        }
        
        setLeadProfile(profileData);
      } else {
        throw new Error(profileResponse.error?.message || 'Failed to fetch lead profile');
      }

      // Fetch lead timeline data
      const timelineResponse = await apiService.getLeadTimeline(leadId);
      
      // Enhanced debug logging for timeline
      dataFlowDebugger.logHookData('useLeadProfile.fetchTimeline', timelineResponse);
      
      if (timelineResponse.success && timelineResponse.data) {
        // Handle different response formats from backend
        const timelineData = timelineResponse.data;
        let processedTimeline: LeadProfile['timeline'] = [];
        
        if (Array.isArray(timelineData)) {
          processedTimeline = timelineData;
          dataFlowDebugger.logDataTransformation('useLeadProfile.fetchTimeline', timelineData, processedTimeline, 'Direct array assignment');
        } else if (timelineData && (timelineData as any).timeline && Array.isArray((timelineData as any).timeline)) {
          // Backend returns { timeline: [...], totalInteractions: number }
          processedTimeline = (timelineData as any).timeline;
          dataFlowDebugger.logDataTransformation('useLeadProfile.fetchTimeline', timelineData, processedTimeline, 'Extract timeline from wrapper object');
        } else {
          processedTimeline = [];
          dataFlowDebugger.logDataIntegrationIssue('useLeadProfile.fetchTimeline', 'Unexpected timeline data format', timelineData);
        }
        
        // Check for mock timeline data
        if (processedTimeline.length > 0) {
          const mockDetection = detectMockData(processedTimeline);
          if (mockDetection.isMock) {
            dataFlowDebugger.logMockDataUsage('useLeadProfile.fetchTimeline', 'Timeline Data', mockDetection.reasons.join(', '));
          }
        }
        
        setTimeline(processedTimeline);
      } else {
        // Timeline is optional, don't throw error if it fails
        console.warn('Failed to fetch lead timeline:', timelineResponse.error?.message);
        dataFlowDebugger.logHookData('useLeadProfile.fetchTimeline.empty', [], true, 'Timeline fetch failed, using empty array');
        setTimeline([]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch lead profile';
      setError(errorMessage);
      console.error('Error fetching lead profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const refetch = async () => {
    await fetchLeadProfile();
  };

  useEffect(() => {
    fetchLeadProfile();
  }, [leadId]);

  return {
    leadProfile,
    timeline,
    loading,
    error,
    refetch,
  };
};