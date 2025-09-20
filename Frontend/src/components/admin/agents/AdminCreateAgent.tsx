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