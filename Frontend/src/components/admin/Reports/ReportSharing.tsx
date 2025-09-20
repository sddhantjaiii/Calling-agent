import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { 
  Share, 
  Link, 
  Mail, 
  Copy, 
  Eye, 
  Download, 
  Lock, 
  Unlock,
  Users,
  Calendar,
  Clock,
  ExternalLink,
  Shield,
  AlertTriangle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { adminApiService } from '@/services/adminApiService';

interface SharedReport {
  id: string;
  reportId: string;
  reportName: string;
  shareType: 'link' | 'email' | 'embed';
  accessLevel: 'view' | 'download' | 'full';
  isPublic: boolean;
  requiresAuth: boolean;
  expiresAt?: Date;
  password?: string;
  allowedUsers?: string[];
  allowedDomains?: string[];
  shareUrl: string;
  embedCode?: string;
  accessCount: number;
  lastAccessed?: Date;
  createdAt: Date;
  createdBy: string;
}

interface ReportSharingProps {
  reportId?: string;
  reportName?: string;
  onShareCreated?: (share: SharedReport) => void;
}

interface ShareConfig {
  shareType: 'link' | 'email' | 'embed';
  accessLevel: 'view' | 'download' | 'full';
  isPublic: boolean;
  requiresAuth: boolean;
  expiresAt?: Date;
  password?: string;
  allowedUsers: string[];
  allowedDomains: string[];
  emailSubject?: string;
  emailMessage?: string;
}

const ACCESS_LEVELS = [
  { 
    value: 'view', 
    label: 'View Only', 
    description: 'Recipients can only view the report online' 
  },
  { 
    value: 'download', 
    label: 'View & Download', 
    description: 'Recipients can view and download the report' 
  },
  { 
    value: 'full', 
    label: 'Full Access', 
    description: 'Recipients can view, download, and share the report' 
  }
];

export const ReportSharing: React.FC<ReportSharingProps> = ({ 
  reportId, 
  reportName,
  onShareCreated 
}) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'create' | 'manage'>('create');
  const [sharedReports, setSharedReports] = useState<SharedReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [shareConfig, setShareConfig] = useState<ShareConfig>({
    shareType: 'link',
    accessLevel: 'view',
    isPublic: false,
    requiresAuth: true,
    allowedUsers: [''],
    allowedDomains: []
  });

  const loadSharedReports = useCallback(async () => {
    if (!reportId) return;
    
    setIsLoading(true);
    try {
      const shares = await adminApiService.getReportShares(reportId);
      setSharedReports(shares);
    } catch (error) {
      toast({
        title: "Load Failed",
        description: "Failed to load shared reports.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [reportId, toast]);

  React.useEffect(() => {
    if (activeTab === 'manage' && reportId) {
      loadSharedReports();
    }
  }, [activeTab, reportId, loadSharedReports]);

  const addAllowedUser = useCallback(() => {
    setShareConfig(prev => ({
      ...prev,
      allowedUsers: [...prev.allowedUsers, '']
    }));
  }, []);

  const updateAllowedUser = useCallback((index: number, email: string) => {
    setShareConfig(prev => ({
      ...prev,
      allowedUsers: prev.allowedUsers.map((u, i) => i === index ? email : u)
    }));
  }, []);

  const removeAllowedUser = useCallback((index: number) => {
    setShareConfig(prev => ({
      ...prev,
      allowedUsers: prev.allowedUsers.filter((_, i) => i !== index)
    }));
  }, []);

  const addAllowedDomain = useCallback(() => {
    setShareConfig(prev => ({
      ...prev,
      allowedDomains: [...prev.allowedDomains, '']
    }));
  }, []);

  const updateAllowedDomain = useCallback((index: number, domain: string) => {
    setShareConfig(prev => ({
      ...prev,
      allowedDomains: prev.allowedDomains.map((d, i) => i === index ? domain : d)
    }));
  }, []);

  const removeAllowedDomain = useCallback((index: number) => {
    setShareConfig(prev => ({
      ...prev,
      allowedDomains: prev.allowedDomains.filter((_, i) => i !== index)
    }));
  }, []);

  const createShare = useCallback(async () => {
    if (!reportId || !reportName) {
      toast({
        title: "Report Required",
        description: "Please select a report to share.",
        variant: "destructive"
      });
      return;
    }

    if (!shareConfig.isPublic) {
      const validUsers = shareConfig.allowedUsers.filter(email => 
        email.trim() && email.includes('@')
      );
      const validDomains = shareConfig.allowedDomains.filter(domain => 
        domain.trim() && domain.includes('.')
      );

      if (validUsers.length === 0 && validDomains.length === 0) {
        toast({
          title: "Access Control Required",
          description: "Please specify allowed users or domains for private sharing.",
          variant: "destructive"
        });
        return;
      }
    }

    setIsLoading(true);
    try {
      const share = await adminApiService.createReportShare({
        reportId,
        reportName,
        ...shareConfig,
        allowedUsers: shareConfig.allowedUsers.filter(email => email.trim() && email.includes('@')),
        allowedDomains: shareConfig.allowedDomains.filter(domain => domain.trim() && domain.includes('.'))
      });
      
      toast({
        title: "Share Created",
        description: `Report "${reportName}" has been shared successfully.`
      });

      onShareCreated?.(share);
      
      // Reset form
      setShareConfig({
        shareType: 'link',
        accessLevel: 'view',
        isPublic: false,
        requiresAuth: true,
        allowedUsers: [''],
        allowedDomains: []
      });

      // Refresh the list if we're on the manage tab
      if (activeTab === 'manage') {
        loadSharedReports();
      }
    } catch (error) {
      toast({
        title: "Share Failed",
        description: "Failed to create report share.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [reportId, reportName, shareConfig, toast, onShareCreated, activeTab, loadSharedReports]);

  const copyShareUrl = useCallback(async (shareUrl: string) => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: "URL Copied",
        description: "Share URL has been copied to clipboard."
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy URL to clipboard.",
        variant: "destructive"
      });
    }
  }, [toast]);

  const revokeShare = useCallback(async (shareId: string) => {
    try {
      await adminApiService.revokeReportShare(shareId);
      setSharedReports(prev => prev.filter(share => share.id !== shareId));
      
      toast({
        title: "Share Revoked",
        description: "Report share has been revoked."
      });
    } catch (error) {
      toast({
        title: "Revoke Failed",
        description: "Failed to revoke report share.",
        variant: "destructive"
      });
    }
  }, [toast]);

  const sendEmailShare = useCallback(async (shareId: string) => {
    try {
      await adminApiService.sendReportShareEmail(shareId, {
        subject: shareConfig.emailSubject,
        message: shareConfig.emailMessage
      });
      
      toast({
        title: "Email Sent",
        description: "Share notification email has been sent."
      });
    } catch (error) {
      toast({
        title: "Email Failed",
        description: "Failed to send share notification email.",
        variant: "destructive"
      });
    }
  }, [shareConfig.emailSubject, shareConfig.emailMessage, toast]);

  const getAccessLevelIcon = (level: string) => {
    switch (level) {
      case 'view':
        return <Eye className="h-4 w-4" />;
      case 'download':
        return <Download className="h-4 w-4" />;
      case 'full':
        return <Users className="h-4 w-4" />;
      default:
        return <Eye className="h-4 w-4" />;
    }
  };

  const getSecurityIcon = (share: SharedReport) => {
    if (share.isPublic) {
      return <Unlock className="h-4 w-4 text-orange-600" />;
    } else if (share.requiresAuth) {
      return <Lock className="h-4 w-4 text-green-600" />;
    } else {
      return <Shield className="h-4 w-4 text-blue-600" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Report Sharing</h2>
          <p className="text-muted-foreground">
            Share reports securely with team members and stakeholders
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
        <Button
          variant={activeTab === 'create' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('create')}
        >
          <Share className="h-4 w-4 mr-2" />
          Create Share
        </Button>
        <Button
          variant={activeTab === 'manage' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('manage')}
        >
          <Link className="h-4 w-4 mr-2" />
          Manage Shares
        </Button>
      </div>

      {/* Create Share Tab */}
      {activeTab === 'create' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Share Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Share Type</Label>
                <Select
                  value={shareConfig.shareType}
                  onValueChange={(shareType: any) => setShareConfig(prev => ({ ...prev, shareType }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="link">Share Link</SelectItem>
                    <SelectItem value="email">Email Share</SelectItem>
                    <SelectItem value="embed">Embed Code</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Access Level</Label>
                <Select
                  value={shareConfig.accessLevel}
                  onValueChange={(accessLevel: any) => setShareConfig(prev => ({ ...prev, accessLevel }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCESS_LEVELS.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        <div>
                          <div className="font-medium">{level.label}</div>
                          <div className="text-xs text-muted-foreground">{level.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="public-share"
                    checked={shareConfig.isPublic}
                    onCheckedChange={(isPublic) => setShareConfig(prev => ({ ...prev, isPublic }))}
                  />
                  <Label htmlFor="public-share">Make publicly accessible</Label>
                </div>

                {!shareConfig.isPublic && (
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="require-auth"
                      checked={shareConfig.requiresAuth}
                      onCheckedChange={(requiresAuth) => setShareConfig(prev => ({ ...prev, requiresAuth }))}
                    />
                    <Label htmlFor="require-auth">Require authentication</Label>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="expires-at">Expiration Date (Optional)</Label>
                <Input
                  id="expires-at"
                  type="datetime-local"
                  value={shareConfig.expiresAt ? shareConfig.expiresAt.toISOString().slice(0, 16) : ''}
                  onChange={(e) => setShareConfig(prev => ({ 
                    ...prev, 
                    expiresAt: e.target.value ? new Date(e.target.value) : undefined 
                  }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password Protection (Optional)</Label>
                <Input
                  id="password"
                  type="password"
                  value={shareConfig.password || ''}
                  onChange={(e) => setShareConfig(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Enter password"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Access Control</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!shareConfig.isPublic && (
                <>
                  <div className="space-y-2">
                    <Label>Allowed Users</Label>
                    {shareConfig.allowedUsers.map((email, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          type="email"
                          value={email}
                          onChange={(e) => updateAllowedUser(index, e.target.value)}
                          placeholder="Enter email address"
                          className="flex-1"
                        />
                        {shareConfig.allowedUsers.length > 1 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeAllowedUser(index)}
                          >
                            ×
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button variant="outline" onClick={addAllowedUser} className="w-full">
                      Add User
                    </Button>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label>Allowed Domains</Label>
                    {shareConfig.allowedDomains.map((domain, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={domain}
                          onChange={(e) => updateAllowedDomain(index, e.target.value)}
                          placeholder="Enter domain (e.g., company.com)"
                          className="flex-1"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeAllowedDomain(index)}
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                    <Button variant="outline" onClick={addAllowedDomain} className="w-full">
                      Add Domain
                    </Button>
                  </div>
                </>
              )}

              {shareConfig.shareType === 'email' && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Label htmlFor="email-subject">Email Subject</Label>
                    <Input
                      id="email-subject"
                      value={shareConfig.emailSubject || ''}
                      onChange={(e) => setShareConfig(prev => ({ ...prev, emailSubject: e.target.value }))}
                      placeholder="Report shared with you"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email-message">Email Message</Label>
                    <Textarea
                      id="email-message"
                      value={shareConfig.emailMessage || ''}
                      onChange={(e) => setShareConfig(prev => ({ ...prev, emailMessage: e.target.value }))}
                      placeholder="Enter custom message..."
                      rows={3}
                    />
                  </div>
                </>
              )}

              <Separator />

              <Button 
                onClick={createShare} 
                disabled={isLoading || !reportId}
                className="w-full"
              >
                <Share className="h-4 w-4 mr-2" />
                Create Share
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Manage Shares Tab */}
      {activeTab === 'manage' && (
        <Card>
          <CardHeader>
            <CardTitle>Shared Reports</CardTitle>
          </CardHeader>
          <CardContent>
            {sharedReports.length === 0 ? (
              <div className="text-center py-8">
                <Share className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No shared reports</h3>
                <p className="text-muted-foreground">
                  Create your first report share to collaborate with others
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {sharedReports.map((share) => (
                  <div key={share.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getSecurityIcon(share)}
                          <h4 className="font-medium">{share.reportName}</h4>
                          <Badge variant="outline" className="flex items-center gap-1">
                            {getAccessLevelIcon(share.accessLevel)}
                            {share.accessLevel}
                          </Badge>
                          <Badge variant={share.isPublic ? 'default' : 'secondary'}>
                            {share.isPublic ? 'Public' : 'Private'}
                          </Badge>
                        </div>
                        
                        <div className="text-sm space-y-1">
                          <div className="flex items-center gap-2">
                            <strong>Share URL:</strong>
                            <code className="bg-muted px-2 py-1 rounded text-xs">
                              {share.shareUrl.length > 50 
                                ? `${share.shareUrl.substring(0, 50)}...` 
                                : share.shareUrl
                              }
                            </code>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyShareUrl(share.shareUrl)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                          
                          <div>
                            <strong>Access Count:</strong> {share.accessCount}
                          </div>
                          
                          {share.lastAccessed && (
                            <div>
                              <strong>Last Accessed:</strong> {share.lastAccessed.toLocaleString()}
                            </div>
                          )}
                          
                          {share.expiresAt && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <strong>Expires:</strong> {share.expiresAt.toLocaleString()}
                              {share.expiresAt < new Date() && (
                                <Badge variant="destructive" className="ml-2">Expired</Badge>
                              )}
                            </div>
                          )}

                          {!share.isPublic && (
                            <div>
                              <strong>Allowed Users:</strong> {share.allowedUsers?.join(', ') || 'None'}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(share.shareUrl, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        
                        {share.shareType === 'email' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => sendEmailShare(share.id)}
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                        )}
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => revokeShare(share.id)}
                        >
                          <AlertTriangle className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {share.embedCode && (
                      <div className="mt-3 p-3 bg-muted rounded">
                        <Label className="text-xs font-medium">Embed Code:</Label>
                        <code className="block text-xs mt-1 break-all">
                          {share.embedCode}
                        </code>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ReportSharing;