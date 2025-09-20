import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';

interface SystemSettingsProps {
  className?: string;
}

const SystemSettings: React.FC<SystemSettingsProps> = ({ className }) => {
  return (
    <div className={`space-y-6 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle>System Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            System configuration settings will be available here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemSettings;