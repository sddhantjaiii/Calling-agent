import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useAgents } from '@/hooks/useAgents';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import type { Contact, Agent } from '@/types';

interface AgentSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (agentElevenLabsId: string) => void;
  contact: Contact | null;
}

export const AgentSelectionModal: React.FC<AgentSelectionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  contact,
}) => {
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const { agents, loading, error } = useAgents();
  const [agentList, setAgentList] = useState<Agent[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (agents && Array.isArray(agents)) {
      setAgentList(agents);
    }
  }, [agents]);

  // Auto-select first agent when modal opens
  useEffect(() => {
    if (isOpen && agentList.length > 0 && !selectedAgentId) {
      setSelectedAgentId((agentList[0] as any).id);
    }
  }, [isOpen, agentList, selectedAgentId]);

  // Reset selection when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedAgentId('');
    }
  }, [isOpen]);

  const handleConfirm = () => {
    if (!selectedAgentId) {
      toast({ title: 'Select an agent', description: 'Please choose an agent to proceed.' });
      return;
    }

    const selected = (agentList as any[]).find(a => a.id === selectedAgentId);
    const elevenlabsId = selected?.elevenlabsAgentId || selected?.elevenlabs_agent_id;

    if (!elevenlabsId) {
      toast({
        title: 'Agent not configured',
        description: 'This agent does not have an ElevenLabs ID configured.',
        variant: 'destructive',
      });
      return;
    }

    onConfirm(elevenlabsId);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Select Agent for Calling</DialogTitle>
          <DialogDescription>
            Choose an agent to initiate the call to {contact?.name}.
          </DialogDescription>
        </DialogHeader>
        
        {loading && (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}

        {error && <p className="text-red-500">{(error as any).message || 'Failed to load agents'}</p>}

        {!loading && !error && (
          <Select onValueChange={setSelectedAgentId} value={selectedAgentId}>
            <SelectTrigger>
              <SelectValue placeholder="Select an agent" />
            </SelectTrigger>
            <SelectContent>
              {agentList.map((agent: Agent) => (
                <SelectItem key={agent.id} value={(agent as any).id}>
                  {agent.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={handleConfirm} 
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Confirm Call
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
