import React, { useState } from 'react';
import ContactList from './ContactList';
import ContactDetails from './ContactDetails';
import ContactForm from './ContactForm';
import { useContacts } from '@/hooks/useContacts';
import { useToast } from '@/components/ui/use-toast';
import { useSuccessFeedback } from '@/contexts/SuccessFeedbackContext';
import { confirmationPresets } from '@/hooks/useConfirmation';
import type { Contact } from '@/types';

type ViewMode = 'list' | 'details' | 'form';

export const ContactManager: React.FC = () => {
  const { toast } = useToast();
  const { deleteContact } = useContacts();
  const { showSuccess, confirm } = useSuccessFeedback();
  
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const handleContactSelect = (contact: Contact) => {
    setSelectedContact(contact);
    setViewMode('details');
  };

  const handleContactEdit = (contact: Contact) => {
    setEditingContact(contact);
    setIsFormOpen(true);
  };

  const handleContactCreate = () => {
    setEditingContact(null);
    setIsFormOpen(true);
  };

  const handleContactDelete = async (contact: Contact) => {
    const confirmed = await confirm(confirmationPresets.deleteContact(contact.name));
    if (confirmed) {
      const success = await deleteContact(contact.id);
      if (success) {
        showSuccess.contact.deleted(contact.name, {
          description: 'Contact has been removed from your list',
          action: {
            label: 'Undo',
            onClick: () => {
              // Could implement undo functionality here
              toast({
                title: 'Undo functionality coming soon',
                description: 'We are working on adding undo capabilities.',
              });
            },
          },
        });
        
        // If we're viewing the deleted contact, go back to list
        if (selectedContact?.id === contact.id) {
          setSelectedContact(null);
          setViewMode('list');
        }
      }
    }
  };

  const handleBackToList = () => {
    setSelectedContact(null);
    setViewMode('list');
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingContact(null);
  };

  const handleFormSuccess = (contact: Contact) => {
    // If we were editing a contact and we're currently viewing it, update the view
    if (editingContact && selectedContact?.id === editingContact.id) {
      setSelectedContact(contact);
    }
  };

  const renderContent = () => {
    switch (viewMode) {
      case 'details':
        if (!selectedContact) {
          setViewMode('list');
          return null;
        }
        return (
          <ContactDetails
            contact={selectedContact}
            onBack={handleBackToList}
            onEdit={handleContactEdit}
            onDelete={handleContactDelete}
          />
        );
      
      case 'list':
      default:
        return (
          <ContactList
            onContactSelect={handleContactSelect}
            onContactEdit={handleContactEdit}
            onContactCreate={handleContactCreate}
          />
        );
    }
  };

  return (
    <div className="h-full">
      {renderContent()}
      
      <ContactForm
        isOpen={isFormOpen}
        onClose={handleFormClose}
        contact={editingContact}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
};

export default ContactManager;