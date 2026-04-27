/**
 * ManagerLayout Component
 *
 * Main layout wrapper for Manager routes.
 * Features:
 * - Uses unified Sidebar component (automatically shows manager-specific menu items including SAMS)
 * - Uses ManagerTopBar with plant/category filters and manager contact info
 * - Consistent UI/UX with admin panel
 * - Supports SAMS functionality (incidents, audits, trainings)
 *
 * This layout is protected and only accessible to users with userType='manager'.
 */

import React from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { ManagerTopBar } from "@/components/ManagerTopBar";
import { useUI } from "@/contexts/UIContext";
import { PlantFilterProvider } from "@/contexts/PlantFilterContext";
import { cn } from "@/lib/utils";

export const ManagerLayout: React.FC = () => {
  const { sidebarCollapsed } = useUI();

  return (
    <PlantFilterProvider>
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div
          className={cn(
            "flex flex-col flex-1 min-w-0 overflow-hidden transition-all duration-300",
            sidebarCollapsed ? "ml-0" : "ml-0"
          )}
        >
          <ManagerTopBar />
          <main className="flex-1 overflow-auto content-area">
            <div className="w-full px-3 py-2 md:px-4 md:py-3">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </PlantFilterProvider>
  );
};
