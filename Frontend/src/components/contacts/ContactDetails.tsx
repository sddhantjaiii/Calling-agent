import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Phone,
  MessageSquare,
  Mail,
  Building,
  Calendar,
  ArrowLeft,
  Edit,
  Trash2,
  FileText,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useContacts } from '@/hooks/useContacts';
import DeleteContactDialog from './DeleteContactDialog';
import type { Contact } from '@/types';

interface ContactDetailsProps {
  contact: Contact;
  onBack: () => void;
  onEdit: (contact: Contact) => void;
  onDelete: (contact: Contact) => void;
}

export const ContactDetails: React.FC<ContactDetailsProps> = ({
  contact,
  onBack,
  onEdit,
  onDelete,
}) => {
  const { toast } = useToast();
  const { deleting } = useContacts();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  const handleCall = () => {
    // TODO: Implement call functionality
    toast({
      title: 'Call feature',
      description: 'Call functionality will be implemented soon.',
    });
  };

  const handleMessage = () => {
    // TODO: Implement message functionality
    toast({
      title: 'Message feature',
      description: 'Message functionality will be implemented soon.',
    });
  };

  const handleEmail = () => {
    if (contact.email) {
      window.open(`mailto:${contact.email}`);
    } else {
      toast({
        title: 'No email',
        description: 'This contact does not have an email address.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteClick = () => {
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    setIsDeleteDialogOpen(false);
    onDelete(contact);
  };

  const handleDeleteCancel = () => {
    setIsDeleteDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Contacts
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{contact.name}</h1>
            {contact.isAutoCreated && (
              <p className="text-sm text-muted-foreground mt-1">
                Auto created and linked to call
              </p>
            )}
            {contact.callLinkType === 'manually_linked' && (
              <p className="text-sm text-muted-foreground mt-1">
                Manually linked to call
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button onClick={handleCall} className="flex items-center gap-2">
            <Phone className="w-4 h-4" />
            Call
          </Button>
          <Button variant="outline" onClick={handleMessage}>
            <MessageSquare className="w-4 h-4 mr-2" />
            Message
          </Button>
          <Button variant="outline" onClick={handleEmail}>
            <Mail className="w-4 h-4 mr-2" />
            Email
          </Button>
          <Button variant="outline" onClick={() => onEdit(contact)}>
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
          
          <Button 
            variant="outline" 
            className="text-red-600 hover:text-red-700"
            onClick={handleDeleteClick}
            disabled={deleting}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact Information */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-500">Name</label>
                  <p className="text-lg font-medium">{contact.name}</p>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-500">Phone</label>
                  <p className="text-lg">{formatPhoneNumber(contact.phoneNumber)}</p>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p className="text-lg">
                    {contact.email ? (
                      <a 
                        href={`mailto:${contact.email}`}
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {contact.email}
                      </a>
                    ) : (
                      <span className="text-gray-400">No email provided</span>
                    )}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-500">Company</label>
                  <p className="text-lg">
                    {contact.company ? (
                      <span className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-gray-400" />
                        {contact.company}
                      </span>
                    ) : (
                      <span className="text-gray-400">No company provided</span>
                    )}
                  </p>
                </div>
              </div>
              
              {contact.notes && (
                <div className="space-y-2 pt-4 border-t">
                  <label className="text-sm font-medium text-gray-500">Notes</label>
                  <div className="bg-gray-50 p-3 rounded-md">
                    <p className="text-sm whitespace-pre-wrap">{contact.notes}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity Timeline - Placeholder for future implementation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Activity Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium mb-2">No activity yet</p>
                <p className="text-sm">
                  Call history, messages, and interactions will appear here once available.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Total Calls</span>
                <Badge variant="secondary">0</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Total Messages</span>
                <Badge variant="secondary">0</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Last Contact</span>
                <span className="text-sm text-gray-500">Never</span>
              </div>
            </CardContent>
          </Card>

          {/* Contact Details */}
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-500">Contact ID</label>
                <p className="text-sm font-mono bg-gray-100 p-2 rounded">
                  {contact.id}
                </p>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-500">Added</label>
                <p className="text-sm flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  {formatDate(contact.createdAt)}
                </p>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-500">Last Updated</label>
                <p className="text-sm flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  {formatDate(contact.updatedAt)}
                </p>
              </div>

              {/* Auto-creation and call link information */}
              {(contact.isAutoCreated || contact.callLinkType !== 'not_linked') && (
                <div className="space-y-2 pt-4 border-t">
                  <label className="text-sm font-medium text-gray-500">Call Information</label>
                  <div className="space-y-2">
                    {contact.isAutoCreated && (
                      <div className="flex items-center gap-2 text-sm">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          Auto-created from call
                        </Badge>
                        {contact.callCreatedAt && (
                          <span className="text-gray-500">
                            on {formatDate(contact.callCreatedAt)}
                          </span>
                        )}
                      </div>
                    )}
                    {contact.callLinkType === 'manually_linked' && (
                      <div className="flex items-center gap-2 text-sm">
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Manually linked to call
                        </Badge>
                      </div>
                    )}
                    {contact.linkedCallId && (
                      <p className="text-xs text-gray-500 font-mono">
                        Call ID: {contact.linkedCallId}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={handleCall}
              >
                <Phone className="w-4 h-4 mr-2" />
                Start Call
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={handleMessage}
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Send Message
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={handleEmail}
                disabled={!contact.email}
              >
                <Mail className="w-4 h-4 mr-2" />
                Send Email
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <DeleteContactDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={handleDeleteCancel}
        contact={contact}
        onConfirm={handleDeleteConfirm}
        isDeleting={deleting}
      />
    </div>
  );
};

export default ContactDetails;