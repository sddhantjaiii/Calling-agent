import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Crown, 
  AlertTriangle, 
  Clock, 
  Activity, 
  Shield,
  TrendingUp,
  CreditCard
} from 'lucide-react';
import UserTierManager from './UserTierManager';
import BillingDisputeHandler from './BillingDisputeHandler';
import TrialExtensionManager from './TrialExtensionManager';
import SystemHealthMonitor from './SystemHealthMonitor';
import IncidentTracker from './IncidentTracker';
import DataPrivacyCompliance from './DataPrivacyCompliance';

interface AdvancedFeaturesProps {
  className?: string;
}

const AdvancedFeatures: React.FC<AdvancedFeaturesProps> = ({ className }) => {
  const [activeTab, setActiveTab] = useState('tiers');

  const features = [
    {
      id: 'tiers',
      label: 'User Tiers',
      icon: Crown,
      description: 'Manage subscriptions and tier assignments',
      badge: 'Premium'
    },
    {
      id: 'billing',
      label: 'Billing Disputes',
      icon: CreditCard,
      description: 'Handle billing issues and disputes',
      badge: 'Support'
    },
    {
      id: 'trials',
      label: 'Trial Management',
      icon: Clock,
      description: 'Track trials and conversions',
      badge: 'Growth'
    },
    {
      id: 'health',
      label: 'System Health',
      icon: Activity,
      description: 'Monitor system performance',
      badge: 'Critical'
    },
    {
      id: 'incidents',
      label: 'Incidents',
      icon: AlertTriangle,
      description: 'Track and resolve incidents',
      badge: 'Operations'
    },
    {
      id: 'privacy',
      label: 'Data Privacy',
      icon: Shield,
      description: 'Compliance and privacy tools',
      badge: 'Legal'
    }
  ];

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Advanced Admin Features</h2>
          <p className="text-muted-foreground">
            Enterprise-level tools for platform management and operations
          </p>
        </div>
        <Badge variant="outline" className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Enterprise
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <TabsTrigger
                key={feature.id}
                value={feature.id}
                className="flex flex-col items-center gap-2 p-4"
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs">{feature.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <div className="grid gap-6">
          {features.map((feature) => (
            <TabsContent key={feature.id} value={feature.id} className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <feature.icon className="h-6 w-6" />
                      <div>
                        <CardTitle>{feature.label}</CardTitle>
                        <CardDescription>{feature.description}</CardDescription>
                      </div>
                    </div>
                    <Badge variant="secondary">{feature.badge}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {feature.id === 'tiers' && <UserTierManager />}
                  {feature.id === 'billing' && <BillingDisputeHandler />}
                  {feature.id === 'trials' && <TrialExtensionManager />}
                  {feature.id === 'health' && <SystemHealthMonitor />}
                  {feature.id === 'incidents' && <IncidentTracker />}
                  {feature.id === 'privacy' && <DataPrivacyCompliance />}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </div>
  );
};

export default AdvancedFeatures;