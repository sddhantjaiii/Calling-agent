import React, { useState, useEffect } from "react";
import CreateAgentModal from "./CreateAgentModal";
import DeleteAgentModal from "./DeleteAgentModal";
import { toast } from "sonner";
import { useAgents } from "@/hooks/useAgents";
import { useSuccessFeedback } from "@/contexts/SuccessFeedbackContext";
import { useAuth } from "@/contexts/AuthContext";
import { confirmationPresets } from "@/hooks/useConfirmation";
import type { Agent } from "@/types";
import {
  Pencil,
  Trash2,
  Eye,
  ChevronUp,
  Wifi,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";

// No mock data - use real agents from API

const agentStatusOptions = [
  { value: "all", label: "All Statuses" },
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
];



export default function AgentManager() {
  // Use the useAgents hook for data management
  const {
    agents,
    voices,
    loading,
    error,
    creating,
    updating,
    deleting,
    testingConnection,
    createAgent,
    updateAgent,
    deleteAgent: deleteAgentFromAPI,
    refreshAgents,
    loadVoices,
    testConnection,
    clearError,
  } = useAgents();

  const { isAdminUser } = useAuth();

  // Use success feedback for notifications
  const { showSuccess, confirm } = useSuccessFeedback();

  const [modalOpen, setModalOpen] = useState(false);
  const [editAgent, setEditAgent] = useState<Agent | null>(null);
  const [deleteAgentState, setDeleteAgentState] = useState<Agent | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [viewDetails, setViewDetails] = useState<Record<string, boolean>>({});

  // Display error messages from the hook
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  // Use loaded agents from API
  const displayAgents = agents;





  const handleDeleteAgent = async (agent: Agent) => {
    const confirmed = await confirm(confirmationPresets.deleteAgent(agent.name));
    if (confirmed) {
      try {
        const success = await deleteAgentFromAPI(agent.id);
        if (success) {
          showSuccess.agent.deleted(agent.name, {
            description: 'Agent has been permanently removed from your account',
            action: {
              label: 'Undo',
              onClick: () => {
                // Could implement undo functionality here
                toast.info('Undo functionality coming soon');
              },
            },
          });
        }
      } catch (error) {
        console.error('Error deleting agent:', error);
        // Error handling is done in the hook
      }
    }
  };

  const handleClearFilters = () => {
    setSearch("");
    setStatus("all");
  };

  const handleTestConnection = async () => {
    try {
      const result = await testConnection();
      if (result) {
        if (result.success) {
          showSuccess.agent.tested('ElevenLabs Connection', {
            message: result.message,
            description: 'Your agents are ready to make calls',
            action: {
              label: 'Create Agent',
              onClick: () => {
                setModalOpen(true);
                setEditAgent(null);
              },
            },
          });
        } else {
          toast.error(result.message, {
            description: 'Please check your ElevenLabs API configuration',
            duration: 5000,
          });
        }
      } else {
        toast.error('Connection test failed', {
          description: 'Unable to reach ElevenLabs API. Please try again.',
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      toast.error('Connection test failed', {
        description: 'An unexpected error occurred. Please try again.',
        duration: 5000,
      });
    }
  };

  const toggleViewDetails = (agentId: string) => {
    setViewDetails((prev) => ({
      ...prev,
      [agentId]: !prev[agentId],
    }));
  };



  const filteredAgents = displayAgents.filter((agent) => {
    const searchText = search.toLowerCase();
    const matchesSearch =
      agent.name?.toLowerCase().includes(searchText) ||
      agent.description?.toLowerCase().includes(searchText);
    const matchesStatus = status === "all" || agent.status === status;
    return matchesSearch && matchesStatus;
  });

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-4">
        {/* HEADER row */}
        <div className="flex items-center justify-between mt-2 mb-0">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">
              Your Agents
            </h2>
            <div className="text-muted-foreground mt-1 mb-2 text-sm">
              Create and manage your AI calling agents
            </div>
          </div>
          {isAdminUser() && (
          <div className="flex items-center gap-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleTestConnection}
                  disabled={testingConnection}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2"
                >
                  {testingConnection ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
                      Testing...
                    </>
                  ) : (
                    <>
                      <Wifi className="w-4 h-4" />
                      Test Connection
                    </>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p>Test the connection to ElevenLabs API to ensure your agents can function properly</p>
              </TooltipContent>
            </Tooltip>
            <button
              onClick={() => {
                setModalOpen(true);
                setEditAgent(null);
              }}
              className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2"
            >
              <span className="text-lg">+</span>
              Create Agent
            </button>
          </div>
          )}
        </div>

        {/* FILTERS */}
        <div className="flex flex-col md:flex-row md:gap-6 items-start md:items-end w-full">
          <div className="w-full md:w-1/3">
            <label
              className="text-xs font-semibold text-muted-foreground"
              htmlFor="agent-search"
            >
              Search
            </label>
            <input
              id="agent-search"
              type="text"
              placeholder="Search agents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full mt-1 px-4 py-2 border border-border rounded outline-none text-sm bg-background"
              autoComplete="off"
            />
          </div>
          <div className="w-full md:w-1/3 mt-2 md:mt-0">
            <label
              className="text-xs font-semibold text-muted-foreground"
              htmlFor="agent-status"
            >
              Status
            </label>
            <select
              id="agent-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full mt-1 px-4 py-2 border border-border rounded bg-background text-sm"
            >
              {agentStatusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="w-full md:w-1/3 flex md:justify-end mt-2 md:mt-0">
            <button
              onClick={handleClearFilters}
              className="text-sm font-medium text-primary hover:underline px-2 py-2 rounded"
              type="button"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* AGENT CARDS */}
        <div className="mt-3">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-card border border-border rounded-lg shadow-md p-6 animate-pulse">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-5 bg-muted rounded w-3/5"></div>
                    <div className="h-6 bg-muted rounded w-16"></div>
                  </div>
                  <div className="space-y-2 mb-4">
                    <div className="h-4 bg-muted rounded"></div>
                    <div className="h-4 bg-muted rounded w-4/5"></div>
                    <div className="h-4 bg-muted rounded w-3/5"></div>
                  </div>
                  <div className="space-y-2 mb-4">
                    {[...Array(4)].map((_, j) => (
                      <div key={j} className="flex items-center gap-2">
                        <div className="h-3 bg-muted rounded w-24"></div>
                        <div className="h-3 bg-muted rounded w-32"></div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-4">
                    <div className="h-4 bg-muted rounded w-24"></div>
                    <div className="flex gap-3">
                      <div className="h-8 w-8 bg-muted rounded-full"></div>
                      <div className="h-8 w-8 bg-muted rounded-full"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredAgents.length === 0 ? (
            <div className="text-muted-foreground col-span-full text-center py-12">
              No agents found.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredAgents.map((agent) => {
                const isExpanded = expanded[agent.id];
                const isViewingDetails = viewDetails[agent.id];
                const desc =
                  typeof agent.description === "string" ? agent.description : "";
                const fallbackDesc = (
                  <span className="italic opacity-70">
                    No description provided
                  </span>
                );
                return (
                  <div
                    key={agent.id}
                    className={`bg-card border border-border rounded-lg shadow-md p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-lg ${isViewingDetails ? "min-h-[320px]" : "min-h-[200px]"
                      }`}
                  >
                    {/* Title */}
                    <div className="flex items-center gap-2 mb-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="font-semibold text-lg text-foreground truncate max-w-[75%] cursor-help">
                            {agent.name}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p>
                            You can rename agents and add descriptions. Click the
                            edit button to modify agent details.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${agent.status === "active"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                          }`}
                      >
                        {agent.status}
                      </span>
                    </div>

                    {/* Description */}
                    <div className="text-sm text-muted-foreground mb-1">
                      {desc ? (
                        !isExpanded && desc.length > 120 ? (
                          <div>
                            {desc.slice(0, 120)}...{" "}
                            <button
                              className="text-primary underline text-xs"
                              onClick={() =>
                                setExpanded((e) => ({
                                  ...e,
                                  [agent.id]: true,
                                }))
                              }
                            >
                              Read more
                            </button>
                          </div>
                        ) : desc.length > 120 ? (
                          <div>
                            {desc}{" "}
                            <button
                              className="text-primary underline text-xs"
                              onClick={() =>
                                setExpanded((e) => ({
                                  ...e,
                                  [agent.id]: false,
                                }))
                              }
                            >
                              Show less
                            </button>
                          </div>
                        ) : (
                          desc
                        )
                      ) : (
                        fallbackDesc
                      )}
                    </div>

                    {/* Agent details */}
                    <div className="flex flex-col gap-0.5 text-[13px] text-foreground/80 mb-2 mt-2">
                      <div className="flex items-center gap-2">
                        <span className="w-24 text-muted-foreground font-semibold">
                          Type:
                        </span>
                        <span>
                          {agent.type === "ChatAgent"
                            ? "Chat Agent"
                            : "Call Agent"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-24 text-muted-foreground font-semibold">
                          Language:
                        </span>
                        <span>{agent.language || "-"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-24 text-muted-foreground font-semibold">
                          Conversations:
                        </span>
                        <span>{agent.conversations ?? 0}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-24 text-muted-foreground font-semibold">
                          Created:
                        </span>
                        <span>{agent.created || "-"}</span>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isViewingDetails && (
                      <div className="flex flex-col gap-0.5 text-[13px] text-foreground/80 mb-2 border-t pt-2">
                        <div className="flex items-center gap-2">
                          <span className="w-24 text-muted-foreground font-semibold">
                            Model:
                          </span>
                          <span>{agent.model || "gpt-4o-mini"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-24 text-muted-foreground font-semibold">
                            Credits:
                          </span>
                          <span
                            className={`${(agent.creditsRemaining || 0) < 500
                              ? "text-red-600"
                              : "text-green-600"
                              }`}
                          >
                            {(agent.creditsRemaining || 0).toLocaleString()}{" "}
                            remaining
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-24 text-muted-foreground font-semibold">
                            Performance:
                          </span>
                          <span className="text-blue-600">
                            {agent.successRate || 0}% success rate
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-24 text-muted-foreground font-semibold">
                            Avg Response:
                          </span>
                          <span>{agent.avgDuration || '0m'}</span>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between mt-auto pt-4">
                      <button
                        onClick={() => toggleViewDetails(agent.id)}
                        className="font-medium hover:underline flex items-center gap-1 text-[#1A6262]"
                      >
                        {isViewingDetails ? (
                          <>
                            <ChevronUp className="w-4 h-4" />
                            Hide Details
                          </>
                        ) : (
                          <>
                            <Eye className="w-4 h-4" />
                            View Details
                          </>
                        )}
                      </button>
                      <div className="flex gap-3">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              className="text-blue-600 hover:bg-blue-50 rounded p-1"
                              onClick={() => {
                                setModalOpen(true);
                                setEditAgent(agent);
                              }}
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <p>Edit agent name and description</p>
                          </TooltipContent>
                        </Tooltip>
                        <button
                          className="text-red-600 hover:bg-red-50 rounded p-1"
                          onClick={() => handleDeleteAgent(agent)}
                          title="Delete"
                          disabled={deleting}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <CreateAgentModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditAgent(null);
        }}
        editAgent={editAgent}
      />

    </TooltipProvider>
  );
}
