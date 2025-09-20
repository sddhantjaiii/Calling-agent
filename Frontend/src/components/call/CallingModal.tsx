import { useState, useEffect } from "react";
import { Phone, PhoneOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useTheme } from "@/components/theme/ThemeProvider";

interface CallingModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadName?: string;
  leadPhone?: string;
  isBulk?: boolean;
  leadCount?: number;
}

const CallingModal = ({
  isOpen,
  onClose,
  leadName,
  leadPhone,
  isBulk,
  leadCount,
}: CallingModalProps) => {
  const { theme } = useTheme();
  const [isConnected, setIsConnected] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isOpen) {
      // Simulate connecting after 2 seconds
      const connectTimeout = setTimeout(() => {
        setIsConnected(true);
      }, 2000);

      // Start call duration timer when connected
      if (isConnected) {
        interval = setInterval(() => {
          setCallDuration((prev) => prev + 1);
        }, 1000);
      }

      return () => {
        clearTimeout(connectTimeout);
        if (interval) clearInterval(interval);
      };
    } else {
      setIsConnected(false);
      setCallDuration(0);
    }
  }, [isOpen, isConnected]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const handleEndCall = () => {
    setIsConnected(false);
    setCallDuration(0);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={`max-w-md ${
          theme === "dark"
            ? "bg-slate-800 border-slate-700"
            : "bg-white border-gray-200"
        }`}
      >
        <div className="py-8 text-center">
          {!isConnected ? (
            <>
              <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <Phone className="w-10 h-10 text-white" />
              </div>
              <h3
                className={`text-xl font-semibold mb-2 ${
                  theme === "dark" ? "text-white" : "text-gray-900"
                }`}
              >
                {isBulk ? `Calling ${leadCount} leads...` : "Calling..."}
              </h3>
              <p
                className={`${
                  theme === "dark" ? "text-slate-300" : "text-gray-600"
                }`}
              >
                {isBulk
                  ? "Initiating bulk call sequence"
                  : `Connecting to ${leadName || "lead"}`}
              </p>
              {!isBulk && leadPhone && (
                <p
                  className={`text-sm mt-1 ${
                    theme === "dark" ? "text-slate-400" : "text-gray-500"
                  }`}
                >
                  {leadPhone}
                </p>
              )}
            </>
          ) : (
            <>
              <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="w-10 h-10 text-white" />
              </div>
              <h3
                className={`text-xl font-semibold mb-2 ${
                  theme === "dark" ? "text-white" : "text-gray-900"
                }`}
              >
                Connected
              </h3>
              <p
                className={`${
                  theme === "dark" ? "text-slate-300" : "text-gray-600"
                } mb-2`}
              >
                {isBulk
                  ? `Connected to ${leadCount} leads`
                  : `Connected to ${leadName || "lead"}`}
              </p>
              <div
                className={`text-2xl font-mono mb-4 ${
                  theme === "dark" ? "text-white" : "text-gray-900"
                }`}
              >
                {formatDuration(callDuration)}
              </div>
              <div className="flex items-center justify-center space-x-2 mb-4">
                <div className="flex space-x-1">
                  <div className="w-2 h-6 bg-green-500 rounded animate-pulse"></div>
                  <div
                    className="w-2 h-4 bg-green-500 rounded animate-pulse"
                    style={{ animationDelay: "0.1s" }}
                  ></div>
                  <div
                    className="w-2 h-8 bg-green-500 rounded animate-pulse"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                  <div
                    className="w-2 h-3 bg-green-500 rounded animate-pulse"
                    style={{ animationDelay: "0.3s" }}
                  ></div>
                  <div
                    className="w-2 h-6 bg-green-500 rounded animate-pulse"
                    style={{ animationDelay: "0.4s" }}
                  ></div>
                </div>
                <span
                  className={`text-sm ${
                    theme === "dark" ? "text-slate-300" : "text-gray-600"
                  }`}
                >
                  AI Talking...
                </span>
              </div>
            </>
          )}

          <Button
            onClick={handleEndCall}
            className="bg-red-500 hover:bg-red-600 text-white px-8 py-3 rounded-full"
          >
            <PhoneOff className="w-5 h-5 mr-2" />
            End Call
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CallingModal;
