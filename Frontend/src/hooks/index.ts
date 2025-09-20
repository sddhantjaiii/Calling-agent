// Data Management Hooks Index
// Central export point for all custom hooks

export { useAgents, type UseAgentsReturn } from './useAgents';
export { useContacts, type UseContactsReturn } from './useContacts';
export { useCalls, type UseCallsReturn } from './useCalls';
export { useDashboard, type UseDashboardReturn } from './useDashboard';
export { useBilling, type UseBillingReturn } from './useBilling';
export { useAgentAnalytics, type UseAgentAnalyticsReturn } from './useAgentAnalytics';

// Re-export default exports for convenience
export { default as useAgentsHook } from './useAgents';
export { default as useContactsHook } from './useContacts';
export { default as useCallsHook } from './useCalls';
export { default as useDashboardHook } from './useDashboard';
export { default as useBillingHook } from './useBilling';
export { default as useAgentAnalyticsHook } from './useAgentAnalytics';