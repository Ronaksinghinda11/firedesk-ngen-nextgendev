/**
 * CustomerLayout Component
 *
 * Main layout wrapper for Customer Portal routes.
 * Features:
 * - Top bar with plant dropdown and category dropdown
 * - Manager name and contact info in top right
 * - Notifications bell
 * - Customer-specific sidebar navigation
 */

import React from "react";
import { Outlet } from "react-router-dom";
import { CustomerSidebar } from "@/components/CustomerSidebar";
import { CustomerTopBar } from "@/components/CustomerTopBar";
import { useUI } from "@/contexts/UIContext";
import { cn } from "@/lib/utils";

export const CustomerLayout: React.FC = () => {
  const { sidebarCollapsed } = useUI();

  return (
    <div className="flex h-screen bg-background">
      <CustomerSidebar />
      <div
        className={cn(
          "flex flex-col flex-1 transition-all duration-300",
          sidebarCollapsed ? "ml-0" : "ml-0"
        )}
      >
        <CustomerTopBar />
        <main className="flex-1 overflow-auto content-area">
          <div className="w-full px-3 py-2 md:px-4 md:py-3">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
