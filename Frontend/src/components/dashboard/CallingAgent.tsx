import { useState } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";
import UnifiedCallLogs from "@/components/call/UnifiedCallLogs";
import UnifiedCallAnalytics from "@/components/call/UnifiedCallAnalytics";
import type { Lead } from "@/pages/Dashboard";

interface CallingAgentProps {
  activeTab: string;
  activeSubTab: string;
  setActiveSubTab: (subTab: string) => void;
  onOpenProfile?: (lead: Lead) => void;
}

const CallingAgent = ({
  activeTab,
  activeSubTab,
  setActiveSubTab,
  onOpenProfile,
}: CallingAgentProps) => {
  const { theme } = useTheme();

  // Debug logging
  console.log('CallingAgent received activeSubTab:', activeSubTab);

  const renderSubTabContent = () => {
    switch (activeSubTab) {
      case "logs":
        return <UnifiedCallLogs activeTab={activeTab} activeSubTab={activeSubTab} onOpenProfile={onOpenProfile} />;
      case "analytics":
        return <UnifiedCallAnalytics />;
      default:
        return <UnifiedCallLogs activeTab={activeTab} activeSubTab={activeSubTab} onOpenProfile={onOpenProfile} />;
    }
  };

  return (
    <div
      className={`p-6 space-y-6 ${
        theme === "dark" ? "bg-black text-white" : "bg-white text-gray-900"
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Calling Agent</h1>
          <p className="text-gray-500 mt-1">
            Unified call logs and analytics across all agents
          </p>
        </div>
      </div>

      {renderSubTabContent()}
    </div>
  );
};

export default CallingAgent;
