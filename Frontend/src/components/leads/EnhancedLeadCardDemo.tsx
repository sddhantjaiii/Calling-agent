import React, { useState } from 'react';
import { EnhancedLeadCard, EnhancedLeadsList, type EnhancedLead } from './index';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTheme } from '@/components/theme/ThemeProvider';
import { cn } from '@/lib/utils';

// Sample enhanced lead data for demonstration
const sampleEnhancedLeads: EnhancedLead[] = [
  {
    id: '1',
    name: 'John Smith',
    email: 'john.smith@techcorp.com',
    phone: '+1-555-0123',
    companyName: 'TechCorp Solutions',
    extractedName: 'John Smith',
    extractedEmail: 'john.smith@techcorp.com',
    totalScore: 85,
    leadStatusTag: 'Hot',
    intentScore: 90,
    urgencyScore: 80,
    budgetScore: 85,
    fitScore: 88,
    engagementScore: 82,
    ctaInteractions: {
      ctaPricingClicked: true,
      ctaDemoClicked: true,
      ctaFollowupClicked: false,
      ctaSampleClicked: true,
      ctaEscalatedToHuman: false
    },
    createdAt: '2024-01-15T10:30:00Z',
    source: 'Website',
    status: 'qualified'
  },
  {
    id: '2',
    name: 'Sarah Johnson',
    email: 'sarah.j@startup.io',
    phone: '+1-555-0456',
    companyName: 'StartupIO',
    extractedName: 'Sarah Johnson',
    extractedEmail: 'sarah.j@startup.io',
    totalScore: 72,
    leadStatusTag: 'Warm',
    intentScore: 75,
    urgencyScore: 70,
    budgetScore: 65,
    fitScore: 78,
    engagementScore: 74,
    ctaInteractions: {
      ctaPricingClicked: false,
      ctaDemoClicked: true,
      ctaFollowupClicked: true,
      ctaSampleClicked: false,
      ctaEscalatedToHuman: false
    },
    createdAt: '2024-01-14T14:20:00Z',
    source: 'LinkedIn',
    status: 'contacted'
  },
  {
    id: '3',
    name: 'Mike Chen',
    email: 'mike@enterprise.com',
    phone: '+1-555-0789',
    companyName: 'Enterprise Corp',
    extractedName: 'Mike Chen',
    extractedEmail: 'mike@enterprise.com',
    totalScore: 45,
    leadStatusTag: 'Cold',
    intentScore: 40,
    urgencyScore: 35,
    budgetScore: 60,
    fitScore: 45,
    engagementScore: 38,
    ctaInteractions: {
      ctaPricingClicked: false,
      ctaDemoClicked: false,
      ctaFollowupClicked: false,
      ctaSampleClicked: true,
      ctaEscalatedToHuman: true
    },
    createdAt: '2024-01-13T09:15:00Z',
    source: 'Cold Call',
    status: 'new'
  },
  {
    id: '4',
    name: 'Unknown Lead',
    email: 'contact@mystery.com',
    phone: '+1-555-0999',
    // No company name to test graceful handling
    extractedName: 'Anonymous User',
    extractedEmail: 'contact@mystery.com',
    totalScore: 60,
    leadStatusTag: 'Warm',
    intentScore: 55,
    urgencyScore: 65,
    budgetScore: 50,
    fitScore: 70,
    engagementScore: 58,
    ctaInteractions: {
      ctaPricingClicked: true,
      ctaDemoClicked: false,
      ctaFollowupClicked: true,
      ctaSampleClicked: false,
      ctaEscalatedToHuman: false
    },
    createdAt: '2024-01-12T16:45:00Z',
    source: 'Referral',
    status: 'new'
  }
];

export const EnhancedLeadCardDemo: React.FC = () => {
  const { theme } = useTheme();
  const [viewMode, setViewMode] = useState<'single' | 'list' | 'grid'>('single');
  const [compact, setCompact] = useState(false);
  const [selectedLead, setSelectedLead] = useState<EnhancedLead>(sampleEnhancedLeads[0]);

  const handleViewDetails = (leadId: string) => {
    console.log('View details for lead:', leadId);
    alert(`Viewing details for lead ${leadId}`);
  };

  const handleContact = (leadId: string) => {
    console.log('Contact lead:', leadId);
    alert(`Contacting lead ${leadId}`);
  };

  const handleScheduleDemo = (leadId: string) => {
    console.log('Schedule demo for lead:', leadId);
    alert(`Scheduling demo for lead ${leadId}`);
  };

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className={cn(
            'text-xl font-bold',
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          )}>
            Enhanced Lead Card Demo
          </CardTitle>
          <p className={cn(
            'text-sm',
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          )}>
            Demonstration of the enhanced lead display components with company names and CTA indicators.
          </p>
        </CardHeader>
        <CardContent>
          {/* Controls */}
          <div className="flex flex-wrap gap-2 mb-6">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={viewMode === 'single' ? 'default' : 'outline'}
                onClick={() => setViewMode('single')}
              >
                Single Card
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'list' ? 'default' : 'outline'}
                onClick={() => setViewMode('list')}
              >
                List View
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                onClick={() => setViewMode('grid')}
              >
                Grid View
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={compact ? 'default' : 'outline'}
                onClick={() => setCompact(!compact)}
              >
                {compact ? 'Normal' : 'Compact'}
              </Button>
            </div>
          </div>

          {/* Lead Selection for Single View */}
          {viewMode === 'single' && (
            <div className="mb-4">
              <label className={cn(
                'block text-sm font-medium mb-2',
                theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
              )}>
                Select Lead:
              </label>
              <div className="flex flex-wrap gap-2">
                {sampleEnhancedLeads.map((lead) => (
                  <Button
                    key={lead.id}
                    size="sm"
                    variant={selectedLead.id === lead.id ? 'default' : 'outline'}
                    onClick={() => setSelectedLead(lead)}
                  >
                    {lead.extractedName || lead.name}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Feature Highlights */}
          <div className="mb-6">
            <h3 className={cn(
              'text-lg font-semibold mb-3',
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            )}>
              Enhanced Features:
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={cn(
                'p-3 rounded-lg border',
                theme === 'dark' 
                  ? 'bg-gray-800/50 border-gray-700' 
                  : 'bg-gray-50 border-gray-200'
              )}>
                <h4 className={cn(
                  'font-medium mb-2',
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                )}>
                  Company Names
                </h4>
                <p className={cn(
                  'text-sm',
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                )}>
                  Displays extracted company names from webhook data with graceful fallback handling.
                </p>
              </div>
              <div className={cn(
                'p-3 rounded-lg border',
                theme === 'dark' 
                  ? 'bg-gray-800/50 border-gray-700' 
                  : 'bg-gray-50 border-gray-200'
              )}>
                <h4 className={cn(
                  'font-medium mb-2',
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                )}>
                  CTA Indicators
                </h4>
                <p className={cn(
                  'text-sm',
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                )}>
                  Shows interactive badges for pricing, demo, follow-up, sample, and human escalation CTAs.
                </p>
              </div>
            </div>
          </div>

          {/* Demo Display */}
          <div className={cn(
            'border rounded-lg p-4',
            theme === 'dark' 
              ? 'border-gray-700 bg-gray-900/20' 
              : 'border-gray-200 bg-gray-50/50'
          )}>
            {viewMode === 'single' && (
              <div className="max-w-md">
                <EnhancedLeadCard
                  lead={selectedLead}
                  onViewDetails={handleViewDetails}
                  onContact={handleContact}
                  onScheduleDemo={handleScheduleDemo}
                  compact={compact}
                />
              </div>
            )}

            {viewMode === 'list' && (
              <EnhancedLeadsList
                leads={sampleEnhancedLeads}
                onViewDetails={handleViewDetails}
                onContact={handleContact}
                onScheduleDemo={handleScheduleDemo}
                compact={compact}
                gridView={false}
              />
            )}

            {viewMode === 'grid' && (
              <EnhancedLeadsList
                leads={sampleEnhancedLeads}
                onViewDetails={handleViewDetails}
                onContact={handleContact}
                onScheduleDemo={handleScheduleDemo}
                compact={compact}
                gridView={true}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedLeadCardDemo;