import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { SelectItem } from '@/components/ui/select';
import { ValidatedInput, ValidatedTextarea } from '@/components/ui/ValidatedInput';
import { ValidatedSelect } from '@/components/ui/ValidatedSelect';
import { toast } from 'sonner';
import { useAgents } from '@/hooks/useAgents';
import { useSuccessFeedback } from '@/contexts/SuccessFeedbackContext';
import { validateForm, validateField, validationSchemas } from '@/utils/formValidation';
import {
  createFormValidationHandler,
  mergeValidationErrors,
  FORM_FIELD_MAPPINGS
} from '@/utils/serverValidationHandler';
import type { Agent, CreateAgentRequest, UpdateAgentRequest } from '@/types';

interface CreateAgentModalProps {
  open: boolean;
  onClose: () => void;
  editAgent?: Agent | null;
}

export function CreateAgentModal({
  open,
  onClose,
  editAgent
}: CreateAgentModalProps) {
  // Use the useAgents hook for data management
  const {
    voices,
    creating,
    updating,
    error,
    createAgent,
    updateAgent,
    clearError,
  } = useAgents();

  // Use success feedback for notifications
  const { showSuccess } = useSuccessFeedback();

  const [formData, setFormData] = useState({
    name: '',
    type: 'CallAgent' as 'CallAgent' | 'ChatAgent',
    agentType: 'call' as 'call' | 'chat',
    language: 'English',
    description: '',
    voiceId: '',
    model: 'gpt-4o-mini',
    elevenlabsAgentId: '',
  });

  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Merge client and server errors (server errors take precedence)
  const validationErrors = mergeValidationErrors(clientErrors, serverErrors);

  // Create server validation handler for this form
  const handleServerValidation = createFormValidationHandler(
    setServerErrors,
    FORM_FIELD_MAPPINGS.agent,
    {
      showToast: true,
      toastTitle: editAgent ? 'Update Failed' : 'Creation Failed',
    }
  );

  // Load form data when editing and clear errors when modal opens
  useEffect(() => {
    if (open) {
      setClientErrors({});
      setServerErrors({});
      setTouchedFields({});
      setIsSubmitting(false);
      clearError();

      if (editAgent) {
        setFormData({
          name: editAgent.name || '',
          type: editAgent.type || 'CallAgent',
          agentType: editAgent.agentType || 'call',
          language: editAgent.language || 'English',
          description: editAgent.description || '',
          voiceId: editAgent.voiceId || '',
          model: editAgent.model || 'gpt-4o-mini',
          elevenlabsAgentId: editAgent.elevenlabsAgentId || '',
        });
      } else {
        setFormData({
          name: '',
          type: 'CallAgent',
          agentType: 'call',
          language: 'English',
          description: '',
          voiceId: '',
          model: 'gpt-4o-mini',
          elevenlabsAgentId: '',
        });
      }
    }
  }, [editAgent, open]);

  // Validation function using the validation schema
  const validateFormData = (): boolean => {
    const result = validateForm(formData, validationSchemas.agent);
    setClientErrors(result.errors);

    // Clear server errors when doing client validation
    setServerErrors({});

    // Mark all fields as touched
    setTouchedFields({
      name: true,
      type: true,
      agentType: true,
      language: true,
      voiceId: true,
      description: true
    });

    return result.isValid;
  };

  const handleFieldBlur = (field: string) => {
    setTouchedFields(prev => ({ ...prev, [field]: true }));

    // Validate individual field
    const schema = validationSchemas.agent;
    const fieldRules = schema[field as keyof typeof schema];

    if (fieldRules) {
      const result = validateField(formData[field as keyof typeof formData], fieldRules, field);
      if (!result.isValid && result.error) {
        setClientErrors(prev => ({ ...prev, [field]: result.error! }));
      } else {
        setClientErrors(prev => ({ ...prev, [field]: '' }));
      }

      // Clear server error for this field when user is actively fixing it
      if (serverErrors[field]) {
        setServerErrors(prev => ({ ...prev, [field]: '' }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous errors
    setClientErrors({});
    setServerErrors({});
    clearError();

    // Validate form
    if (!validateFormData()) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (editAgent) {
        // Update existing agent
        const updateData: UpdateAgentRequest = {
          name: formData.name.trim(),
          agentType: formData.agentType,
          language: formData.language,
          type: formData.type,
          description: formData.description.trim(),
        };

        const result = await updateAgent(editAgent.id, updateData);
        if (result) {
          showSuccess.agent.updated(formData.name.trim(), {
            description: 'Your agent configuration has been saved',
            action: {
              label: 'View Agent',
              onClick: () => {
                // Could navigate to agent details
                console.log('Navigate to agent details');
              },
            },
          });
          onClose();
        }
      } else {
        // Create new agent
        const createData: CreateAgentRequest = {
          name: formData.name.trim(),
          agentType: formData.agentType,
          language: formData.language,
          type: formData.type,
          description: formData.description.trim(),
        };

        const result = await createAgent(createData);
        if (result) {
          showSuccess.agent.created(formData.name.trim(), {
            description: 'Your AI agent is ready to start making calls',
            action: {
              label: 'Test Connection',
              onClick: () => {
                // Could trigger test connection
                console.log('Test agent connection');
              },
            },
          });
          onClose();
        }
      }
    } catch (error) {
      console.error('Agent save error:', error);

      // Try to handle as server validation error first
      const wasValidationError = handleServerValidation(error);

      if (!wasValidationError) {
        // Handle other specific error types or fall back to generic error
        const errorObj = error as any;

        if (errorObj?.code === 'AGENT_LIMIT_EXCEEDED') {
          toast.error('Agent Limit Reached', {
            description: 'You have reached the maximum number of agents allowed. Please upgrade your plan or delete unused agents.',
          });
        } else if (errorObj?.code === 'ELEVENLABS_ERROR') {
          setServerErrors({ voiceId: 'Voice service is currently unavailable. Please try again later.' });
          toast.error('Voice Service Error', {
            description: 'There was an issue with the voice service. Please try again.',
          });
        } else if (errorObj?.code === 'UNAUTHORIZED') {
          toast.error('Session Expired', {
            description: 'Please log in again to continue.',
          });
        } else if (errorObj?.code === 'NETWORK_ERROR') {
          toast.error('Network Error', {
            description: 'Please check your internet connection and try again.',
          });
        } else {
          // Generic error handling
          toast.error('Error', {
            description: errorObj?.message || `Failed to ${editAgent ? 'update' : 'create'} agent. Please try again.`,
          });
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };

      // Update agentType when type changes
      if (field === 'type') {
        updated.agentType = value === 'CallAgent' ? 'call' : 'chat';
      }

      return updated;
    });

    // Clear both client and server errors when user starts typing
    if (clientErrors[field]) {
      setClientErrors(prev => ({ ...prev, [field]: '' }));
    }
    if (serverErrors[field]) {
      setServerErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0 pb-4">
          <DialogTitle>
            {editAgent ? 'Edit Agent' : 'Create New Agent'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto invisible-scrollbar pr-2 -mr-2">
          <form onSubmit={handleSubmit} className="space-y-4 pb-4">
            {/* Agent Name */}
            <ValidatedInput
              label="Agent Name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              onBlur={() => handleFieldBlur('name')}
              placeholder="Enter agent name"
              maxLength={50}
              showCharCount
              required
              error={validationErrors.name}
              touched={touchedFields.name}
              disabled={isSubmitting || creating || updating}
              description="Choose a descriptive name for your AI agent"
            />

            {/* Agent Type */}
            <ValidatedSelect
              label="Agent Type"
              value={formData.type}
              onValueChange={(value) => handleInputChange('type', value)}
              onBlur={() => handleFieldBlur('type')}
              error={validationErrors.type}
              touched={touchedFields.type}
              required
              disabled={isSubmitting || creating || updating}
              description="Choose how your agent will interact with customers"
            >
              <SelectItem value="CallAgent">Call Agent</SelectItem>
              <SelectItem value="ChatAgent">Chat Agent</SelectItem>
            </ValidatedSelect>

            {/* Language */}
            <ValidatedSelect
              label="Language"
              value={formData.language}
              onValueChange={(value) => handleInputChange('language', value)}
              onBlur={() => handleFieldBlur('language')}
              error={validationErrors.language}
              touched={touchedFields.language}
              required
              disabled={isSubmitting || creating || updating}
              description="Primary language for agent interactions"
            >
              <SelectItem value="English">English</SelectItem>
              <SelectItem value="Spanish">Spanish</SelectItem>
              <SelectItem value="French">French</SelectItem>
              <SelectItem value="German">German</SelectItem>
              <SelectItem value="Italian">Italian</SelectItem>
            </ValidatedSelect>

            {/* Voice Selection (only for Call Agents) */}
            {formData.type === 'CallAgent' && (
              <ValidatedSelect
                label="Voice"
                value={formData.voiceId || undefined}
                onValueChange={(value) => handleInputChange('voiceId', value)}
                onBlur={() => handleFieldBlur('voiceId')}
                placeholder={voices.length === 0 ? "Loading voices..." : "Select a voice"}
                error={validationErrors.voiceId}
                touched={touchedFields.voiceId}
                required
                disabled={voices.length === 0 || isSubmitting || creating || updating}
                description={voices.length === 0 ? "Loading available voices..." : "Choose the voice for your call agent"}
              >
                {voices.map((voice) => (
                  <SelectItem key={voice.voice_id} value={voice.voice_id}>
                    {voice.name} ({voice.category})
                  </SelectItem>
                ))}
              </ValidatedSelect>
            )}

            {/* Model */}
            <ValidatedSelect
              label="AI Model"
              value={formData.model}
              onValueChange={(value) => handleInputChange('model', value)}
              disabled={isSubmitting || creating || updating}
              description="Choose the AI model that powers your agent"
            >
              <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
              <SelectItem value="gpt-4o">GPT-4o</SelectItem>
              <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
            </ValidatedSelect>

            {/* Description */}
            <ValidatedTextarea
              label="Description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              onBlur={() => handleFieldBlur('description')}
              placeholder="Describe what this agent does..."
              maxLength={200}
              showCharCount
              rows={3}
              error={validationErrors.description}
              touched={touchedFields.description}
              disabled={isSubmitting || creating || updating}
              description="Optional description to help you identify this agent"
            />

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <div className="text-sm text-red-600">
                  {error}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting || creating || updating}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || creating || updating}
                className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50"
              >
                {isSubmitting || creating || updating ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {editAgent ? 'Updating...' : 'Creating...'}
                  </div>
                ) : (
                  editAgent ? 'Update Agent' : 'Create Agent'
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default CreateAgentModal;