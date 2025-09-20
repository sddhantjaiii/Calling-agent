import React from 'react';
import { ContactManager } from '@/components/contacts';

const Contacts: React.FC = () => {
  return (
    <div className="h-full">
      <ContactManager />
    </div>
  );
};

export default Contacts;