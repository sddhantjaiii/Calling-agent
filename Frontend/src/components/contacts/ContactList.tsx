import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Phone,
  MessageSquare,
  Mail,
  Search,
  Filter,
  Plus,
  Upload,
  MoreHorizontal,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import Pagination from '@/components/ui/pagination';
import LazyLoader from '@/components/ui/LazyLoader';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { useContacts } from '@/hooks/useContacts';
import { useToast } from '@/components/ui/use-toast';
import DeleteContactDialog from './DeleteContactDialog';
import BulkContactUpload from './BulkContactUpload';
import { AgentSelectionModal } from './AgentSelectionModal';
import type { Contact, ContactsListOptions, ContactUploadResult } from '@/types';

interface ContactListProps {
  onContactSelect?: (contact: Contact) => void;
  onContactEdit?: (contact: Contact) => void;
  onContactCreate?: () => void;
  useLazyLoading?: boolean;
  initialPageSize?: number;
}

export const ContactList: React.FC<ContactListProps> = ({
  onContactSelect,
  onContactEdit,
  onContactCreate,
  useLazyLoading = false,
  initialPageSize = 10,
}) => {
  const ITEMS_PER_PAGE = initialPageSize;
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'phone_number' | 'created_at'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [allLoadedContacts, setAllLoadedContacts] = useState<Contact[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'auto_created' | 'linked_to_calls'>('all');
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); // Reset to first page when searching
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Prepare options for the hook with server-side pagination
  const contactsOptions: ContactsListOptions = {
    search: debouncedSearchTerm,
    sortBy,
    sortOrder,
    limit: ITEMS_PER_PAGE,
    offset: (currentPage - 1) * ITEMS_PER_PAGE,
  };

  const {
    contacts,
    pagination,
    loading,
    error,
    deleting,
    refreshContacts,
    deleteContact,
    clearError,
  } = useContacts(contactsOptions);

  // Handle lazy loading vs traditional pagination and apply filters
  let baseContacts = useLazyLoading ? allLoadedContacts : contacts;
  
  // Apply filter based on selected filter type
  const displayContacts = baseContacts.filter(contact => {
    switch (filterType) {
      case 'auto_created':
        return contact.isAutoCreated;
      case 'linked_to_calls':
        return contact.callLinkType === 'auto_created' || contact.callLinkType === 'manually_linked';
      case 'all':
      default:
        return true;
    }
  });

  // Calculate pagination info from server response
  const totalContacts = pagination?.total || contacts.length;
  const totalPages = Math.ceil(totalContacts / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + contacts.length;
  const hasMore = pagination?.hasMore || false;

  // Update accumulated contacts for lazy loading
  useEffect(() => {
    if (useLazyLoading) {
      if (currentPage === 1) {
        // Reset for new search or first load
        setAllLoadedContacts(contacts);
      } else {
        // Append new contacts
        setAllLoadedContacts(prev => {
          const existingIds = new Set(prev.map(c => c.id));
          const newContacts = contacts.filter(c => !existingIds.has(c.id));
          return [...prev, ...newContacts];
        });
      }
      setIsLoadingMore(false);
    }
  }, [contacts, currentPage, useLazyLoading]);

  const handleDeleteContact = (contact: Contact) => {
    setContactToDelete(contact);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!contactToDelete) return;

    try {
      const success = await deleteContact(contactToDelete.id);
      if (success) {
        toast({
          title: 'Contact deleted',
          description: `${contactToDelete.name} has been deleted successfully.`,
        });
      } else {
        toast({
          title: 'Delete failed',
          description: 'Failed to delete contact. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Delete failed',
        description: 'An error occurred while deleting the contact.',
        variant: 'destructive',
      });
    }

    setIsDeleteDialogOpen(false);
    setContactToDelete(null);
  };

  const handleDeleteCancel = () => {
    setIsDeleteDialogOpen(false);
    setContactToDelete(null);
  };

  const handleSortChange = (newSortBy: typeof sortBy) => {
    if (newSortBy === sortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // The useContacts hook will automatically refresh when contactsOptions change
  };

  const handleLoadMore = () => {
    if (useLazyLoading && hasMore && !loading && !isLoadingMore) {
      setIsLoadingMore(true);
      setCurrentPage(prev => prev + 1);
    }
  };

  const handleBulkUploadComplete = (result: ContactUploadResult) => {
    if (result.success && result.summary.successful > 0) {
      toast({
        title: 'Bulk upload completed',
        description: `Successfully uploaded ${result.summary.successful} contacts.`,
      });
      // Refresh the contact list to show new contacts
      refreshContacts();
    }
  };

  const handleCallContact = (contact: Contact) => {
    setSelectedContact(contact);
    setIsAgentModalOpen(true);
  };

  const handleConfirmCall = async (agentId: string) => {
    if (!selectedContact) return;

    const apiKey = import.meta.env.VITE_XI_API_KEY;
    if (!apiKey) {
      toast({
        title: 'API Key Missing',
        description: 'ElevenLabs API key is not configured.',
        variant: 'destructive',
      });
      return;
    }

    const phone = (selectedContact as any).phoneNumber || (selectedContact as any).phone_number;
    if (!phone) {
      toast({
        title: 'Phone missing',
        description: 'This contact does not have a phone number.',
        variant: 'destructive',
      });
      return;
    }

    const payload = {
      call_name: selectedContact.name,
      agent_id: agentId,
      agent_phone_number_id: 'phnum_4401k48bf15e3pv2m8nsfnc25s9',
      scheduled_time_unix: 0,
      recipients: [ { phone_number: phone } ]
    };

    // Debug toast/log to verify click and payload
    toast({ title: 'Submitting call...', description: `${selectedContact.name} via agent ${agentId}` });
    console.log('ElevenLabs submit payload:', payload);

    try {
      const response = await fetch('https://api.elevenlabs.io/v1/convai/batch-calling/submit', {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        mode: 'cors',
      });

      const text = await response.text();
      let body: any;
      try { body = JSON.parse(text); } catch { body = text; }

      if (response.ok) {
        toast({
          title: 'Call Initiated',
          description: `Call to ${selectedContact.name} is being initiated.`,
        });
        console.log('Call submission response:', body);
      } else {
        console.error('Call submission error:', body);
        throw new Error((body && (body.detail || body.message)) || `Failed with ${response.status}`);
      }
    } catch (error) {
      toast({
        title: 'Error Initiating Call',
        description: error instanceof Error ? error.message : 'An unknown error occurred.',
        variant: 'destructive',
      });
      console.error('Error initiating call:', error);
    }

    setIsAgentModalOpen(false);
    setSelectedContact(null);
  };


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatPhoneNumber = (phone: string | null | undefined) => {
    // Handle null/undefined phone numbers
    if (!phone || typeof phone !== 'string') {
      return 'N/A';
    }
    
    // Basic phone number formatting
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => { clearError(); refreshContacts(); }}>
            Try Again
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6 pl-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Contacts</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setIsBulkUploadOpen(true)}
            className="flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Bulk Upload
          </Button>
          <Button onClick={onContactCreate} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Contact
          </Button>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search contacts by name, phone, email, or company..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              
              <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Contacts</SelectItem>
                  <SelectItem value="auto_created">Auto-created</SelectItem>
                  <SelectItem value="linked_to_calls">Linked to Calls</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={handleSortChange}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Sort by Name</SelectItem>
                  <SelectItem value="phone_number">Sort by Phone</SelectItem>
                  <SelectItem value="created_at">Sort by Date Added</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>
              {loading ? 'Loading contacts...' : (
                <>
                  {displayContacts.length} 
                  {filterType === 'all' ? ' contacts' : 
                   filterType === 'auto_created' ? ' auto-created contacts' :
                   ' contacts linked to calls'}
                  {filterType !== 'all' && totalContacts !== displayContacts.length && (
                    <span className="text-sm text-gray-500 ml-1">
                      (of {totalContacts} total)
                    </span>
                  )}
                </>
              )}
            </span>
            {!loading && contacts.length > 0 && (
              <span className="text-sm text-gray-500">
                Page {currentPage} of {totalPages}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-0">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="p-4 border-b border-border">
                  <div className="flex items-center space-x-3">
                    <div className="flex-1 grid grid-cols-6 gap-4">
                      <div className="h-4 bg-muted rounded animate-pulse"></div>
                      <div className="h-4 bg-muted rounded animate-pulse"></div>
                      <div className="h-4 bg-muted rounded animate-pulse"></div>
                      <div className="h-4 bg-muted rounded animate-pulse"></div>
                      <div className="h-4 bg-muted rounded animate-pulse"></div>
                      <div className="h-8 w-8 bg-muted rounded animate-pulse ml-auto"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : contacts.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-gray-400 mb-4">
                <Phone className="w-12 h-12 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No contacts found
                </h3>
                <p className="text-gray-500">
                  {searchTerm
                    ? `No contacts match "${searchTerm}"`
                    : 'Get started by adding your first contact'}
                </p>
              </div>
              {!searchTerm && (
                <Button onClick={onContactCreate}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Contact
                </Button>
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSortChange('name')}
                    >
                      Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSortChange('phone_number')}
                    >
                      Phone {sortBy === 'phone_number' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSortChange('created_at')}
                    >
                      Added {sortBy === 'created_at' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayContacts.map((contact) => (
                    <TableRow
                      key={contact.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => onContactSelect?.(contact)}
                    >
                      <TableCell className="font-medium">
                        <div>
                          <div>{contact.name}</div>
                          {contact.isAutoCreated && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Auto created and linked to call
                            </div>
                          )}
                          {contact.callLinkType === 'manually_linked' && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Manually linked to call
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatPhoneNumber((contact as any).phoneNumber || (contact as any).phone_number)}
                      </TableCell>
                      <TableCell>
                        {(contact as any).email || (
                          <span className="text-gray-400">No email</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {(contact as any).company || (
                          <span className="text-gray-400">No company</span>
                        )}
                      </TableCell>
                      <TableCell className="text-gray-500">
                        {formatDate((contact as any).createdAt || (contact as any).created_at)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                onContactEdit?.(contact);
                              }}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCallContact(contact);
                              }}
                            >
                              <Phone className="w-4 h-4 mr-2" />
                              Call
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                // TODO: Implement message functionality
                                toast({
                                  title: 'Message feature',
                                  description: 'Message functionality will be implemented soon.',
                                });
                              }}
                            >
                              <MessageSquare className="w-4 h-4 mr-2" />
                              Message
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                if ((contact as any).email) {
                                  window.open(`mailto:${(contact as any).email}`);
                                } else {
                                  toast({
                                    title: 'No email',
                                    description: 'This contact does not have an email address.',
                                    variant: 'destructive',
                                  });
                                }
                              }}
                            >
                              <Mail className="w-4 h-4 mr-2" />
                              Email
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteContact(contact);
                              }}
                              disabled={deleting}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination or Lazy Loading */}
              {useLazyLoading ? (
                <LazyLoader
                  hasMore={hasMore}
                  loading={isLoadingMore}
                  onLoadMore={handleLoadMore}
                  threshold={200}
                />
              ) : (
                totalPages > 1 && (
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={totalContacts}
                    itemsPerPage={ITEMS_PER_PAGE}
                    onPageChange={handlePageChange}
                    loading={loading}
                  />
                )
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <DeleteContactDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={handleDeleteCancel}
        contact={contactToDelete}
        onConfirm={handleDeleteConfirm}
        isDeleting={deleting}
      />

      {/* Bulk Contact Upload Dialog */}
      <BulkContactUpload
        isOpen={isBulkUploadOpen}
        onOpenChange={setIsBulkUploadOpen}
        onUploadComplete={handleBulkUploadComplete}
      />

      {/* Agent Selection Modal */}
      <AgentSelectionModal
        isOpen={isAgentModalOpen}
        onClose={() => setIsAgentModalOpen(false)}
        onConfirm={handleConfirmCall}
        contact={selectedContact}
      />
    </div>
  );
};

export default ContactList;