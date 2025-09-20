import { createContext, useContext, useState, ReactNode } from 'react';

interface NavigationContextType {
  activeTab: string;
  activeSubTab: string;
  setActiveTab: (tab: string) => void;
  setActiveSubTab: (subTab: string) => void;
  navigateToLeadIntelligence: () => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

interface NavigationProviderProps {
  children: ReactNode;
  initialTab?: string;
  initialSubTab?: string;
}

export const NavigationProvider = ({ 
  children, 
  initialTab = "overview", 
  initialSubTab = "" 
}: NavigationProviderProps) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [activeSubTab, setActiveSubTab] = useState(initialSubTab);

  const navigateToLeadIntelligence = () => {
    setActiveTab("lead-intelligence");
    setActiveSubTab("");
  };

  const value = {
    activeTab,
    activeSubTab,
    setActiveTab,
    setActiveSubTab,
    navigateToLeadIntelligence,
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};
