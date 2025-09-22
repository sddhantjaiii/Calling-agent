import { useState, useEffect } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useAgents } from "@/hooks/useAgents";
import CallLogs from "@/components/call/CallLogs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { ChevronDown, X } from "lucide-react";
import type { Lead } from "@/pages/Dashboard";

interface UnifiedCallLogsProps {
  activeTab: string;
  activeSubTab: string;
  onOpenProfile?: (lead: Lead) => void;
}

const UnifiedCallLogs = ({ activeTab, activeSubTab, onOpenProfile }: UnifiedCallLogsProps) => {
  const { theme } = useTheme();
  const { agents } = useAgents();
  // Filter to get only call agents
  const callAgents = agents.filter(agent => agent.type === "CallAgent");
  
  // Multi-select for call logs (keeping existing functionality)
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  
  // Handle agent selection/deselection
  const handleAgentToggle = (agentId: string) => {
    setSelectedAgents(prev => 
      prev.includes(agentId) 
        ? prev.filter(id => id !== agentId)
        : [...prev, agentId]
    );
  };

  // Clear all selected agents
  const clearAllAgents = () => {
    setSelectedAgents([]);
  };

  // Select all agents
  const selectAllAgents = () => {
    setSelectedAgents(callAgents.map(agent => agent.id));
  };

  // Get selected agent names for display
  const getSelectedAgentNames = () => {
    return callAgents
      .filter(agent => selectedAgents.includes(agent.id))
      .map(agent => agent.name);
  };

  // Debug logging
  useEffect(() => {
    const mappedAgents = selectedAgents.length === 0 
      ? [] 
      : callAgents
        .filter(agent => selectedAgents.includes(agent.id))
        .map(agent => agent.elevenlabsAgentId);
        
    console.log('UnifiedCallLogs Debug:', {
      selectedAgents,
      selectedAgentsLength: selectedAgents.length,
      callAgents: callAgents.length,
      callAgentIds: callAgents.map(a => a.id),
      agentMapping: callAgents.map(agent => ({ 
        id: agent.id, 
        elevenlabsAgentId: agent.elevenlabsAgentId,
        name: agent.name 
      })),
      mappedAgents,
      selectedAgentFilter: selectedAgents.map(id => {
        const agent = callAgents.find(a => a.id === id);
        return agent ? { id: agent.id, elevenlabsAgentId: agent.elevenlabsAgentId, name: agent.name } : { id, notFound: true };
      })
    });
  }, [selectedAgents, callAgents]);

  return (
    <div className="space-y-4">
      {/* Agent Filter Section */}
      <div className="flex items-center gap-4 p-4 border rounded-lg">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">Filter by Agent:</span>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="justify-between min-w-[200px]">
                {selectedAgents.length === 0 
                  ? "All Agents" 
                  : selectedAgents.length === 1
                  ? getSelectedAgentNames()[0]
                  : `${selectedAgents.length} agents selected`
                }
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuLabel>Select Agents</DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              {/* Select All / Clear All */}
              <div className="flex justify-between p-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={selectAllAgents}
                  className="text-xs h-auto p-1"
                >
                  Select All
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearAllAgents}
                  className="text-xs h-auto p-1"
                >
                  Clear All
                </Button>
              </div>
              
              <DropdownMenuSeparator />
              
              {callAgents.map((agent) => (
                <DropdownMenuCheckboxItem
                  key={agent.id}
                  checked={selectedAgents.includes(agent.id)}
                  onCheckedChange={() => handleAgentToggle(agent.id)}
                >
                  {agent.name}
                </DropdownMenuCheckboxItem>
              ))}
              
              {callAgents.length === 0 && (
                <div className="p-2 text-sm text-gray-500 text-center">
                  No call agents found
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Selected Agents Display */}
        {selectedAgents.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-500">Selected:</span>
            {getSelectedAgentNames().map((name) => (
              <Badge key={name} variant="secondary" className="text-xs">
                {name}
                <X 
                  className="h-3 w-3 ml-1 cursor-pointer" 
                  onClick={() => {
                    const agent = callAgents.find(a => a.name === name);
                    if (agent) handleAgentToggle(agent.id);
                  }}
                />
              </Badge>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllAgents}
              className="text-xs h-auto p-1 text-gray-500"
            >
              Clear All
            </Button>
          </div>
        )}
      </div>

      {/* Call Logs Component with Agent Filter */}
      <div className="min-h-[400px]">
        <CallLogs 
          activeTab={activeTab}
          activeSubTab={activeSubTab}
          selectedAgents={(() => {
            if (selectedAgents.length === 0) return [];
            
            // Map selected agent IDs to agent names since elevenlabsAgentId is undefined
            const mapped = callAgents
              .filter(agent => selectedAgents.includes(agent.id))
              .map(agent => agent.name);
              
            console.log('🔍 Agent Mapping Debug (using names):', {
              selectedAgents,
              filteredAgents: callAgents.filter(agent => selectedAgents.includes(agent.id)),
              mappedNames: mapped,
              allAgents: callAgents.map(a => ({ id: a.id, elevenlabsAgentId: a.elevenlabsAgentId, name: a.name }))
            });
            
            return mapped;
          })()}
          onOpenProfile={onOpenProfile}
          useLazyLoading={true}
          initialPageSize={30}
        />
      </div>
    </div>
  );
};

export default UnifiedCallLogs;
