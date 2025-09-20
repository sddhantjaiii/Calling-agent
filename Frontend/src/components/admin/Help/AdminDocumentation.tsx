import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { 
  Search, 
  Book, 
  Users, 
  Settings, 
  BarChart3, 
  Shield, 
  HelpCircle,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

interface HelpArticle {
  id: string;
  title: string;
  category: string;
  content: string;
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

const helpArticles: HelpArticle[] = [
  {
    id: 'getting-started',
    title: 'Getting Started with Admin Panel',
    category: 'basics',
    content: `
# Getting Started with Admin Panel

Welcome to the AI Calling Agent Admin Panel. This comprehensive guide will help you navigate and utilize all administrative features.

## Overview
The admin panel provides complete control over your AI calling platform, including user management, agent monitoring, system analytics, and configuration.

## Key Features
- **User Management**: View, edit, and manage all platform users
- **Agent Monitoring**: Monitor agent performance and health across all users
- **System Analytics**: Access comprehensive platform metrics and reports
- **Configuration**: Manage API keys, feature flags, and system settings
- **Audit Logs**: Track all administrative actions for security compliance

## Navigation
Use the sidebar to navigate between different sections. Each section provides specialized tools for managing specific aspects of the platform.
    `,
    tags: ['basics', 'navigation', 'overview'],
    difficulty: 'beginner'
  },
  {
    id: 'user-management',
    title: 'Managing Users',
    category: 'users',
    content: `
# User Management Guide

## Viewing Users
The user list displays all registered users with key information including:
- User details (name, email, role)
- Account status (active/inactive)
- Usage statistics (agents, calls, credits)
- Registration and last login dates

## User Actions
### Editing User Information
1. Click on a user from the list
2. Select "Edit User" from the actions menu
3. Modify the necessary fields
4. Save changes

### Managing Credits
1. Open user details
2. Click "Adjust Credits"
3. Enter the credit amount (positive to add, negative to subtract)
4. Provide a reason for the adjustment
5. Confirm the transaction

### Account Status
Toggle user accounts between active and inactive states using the status toggle in the user list or details view.
    `,
    tags: ['users', 'credits', 'management'],
    difficulty: 'beginner'
  },
  {
    id: 'agent-monitoring',
    title: 'Agent Monitoring and Management',
    category: 'agents',
    content: `
# Agent Monitoring Guide

## Agent Overview
Monitor all agents across the platform from a centralized dashboard showing:
- Agent health status
- Performance metrics
- ElevenLabs integration status
- Usage patterns

## Health Monitoring
### Status Indicators
- **Green**: Agent is healthy and operational
- **Yellow**: Warning - potential issues detected
- **Red**: Error - agent requires attention

### Performance Metrics
Track key performance indicators:
- Call success rates
- Response times
- Error frequencies
- Usage volumes

## Bulk Operations
Perform actions on multiple agents simultaneously:
1. Select agents using checkboxes
2. Choose bulk action (activate/deactivate)
3. Confirm the operation
4. Monitor progress in the results panel
    `,
    tags: ['agents', 'monitoring', 'performance'],
    difficulty: 'intermediate'
  },
  {
    id: 'system-analytics',
    title: 'System Analytics and Reporting',
    category: 'analytics',
    content: `
# System Analytics Guide

## Dashboard Overview
The analytics dashboard provides real-time insights into platform performance:
- User growth trends
- Agent distribution
- Call volume patterns
- System health metrics

## Custom Reports
### Creating Reports
1. Navigate to Report Builder
2. Select data source
3. Choose metrics to include
4. Apply filters as needed
5. Configure export options
6. Generate and download report

### Scheduled Reports
Set up automated report generation:
1. Create a report configuration
2. Set schedule (daily, weekly, monthly)
3. Configure recipients
4. Enable automatic delivery

## Key Metrics
- **User Metrics**: Registration trends, activity levels, tier distribution
- **Agent Metrics**: Performance, health, usage patterns
- **System Metrics**: Response times, error rates, uptime
    `,
    tags: ['analytics', 'reports', 'metrics'],
    difficulty: 'intermediate'
  },
  {
    id: 'configuration',
    title: 'System Configuration',
    category: 'config',
    content: `
# System Configuration Guide

## API Key Management
### ElevenLabs Integration
1. Navigate to Configuration > API Keys
2. Add new API key or edit existing ones
3. Assign keys to specific users or set as default
4. Monitor usage and quotas
5. Rotate keys as needed for security

### Key Assignment
- **Default Keys**: Used for new user registrations
- **User-Specific Keys**: Assigned to individual users
- **Usage Tracking**: Monitor consumption and costs

## Feature Flags
### Managing Features
1. Access Configuration > Feature Flags
2. Toggle features on/off globally or per user
3. Configure rollout percentages
4. Set tier-based restrictions

### Proprietary Features
Special features requiring admin activation:
- Dashboard KPIs
- Advanced agent analytics
- Custom reporting tools

## System Settings
Configure platform-wide settings:
- Credit rates and pricing
- Upload limits
- Service provider settings
- Maintenance modes
    `,
    tags: ['configuration', 'api-keys', 'features'],
    difficulty: 'advanced'
  },
  {
    id: 'security',
    title: 'Security and Audit Logs',
    category: 'security',
    content: `
# Security and Audit Guide

## Audit Logs
### Viewing Logs
Access comprehensive audit trails showing:
- Admin actions and timestamps
- User affected by actions
- IP addresses and user agents
- Success/failure status

### Filtering Logs
Use filters to find specific events:
- Date ranges
- Admin users
- Action types
- Target users

## Security Monitoring
### Failed Login Attempts
Monitor and investigate:
- Multiple failed login attempts
- Unusual access patterns
- Suspicious IP addresses

### Access Controls
- Role-based permissions
- Session management
- IP-based restrictions
- Two-factor authentication (when enabled)

## Best Practices
- Regular audit log reviews
- Prompt investigation of anomalies
- Secure credential management
- Regular access reviews
    `,
    tags: ['security', 'audit', 'monitoring'],
    difficulty: 'advanced'
  }
];

const AdminDocumentation: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedArticle, setSelectedArticle] = useState<HelpArticle | null>(null);

  const categories = [
    { id: 'all', label: 'All Topics', icon: Book },
    { id: 'basics', label: 'Getting Started', icon: HelpCircle },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'agents', label: 'Agent Monitoring', icon: BarChart3 },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'config', label: 'Configuration', icon: Settings },
    { id: 'security', label: 'Security', icon: Shield }
  ];

  const filteredArticles = helpArticles.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         article.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         article.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || article.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (selectedArticle) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            onClick={() => setSelectedArticle(null)}
            className="mb-4"
          >
            ← Back to Help Topics
          </Button>
          <Badge className={getDifficultyColor(selectedArticle.difficulty)}>
            {selectedArticle.difficulty}
          </Badge>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Book className="h-5 w-5" />
              {selectedArticle.title}
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              {selectedArticle.tags.map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none">
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                {selectedArticle.content}
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin Documentation</h1>
          <p className="text-muted-foreground">
            Comprehensive guides for managing your AI calling platform
          </p>
        </div>
      </div>

      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <div className="lg:w-64 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search documentation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <TabsList className="grid grid-cols-1 h-auto p-1 bg-muted/50">
              {categories.map(category => {
                const Icon = category.icon;
                return (
                  <TabsTrigger
                    key={category.id}
                    value={category.id}
                    className="justify-start gap-2 data-[state=active]:bg-background"
                  >
                    <Icon className="h-4 w-4" />
                    {category.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          {/* Content */}
          <div className="flex-1">
            <TabsContent value={selectedCategory} className="mt-0">
              <div className="grid gap-4">
                {filteredArticles.length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-8">
                      <Book className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">No articles found</h3>
                      <p className="text-muted-foreground">
                        Try adjusting your search terms or category filter
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  filteredArticles.map(article => (
                    <Card 
                      key={article.id} 
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => setSelectedArticle(article)}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold">{article.title}</h3>
                              <Badge className={getDifficultyColor(article.difficulty)}>
                                {article.difficulty}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">
                              {article.content.split('\n').find(line => line.trim() && !line.startsWith('#'))?.trim().slice(0, 150)}...
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {article.tags.slice(0, 3).map(tag => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                              {article.tags.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{article.tags.length - 3}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground ml-4" />
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          </div>
        </div>
      </Tabs>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            Additional Resources
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Button variant="outline" className="justify-start h-auto p-4">
              <div className="text-left">
                <div className="font-medium">API Documentation</div>
                <div className="text-sm text-muted-foreground">
                  Technical API reference
                </div>
              </div>
            </Button>
            <Button variant="outline" className="justify-start h-auto p-4">
              <div className="text-left">
                <div className="font-medium">Video Tutorials</div>
                <div className="text-sm text-muted-foreground">
                  Step-by-step video guides
                </div>
              </div>
            </Button>
            <Button variant="outline" className="justify-start h-auto p-4">
              <div className="text-left">
                <div className="font-medium">Support Portal</div>
                <div className="text-sm text-muted-foreground">
                  Get help from our team
                </div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDocumentation;