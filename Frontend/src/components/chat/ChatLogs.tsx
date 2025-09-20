import { useState } from "react";
import { MessageSquare, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useTheme } from "@/components/theme/ThemeProvider";

interface ChatLogsProps {
  onIntervene: () => void;
  isAdminIntervened: boolean;
  onExit: () => void;
}

const ChatLogs = ({
  onIntervene,
  isAdminIntervened,
  onExit,
}: ChatLogsProps) => {
  const { theme } = useTheme();
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [showInterveneWarning, setShowInterveneWarning] = useState(false);
  const [adminMessages, setAdminMessages] = useState<{
    [key: string]: { entered: boolean; exited: boolean };
  }>({});
  const [adminMessage, setAdminMessage] = useState("");

  const recentUsers = [
    {
      id: "1",
      name: "Siddhant",
      phone: "+91 8979556941",
      platform: "WhatsApp",
      time: "11:02 AM",
      avatar: "S",
      status: "Hot Lead",
      isLive: true,
      messages: [
        {
          id: "1",
          text: "Thanks for confirming, Siddhant! If you have any specific questions about our services or if there's something you'd like to explore further, just let me know! 😊",
          time: "10:47 AM",
          isBot: true,
        },
        {
          id: "2",
          text: "Tell me about your pricing",
          time: "10:57 AM",
          isBot: false,
        },
        {
          id: "3",
          text: "Our pricing structure at SniperThink is designed to cater to different business needs. Here's a summary of our sample pricing plans...",
          time: "11:02 AM",
          isBot: true,
        },
      ],
    },
    {
      id: "2",
      name: "Priya Sharma",
      phone: "+91 9873587694",
      platform: "WhatsApp",
      time: "10:52 AM",
      avatar: "P",
      status: "Warm - Nurture",
      isLive: false,
      messages: [
        {
          id: "1",
          text: "Hi, I'm interested in your analytics platform",
          time: "10:30 AM",
          isBot: false,
        },
        {
          id: "2",
          text: "Hello Priya! Thank you for your interest. I'd be happy to help you learn more about our platform.",
          time: "10:31 AM",
          isBot: true,
        },
        {
          id: "3",
          text: "Can you tell me more about the features?",
          time: "10:52 AM",
          isBot: false,
        },
      ],
    },
    {
      id: "3",
      name: "Rahul Kumar",
      phone: "No phone",
      platform: "Instagram",
      time: "10:45 AM",
      avatar: "R",
      status: "Follow-Up Later",
      isLive: false,
      messages: [
        {
          id: "1",
          text: "Hey, saw your post about business analytics",
          time: "10:40 AM",
          isBot: false,
        },
        {
          id: "2",
          text: "Hi Rahul! Thanks for reaching out. Yes, we help businesses make data-driven decisions.",
          time: "10:41 AM",
          isBot: true,
        },
        {
          id: "3",
          text: "Sounds interesting, but I'm quite busy right now",
          time: "10:45 AM",
          isBot: false,
        },
      ],
    },
  ];

  const selectedUserData = recentUsers.find((user) => user.id === selectedUser);
  const isLiveChat = selectedUserData?.isLive || false;

  const handleInterveneClick = () => {
    if (isLiveChat) {
      handleIntervene();
    } else {
      setShowInterveneWarning(true);
    }
  };

  const handleIntervene = () => {
    onIntervene();
    if (selectedUser) {
      setAdminMessages((prev) => ({
        ...prev,
        [selectedUser]: { ...prev[selectedUser], entered: true },
      }));
    }
    setShowInterveneWarning(false);
  };

  const handleExit = () => {
    onExit();
    if (selectedUser) {
      setAdminMessages((prev) => ({
        ...prev,
        [selectedUser]: { ...prev[selectedUser], exited: true },
      }));
    }
  };

  const handleRefresh = () => {
    console.log("Refreshing chat...");
  };

  const handleSendAdminMessage = () => {
    if (adminMessage.trim()) {
      console.log("Sending admin message:", adminMessage);
      setAdminMessage("");
    }
  };

  return (
    <div
      className={`grid grid-cols-3 gap-6 ${
        theme === "dark" ? "bg-black" : "bg-gray-50"
      } p-6`}
      style={{ height: "calc(100vh - 200px)" }}
    >
      {/* Find User Section */}
      <div
        className={`${
          theme === "dark"
            ? "bg-black border-slate-700"
            : "bg-white border-gray-200"
        } border rounded-lg flex flex-col h-full`}
      >
        <div
          className={`p-4 border-b ${
            theme === "dark" ? "border-slate-700" : "border-gray-200"
          }`}
        >
          <h3
            className={`text-lg font-semibold mb-4 ${
              theme === "dark" ? "text-white" : "text-gray-900"
            }`}
          >
            Find User
          </h3>
          <div className="relative">
            <input
              type="text"
              placeholder="Search by phone or name"
              className={`w-full border rounded-lg px-4 py-2 pl-10 ${
                theme === "dark"
                  ? "bg-slate-700 border-slate-600 text-white"
                  : "bg-gray-50 border-gray-300 text-gray-900"
              }`}
            />
            <MessageSquare
              className={`w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 ${
                theme === "dark" ? "text-slate-400" : "text-gray-400"
              }`}
            />
          </div>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          <h4
            className={`text-sm mb-3 ${
              theme === "dark" ? "text-slate-400" : "text-gray-600"
            }`}
          >
            Recent Users
          </h4>
          <div className="space-y-3">
            {recentUsers.map((user) => (
              <div
                key={user.id}
                onClick={() => setSelectedUser(user.id)}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedUser === user.id
                    ? theme === "dark"
                      ? "bg-slate-600"
                      : "bg-blue-100"
                    : theme === "dark"
                    ? "bg-slate-700 hover:bg-slate-600"
                    : "bg-gray-100 hover:bg-gray-200"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${
                      theme === "dark" ? "bg-slate-600" : "bg-gray-500"
                    }`}
                  >
                    {user.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h5
                        className={`font-medium truncate ${
                          theme === "dark" ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {user.name}
                      </h5>
                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            user.platform === "WhatsApp"
                              ? "bg-green-500 text-white"
                              : "bg-purple-500 text-white"
                          }`}
                        >
                          {user.platform}
                        </span>
                        {user.isLive && (
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        )}
                      </div>
                    </div>
                    <p
                      className={`text-sm ${
                        theme === "dark" ? "text-slate-400" : "text-gray-600"
                      }`}
                    >
                      {user.phone}
                    </p>
                    <p
                      className={`text-xs ${
                        theme === "dark" ? "text-slate-500" : "text-gray-500"
                      }`}
                    >
                      {user.time}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div
        className={`col-span-2 ${
          theme === "dark"
            ? "bg-black border-slate-700"
            : "bg-white border-gray-200"
        } border rounded-lg flex flex-col h-full`}
      >
        {selectedUser ? (
          <>
            {/* Chat Header */}
            <div
              className={`p-4 border-b flex items-center justify-between ${
                theme === "dark" ? "border-slate-700" : "border-gray-200"
              }`}
            >
              <div className="flex items-center space-x-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${
                    theme === "dark" ? "bg-slate-600" : "bg-gray-500"
                  }`}
                >
                  {selectedUserData?.avatar}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3
                      className={`font-medium ${
                        theme === "dark" ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {selectedUserData?.name}
                    </h3>
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        selectedUserData?.platform === "WhatsApp"
                          ? "bg-green-500 text-white"
                          : "bg-purple-500 text-white"
                      }`}
                    >
                      {selectedUserData?.platform}
                    </span>
                    {isAdminIntervened && (
                      <div className="flex items-center space-x-1">
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                        <span className="px-2 py-1 rounded-full text-xs bg-red-500 text-white animate-pulse">
                          Admin Mode
                        </span>
                      </div>
                    )}
                  </div>
                  <p
                    className={`text-sm ${
                      theme === "dark" ? "text-slate-400" : "text-gray-600"
                    }`}
                  >
                    {selectedUserData?.phone}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRefresh}
                  className={
                    theme === "dark"
                      ? "bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600"
                      : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                  }
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
                {!isAdminIntervened ? (
                  <Button
                    size="sm"
                    className="bg-blue-500 hover:bg-blue-600"
                    onClick={handleInterveneClick}
                  >
                    Intervene
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="bg-red-500 hover:bg-red-600"
                    onClick={handleExit}
                  >
                    Exit Intervention
                  </Button>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
              {selectedUserData?.messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.isBot ? "justify-start" : "justify-end"
                  }`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.isBot
                        ? theme === "dark"
                          ? "bg-slate-700 text-white"
                          : "bg-gray-200 text-gray-900"
                        : "bg-blue-500 text-white"
                    }`}
                  >
                    <p className="text-sm">{message.text}</p>
                    <p className="text-xs opacity-70 mt-1">{message.time}</p>
                  </div>
                </div>
              ))}

              {/* Admin Messages */}
              {adminMessages[selectedUser]?.entered && (
                <div className="flex justify-center">
                  <div className="bg-yellow-600/20 border border-yellow-600/50 rounded-full px-4 py-2 flex items-center space-x-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                    <span className="text-yellow-300 text-sm">
                      👤 Admin has entered the chat and is now responding
                    </span>
                  </div>
                </div>
              )}

              {adminMessages[selectedUser]?.exited && (
                <div className="flex justify-center">
                  <div className="bg-yellow-600/20 border border-yellow-600/50 rounded-full px-4 py-2 flex items-center space-x-2">
                    <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                    <span className="text-yellow-300 text-sm">
                      👤 Admin has left the chat. AI Assistant is now responding
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Message Input */}
            <div
              className={`p-4 border-t ${
                theme === "dark" ? "border-slate-700" : "border-gray-200"
              }`}
            >
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder={
                    isAdminIntervened
                      ? "Reply as Admin..."
                      : "Type a message..."
                  }
                  value={adminMessage}
                  onChange={(e) => setAdminMessage(e.target.value)}
                  className={`flex-1 border rounded-lg px-4 py-2 ${
                    theme === "dark"
                      ? "bg-slate-700 border-slate-600 text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  }`}
                  onKeyPress={(e) =>
                    e.key === "Enter" && handleSendAdminMessage()
                  }
                />
                <Button
                  size="sm"
                  onClick={handleSendAdminMessage}
                  className={
                    isAdminIntervened
                      ? "bg-red-500 hover:bg-red-600"
                      : "bg-blue-500 hover:bg-blue-600"
                  }
                >
                  {isAdminIntervened ? "Send as Admin" : "Send"}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 mx-auto ${
                  theme === "dark" ? "bg-slate-700" : "bg-gray-200"
                }`}
              >
                <MessageSquare
                  className={`w-8 h-8 ${
                    theme === "dark" ? "text-slate-400" : "text-gray-500"
                  }`}
                />
              </div>
              <h3
                className={`text-xl font-semibold mb-2 ${
                  theme === "dark" ? "text-white" : "text-gray-900"
                }`}
              >
                Select a conversation
              </h3>
              <p
                className={
                  theme === "dark" ? "text-slate-400" : "text-gray-600"
                }
              >
                Choose a user from the list to start chatting
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Intervene Warning Dialog */}
      <Dialog
        open={showInterveneWarning}
        onOpenChange={setShowInterveneWarning}
      >
        <DialogContent
          className={
            theme === "dark"
              ? "bg-black border-slate-700"
              : "bg-white border-gray-200"
          }
        >
          <DialogHeader>
            <DialogTitle
              className={theme === "dark" ? "text-white" : "text-gray-900"}
            >
              Not a Live Chat
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p
              className={theme === "dark" ? "text-slate-300" : "text-gray-700"}
            >
              This is not a live chat session. Do you still want to intervene?
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowInterveneWarning(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleIntervene}
              className="bg-blue-500 hover:bg-blue-600"
            >
              Yes, Intervene
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChatLogs;
