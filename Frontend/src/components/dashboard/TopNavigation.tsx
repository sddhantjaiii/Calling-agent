import { useState } from "react";
import {
  Bell,
  Search,
  User,
  ChevronDown,
  X,
  Settings,
  Users,
  Phone,
  Mail,
  Lock,
  Sun,
  Moon,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useAuth } from "@/contexts/AuthContext";
import { useAgents } from "@/contexts/AgentContext";
import { useNavigation } from "@/contexts/NavigationContext";
import { toast } from "sonner";
import InviteTeamModal from "./InviteTeamModal";
import CreditDisplay from "../billing/CreditDisplay";
// import AgentSelector from "@/components/ui/AgentSelector";
import NotificationDropdown from "./NotificationDropdown";

interface TopNavigationProps {
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

const TopNavigation = ({ sidebarCollapsed, onToggleSidebar }: TopNavigationProps = {}) => {
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const { selectedAgent } = useAgents();
  const { navigateToLeadIntelligence } = useNavigation();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  // Removed handleInviteSubmit as InviteTeamModal manages its own invite logic

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out successfully");
      setShowProfileDropdown(false);
    } catch (error) {
      toast.error("Logout failed");
    }
  };

  return (
    <div
      className={`h-16 ${
        theme === "dark"
          ? "bg-black border-slate-700"
          : "bg-white border-gray-200"
      } border-b flex items-center justify-between px-6`}
    >
      <div className="flex items-center space-x-4">
        {/* Sidebar Toggle Button */}
        {onToggleSidebar && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleSidebar}
            className={`p-2 ${
              theme === "dark"
                ? "text-slate-300 hover:text-white hover:bg-slate-700"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            <Menu className="w-5 h-5" />
          </Button>
        )}
        <h1
          className={`text-xl font-semibold ${
            theme === "dark" ? "text-white" : "text-gray-900"
          }`}
        >
          Welcome {user?.displayName || user?.email || 'User'}!
        </h1>
      </div>

      <div className="flex items-center space-x-4">
        {/* Credit Display */}
        <CreditDisplay variant="compact" showRefresh={true} />

        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className={`p-2 ${
            theme === "dark"
              ? "text-slate-300 hover:text-white hover:bg-slate-700"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          }`}
        >
          {theme === "dark" ? (
            <Sun className="w-5 h-5" />
          ) : (
            <Moon className="w-5 h-5" />
          )}
        </Button>

        {/* Notifications */}
        <NotificationDropdown onNavigateToLeadIntelligence={navigateToLeadIntelligence} />

        {/* Profile Dropdown */}
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowProfileDropdown(!showProfileDropdown)}
            className={`flex items-center space-x-2 p-2 ${
              theme === "dark"
                ? "text-slate-300 hover:text-white hover:bg-slate-700"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white font-medium"
              style={{ backgroundColor: "#1A6262" }}
            >
              A
            </div>
            <ChevronDown className="w-4 h-4" />
          </Button>

          {showProfileDropdown && (
            <div
              className={`absolute right-0 mt-2 w-48 rounded-lg shadow-lg border z-50 ${
                theme === "dark"
                  ? "bg-black border-slate-700"
                  : "bg-white border-gray-200"
              }`}
            >
              <div className="py-1">
                <button
                  onClick={() => {
                    setShowInviteModal(true);
                    setShowProfileDropdown(false);
                  }}
                  className={`block w-full text-left px-4 py-2 text-sm hover:bg-opacity-50 ${
                    theme === "dark"
                      ? "text-slate-300 hover:bg-slate-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  Invite Team Member
                </button>
                <button
                  onClick={handleLogout}
                  className={`block w-full text-left px-4 py-2 text-sm hover:bg-opacity-50 ${
                    theme === "dark"
                      ? "text-slate-300 hover:bg-slate-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Use InviteTeamModal for top nav invite modal */}
      <InviteTeamModal
        open={showInviteModal}
        onOpenChange={setShowInviteModal}
      />
    </div>
  );
};
export default TopNavigation;
