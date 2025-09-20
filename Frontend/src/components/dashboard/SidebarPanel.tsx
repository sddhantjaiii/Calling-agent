import { User, UserPlus, LogOut, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme/ThemeProvider";

interface SidebarPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onInviteTeam: () => void;
  onLogout: () => void;
}

const SidebarPanel = ({
  isOpen,
  onClose,
  onInviteTeam,
  onLogout,
}: SidebarPanelProps) => {
  const { theme } = useTheme();

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`fixed left-64 top-0 h-full w-80 z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } ${
          theme === "dark"
            ? "bg-black border-r border-slate-700"
            : "bg-white border-r border-gray-200"
        }`}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3
              className={`text-lg font-semibold ${
                theme === "dark" ? "text-white" : "text-gray-900"
              }`}
            >
              Profile Menu
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className={
                theme === "dark"
                  ? "text-slate-300 hover:text-white hover:bg-slate-700"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-4">
            {/* Profile Section */}
            <div
              className={`p-4 rounded-lg ${
                theme === "dark" ? "bg-slate-700" : "bg-gray-100"
              }`}
            >
              <div className="flex items-center space-x-3 mb-4">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    theme === "dark" ? "bg-slate-600" : "bg-gray-200"
                  }`}
                >
                  <User
                    className={`w-6 h-6 ${
                      theme === "dark" ? "text-slate-300" : "text-gray-600"
                    }`}
                  />
                </div>
                <div>
                  <h4
                    className={`font-medium ${
                      theme === "dark" ? "text-white" : "text-gray-900"
                    }`}
                  >
                    AI Agent Admin
                  </h4>
                  <p
                    className={`text-sm ${
                      theme === "dark" ? "text-slate-400" : "text-gray-600"
                    }`}
                  >
                    Administrator
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div>
                  <span
                    className={`font-medium ${
                      theme === "dark" ? "text-slate-300" : "text-gray-700"
                    }`}
                  >
                    Company:{" "}
                  </span>
                  <span
                    className={
                      theme === "dark" ? "text-slate-400" : "text-gray-600"
                    }
                  >
                    SniperThink Technologies
                  </span>
                </div>
                <div>
                  <span
                    className={`font-medium ${
                      theme === "dark" ? "text-slate-300" : "text-gray-700"
                    }`}
                  >
                    Email:{" "}
                  </span>
                  <span
                    className={
                      theme === "dark" ? "text-slate-400" : "text-gray-600"
                    }
                  >
                    admin@sniperthink.com
                  </span>
                </div>
                <div>
                  <span
                    className={`font-medium ${
                      theme === "dark" ? "text-slate-300" : "text-gray-700"
                    }`}
                  >
                    Phone:{" "}
                  </span>
                  <span
                    className={
                      theme === "dark" ? "text-slate-400" : "text-gray-600"
                    }
                  >
                    +91 9876543210
                  </span>
                </div>
                <div>
                  <span
                    className={`font-medium ${
                      theme === "dark" ? "text-slate-300" : "text-gray-700"
                    }`}
                  >
                    Team Members:{" "}
                  </span>
                  <span
                    className={
                      theme === "dark" ? "text-slate-400" : "text-gray-600"
                    }
                  >
                    5 invited
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                onClick={onInviteTeam}
                style={{ backgroundColor: "#1A6262" }}
                className="w-full justify-start hover:opacity-90 text-white"
              >
                <UserPlus className="w-4 h-4 mr-3" />
                Invite Team Member
              </Button>

              <Button
                variant="outline"
                className={`w-full justify-start ${
                  theme === "dark"
                    ? "bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600"
                    : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                <User className="w-4 h-4 mr-3" />
                Password Settings
              </Button>

              <Button
                onClick={onLogout}
                variant="outline"
                className="w-full justify-start border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
              >
                <LogOut className="w-4 h-4 mr-3" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SidebarPanel;
