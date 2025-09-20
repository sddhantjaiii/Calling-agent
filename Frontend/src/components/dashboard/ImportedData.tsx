import React from "react";
import { ContactManager } from "@/components/contacts";
import type { Lead } from "@/pages/Dashboard";

interface ImportedDataProps {
  onOpenProfile: (lead: Lead) => void;
}

const ImportedData: React.FC<ImportedDataProps> = ({ onOpenProfile }) => {
  return (
    <div className="h-full">
      <ContactManager />
    </div>
  );
};

export default ImportedData;