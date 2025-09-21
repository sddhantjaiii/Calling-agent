import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ValidatedInput, ValidatedTextarea } from '@/components/ui/ValidatedInput';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAdmin } from '@/contexts/AdminContext';
import { adminApiService } from '@/services/adminApiService';
import { validateForm, validateField, validationSchemas } from '@/utils/formValidation';
import { 
  createFormValidationHandler, 
  mergeValidationErrors,
  FORM_FIELD_MAPPINGS
} from '@/utils/serverValidationHandler';
import { Bot, Users, Save, X } from 'lucide-react';

// Default data collection description for agent creation
const DEFAULT_DATA_COLLECTION_DESCRIPTION = "You are an AI lead evaluation system.   Your job: Analyze the full conversation history (in any language) and return a **single JSON object** with lead evaluation scores, reasoning, and extracted details.    Follow these strict steps:  ---  ### 1. Language Handling - Detect all languages in the conversation.   - If any part is in Hindi, Hinglish, or non-English → internally translate into English before applying rules.   - Use the English-translated text for evaluation.    ---  ### 2. Intent Recognition Intent = Why the lead is speaking with the AI.    - **Low Intent (1 point):**     Exploratory, background info only. No pricing/demo asks. Keywords: \"overview,\" \"high-level,\" \"curious,\" \"What does this do?\"    - **Medium Intent (2 points):**     Evaluating features, costs, integrations. Comparing vendors but not booking demo. Keywords: \"pricing,\" \"API support,\" \"integrates with Salesforce,\" \"limitations,\" \"trial?\"    - **High Intent (3 points):**     Ready for next step: demo, quote, contract, or implementation timeline. Keywords: \"Can I get a demo,\" \"Send me a quote,\" \"We're ready to sign,\" \"Book a call.\"    ---  ### 3. Urgency (How quickly they want problem solved) - **Low (1 point):** Researching/benchmarking, no timeline. Keywords: \"maybe next year,\" \"just exploring,\" \"future project.\"   - **Medium (2 points):** Clear problem, but planning for next month/quarter. Keywords: \"on roadmap,\" \"by Q2,\" \"end of month.\"   - **High (3 points):** Blocking issue, urgent deadlines, or lost revenue. Keywords: \"critical,\" \"urgent,\" \"mission-critical,\" \"blocking launch,\" \"we're losing customers.\"    ---  ### 4. Budget Constraint - **Yes (Constrained, 1 point):** Cost is a blocker. Keywords: \"free version,\" \"too expensive,\" \"not in our budget,\" \"we can't afford.\"   - **Maybe (Not sure, 2 points):** Asked about pricing, but no clear objection/approval. Default if budget not discussed.   - **No (Unconstrained, 3 points):** No cost concerns OR explicitly says budget approved. Keywords: \"fits our budget,\" \"we have funding,\" \"go ahead.\"    ---  ### 5. Fit Alignment - **Low (1 point):** Needs outside SniperThink scope (e.g., influencer marketing, social listening, no-code email builder).   - **Medium (2 points):** Partial overlap with extra needs (CRM integration, email sequences, funnel analytics).   - **High (3 points):** Direct match with SniperThink strengths (AI-driven lead scoring, automated qualification, MQL → SQL conversion).    ---  ### 6. Engagement Health - **Low (1 point):** 1–2 msgs/day, no CTA clicks, >12 hr response gap.   - **Medium (2 points):** 3–4 msgs/day, 1 CTA click, reply in 4–12 hrs.   - **High (3 points):** ≥5 msgs/day, ≥2 CTA clicks, reply <4 hrs, enthusiastic tone.    ---  ### 7. CTA Detection Rules Mark CTA fields as \\\"Yes\\\" or \\\"No\\\".   - **Pricing CTA:** Lead asks cost, budget numbers, or tier comparisons.   - **Demo CTA:** Lead asks for demo, trial, or hands-on test.   - **Follow-Up CTA:** Lead requests reminder, future contact, or materials to review later.   - **Sample CTA:** Lead asks for case study, whitepaper, sandbox account, or recorded session.   - **Escalation CTA:** Lead asks to speak to a human, sales rep, or expresses bot frustration.   - **Website CTA:** Lead requests website link, mentions content found there, or self-browses features/pricing pages.    ---  ### 8. Scoring & Thresholds - **Total Score = sum of Intent + Urgency + Budget + Fit + Engagement**   - Max possible = 15 points.   - Cap **total_score at 9** if: fewer than 3 replies OR no demo/follow-up CTA clicked.    **Lead Status Tag (based on total_score):**   - **Cold:** 5–8 points   - **Warm:** 9–11 points   - **Hot:** 12–15 points    ---  ### 9. Meeting Extraction (updated — timezone-aware) - Locate the `book_meeting` tool call in the conversation. If found, extract the date/time value(s) from that tool call. - Parse the extracted timestamp in a timezone-aware manner:   - If the `book_meeting` payload includes an explicit timezone or timezone offset (e.g., \\\"2025-09-18T11:30:00Z\\\" or \\\"2025-09-18T17:00:00+05:30\\\"), parse accordingly.   - If the `book_meeting` payload gives a local time **without** timezone (e.g., \\\"Sep 18, 2025 5:00 PM\\\"), assume the user's timezone is **Asia/Kolkata (UTC+05:30)** and parse as that local time. - **Output requirement for the JSON field `demo_book_datetime`:**   - Return a single ISO 8601 timestamp **in the user's local timezone with offset**, formatted like `YYYY-MM-DDTHH:MM:SS+05:30` (for Asia/Kolkata). Example: `\\\"2025-09-18T17:00:00+05:30\\\".   - Implementation rules:     - If the tool call provided a timezone-aware timestamp (any zone), convert it to **Asia/Kolkata** and output it with `+05:30` offset.     - If the tool call provided a UTC timestamp (`...Z`), convert it to Asia/Kolkata and output with `+05:30`.     - If the tool call provided a local time with no tz, treat it as Asia/Kolkata and output with `+05:30`. - If **no** `book_meeting` tool call exists or no parsable datetime is present, set `\\\"demo_book_datetime\\\": null`. - Examples:   - Input in tool call: `\\\"2025-09-18T11:30:00Z\\\"` → Output: `\\\"2025-09-18T17:00:00+05:30\\\".   - Input in tool call: `\\\"2025-09-18T17:00:00+05:30\\\"` → Output: `\\\"2025-09-18T17:00:00+05:30\\\".   - Input in tool call: `\\\"Sep 18, 2025 5:00 PM\\\"` (no tz) → treat as Asia/Kolkata → Output: `\\\"2025-09-18T17:00:00+05:30\\\". - Edge cases:   - If multiple `book_meeting` calls exist, use the one from the **most recent** tool call.   - If the timestamp is ambiguous (e.g., only a date, no time), return `null` (do not guess a time). - Do NOT ask clarifying questions; apply the above defaults automatically.   ---  ### 10. Smart Notification - Create a **short 4–5 word summary** of overall user interaction.   - Personalized (use extracted name if available).   - Examples:     - `\\\"Siddhant booked a meeting\\\"`     - `\\\"Shrey asked about pricing\\\"`     - `\\\"Priyanka confused about pricing\\\"`     - `\\\"Raj exploring technical queries\\\"`    ---  ### 11. Output JSON Format Always return this exact structure (no extra fields, no missing fields):  ###12.Rule Critical Reasoning: Be concise (≤10 words per category). Enough to justify score, no fluff. Output: Strict JSON only, ≤900 chars total. No extra text.  {   \\\"intent_level\\\": \\\"Low\\\",   \\\"intent_score\\\": 1,   \\\"urgency_level\\\": \\\"Low\\\",   \\\"urgency_score\\\": 1,   \\\"budget_constraint\\\": \\\"Maybe\\\",   \\\"budget_score\\\": 2,   \\\"fit_alignment\\\": \\\"Medium\\\",   \\\"fit_score\\\": 2,   \\\"engagement_health\\\": \\\"Medium\\\",   \\\"engagement_score\\\": 2,   \\\"cta_pricing_clicked\\\": \\\"No\\\",   \\\"cta_demo_clicked\\\": \\\"No\\\",   \\\"cta_followup_clicked\\\": \\\"No\\\",   \\\"cta_sample_clicked\\\": \\\"No\\\",   \\\"cta_website_clicked\\\": \\\"No\\\",   \\\"cta_escalated_to_human\\\": \\\"No\\\",   \\\"total_score\\\": 7,   \\\"lead_status_tag\\\": \\\"Cold\\\",   \\\"demo_book_datetime\\\": null,   \\\"reasoning\\\": {     \\\"intent\\\": \\\"Reasoning here\\\",     \\\"urgency\\\": \\\"Reasoning here\\\",     \\\"budget\\\": \\\"Reasoning here\\\",     \\\"fit\\\": \\\"Reasoning here\\\",     \\\"engagement\\\": \\\"Reasoning here\\\",     \\\"cta_behavior\\\": \\\"Reasoning here\\\"   },   \\\"extraction\\\": {     \\\"name\\\": null,     \\\"email_address\\\": null,     \\\"company_name\\\": null,     \\\"smartnotification\\\": \\\"Short 4–5 word summary\\\"   } }  ---";

interface AdminCreateAgentProps {
  onAgentCreated?: () => void;
  preselectedUserId?: string;
}

export default function AdminCreateAgent({ onAgentCreated, preselectedUserId }: AdminCreateAgentProps) {
  const { user: adminUser, isLoading: adminLoading, error: adminError } = useAdmin();
  
  // Debug logging
  console.log('AdminCreateAgent - Admin User:', adminUser);
  console.log('AdminCreateAgent - Admin Loading:', adminLoading);
  console.log('AdminCreateAgent - Admin Error:', adminError);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    voice: '',
    prompt: '',
    language: 'en',
    model: 'gpt-4o-mini',
    userId: preselectedUserId || '',
    dataCollectionDescription: DEFAULT_DATA_COLLECTION_DESCRIPTION,
  });

  const [users, setUsers] = useState<Array<{ id: string; email: string; name: string }>>([]);
  const [voices, setVoices] = useState<Array<{ id: string; name: string }>>([]);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Merge client and server errors (server errors take precedence)
  const validationErrors = mergeValidationErrors(clientErrors, serverErrors);

  // Create server validation handler for this form
  const handleServerValidation = createFormValidationHandler(
    setServerErrors,
    FORM_FIELD_MAPPINGS.agent,
    {
      showToast: true,
      toastTitle: 'Agent Creation Failed',
    }
  );

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setIsLoadingData(true);
        
        // Load users and voices in parallel
        const [usersResponse, voicesResponse] = await Promise.all([
          adminApiService.getUsers({ limit: 1000 }), // Load all users for assignment
          adminApiService.getVoices() // Assuming this exists or we'll create it
        ]);

        // Handle users response - check if it's paginated or direct array
        if (usersResponse?.data) {
          let usersData: any[] = [];
          
          // Handle PaginatedResponse structure (data.users array) - the actual API returns a nested structure
          const responseData = usersResponse.data as any;
          if (responseData.users && Array.isArray(responseData.users)) {
            usersData = responseData.users;
          }
          // Check if it's a paginated response with items array
          else if (responseData.items && Array.isArray(responseData.items)) {
            usersData = responseData.items;
          } 
          // Check if it's directly an array
          else if (Array.isArray(responseData)) {
            usersData = responseData;
          }
          // Check if it's a single object with data property
          else if (responseData.data && Array.isArray(responseData.data)) {
            usersData = responseData.data;
          }
          
          setUsers(usersData.map((user: any) => ({
            id: user.id,
            email: user.email,
            name: user.name || user.email
          })));
        }

        // Handle voices response
        if (voicesResponse?.data) {
          let voicesData: any[] = [];
          
          // Check if it's a direct array
          if (Array.isArray(voicesResponse.data)) {
            voicesData = voicesResponse.data;
          }
          // Check if it's nested in a data property
          else {
            const responseData = voicesResponse.data as any;
            if (responseData.data && Array.isArray(responseData.data)) {
              voicesData = responseData.data;
            }
            // Check if it's a paginated response with items array
            else if (responseData.items && Array.isArray(responseData.items)) {
              voicesData = responseData.items;
            }
          }
          
          setVoices(voicesData.map((voice: any) => ({
            id: voice.voice_id || voice.id,
            name: voice.name
          })));
        }
      } catch (error: any) {
        console.error('Failed to load initial data:', error);
        toast.error('Failed to load data', {
          description: error.message || 'An error occurred while loading users and voices'
        });
      } finally {
        setIsLoadingData(false);
      }
    };

    loadInitialData();
  }, []);

  const handleFieldChange = (field: string, value: string) => {
    // Clear server errors for this field when user starts typing
    if (serverErrors[field]) {
      setServerErrors(prev => {
        const { [field]: _, ...rest } = prev;
        return rest;
      });
    }

    setFormData(prev => ({ ...prev, [field]: value }));
    setTouchedFields(prev => ({ ...prev, [field]: true }));

    // Perform client-side validation
    const rules = validationSchemas.agent[field];
    if (rules) {
      const result = validateField(value, rules, field);
      setClientErrors(prev => ({ ...prev, [field]: result.error || '' }));
    }
  };

  const handleInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    handleFieldChange(field, e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all fields
    const { isValid, errors } = validateForm(formData, validationSchemas.agent);
    setClientErrors(errors);
    setTouchedFields(Object.keys(formData).reduce((acc, key) => ({ ...acc, [key]: true }), {}));

    if (!isValid) {
      toast.error('Please fix the validation errors');
      return;
    }

    // Check if admin user is available, otherwise use a fallback
    let userId = adminUser?.id;
    if (!userId) {
      console.warn('Admin user not available, using fallback approach');
      // Try to get user from localStorage or use a default admin user ID
      const authToken = localStorage.getItem('auth_token');
      if (!authToken) {
        toast.error('Authentication required', {
          description: 'Please log in to create agents'
        });
        return;
      }
      
      // For now, let's use the selected user ID or create as unassigned
      userId = formData.userId || 'admin-fallback';
    }

    setIsSubmitting(true);

    try {
      // Prepare agent data in the format expected by the backend
      const agentData = {
        name: formData.name,
        description: formData.description,
        system_prompt: formData.prompt,
        language: formData.language,
        type: 'CallAgent', // Default to CallAgent
        voice_id: formData.voice,
        llm: {
          model: formData.model,
          temperature: 0.7,
          max_tokens: 4000
        },
        tts: {
          voice_id: formData.voice,
          model: 'eleven_turbo_v2_5',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.8,
            style: 0.2,
            use_speaker_boost: true
          }
        },
        data_collection: {
          default: {
            type: 'string',
            description: formData.dataCollectionDescription
          }
        }
      };

      // Handle user assignment
      const assignToUserId = formData.userId !== 'none' ? formData.userId : undefined;

      console.log('Creating agent with data:', { agentData, assignToUserId });
      
      const response = await adminApiService.createAgent({
        ...agentData,
        assignToUserId
      });
      
      if (response.success) {
        toast.success('Agent created successfully', {
          description: `${agentData.name} has been created and ${assignToUserId ? 'assigned to user' : 'is available for assignment'}.`
        });
        
        // Reset form
        setFormData({
          name: '',
          description: '',
          voice: '',
          prompt: '',
          language: 'en',
          model: 'gpt-4o-mini',
          userId: preselectedUserId || '',
          dataCollectionDescription: DEFAULT_DATA_COLLECTION_DESCRIPTION,
        });
        setClientErrors({});
        setServerErrors({});
        setTouchedFields({});
        
        onAgentCreated?.();
      } else {
        throw new Error(response.error?.message || 'Failed to create agent');
      }
    } catch (error: any) {
      console.error('Agent creation error:', error);
      
      // Handle server validation errors
      if (error.response?.status === 400 && error.response?.data?.validationErrors) {
        handleServerValidation(error);
      } else {
        toast.error('Failed to create agent', {
          description: error.message || 'An unexpected error occurred'
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingData || adminLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Create New Agent
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">
                {adminLoading ? 'Loading admin information...' : 'Loading data...'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (adminError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Create New Agent
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <p className="text-sm text-destructive mb-2">Admin access error</p>
              <p className="text-xs text-muted-foreground">{adminError}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          Create New Agent
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <ValidatedInput
                label="Agent Name"
                name="name"
                value={formData.name}
                onChange={handleInputChange('name')}
                error={validationErrors.name}
                touched={touchedFields.name}
                placeholder="Enter agent name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="user-select">Assign to User (Optional)</Label>
              <Select value={formData.userId || 'unassigned'} onValueChange={(value) => handleFieldChange('userId', value === 'unassigned' ? '' : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a user (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">No assignment (admin managed)</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>{user.name} ({user.email})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <ValidatedTextarea
              label="Description"
              name="description"
              value={formData.description}
              onChange={handleInputChange('description')}
              error={validationErrors.description}
              touched={touchedFields.description}
              placeholder="Describe what this agent does"
              rows={3}
            />
          </div>

          {/* Voice and Language Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="voice-select">Voice</Label>
              <Select value={formData.voice} onValueChange={(value) => handleFieldChange('voice', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a voice" />
                </SelectTrigger>
                <SelectContent>
                  {voices.map((voice) => (
                    <SelectItem key={voice.id} value={voice.id}>
                      {voice.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {validationErrors.voice && touchedFields.voice && (
                <p className="text-sm text-destructive">{validationErrors.voice}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="language-select">Language</Label>
              <Select value={formData.language} onValueChange={(value) => handleFieldChange('language', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                  <SelectItem value="it">Italian</SelectItem>
                  <SelectItem value="pt">Portuguese</SelectItem>
                  <SelectItem value="pl">Polish</SelectItem>
                  <SelectItem value="tr">Turkish</SelectItem>
                  <SelectItem value="ru">Russian</SelectItem>
                  <SelectItem value="nl">Dutch</SelectItem>
                  <SelectItem value="cs">Czech</SelectItem>
                  <SelectItem value="ar">Arabic</SelectItem>
                  <SelectItem value="zh">Chinese</SelectItem>
                  <SelectItem value="ja">Japanese</SelectItem>
                  <SelectItem value="hu">Hungarian</SelectItem>
                  <SelectItem value="ko">Korean</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Model Selection */}
          <div className="space-y-2">
            <Label htmlFor="model-select">AI Model</Label>
            <Select value={formData.model} onValueChange={(value) => handleFieldChange('model', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select AI model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* System Prompt */}
          <div className="space-y-2">
            <ValidatedTextarea
              label="System Prompt"
              name="prompt"
              value={formData.prompt}
              onChange={handleInputChange('prompt')}
              error={validationErrors.prompt}
              touched={touchedFields.prompt}
              placeholder="Enter the system prompt that defines the agent's behavior and personality"
              rows={6}
              required
            />
          </div>

          {/* Data Collection Description */}
          <div className="space-y-2">
            <ValidatedTextarea
              label="Data Collection Description"
              name="dataCollectionDescription"
              value={formData.dataCollectionDescription}
              onChange={handleInputChange('dataCollectionDescription')}
              error={validationErrors.dataCollectionDescription}
              touched={touchedFields.dataCollectionDescription}
              placeholder="Enter the data collection evaluation instructions for the agent"
              rows={8}
              description="This defines how the agent will evaluate and score conversations. You can edit or clear this field as needed."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setFormData({
                  name: '',
                  description: '',
                  voice: '',
                  prompt: '',
                  language: 'en',
                  model: 'gpt-4o-mini',
                  userId: preselectedUserId || '',
                  dataCollectionDescription: DEFAULT_DATA_COLLECTION_DESCRIPTION,
                });
                setClientErrors({});
                setServerErrors({});
                setTouchedFields({});
              }}
              disabled={isSubmitting}
            >
              <X className="h-4 w-4 mr-2" />
              Clear
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Create Agent
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}