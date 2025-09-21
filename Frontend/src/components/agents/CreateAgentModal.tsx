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

// Default data collection description for agent creation
const DEFAULT_DATA_COLLECTION_DESCRIPTION = "You are an AI lead evaluation system.   Your job: Analyze the full conversation history (in any language) and return a **single JSON object** with lead evaluation scores, reasoning, and extracted details.    Follow these strict steps:  ---  ### 1. Language Handling - Detect all languages in the conversation.   - If any part is in Hindi, Hinglish, or non-English → internally translate into English before applying rules.   - Use the English-translated text for evaluation.    ---  ### 2. Intent Recognition Intent = Why the lead is speaking with the AI.    - **Low Intent (1 point):**     Exploratory, background info only. No pricing/demo asks. Keywords: \"overview,\" \"high-level,\" \"curious,\" \"What does this do?\"    - **Medium Intent (2 points):**     Evaluating features, costs, integrations. Comparing vendors but not booking demo. Keywords: \"pricing,\" \"API support,\" \"integrates with Salesforce,\" \"limitations,\" \"trial?\"    - **High Intent (3 points):**     Ready for next step: demo, quote, contract, or implementation timeline. Keywords: \"Can I get a demo,\" \"Send me a quote,\" \"We're ready to sign,\" \"Book a call.\"    ---  ### 3. Urgency (How quickly they want problem solved) - **Low (1 point):** Researching/benchmarking, no timeline. Keywords: \"maybe next year,\" \"just exploring,\" \"future project.\"   - **Medium (2 points):** Clear problem, but planning for next month/quarter. Keywords: \"on roadmap,\" \"by Q2,\" \"end of month.\"   - **High (3 points):** Blocking issue, urgent deadlines, or lost revenue. Keywords: \"critical,\" \"urgent,\" \"mission-critical,\" \"blocking launch,\" \"we're losing customers.\"    ---  ### 4. Budget Constraint - **Yes (Constrained, 1 point):** Cost is a blocker. Keywords: \"free version,\" \"too expensive,\" \"not in our budget,\" \"we can't afford.\"   - **Maybe (Not sure, 2 points):** Asked about pricing, but no clear objection/approval. Default if budget not discussed.   - **No (Unconstrained, 3 points):** No cost concerns OR explicitly says budget approved. Keywords: \"fits our budget,\" \"we have funding,\" \"go ahead.\"    ---  ### 5. Fit Alignment - **Low (1 point):** Needs outside SniperThink scope (e.g., influencer marketing, social listening, no-code email builder).   - **Medium (2 points):** Partial overlap with extra needs (CRM integration, email sequences, funnel analytics).   - **High (3 points):** Direct match with SniperThink strengths (AI-driven lead scoring, automated qualification, MQL → SQL conversion).    ---  ### 6. Engagement Health - **Low (1 point):** 1–2 msgs/day, no CTA clicks, >12 hr response gap.   - **Medium (2 points):** 3–4 msgs/day, 1 CTA click, reply in 4–12 hrs.   - **High (3 points):** ≥5 msgs/day, ≥2 CTA clicks, reply <4 hrs, enthusiastic tone.    ---  ### 7. CTA Detection Rules Mark CTA fields as \\\"Yes\\\" or \\\"No\\\".   - **Pricing CTA:** Lead asks cost, budget numbers, or tier comparisons.   - **Demo CTA:** Lead asks for demo, trial, or hands-on test.   - **Follow-Up CTA:** Lead requests reminder, future contact, or materials to review later.   - **Sample CTA:** Lead asks for case study, whitepaper, sandbox account, or recorded session.   - **Escalation CTA:** Lead asks to speak to a human, sales rep, or expresses bot frustration.   - **Website CTA:** Lead requests website link, mentions content found there, or self-browses features/pricing pages.    ---  ### 8. Scoring & Thresholds - **Total Score = sum of Intent + Urgency + Budget + Fit + Engagement**   - Max possible = 15 points.   - Cap **total_score at 9** if: fewer than 3 replies OR no demo/follow-up CTA clicked.    **Lead Status Tag (based on total_score):**   - **Cold:** 5–8 points   - **Warm:** 9–11 points   - **Hot:** 12–15 points    ---  ### 9. Meeting Extraction (updated — timezone-aware) - Locate the `book_meeting` tool call in the conversation. If found, extract the date/time value(s) from that tool call. - Parse the extracted timestamp in a timezone-aware manner:   - If the `book_meeting` payload includes an explicit timezone or timezone offset (e.g., \\\"2025-09-18T11:30:00Z\\\" or \\\"2025-09-18T17:00:00+05:30\\\"), parse accordingly.   - If the `book_meeting` payload gives a local time **without** timezone (e.g., \\\"Sep 18, 2025 5:00 PM\\\"), assume the user's timezone is **Asia/Kolkata (UTC+05:30)** and parse as that local time. - **Output requirement for the JSON field `demo_book_datetime`:**   - Return a single ISO 8601 timestamp **in the user's local timezone with offset**, formatted like `YYYY-MM-DDTHH:MM:SS+05:30` (for Asia/Kolkata). Example: `\\\"2025-09-18T17:00:00+05:30\\\".   - Implementation rules:     - If the tool call provided a timezone-aware timestamp (any zone), convert it to **Asia/Kolkata** and output it with `+05:30` offset.     - If the tool call provided a UTC timestamp (`...Z`), convert it to Asia/Kolkata and output with `+05:30`.     - If the tool call provided a local time with no tz, treat it as Asia/Kolkata and output with `+05:30`. - If **no** `book_meeting` tool call exists or no parsable datetime is present, set `\\\"demo_book_datetime\\\": null`. - Examples:   - Input in tool call: `\\\"2025-09-18T11:30:00Z\\\"` → Output: `\\\"2025-09-18T17:00:00+05:30\\\".   - Input in tool call: `\\\"2025-09-18T17:00:00+05:30\\\"` → Output: `\\\"2025-09-18T17:00:00+05:30\\\".   - Input in tool call: `\\\"Sep 18, 2025 5:00 PM\\\"` (no tz) → treat as Asia/Kolkata → Output: `\\\"2025-09-18T17:00:00+05:30\\\". - Edge cases:   - If multiple `book_meeting` calls exist, use the one from the **most recent** tool call.   - If the timestamp is ambiguous (e.g., only a date, no time), return `null` (do not guess a time). - Do NOT ask clarifying questions; apply the above defaults automatically.   ---  ### 10. Smart Notification - Create a **short 4–5 word summary** of overall user interaction.   - Personalized (use extracted name if available).   - Examples:     - `\\\"Siddhant booked a meeting\\\"`     - `\\\"Shrey asked about pricing\\\"`     - `\\\"Priyanka confused about pricing\\\"`     - `\\\"Raj exploring technical queries\\\"`    ---  ### 11. Output JSON Format Always return this exact structure (no extra fields, no missing fields):  ###12.Rule Critical Reasoning: Be concise (≤10 words per category). Enough to justify score, no fluff. Output: Strict JSON only, ≤900 chars total. No extra text.  {   \\\"intent_level\\\": \\\"Low\\\",   \\\"intent_score\\\": 1,   \\\"urgency_level\\\": \\\"Low\\\",   \\\"urgency_score\\\": 1,   \\\"budget_constraint\\\": \\\"Maybe\\\",   \\\"budget_score\\\": 2,   \\\"fit_alignment\\\": \\\"Medium\\\",   \\\"fit_score\\\": 2,   \\\"engagement_health\\\": \\\"Medium\\\",   \\\"engagement_score\\\": 2,   \\\"cta_pricing_clicked\\\": \\\"No\\\",   \\\"cta_demo_clicked\\\": \\\"No\\\",   \\\"cta_followup_clicked\\\": \\\"No\\\",   \\\"cta_sample_clicked\\\": \\\"No\\\",   \\\"cta_website_clicked\\\": \\\"No\\\",   \\\"cta_escalated_to_human\\\": \\\"No\\\",   \\\"total_score\\\": 7,   \\\"lead_status_tag\\\": \\\"Cold\\\",   \\\"demo_book_datetime\\\": null,   \\\"reasoning\\\": {     \\\"intent\\\": \\\"Reasoning here\\\",     \\\"urgency\\\": \\\"Reasoning here\\\",     \\\"budget\\\": \\\"Reasoning here\\\",     \\\"fit\\\": \\\"Reasoning here\\\",     \\\"engagement\\\": \\\"Reasoning here\\\",     \\\"cta_behavior\\\": \\\"Reasoning here\\\"   },   \\\"extraction\\\": {     \\\"name\\\": null,     \\\"email_address\\\": null,     \\\"company_name\\\": null,     \\\"smartnotification\\\": \\\"Short 4–5 word summary\\\"   } }  ---"

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
    dataCollectionDescription: DEFAULT_DATA_COLLECTION_DESCRIPTION,
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
          dataCollectionDescription: DEFAULT_DATA_COLLECTION_DESCRIPTION,
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
          dataCollectionDescription: DEFAULT_DATA_COLLECTION_DESCRIPTION,
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
      description: true,
      dataCollectionDescription: true
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
          data_collection: {
            default: {
              type: 'string',
              description: formData.dataCollectionDescription
            }
          }
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
          data_collection: {
            default: {
              type: 'string',
              description: formData.dataCollectionDescription
            }
          }
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

            {/* Data Collection Description */}
            <ValidatedTextarea
              label="Data Collection Description"
              value={formData.dataCollectionDescription}
              onChange={(e) => handleInputChange('dataCollectionDescription', e.target.value)}
              onBlur={() => handleFieldBlur('dataCollectionDescription')}
              placeholder="Enter the data collection evaluation instructions for the agent"
              rows={8}
              error={validationErrors.dataCollectionDescription}
              touched={touchedFields.dataCollectionDescription}
              disabled={isSubmitting || creating || updating}
              description="Instructions for how the agent should evaluate and collect lead data from conversations"
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