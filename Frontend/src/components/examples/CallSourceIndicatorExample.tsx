import React from 'react';
import { CallSourceIndicator } from '@/components/call/CallSourceIndicator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const CallSourceIndicatorExample: React.FC = () => {
  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Call Source Indicator Examples</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">Phone Calls</h3>
            <div className="flex flex-wrap gap-4">
              <CallSourceIndicator 
                callSource="phone" 
                phoneNumber="+1 (555) 123-4567"
                size="sm"
              />
              <CallSourceIndicator 
                callSource="phone" 
                phoneNumber="+1 (555) 123-4567"
                size="md"
              />
              <CallSourceIndicator 
                callSource="phone" 
                phoneNumber="+1 (555) 123-4567"
                size="lg"
              />
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Internet Calls</h3>
            <div className="flex flex-wrap gap-4">
              <CallSourceIndicator 
                callSource="internet"
                size="sm"
              />
              <CallSourceIndicator 
                callSource="internet"
                size="md"
              />
              <CallSourceIndicator 
                callSource="internet"
                size="lg"
              />
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Unknown Source</h3>
            <div className="flex flex-wrap gap-4">
              <CallSourceIndicator 
                callSource="unknown"
                size="sm"
              />
              <CallSourceIndicator 
                callSource="unknown"
                size="md"
              />
              <CallSourceIndicator 
                callSource="unknown"
                size="lg"
              />
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Icon Only (No Label)</h3>
            <div className="flex flex-wrap gap-4">
              <CallSourceIndicator 
                callSource="phone" 
                phoneNumber="+1 (555) 123-4567"
                showLabel={false}
                size="sm"
              />
              <CallSourceIndicator 
                callSource="internet"
                showLabel={false}
                size="md"
              />
              <CallSourceIndicator 
                callSource="unknown"
                showLabel={false}
                size="lg"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};