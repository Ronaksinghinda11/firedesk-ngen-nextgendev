/**
 * ManagerSidebar Component
 *
 * Permission-aware sidebar navigation for Manager users.
 * Dynamically displays menu items based on manager's permissions assigned by admin.
 * Shows only features the manager has access to (based on role permissions).
 */

import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Factory,
  Package,
  Ticket,
  User,
  ChevronLeft,
  CalendarDays,
  Users,
  FolderTree,
  FileText,
  ClipboardList,
  Wrench,
  Archive,
  BarChart3,
  Settings,
  Building2,
  Cog,
} from "lucide-react";
import { useUI } from "@/contexts/UIContext";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Entity } from "@/types/permissions";

interface MenuItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  entity?: Entity; // Required entity permission
  badge?: string; // Optional badge text
  isNew?: boolean; // Show "NEW" badge
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

export const ManagerSidebar: React.FC = () => {
  const { sidebarCollapsed, toggleSidebar } = useUI();
  const { canView } = usePermissions();
  const location = useLocation();

  // Define all possible menu sections and items
  // Dashboard - always visible for managers
  const dashboardItems: MenuItem[] = [
    {
      label: "Dashboard",
      path: "/manager",
      icon: LayoutDashboard,
      entity: Entity.DASHBOARD
    },
    {
      label: "Premium Dashboard",
      path: "/manager/premium-dashboard",
      icon: BarChart3,
      entity: Entity.DASHBOARD,
      isNew: true
    },
  ];

  // Operations section - plant and asset management
  const operationsItems: MenuItem[] = [
    {
      label: "My Plants",
      path: "/manager/plants",
      icon: Factory,
      entity: Entity.PLANTS
    },
    {
      label: "Floorplans",
      path: "/manager/floorplans",
      icon: Building2,
      entity: Entity.FLOORPLANS
    },
    {
      label: "Assets",
      path: "/manager/assets",
      icon: Package,
      entity: Entity.ASSETS
    },
    {
      label: "Categories",
      path: "/manager/categories",
      icon: FolderTree,
      entity: Entity.CATEGORIES
    },
  ];

  // Services section - scheduling and forms
  const servicesItems: MenuItem[] = [
    {
      label: "Calendar",
      path: "/manager/calendar",
      icon: CalendarDays,
      entity: Entity.SERVICES,
      isNew: true
    },
    {
      label: "Service Forms",
      path: "/manager/service-forms",
      icon: FileText,
      entity: Entity.SERVICE_FORMS
    },
    {
      label: "Group Service",
      path: "/manager/group-service",
      icon: ClipboardList,
      entity: Entity.GROUP_SERVICE
    },
  ];

  // Tickets & Maintenance
  const ticketsItems: MenuItem[] = [
    {
      label: "Tickets",
      path: "/manager/tickets",
      icon: Ticket,
      entity: Entity.TICKETS
    },
  ];

  // Team Management
  const teamItems: MenuItem[] = [
    {
      label: "Technicians",
      path: "/manager/technicians",
      icon: Wrench,
      entity: Entity.TECHNICIANS
    },
  ];

  // Reports & Analytics
  const reportsItems: MenuItem[] = [
    {
      label: "Reports",
      path: "/manager/reports",
      icon: BarChart3,
      entity: Entity.REPORTS
    },
    {
      label: "Audits",
      path: "/manager/audits",
      icon: ClipboardList,
      entity: Entity.AUDITS
    },
    {
      label: "Archive",
      path: "/manager/archive",
      icon: Archive,
      entity: Entity.ARCHIVE
    },
  ];

  // Settings
  const settingsItems: MenuItem[] = [
    {
      label: "IoT Setup",
      path: "/manager/iot-setup",
      icon: Cog,
      isNew: true,
      entity: Entity.PLANTS
    },
    {
      label: "Profile",
      path: "/manager/profile",
      icon: User
      // No entity check - profile is always accessible
    },
  ];

  // Filter menu items based on permissions
  const filterItemsByPermission = (items: MenuItem[]): MenuItem[] => {
    return items.filter(item => {
      // If no entity specified, always show (like Profile)
      if (!item.entity) {
        return true;
      }
      // Check if user has read permission for this entity
      return canView(item.entity);
    });
  };

  // Build sections with filtered items
  const allSections: MenuSection[] = [
    { title: "", items: dashboardItems },
    { title: "Operations", items: operationsItems },
    { title: "Services", items: servicesItems },
    { title: "Tickets", items: ticketsItems },
    { title: "Team", items: teamItems },
    { title: "Reports & Analytics", items: reportsItems },
    { title: "Settings", items: settingsItems },
  ];

  // Filter sections to only include those with visible items
  const visibleSections = allSections
    .map(section => ({
      ...section,
      items: filterItemsByPermission(section.items)
    }))
    .filter(section => section.items.length > 0);

  // When collapsed, return null - the expand button will be in the navbar
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
          className="text-white hover:bg-slate-700/50 w-8 h-8 flex items-center justify-center transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 custom-scrollbar">
        {visibleSections.map((section, idx) => (
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
                  (item.path !== "/manager" &&
                    location.pathname.startsWith(item.path));

                return (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      end={item.path === "/manager"}
                      className={cn(
                        "flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-slate-700/50 hover:text-white hover:translate-x-1",
                        isActive
                          ? "bg-slate-700 text-white shadow-md"
                          : "text-slate-300"
                      )}
                    >
                      <div className="flex items-center min-w-0 flex-1">
                        <Icon className={cn(
                          "h-4 w-4 mr-3 flex-shrink-0",
                          isActive ? "text-orange-400" : "text-slate-400"
                        )} />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.isNew && (
                        <Badge
                          variant="secondary"
                          className="ml-2 text-[10px] px-1.5 py-0 bg-orange-500 text-white border-none"
                        >
                          NEW
                        </Badge>
                      )}
                      {item.badge && (
                        <Badge
                          variant="outline"
                          className="ml-2 text-[10px] px-1.5 py-0"
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer - Permission Info */}
      <div className="border-t border-slate-700 p-4 bg-slate-900/50">
        <p className="text-xs text-slate-400 text-center">
          Manager Portal
        </p>
        <p className="text-[10px] text-slate-500 text-center mt-1">
          {visibleSections.reduce((acc, section) => acc + section.items.length, 0)} features available
        </p>
      </div>

      {/* Custom Scrollbar Styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(51, 65, 85, 0.3);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.3);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(148, 163, 184, 0.5);
        }
      `}</style>
    </div>
  );
};
