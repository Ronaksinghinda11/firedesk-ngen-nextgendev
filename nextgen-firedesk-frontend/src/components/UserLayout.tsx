/**
 * UserLayout Component
 *
 * Main layout wrapper for User routes (including custom roles).
 * Features:
 * - Uses unified Sidebar component (automatically shows user-specific menu items including SAMS)
 * - Uses ManagerTopBar with plant/category filters
 * - Supports SAMS functionality (report incidents, view my incidents for team leaders)
 * - Role-aware navigation based on user permissions
 *
 * This layout is accessible to authenticated users with custom roles and standard users.
 */

import React from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { ManagerTopBar } from "@/components/ManagerTopBar";
import { useUI } from "@/contexts/UIContext";
import { PlantFilterProvider } from "@/contexts/PlantFilterContext";
import { cn } from "@/lib/utils";

export const UserLayout: React.FC = () => {
  const { sidebarCollapsed } = useUI();

  return (
    <PlantFilterProvider>
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div
          className={cn(
            "flex flex-col flex-1 transition-all duration-300",
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
