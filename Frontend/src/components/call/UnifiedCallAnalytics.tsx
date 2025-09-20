import { useState, useEffect } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useAgents } from "@/hooks/useAgents";
import CallAnalytics from "@/components/call/CallAnalytics";
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
import { ChevronDown } from "lucide-react";

const UnifiedCallAnalytics = () => {
  const { theme } = useTheme();
  const { agents } = useAgents();
  
  // Filter to get only call agents
  const callAgents = agents.filter(agent => agent.type === "CallAgent");
  
  // Single agent selection - default to all agents (no selection)
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  
  // Handle agent selection
  const handleAgentSelect = (agentId: string) => {
    console.log('🔍 Debug: Agent selected with ID:', agentId);
    const agent = callAgents.find(a => a.id === agentId);
    console.log('🔍 Debug: Agent found:', agent ? { 
      id: agent.id, 
      name: agent.name, 
      elevenlabsAgentId: agent.elevenlabsAgentId 
    } : 'NOT FOUND');
    setSelectedAgent(agentId);
  };

  // Get selected agent info for display
  const getSelectedAgentInfo = () => {
    return callAgents.find(agent => agent.id === selectedAgent);
  };

  return (
    <div className="space-y-4">
      {/* Agent Filter Section */}
      <div className="flex items-center gap-4 p-4 border rounded-lg">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">Analytics for Agent:</span>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="justify-between min-w-[200px]">
                {getSelectedAgentInfo()?.name || "All agents"}
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuLabel>Select Agent</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                key="all-agents"
                checked={selectedAgent === ""}
                onCheckedChange={() => handleAgentSelect("")}
              >
                All agents
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              
              {callAgents.map((agent) => (
                <DropdownMenuCheckboxItem
                  key={agent.id}
                  checked={selectedAgent === agent.id}
                  onCheckedChange={() => handleAgentSelect(agent.id)}
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

        {/* Selected Agent Display */}
        {selectedAgent && getSelectedAgentInfo() && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {getSelectedAgentInfo()?.name}
            </Badge>
          </div>
        )}
      </div>



      {/* Call Analytics Component */}
      <div className="min-h-[600px]">
        <CallAnalytics 
          selectedAgentId={selectedAgent}
        />
      </div>
    </div>
  );
};

export default UnifiedCallAnalytics;
