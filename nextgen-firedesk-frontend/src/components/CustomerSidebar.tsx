/**
 * CustomerSidebar Component
 *
 * Navigation sidebar for Customer Portal with menu items:
 * - Home Dashboard
 * - Plant Management
 * - Categories
 * - Technicians
 * - Assets
 * - Group Service
 * - Tickets
 * - Audits
 * - Archive
 * - Reports
 * - Service Forms
 */

import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Factory,
  Package,
  UserCog,
  Ticket,
  FileText,
  Archive,
  BarChart3,
  Calendar,
  FolderArchive,
  ClipboardCheck,
  Layers,
  ChevronLeft,
} from "lucide-react";
import { useUI } from "@/contexts/UIContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MenuItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

// Customer Dashboard section
const dashboardItems: MenuItem[] = [
  { label: "Dashboard", path: "/customer", icon: LayoutDashboard },
];

// Operations section
const operationsItems: MenuItem[] = [
  { label: "Plant Management", path: "/customer/plants", icon: Factory },
  { label: "Categories", path: "/customer/categories", icon: Layers },
  { label: "Technicians", path: "/customer/technicians", icon: UserCog },
  { label: "Assets", path: "/customer/assets", icon: Package },
  { label: "Group Service", path: "/customer/group-service", icon: Calendar },
  { label: "Tickets", path: "/customer/tickets", icon: Ticket },
];

// Records section
const recordsItems: MenuItem[] = [
  { label: "Audits", path: "/customer/audits", icon: ClipboardCheck },
  { label: "Archive", path: "/customer/archive", icon: FolderArchive },
  { label: "Reports", path: "/customer/reports", icon: BarChart3 },
  { label: "Service Forms", path: "/customer/service-forms", icon: FileText },
];

export const CustomerSidebar: React.FC = () => {
  const { sidebarCollapsed, toggleSidebar } = useUI();
  const location = useLocation();

  const sections = [
    { title: "", items: dashboardItems },
    { title: "Operations", items: operationsItems },
    { title: "Records & Reports", items: recordsItems },
  ];

  if (sidebarCollapsed) {
    return null;
  }

  return (
    <div
      className={cn(
        "h-screen flex flex-col transition-all duration-300 bg-gradient-to-b from-slate-800 to-slate-900 border-r border-slate-700",
        "w-56 shadow-2xl"
      )}
    >
      {/* Header */}
      <div className="border-b border-slate-700 flex items-center justify-between p-4 bg-slate-900/50">
        <img
          src="/firedesklogo.png"
          alt="FireDesk Logo"
          className="h-8 w-auto object-contain"
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="text-white hover:bg-slate-700/50 w-8 h-8"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        {sections.map((section, idx) => (
          <div key={idx} className="mb-6">
            {section.title && (
              <h3 className="px-4 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {section.title}
              </h3>
            )}
            <ul className="space-y-1 px-2">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  location.pathname === item.path ||
                  (item.path !== "/customer" &&
                    location.pathname.startsWith(item.path));

                return (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      end={item.path === "/customer"}
                      className={cn(
                        "flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-slate-700/50 hover:text-white hover:translate-x-1",
                        isActive
                          ? "bg-slate-700 text-white shadow-md"
                          : "text-slate-300"
                      )}
                    >
                      <Icon className="h-4 w-4 mr-3 text-slate-400" />
                      <span className="truncate">{item.label}</span>
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  );
};
