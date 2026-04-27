import React from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { Navbar } from "@/components/Navbar";
import { useUI } from "@/contexts/UIContext";
import { cn } from "@/lib/utils";

export const AdminLayout: React.FC = () => {
  const { sidebarCollapsed } = useUI();

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div
        className={cn(
          "flex flex-col flex-1 min-w-0 overflow-hidden transition-all duration-300",
          sidebarCollapsed ? "ml-0" : "ml-0"
        )}
      >
        <Navbar />
        <main className="flex-1 overflow-auto content-area">
          <div className="w-full px-3 py-2 md:px-4 md:py-3">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
