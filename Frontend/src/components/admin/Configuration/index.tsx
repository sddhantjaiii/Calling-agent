import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import {
  Settings,
  Key,
  Flag,
  Crown,
  Users,
  DollarSign,
  Shield
} from 'lucide-react';

import APIKeyManager from './APIKeyManager';
import FeatureFlagManager from './FeatureFlagManager';
import SystemSettings from './SystemSettings';
import UserTierManager from './UserTierManager';

interface ConfigurationProps {
  className?: string;
}

export const Configuration: React.FC<ConfigurationProps> = ({ className }) => {
  const [activeTab, setActiveTab] = useState('api-keys');

  const configurationTabs = [
    {
      id: 'api-keys',
      label: 'API Keys',
      icon: Key,
      component: APIKeyManager,
      description: 'Manage ElevenLabs API keys and user assignments'
    },
    {
      id: 'feature-flags',
      label: 'Feature Flags',
      icon: Flag,
      component: FeatureFlagManager,
      description: 'Control proprietary features and user access'
    },
    {
      id: 'system-settings',
      label: 'System Settings',
      icon: Settings,
      component: SystemSettings,
      description: 'Configure platform-wide settings and parameters'
    },
    {
      id: 'user-tiers',
      label: 'User Tiers',
      icon: Crown,
      component: UserTierManager,
      description: 'Manage subscription tiers and feature access'
    }
  ];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Configuration Management</h1>
          <p className="text-gray-600 mt-2">
            Manage system configuration, API keys, feature flags, and user tiers
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Shield className="h-5 w-5 text-green-500" />
          <span className="text-sm text-gray-600">Super Admin Access</span>
        </div>
      </div>

      {/* Configuration Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          {configurationTabs.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className="flex items-center space-x-2">
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {configurationTabs.map((tab) => (
          <TabsContent key={tab.id} value={tab.id} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <tab.icon className="h-5 w-5" />
                  <span>{tab.label}</span>
                </CardTitle>
                <CardDescription>{tab.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <tab.component />
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default Configuration;

// Export individual components
export { APIKeyManager } from './APIKeyManager';
export { FeatureFlagManager } from './FeatureFlagManager';
export { default as SystemSettings } from './SystemSettings';
export { UserTierManager } from './UserTierManager';