import { useState } from "react";
import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme/ThemeProvider";
import ChatLogs from "@/components/chat/ChatLogs";
import ChatAnalytics from "@/components/chat/ChatAnalytics";
import ChatData from "@/components/chat/ChatData";
import type { Lead } from "@/pages/Dashboard";

interface ChatAgentProps {
  agent?: any; // The specific chat agent
  activeSubTab: string;
  setActiveSubTab: (subTab: string) => void;
  onOpenProfile?: (lead: Lead) => void;
}

const ChatAgent = ({
  agent,
  activeSubTab,
  setActiveSubTab,
  onOpenProfile,
}: ChatAgentProps) => {
  const { theme } = useTheme();
  const [credits] = useState(450);
  const [isAdminIntervened, setIsAdminIntervened] = useState(false);
  // Commented out chat agent token purchase feature as per requirements 2.1, 2.2, 2.3, 5.4
  // const showBuyCredits = credits < 50;

  const handleIntervene = () => {
    setIsAdminIntervened(true);
  };

  const handleExit = () => {
    setIsAdminIntervened(false);
  };

  const handleNavigateToLogs = () => {
    setActiveSubTab("logs");
  };

  const renderSubTabContent = () => {
    switch (activeSubTab) {
      case "logs":
        return (
          <ChatLogs
            onIntervene={handleIntervene}
            isAdminIntervened={isAdminIntervened}
            onExit={handleExit}
          />
        );
      case "analytics":
        return <ChatAnalytics />;
      case "data":
        return (
          <ChatData
            onNavigateToLogs={handleNavigateToLogs}
            onOpenProfile={onOpenProfile}
          />
        );
      default:
        return (
          <ChatLogs
            onIntervene={handleIntervene}
            isAdminIntervened={isAdminIntervened}
            onExit={handleExit}
          />
        );
    }
  };

  return (
    <div
      className={`p-6 space-y-6 ${
        theme === "dark" ? "bg-black" : "bg-gray-50"
      }`}
    >
      {/* Sub-tab content */}
      {renderSubTabContent()}
    </div>
  );
};

export default ChatAgent;
