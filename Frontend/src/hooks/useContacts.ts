import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/apiService';
import { queryKeys, cacheUtils } from '../lib/queryClient';
import { useAuth } from '../contexts/AuthContext';
import { toCamelCase } from '../utils/caseConverter'; // Import the converter
import type { 
  Contact, 
  CreateContactRequest, 
  UpdateContactRequest, 
  ContactStats,
  ContactUploadResult,
  ContactsListOptions,
  ApiError 
} from '../types';

export interface UseContactsReturn {
  // Data
  contacts: Contact[];
  stats: ContactStats | null;
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  } | null;
  
  // Loading states
  loading: boolean;
  loadingStats: boolean;
  
  // Error states
  error: string | null;
  statsError: string | null;
  
  // Mutation states
  creating: boolean;
  updating: boolean;
  deleting: boolean;
  uploading: boolean;
  
  // Actions
  createContact: (data: CreateContactRequest) => Promise<Contact | null>;
  updateContact: (id: string, data: UpdateContactRequest) => Promise<Contact | null>;
  deleteContact: (id: string) => Promise<boolean>;
  uploadContacts: (file: File) => Promise<ContactUploadResult | null>;
  refreshContacts: (options?: ContactsListOptions) => Promise<void>;
  searchContacts: (query: string) => Promise<void>;
  clearError: () => void;
}

export const useContacts = (initialOptions?: ContactsListOptions): UseContactsReturn => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Helper function to handle API errors
  const handleError = (error: unknown, operation: string): string => {
    console.error(`Error in ${operation}:`, error);
    
    let errorMessage = `Failed to ${operation}`;
    
    if (error instanceof Error) {
      const apiError = error as ApiError;
      if (apiError.code === 'UNAUTHORIZED') {
        errorMessage = 'Session expired. Please log in again.';
      } else if (apiError.code === 'VALIDATION_ERROR') {
        errorMessage = apiError.message || 'Invalid data provided';
      } else if (apiError.code === 'NETWORK_ERROR') {
        errorMessage = 'Network error. Please check your connection.';
      } else if (apiError.code === 'CONFLICT') {
        errorMessage = 'Contact with this phone number already exists';
      } else {
        errorMessage = apiError.message || errorMessage;
      }
    }
    
    return errorMessage;
  };

  // Query for contacts with caching
  const {
    data: contactsData,
    isLoading: loading,
    error: contactsError,
    refetch: refetchContacts,
  } = useQuery({
    queryKey: [...queryKeys.contacts(user?.id), initialOptions],
    queryFn: async () => {
      const response = await apiService.getContacts(initialOptions);
      
      // Handle both paginated and non-paginated responses
      let contactsData;
      if (response.data && 'contacts' in response.data) {
        contactsData = response.data;
      } else {
        contactsData = {
          contacts: response.data || response as unknown as Contact[],
          pagination: null
        };
      }

      // Convert snake_case keys to camelCase
      if (contactsData.contacts) {
        contactsData.contacts = contactsData.contacts.map(contact => toCamelCase(contact));
      }

      return contactsData;
    },
    staleTime: 1 * 60 * 1000, // 1 minute - contacts change frequently
    gcTime: 3 * 60 * 1000, // 3 minutes
  });

  // Query for contact statistics with longer caching
  const {
    data: stats = null,
    isLoading: loadingStats,
    error: statsQueryError,
  } = useQuery({
    queryKey: queryKeys.contactStats(user?.id),
    queryFn: async () => {
      const response = await apiService.getContactStats();
      return response.data || response as unknown as ContactStats;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - stats change less frequently
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 1, // Don't retry stats as much since it's not critical
  });

  // Extract contacts and pagination from query data
  const contacts: Contact[] = Array.isArray(contactsData) 
    ? contactsData 
    : (contactsData as any)?.contacts || [];
  const pagination = contactsData?.pagination || null;

  // Create contact mutation with optimistic updates
  const createContactMutation = useMutation({
    mutationFn: async (data: CreateContactRequest) => {
      const response = await apiService.createContact(data);
      const contact = response.data || response as unknown as Contact;
      return toCamelCase(contact);
    },
    onMutate: async (newContact) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.contacts(user?.id) });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData([...queryKeys.contacts(user?.id), initialOptions]) as { contacts: Contact[]; pagination: any } | undefined;

      // Optimistically update to the new value
      if (previousData && 'contacts' in previousData) {
        const optimisticContact: Contact = {
          id: `temp-${Date.now()}`,
          userId: user?.id || '',
          name: newContact.name,
          phoneNumber: newContact.phoneNumber,
          email: newContact.email,
          company: newContact.company,
          notes: newContact.notes,
          isAutoCreated: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        queryClient.setQueryData([...queryKeys.contacts(user?.id), initialOptions], {
          ...previousData,
          contacts: [...previousData.contacts, optimisticContact]
        });
      }

      return { previousData };
    },
    onError: (_err, _newContact, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousData) {
        queryClient.setQueryData([...queryKeys.contacts(user?.id), initialOptions], context.previousData);
      }
    },
    onSuccess: () => {
      // Invalidate and refetch contacts and stats to get the real data
      cacheUtils.invalidateContacts(user?.id);
      queryClient.invalidateQueries({ queryKey: queryKeys.contactStats(user?.id) });
    },
  });

  // Update contact mutation with optimistic updates
  const updateContactMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateContactRequest }) => {
      const response = await apiService.updateContact(id, data);
      const contact = response.data || response as unknown as Contact;
      return toCamelCase(contact);
    },
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.contacts(user?.id) });

      const previousData = queryClient.getQueryData([...queryKeys.contacts(user?.id), initialOptions]) as { contacts: Contact[]; pagination: any } | undefined;

      if (previousData && 'contacts' in previousData) {
        const updatedContacts = previousData.contacts.map((contact: Contact) =>
          contact.id === id ? { ...contact, ...data, updatedAt: new Date().toISOString() } : contact
        );
        queryClient.setQueryData([...queryKeys.contacts(user?.id), initialOptions], {
          ...previousData,
          contacts: updatedContacts
        });
      }

      return { previousData };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData([...queryKeys.contacts(user?.id), initialOptions], context.previousData);
      }
    },
    onSuccess: () => {
      cacheUtils.invalidateContacts();
    },
  });

  // Delete contact mutation with optimistic updates
  const deleteContactMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiService.deleteContact(id);
      return id;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.contacts(user?.id) });

      const previousData = queryClient.getQueryData([...queryKeys.contacts(user?.id), initialOptions]) as { contacts: Contact[]; pagination: any } | undefined;

      if (previousData && 'contacts' in previousData) {
        const filteredContacts = previousData.contacts.filter((contact: Contact) => contact.id !== id);
        queryClient.setQueryData([...queryKeys.contacts(user?.id), initialOptions], {
          ...previousData,
          contacts: filteredContacts
        });
      }

      return { previousData };
    },
    onError: (_err, _id, context) => {
      if (context?.previousData) {
        queryClient.setQueryData([...queryKeys.contacts(user?.id), initialOptions], context.previousData);
      }
    },
    onSuccess: () => {
      cacheUtils.invalidateContacts(user?.id);
      queryClient.invalidateQueries({ queryKey: queryKeys.contactStats(user?.id) });
    },
  });

  // Upload contacts mutation
  const uploadContactsMutation = useMutation({
    mutationFn: async (file: File) => {
      const response = await apiService.uploadContacts(file);
      return response.data || response as unknown as ContactUploadResult;
    },
    onSuccess: (result) => {
      // Refresh contacts and stats after successful upload
      if (result.success && result.summary.successful > 0) {
        cacheUtils.invalidateContacts(user?.id);
        queryClient.invalidateQueries({ queryKey: queryKeys.contactStats(user?.id) });
      }
    },
  });

  // Action functions
  const createContact = async (data: CreateContactRequest): Promise<Contact | null> => {
    try {
      return await createContactMutation.mutateAsync(data);
    } catch (error) {
      handleError(error, 'create contact');
      return null;
    }
  };

  const updateContact = async (id: string, data: UpdateContactRequest): Promise<Contact | null> => {
    try {
      return await updateContactMutation.mutateAsync({ id, data });
    } catch (error) {
      handleError(error, 'update contact');
      return null;
    }
  };

  const deleteContact = async (id: string): Promise<boolean> => {
    try {
      await deleteContactMutation.mutateAsync(id);
      return true;
    } catch (error) {
      handleError(error, 'delete contact');
      return false;
    }
  };

  const uploadContacts = async (file: File): Promise<ContactUploadResult | null> => {
    try {
      return await uploadContactsMutation.mutateAsync(file);
    } catch (error) {
      handleError(error, 'upload contacts');
      return null;
    }
  };

  const refreshContacts = async (_options?: ContactsListOptions): Promise<void> => {
    await refetchContacts();
  };

  const searchContacts = async (query: string): Promise<void> => {
    // This would typically trigger a new query with search parameters
    // For now, we'll refetch with the search query
    queryClient.invalidateQueries({ queryKey: [...queryKeys.contacts(user?.id), { ...initialOptions, search: query }] });
  };

  const clearError = (): void => {
    // Clear query errors without triggering refetch to prevent infinite loops
    queryClient.setQueryData(queryKeys.contacts(user?.id), (oldData: Contact[] | undefined) => oldData);
    queryClient.setQueryData(queryKeys.contactStats(user?.id), (oldData: ContactStats | undefined) => oldData);
  };

  return {
    // Data
    contacts,
    stats,
    pagination,
    
    // Loading states
    loading,
    loadingStats,
    
    // Error states
    error: contactsError ? handleError(contactsError, 'load contacts') : null,
    statsError: statsQueryError ? handleError(statsQueryError, 'load contact stats') : null,
    
    // Mutation states
    creating: createContactMutation.isPending,
    updating: updateContactMutation.isPending,
    deleting: deleteContactMutation.isPending,
    uploading: uploadContactsMutation.isPending,
    
    // Actions
    createContact,
    updateContact,
    deleteContact,
    uploadContacts,
    refreshContacts,
    searchContacts,
    clearError,
  };
};

export default useContacts;