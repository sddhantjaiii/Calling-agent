import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { 
  Building2, 
  Mail, 
  Phone, 
  Calendar, 
  DollarSign, 
  Play, 
  PhoneCall, 
  FileText, 
  User,
  Star,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme/ThemeProvider';

// Enhanced Lead interface based on the webhook enhancement requirements
export interface EnhancedLead {
  id: string;
  name: string;
  email: string;
  phone: string;
  companyName?: string;
  extractedName?: string;
  extractedEmail?: string;
  totalScore: number;
  leadStatusTag: string;
  intentScore: number;
  urgencyScore: number;
  budgetScore: number;
  fitScore: number;
  engagementScore: number;
  ctaInteractions: {
    ctaPricingClicked: boolean;
    ctaDemoClicked: boolean;
    ctaFollowupClicked: boolean;
    ctaSampleClicked: boolean;
    ctaEscalatedToHuman: boolean;
  };
  createdAt: string;
  source?: string;
  status?: string;
}

interface EnhancedLeadCardProps {
  lead: EnhancedLead;
  onViewDetails?: (leadId: string) => void;
  onContact?: (leadId: string) => void;
  onScheduleDemo?: (leadId: string) => void;
  className?: string;
  compact?: boolean;
}

// Helper function to get lead score color
const getScoreColor = (score: number): string => {
  if (score >= 80) return 'text-green-600 dark:text-green-400';
  if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
  if (score >= 40) return 'text-orange-600 dark:text-orange-400';
  return 'text-red-600 dark:text-red-400';
};

// Helper function to get lead tag color
const getLeadTagColor = (tag: string): string => {
  switch (tag.toLowerCase()) {
    case 'hot':
      return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
    case 'warm':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
    case 'cold':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
  }
};

// CTA Badge component for displaying interaction indicators
const CTABadge: React.FC<{
  type: 'pricing' | 'demo' | 'followup' | 'sample' | 'human';
  active: boolean;
  compact?: boolean;
}> = ({ type, active, compact = false }) => {
  if (!active) return null;

  const badgeConfig = {
    pricing: {
      icon: DollarSign,
      label: compact ? '$' : 'Pricing',
      className: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
    },
    demo: {
      icon: Play,
      label: compact ? '▶' : 'Demo',
      className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
    },
    followup: {
      icon: Calendar,
      label: compact ? '📅' : 'Follow-up',
      className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
    },
    sample: {
      icon: FileText,
      label: compact ? '📄' : 'Sample',
      className: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400'
    },
    human: {
      icon: User,
      label: compact ? '👤' : 'Human',
      className: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
    }
  };

  const config = badgeConfig[type];
  const Icon = config.icon;

  return (
    <Badge 
      variant="outline" 
      className={cn(
        'text-xs font-medium border-0',
        config.className,
        compact ? 'px-1.5 py-0.5' : 'px-2 py-1'
      )}
    >
      {compact ? (
        config.label
      ) : (
        <>
          <Icon className="w-3 h-3 mr-1" />
          {config.label}
        </>
      )}
    </Badge>
  );
};

export const EnhancedLeadCard: React.FC<EnhancedLeadCardProps> = ({
  lead,
  onViewDetails,
  onContact,
  onScheduleDemo,
  className,
  compact = false
}) => {
  const { theme } = useTheme();

  // Use extracted name if available, fallback to original name
  const displayName = lead.extractedName || lead.name || 'Unknown Lead';
  const displayEmail = lead.extractedEmail || lead.email;
  const displayCompany = lead.companyName;

  // Get initials for avatar
  const initials = displayName
    .split(' ')
    .map(n => n.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return 'Unknown';
    }
  };

  return (
    <Card 
      className={cn(
        'transition-all duration-200 hover:shadow-md border',
        theme === 'dark' 
          ? 'bg-gray-900/50 border-gray-700 hover:border-gray-600' 
          : 'bg-white border-gray-200 hover:border-gray-300',
        compact ? 'p-3' : 'p-4',
        className
      )}
    >
      <CardHeader className={cn('pb-3', compact && 'pb-2')}>
        <div className="flex items-start justify-between">
          {/* Lead Info */}
          <div className="flex items-start space-x-3 flex-1 min-w-0">
            {/* Avatar */}
            <div className={cn(
              'flex items-center justify-center rounded-full font-semibold text-white flex-shrink-0',
              compact ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm',
              theme === 'dark' ? 'bg-gray-600' : 'bg-gray-500'
            )}>
              {initials}
            </div>

            {/* Lead Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className={cn(
                  'font-semibold truncate',
                  compact ? 'text-sm' : 'text-base',
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                )}>
                  {displayName}
                </h3>
                <Badge 
                  variant="outline" 
                  className={cn(
                    'text-xs font-medium border-0 flex-shrink-0',
                    getLeadTagColor(lead.leadStatusTag)
                  )}
                >
                  {lead.leadStatusTag}
                </Badge>
              </div>

              {/* Company Name - Enhanced Feature */}
              {displayCompany && (
                <div className="flex items-center gap-1 mb-1">
                  <Building2 className="w-3 h-3 text-gray-400 flex-shrink-0" />
                  <span className={cn(
                    'text-sm font-medium truncate',
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  )}>
                    {displayCompany}
                  </span>
                </div>
              )}

              {/* Contact Info */}
              <div className="space-y-1">
                {displayEmail && (
                  <div className="flex items-center gap-1">
                    <Mail className="w-3 h-3 text-gray-400 flex-shrink-0" />
                    <span className={cn(
                      'text-xs truncate',
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    )}>
                      {displayEmail}
                    </span>
                  </div>
                )}
                {lead.phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="w-3 h-3 text-gray-400 flex-shrink-0" />
                    <span className={cn(
                      'text-xs',
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    )}>
                      {lead.phone}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Lead Score */}
          <div className="flex flex-col items-end flex-shrink-0 ml-3">
            <div className="flex items-center gap-1 mb-1">
              <Star className={cn('w-3 h-3', getScoreColor(lead.totalScore))} />
              <span className={cn(
                'font-bold',
                compact ? 'text-sm' : 'text-lg',
                getScoreColor(lead.totalScore)
              )}>
                {lead.totalScore}
              </span>
            </div>
            <span className={cn(
              'text-xs',
              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
            )}>
              Score
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className={cn('pt-0', compact && 'space-y-2')}>
        {/* CTA Interactions - Enhanced Feature */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <CTABadge 
            type="pricing" 
            active={lead.ctaInteractions.ctaPricingClicked} 
            compact={compact}
          />
          <CTABadge 
            type="demo" 
            active={lead.ctaInteractions.ctaDemoClicked} 
            compact={compact}
          />
          <CTABadge 
            type="followup" 
            active={lead.ctaInteractions.ctaFollowupClicked} 
            compact={compact}
          />
          <CTABadge 
            type="sample" 
            active={lead.ctaInteractions.ctaSampleClicked} 
            compact={compact}
          />
          <CTABadge 
            type="human" 
            active={lead.ctaInteractions.ctaEscalatedToHuman} 
            compact={compact}
          />
        </div>

        {/* Engagement Metrics */}
        {!compact && (
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-gray-400" />
              <span className={cn(
                'text-xs',
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              )}>
                Intent: {lead.intentScore}/100
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-gray-400" />
              <span className={cn(
                'text-xs',
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              )}>
                Urgency: {lead.urgencyScore}/100
              </span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-1">
            <span className={cn(
              'text-xs',
              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
            )}>
              {formatDate(lead.createdAt)}
            </span>
            {lead.source && (
              <>
                <span className="text-gray-400">•</span>
                <span className={cn(
                  'text-xs',
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                )}>
                  {lead.source}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-1">
            {onContact && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onContact(lead.id)}
                className={cn(
                  'h-7 px-2 text-xs',
                  theme === 'dark' 
                    ? 'hover:bg-gray-800 text-gray-300' 
                    : 'hover:bg-gray-100 text-gray-600'
                )}
                aria-label={`Contact ${displayName}`}
              >
                <PhoneCall className="w-3 h-3" />
              </Button>
            )}
            {onScheduleDemo && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onScheduleDemo(lead.id)}
                className={cn(
                  'h-7 px-2 text-xs',
                  theme === 'dark' 
                    ? 'hover:bg-gray-800 text-gray-300' 
                    : 'hover:bg-gray-100 text-gray-600'
                )}
                aria-label={`Schedule demo with ${displayName}`}
              >
                <Calendar className="w-3 h-3" />
              </Button>
            )}
            {onViewDetails && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onViewDetails(lead.id)}
                className={cn(
                  'h-7 px-2 text-xs',
                  theme === 'dark' 
                    ? 'hover:bg-gray-800 text-gray-300' 
                    : 'hover:bg-gray-100 text-gray-600'
                )}
                aria-label={`View details for ${displayName}`}
              >
                <FileText className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EnhancedLeadCard;