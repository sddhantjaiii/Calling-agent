import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ValidatedInput, ValidatedTextarea } from '@/components/ui/ValidatedInput';
import { PhoneNumberInput } from '@/components/ui/PhoneNumberInput';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { useContacts } from '@/hooks/useContacts';
import { useSuccessFeedback } from '@/contexts/SuccessFeedbackContext';
import { validateForm, validateField, validationSchemas } from '@/utils/formValidation';
import { 
  createFormValidationHandler,
  mergeValidationErrors,
  FORM_FIELD_MAPPINGS 
} from '@/utils/serverValidationHandler';
import type { Contact, CreateContactRequest, UpdateContactRequest } from '@/types';

interface ContactFormProps {
  isOpen: boolean;
  onClose: () => void;
  contact?: Contact | null; // null for create, Contact for edit
  onSuccess?: (contact: Contact) => void;
}

export const ContactForm: React.FC<ContactFormProps> = ({
  isOpen,
  onClose,
  contact,
  onSuccess,
}) => {
  const { toast } = useToast();
  const { createContact, updateContact, creating, updating } = useContacts();
  const { showSuccess } = useSuccessFeedback();
  
  const [formData, setFormData] = useState({
    name: '',
    phoneNumber: '',
    email: '',
    company: '',
    notes: '',
  });
  
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const isEditing = !!contact;
  const isLoading = creating || updating;

  // Merge client and server errors (server errors take precedence)
  const errors = mergeValidationErrors(clientErrors, serverErrors);

  // Create server validation handler for this form
  const handleServerValidation = createFormValidationHandler(
    setServerErrors,
    FORM_FIELD_MAPPINGS.contact,
    {
      showToast: true,
      toastTitle: isEditing ? 'Update Failed' : 'Creation Failed',
    }
  );

  // Reset form when dialog opens/closes or contact changes
  useEffect(() => {
    if (isOpen) {
      if (contact) {
        // Editing existing contact
        setFormData({
          name: contact.name,
          phoneNumber: contact.phoneNumber,
          email: contact.email || '',
          company: contact.company || '',
          notes: contact.notes || '',
        });
      } else {
        // Creating new contact - set default country code to India (+91)
        setFormData({
          name: '',
          phoneNumber: '+91 ',
          email: '',
          company: '',
          notes: '',
        });
      }
      setClientErrors({});
      setServerErrors({});
      setTouchedFields({});
    }
  }, [isOpen, contact]);

  const validateFormData = (): boolean => {
    const result = validateForm(formData, validationSchemas.contact);
    setClientErrors(result.errors);
    
    // Clear server errors when doing client validation
    setServerErrors({});
    
    // Mark all fields as touched
    setTouchedFields({
      name: true,
      phoneNumber: true,
      email: true,
      company: true,
      notes: true
    });
    
    return result.isValid;
  };

  const handleFieldBlur = (field: string) => {
    setTouchedFields(prev => ({ ...prev, [field]: true }));
    
    // Validate individual field
    const schema = validationSchemas.contact;
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

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear both client and server errors for this field when user starts typing
    if (clientErrors[field]) {
      setClientErrors(prev => ({ ...prev, [field]: '' }));
    }
    if (serverErrors[field]) {
      setServerErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateFormData()) {
      return;
    }

    try {
      let result: Contact | null = null;

      if (isEditing && contact) {
        // Update existing contact
        const updateData: UpdateContactRequest = {
          name: formData.name.trim(),
          phoneNumber: formData.phoneNumber.trim(),
          email: formData.email.trim() || undefined,
          company: formData.company.trim() || undefined,
          notes: formData.notes.trim() || undefined,
        };
        
        result = await updateContact(contact.id, updateData);
      } else {
        // Create new contact
        const createData: CreateContactRequest = {
          name: formData.name.trim(),
          phoneNumber: formData.phoneNumber.trim(),
          email: formData.email.trim() || undefined,
          company: formData.company.trim() || undefined,
          notes: formData.notes.trim() || undefined,
        };
        
        result = await createContact(createData);
      }

      if (result) {
        if (isEditing) {
          showSuccess.contact.updated(result.name, {
            description: 'Contact information has been saved',
            action: {
              label: 'View Contact',
              onClick: () => {
                onSuccess?.(result);
              },
            },
          });
        } else {
          showSuccess.contact.created(result.name, {
            description: 'Contact is now available for campaigns',
            action: {
              label: 'Add Another',
              onClick: () => {
                // Reset form for adding another contact
                setFormData({
                  name: '',
                  phoneNumber: '',
                  email: '',
                  company: '',
                  notes: '',
                });
                setClientErrors({});
                setServerErrors({});
              },
            },
          });
        }
        
        onSuccess?.(result);
        onClose();
      }
    } catch (error: unknown) {
      console.error('Error saving contact:', error);
      
      // Try to handle as server validation error first
      const wasValidationError = handleServerValidation(error);
      
      if (!wasValidationError) {
        // Handle other specific error types
        const errorObj = error as any;
        
        if (errorObj?.code === 'CONFLICT') {
          // Handle duplicate phone number error
          setServerErrors({ phoneNumber: 'A contact with this phone number already exists' });
          
          toast({
            title: 'Duplicate Contact',
            description: 'A contact with this phone number already exists.',
            variant: 'destructive',
          });
        } else if (errorObj?.code === 'UNAUTHORIZED') {
          toast({
            title: 'Session Expired',
            description: 'Please log in again to continue.',
            variant: 'destructive',
          });
        } else if (errorObj?.code === 'NETWORK_ERROR') {
          toast({
            title: 'Network Error',
            description: 'Please check your internet connection and try again.',
            variant: 'destructive',
          });
        } else {
          // Generic error handling
          toast({
            title: 'Error',
            description: errorObj?.message || `Failed to ${isEditing ? 'update' : 'create'} contact. Please try again.`,
            variant: 'destructive',
          });
        }
      }
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Contact' : 'Add New Contact'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <ValidatedInput
            label="Name"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            onBlur={() => handleFieldBlur('name')}
            placeholder="Enter contact name"
            disabled={isLoading}
            error={errors.name}
            touched={touchedFields.name}
            required
            maxLength={100}
            showCharCount
            description="Full name of the contact person"
          />

          <PhoneNumberInput
            label="Phone Number"
            value={formData.phoneNumber}
            onChange={(value) => handleInputChange('phoneNumber', value)}
            onBlur={() => handleFieldBlur('phoneNumber')}
            placeholder="Enter phone number"
            disabled={isLoading}
            error={errors.phoneNumber}
            touched={touchedFields.phoneNumber}
            required
            description="Phone number with country code"
          />

          <ValidatedInput
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            onBlur={() => handleFieldBlur('email')}
            placeholder="Enter email address (optional)"
            disabled={isLoading}
            error={errors.email}
            touched={touchedFields.email}
            maxLength={255}
            description="Optional email address for this contact"
          />

          <ValidatedInput
            label="Company"
            value={formData.company}
            onChange={(e) => handleInputChange('company', e.target.value)}
            onBlur={() => handleFieldBlur('company')}
            placeholder="Enter company name (optional)"
            disabled={isLoading}
            error={errors.company}
            touched={touchedFields.company}
            maxLength={100}
            showCharCount
            description="Company or organization name"
          />

          <ValidatedTextarea
            label="Notes"
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            onBlur={() => handleFieldBlur('notes')}
            placeholder="Add any notes about this contact (optional)"
            disabled={isLoading}
            rows={3}
            error={errors.notes}
            touched={touchedFields.notes}
            maxLength={1000}
            showCharCount
            description="Additional information about this contact"
          />

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
            >
              {isLoading 
                ? (isEditing ? 'Updating...' : 'Creating...') 
                : (isEditing ? 'Update Contact' : 'Create Contact')
              }
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ContactForm;