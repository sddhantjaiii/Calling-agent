import React from 'react';
import { Button } from './button';
import { Badge } from './badge';
import { 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  RefreshCw, 
  Shield, 
  Zap,
  Settings
} from 'lucide-react';
import { useApiServiceStatus } from '../../hooks/useApiRetry';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './popover';

interface ApiStatusIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

export function ApiStatusIndicator({ 
  className = '', 
  showDetails = false 
}: ApiStatusIndicatorProps) {
  const {
    circuitBreakerState,
    rateLimitStatus,
    resetCircuitBreaker,
    resetRateLimit,
    updateStatus,
  } = useApiServiceStatus();

  const getCircuitBreakerColor = () => {
    switch (circuitBreakerState) {
      case 'CLOSED': return 'bg-green-500';
      case 'HALF_OPEN': return 'bg-yellow-500';
      case 'OPEN': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getCircuitBreakerIcon = () => {
    switch (circuitBreakerState) {
      case 'CLOSED': return <CheckCircle className="h-4 w-4" />;
      case 'HALF_OPEN': return <Clock className="h-4 w-4" />;
      case 'OPEN': return <AlertCircle className="h-4 w-4" />;
      default: return <Shield className="h-4 w-4" />;
    }
  };

  const getRateLimitColor = () => {
    if (!rateLimitStatus.allowed) return 'bg-red-500';
    if (rateLimitStatus.timeUntilReset > 0) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (!showDetails) {
    // Simple indicator
    const hasIssues = circuitBreakerState !== 'CLOSED' || !rateLimitStatus.allowed;
    
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={`${className} p-2`}
          >
            <div className={`w-3 h-3 rounded-full ${hasIssues ? 'bg-red-500' : 'bg-green-500'}`} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <ApiStatusDetails
            circuitBreakerState={circuitBreakerState}
            rateLimitStatus={rateLimitStatus}
            resetCircuitBreaker={resetCircuitBreaker}
            resetRateLimit={resetRateLimit}
            updateStatus={updateStatus}
          />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <ApiStatusDetails
        circuitBreakerState={circuitBreakerState}
        rateLimitStatus={rateLimitStatus}
        resetCircuitBreaker={resetCircuitBreaker}
        resetRateLimit={resetRateLimit}
        updateStatus={updateStatus}
      />
    </div>
  );
}

interface ApiStatusDetailsProps {
  circuitBreakerState: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  rateLimitStatus: { allowed: boolean; timeUntilReset: number };
  resetCircuitBreaker: () => void;
  resetRateLimit: () => void;
  updateStatus: () => void;
}

function ApiStatusDetails({
  circuitBreakerState,
  rateLimitStatus,
  resetCircuitBreaker,
  resetRateLimit,
  updateStatus,
}: ApiStatusDetailsProps) {
  const getCircuitBreakerColor = () => {
    switch (circuitBreakerState) {
      case 'CLOSED': return 'bg-green-500';
      case 'HALF_OPEN': return 'bg-yellow-500';
      case 'OPEN': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getCircuitBreakerIcon = () => {
    switch (circuitBreakerState) {
      case 'CLOSED': return <CheckCircle className="h-4 w-4" />;
      case 'HALF_OPEN': return <Clock className="h-4 w-4" />;
      case 'OPEN': return <AlertCircle className="h-4 w-4" />;
      default: return <Shield className="h-4 w-4" />;
    }
  };

  const getRateLimitColor = () => {
    if (!rateLimitStatus.allowed) return 'bg-red-500';
    if (rateLimitStatus.timeUntilReset > 0) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">API Service Status</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={updateStatus}
          className="p-1"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Circuit Breaker Status */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${getCircuitBreakerColor()}`} />
            <span className="text-sm font-medium">Circuit Breaker</span>
          </div>
          <Badge variant="outline" className="text-xs">
            {getCircuitBreakerIcon()}
            <span className="ml-1">{circuitBreakerState}</span>
          </Badge>
        </div>
        
        <p className="text-xs text-gray-600">
          {circuitBreakerState === 'CLOSED' && 'All systems operational'}
          {circuitBreakerState === 'HALF_OPEN' && 'Testing service recovery'}
          {circuitBreakerState === 'OPEN' && 'Service temporarily unavailable'}
        </p>

        {circuitBreakerState !== 'CLOSED' && (
          <Button
            variant="outline"
            size="sm"
            onClick={resetCircuitBreaker}
            className="w-full text-xs"
          >
            <Shield className="h-3 w-3 mr-1" />
            Reset Circuit Breaker
          </Button>
        )}
      </div>

      {/* Rate Limit Status */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${getRateLimitColor()}`} />
            <span className="text-sm font-medium">Rate Limit</span>
          </div>
          <Badge variant="outline" className="text-xs">
            <Zap className="h-3 w-3" />
            <span className="ml-1">
              {rateLimitStatus.allowed ? 'OK' : 'Limited'}
            </span>
          </Badge>
        </div>

        <p className="text-xs text-gray-600">
          {rateLimitStatus.allowed 
            ? 'Requests within limits'
            : `Rate limited - reset in ${Math.ceil(rateLimitStatus.timeUntilReset / 1000)}s`
          }
        </p>

        {!rateLimitStatus.allowed && (
          <Button
            variant="outline"
            size="sm"
            onClick={resetRateLimit}
            className="w-full text-xs"
          >
            <Zap className="h-3 w-3 mr-1" />
            Reset Rate Limit
          </Button>
        )}
      </div>

      {/* Overall Status */}
      <div className="pt-2 border-t">
        <div className="flex items-center space-x-2">
          {circuitBreakerState === 'CLOSED' && rateLimitStatus.allowed ? (
            <>
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-green-600">All systems operational</span>
            </>
          ) : (
            <>
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              <span className="text-sm text-yellow-600">Some limitations active</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ApiStatusIndicator;