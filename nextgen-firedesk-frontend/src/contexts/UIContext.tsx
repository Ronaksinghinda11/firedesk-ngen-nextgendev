import React, { createContext, useContext, useState, ReactNode } from 'react';

interface UIContextType {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  notifications: number;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider = ({ children }: { children: ReactNode }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notifications] = useState(3);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <UIContext.Provider value={{ sidebarCollapsed, toggleSidebar, notifications }}>
      {children}
    </UIContext.Provider>
  );
};

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within UIProvider');
  }
  return context;
};
