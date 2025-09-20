import Dashboard from "./Dashboard";

/**
 * This page shows the Chat Data tab within the dashboard shell (sidebar, topnav, etc).
 * Mobile & desktop responsive.
 * Keeps all design, flow, and structure exactly as elsewhere in the dashboard.
 */
const ChatDataPage = () => {
  // Pass correct tab state so Dashboard shows the Data Tab for Chat Agent
  return <Dashboard initialTab="chat" initialSubTab="data" />;
};

export default ChatDataPage;
