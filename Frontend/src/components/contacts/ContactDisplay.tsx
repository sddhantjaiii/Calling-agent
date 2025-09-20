import React from 'react';
import { Mail, Phone, Globe, User } from 'lucide-react';

interface ContactInfo {
  name?: string;
  email?: string;
  phoneNumber?: string;
}

interface ContactDisplayProps {
  contact?: ContactInfo;
  callSource?: 'phone' | 'internet' | 'unknown';
  className?: string;
}

export const ContactDisplay: React.FC<ContactDisplayProps> = ({ 
  contact, 
  callSource = 'unknown',
  className = '' 
}) => {
  const getDisplayInfo = () => {
    if (!contact) {
      return {
        name: callSource === 'internet' ? 'Web Visitor' : 'Unknown Caller',
        email: null,
        phone: null
      };
    }

    return {
      name: contact.name || (callSource === 'internet' ? 'Web Visitor' : 'Unknown Caller'),
      email: contact.email || null, // ✅ Don't show fake emails
      phone: contact.phoneNumber || null
    };
  };

  const { name, email, phone } = getDisplayInfo();

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Contact Name */}
      <div className="flex items-center gap-2">
        <User className="w-4 h-4 text-gray-500" />
        <span className="font-medium text-gray-900">{name}</span>
      </div>

      {/* Email - only show if available */}
      {email && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Mail className="w-3 h-3" />
          <span>{email}</span>
        </div>
      )}

      {/* Phone - only show if available */}
      {phone && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Phone className="w-3 h-3" />
          <span>{phone}</span>
        </div>
      )}

      {/* Show appropriate message when no contact info is available */}
      {!email && !phone && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          {callSource === 'internet' ? (
            <>
              <Globe className="w-3 h-3" />
              <span>No contact information available</span>
            </>
          ) : (
            <>
              <Phone className="w-3 h-3" />
              <span>Contact details not provided</span>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ContactDisplay;