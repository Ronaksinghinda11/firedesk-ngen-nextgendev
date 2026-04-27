import React, { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Factory,
  MapPin,
  Package,
  UserCog,
  FileText,
  Users,
  UserCheck,
  Shield,
  ChevronRight,
  ChevronLeft,
  Menu,
  Building2,
  Ticket,
  Tags,
  Layers,
  FileCheck,
  Archive,
  BarChart3,
  ClipboardList,
  Database,
  AlertCircle,
  Briefcase,
  AlertTriangle,
  ClipboardCheck,
  GraduationCap,
  Sparkles,
  Calendar,
  Cog,
  Warehouse,
} from "lucide-react";
import { useUI } from "@/contexts/UIContext";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { Entity } from "@/types/permissions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { userApi } from "@/services/api/samsApi";

interface MenuItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  entity?: Entity; // Optional entity for permission checking
}

// Admin Dashboard section
const adminDashboardItems: MenuItem[] = [
  { label: "Dashboard", path: "/admin", icon: LayoutDashboard },
  {
    label: "Analytics Dashboard",
    path: "/admin/analytics-dashboard",
    icon: BarChart3,
  },
];

// Master Data section
// NOTE: Frequencies are now hardcoded constants, only Conditions are user-manageable
const masterDataItems: MenuItem[] = [
  { label: "Industries", path: "/admin/industries", icon: Factory },

  { label: "Categories", path: "/admin/categories", icon: Package },
  { label: "Products", path: "/admin/products", icon: Package },
  { label: "Vendors", path: "/admin/vendors", icon: Briefcase },
  {
    label: "Conditions",
    path: "/admin/master-data/conditions",
    icon: AlertCircle,
  },
];

// User Management section
const userManagementItems: MenuItem[] = [
  { label: "Users", path: "/admin/users", icon: UserCheck },
  { label: "Roles", path: "/admin/roles", icon: Shield },
];

// SAMS (Safety & Audit Management System) section
const samsItems: MenuItem[] = [
  // { label: "SAMS Dashboard", path: "/admin/sams", icon: Shield },
  { label: "Incidents", path: "/admin/sams/incidents", icon: AlertTriangle },
  // { label: "Report Incident", path: "/admin/sams/incidents/create", icon: AlertTriangle },
  {
    label: "Incident Types",
    path: "/admin/sams/master-data/types",
    icon: Database,
  },
  {
    label: "Incident Subtypes",
    path: "/admin/sams/master-data/subtypes",
    icon: Tags,
  },
  {
    label: "CAPA Steps",
    path: "/admin/sams/master-data/capa-steps",
    icon: ClipboardCheck,
  },
  { label: "Audits (Preview)", path: "/admin/sams/audits", icon: FileCheck },
  {
    label: "Trainings (Preview)",
    path: "/admin/sams/trainings",
    icon: GraduationCap,
  },
];

// Administration section
const administrationItems: MenuItem[] = [
  { label: "Plants", path: "/admin/plants", icon: Factory },
  { label: "Floorplans", path: "/admin/floorplans", icon: Building2 },
  { label: "Assets", path: "/admin/assets", icon: Package },
  { label: "Service Questions", path: "/admin/questions", icon: FileText },
  { label: "Service Forms", path: "/admin/service-forms", icon: FileText },
  { label: "Service Scheduler", path: "/admin/scheduler", icon: Calendar },
  { label: "Calendar", path: "/admin/calendar", icon: Calendar },
  { label: "Tickets", path: "/admin/tickets", icon: Ticket },
  { label: "Inventory", path: "/admin/inventory", icon: Warehouse },
  { label: "IoT Setup", path: "/admin/iot-setup", icon: Cog },
];

// ... (Manager items remain unchanged)

// ... (Inside Sidebar component)

// Manager Dashboard section
const managerDashboardItems: MenuItem[] = [
  {
    label: "Dashboard",
    path: "/manager",
    icon: LayoutDashboard,
    entity: Entity.DASHBOARD,
  },
  {
    label: "Analytical Dashboard",
    path: "/manager/premium-dashboard",
    icon: Sparkles,
    entity: Entity.DASHBOARD,
  },
];

// Dynamic Dashboard for custom roles (will be filtered by path in render)
const customRoleDashboardItems: MenuItem[] = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
    entity: Entity.DASHBOARD,
  },
];

// Manager Operations section - All 11 comprehensive modules
const managerOperationsItems: MenuItem[] = [
  {
    label: "Plants",
    path: "/manager/plants",
    icon: Factory,
    entity: Entity.PLANTS,
  },
  {
    label: "Floorplans",
    path: "/manager/floorplans",
    icon: Building2,
    entity: Entity.FLOORPLANS,
  },
  {
    label: "Categories",
    path: "/manager/categories",
    icon: Tags,
    entity: Entity.CATEGORIES,
  },
  {
    label: "Products",
    path: "/manager/products",
    icon: Package,
    entity: Entity.PRODUCTS,
  },
  {
    label: "Technicians",
    path: "/manager/technicians",
    icon: UserCog,
    entity: Entity.TECHNICIANS,
  },
  {
    label: "Assets",
    path: "/manager/assets",
    icon: Package,
    entity: Entity.ASSETS,
  },
  {
    label: "Inventory",
    path: "/manager/inventory",
    icon: Warehouse,
    entity: Entity.INVENTORY,
  },
  // { label: "Group Service", path: "/manager/group-service", icon: Layers, entity: Entity.GROUP_SERVICE },
  // { label: "Audits", path: "/manager/audits", icon: FileCheck, entity: Entity.AUDITS },
  // { label: "Archive", path: "/manager/archive", icon: Archive, entity: Entity.ARCHIVE },
  {
    label: "Reports",
    path: "/manager/reports",
    icon: BarChart3,
    entity: Entity.REPORTS,
  },
  {
    label: "Service Forms",
    path: "/manager/service-forms",
    icon: ClipboardList,
    entity: Entity.SERVICE_FORMS,
  },
  { label: "Service Scheduler", path: "/manager/scheduler", icon: Calendar },
  { label: "Calendar", path: "/manager/calendar", icon: Calendar },
  {
    label: "Tickets",
    path: "/manager/tickets",
    icon: Ticket,
    entity: Entity.TICKETS,
  },
  {
    label: "Approvals",
    path: "/manager/approval-console",
    icon: ClipboardCheck,
    entity: Entity.SERVICE_FORMS,
  },
  {
    label: "IoT Setup",
    path: "/manager/iot-setup",
    icon: Cog,
    entity: Entity.PLANTS,
  },
];

// Manager SAMS section
const managerSamsItems: MenuItem[] = [
  // { label: "SAMS Dashboard", path: "/manager/sams", icon: Shield },
  { label: "Incidents", path: "/manager/sams/incidents", icon: AlertTriangle },
  // { label: "Report Incident", path: "/manager/sams/incidents/create", icon: AlertTriangle },
  {
    label: "Audits(Preview)",
    path: "/manager/sams/audits",
    icon: ClipboardCheck,
  },
  {
    label: "Trainings(Preview)",
    path: "/manager/sams/trainings",
    icon: GraduationCap,
  },
];

export const Sidebar: React.FC = () => {
  const { sidebarCollapsed, toggleSidebar } = useUI();
  const { user, isAdmin, isManager } = useAuth();
  const { hasAnyPermission } = usePermissions();
  const location = useLocation();
  const [isTeamLeader, setIsTeamLeader] = useState(false);

  // Check if user is a team leader
  useEffect(() => {
    const checkTeamLeaderStatus = async () => {
      if (!user || isAdmin) return; // Admins don't need this check

      try {
        const response = await userApi.checkTeamLeaderStatus();
        setIsTeamLeader(response.data.isTeamLeader);
      } catch (error) {
        console.error("Failed to check team leader status:", error);
        setIsTeamLeader(false);
      }
    };

    checkTeamLeaderStatus();
  }, [user, isAdmin, isManager]);

  // Filter menu items based on permissions
  const filterItemsByPermission = (items: MenuItem[]): MenuItem[] => {
    if (isAdmin) {
      // Admins see all items
      return items;
    }

    // Filter items based on entity permissions
    return items.filter((item) => {
      // If no entity specified, always show the item
      if (!item.entity) {
        return true;
      }

      // Check if user has any permission for this entity
      return hasAnyPermission(item.entity);
    });
  };

  // Determine base path for active check
  const isOnDashboardRoute = location.pathname.startsWith("/dashboard");
  const basePath = isAdmin
    ? "/admin"
    : isOnDashboardRoute
      ? "/dashboard"
      : "/manager";

  // Determine menu sections based on user role
  let sections: { title: string; items: MenuItem[] }[] = [];

  if (isAdmin) {
    sections = [
      { title: "", items: adminDashboardItems },
      { title: "User Management", items: userManagementItems },
      { title: "Master Data", items: masterDataItems },
      { title: "Administration", items: administrationItems },
      { title: "Safety & Audit", items: samsItems },
    ];
  } else if (isManager) {
    // Base manager sections
    const managerSections: { title: string; items: MenuItem[] }[] = [
      { title: "", items: filterItemsByPermission(managerDashboardItems) },
    ];

    managerSections.push({
      title: "Operations",
      items: filterItemsByPermission(managerOperationsItems),
    });
    managerSections.push({ title: "Safety & Audit", items: managerSamsItems });

    // Add My Incidents if manager is also a team leader
    if (isTeamLeader) {
      managerSections.push({
        title: "My Incidents",
        items: [
          {
            label: "My Incidents",
            path: "/user/sams/incidents",
            icon: AlertTriangle,
          },
        ],
      });
    }

    sections = managerSections;
  } else if (user) {
    // Custom roles - show filtered items with dynamic dashboard path
    // This ensures users with custom roles see menu items based on their permissions
    const dashboardItems = isOnDashboardRoute
      ? customRoleDashboardItems
      : managerDashboardItems;

    const filteredDashboard = filterItemsByPermission(dashboardItems);
    const filteredOperations = filterItemsByPermission(
      managerOperationsItems,
    ).map((item) => ({
      ...item,
      path: isOnDashboardRoute
        ? item.path.replace("/manager", "/dashboard")
        : item.path,
    }));

    // Only add sections that have items
    if (filteredDashboard.length > 0) {
      sections.push({ title: "", items: filteredDashboard });
    }

    // Add Report Incident (available to all users)
    // sections.push({
    //   title: "Safety & Audit",
    //   items: [
    //     { label: "Report Incident", path: "/user/sams/incidents/create", icon: AlertTriangle }
    //   ]
    // });

    // Add My Incidents if user is a team leader
    if (isTeamLeader) {
      sections.push({
        title: "My Incidents",
        items: [
          {
            label: "My Incidents",
            path: "/user/sams/incidents",
            icon: AlertTriangle,
          },
        ],
      });
    }

    if (filteredOperations.length > 0) {
      sections.push({ title: "Operations", items: filteredOperations });
    }
  }

  // When collapsed, return null - the expand button will be in the navbar
  if (sidebarCollapsed) {
    return null;
  }

  return (
    <div
      className={cn(
        "h-screen flex flex-col transition-all duration-300 bg-gradient-to-b from-slate-800 to-slate-900 border-r border-slate-700",
        "w-56 shadow-2xl",
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
                  (item.path !== basePath &&
                    location.pathname.startsWith(item.path));

                return (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      end={item.path === basePath}
                      className={cn(
                        "flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-slate-700/50 hover:text-white hover:translate-x-1",
                        isActive
                          ? "bg-slate-700 text-white shadow-md"
                          : "text-slate-300",
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

// Enhanced Navbar component with integrated expand button
export const Navbar: React.FC = () => {
  const { sidebarCollapsed, toggleSidebar } = useUI();

  return (
    <div
      className={cn(
        "h-16 border-b transition-all duration-300 flex items-center",
        sidebarCollapsed
          ? "bg-gradient-to-r from-blue-600 to-purple-600 border-blue-500 shadow-lg px-4"
          : "bg-white border-gray-200 px-6",
      )}
    >
      {/* Left section with expand button */}
      <div className="flex items-center">
        {sidebarCollapsed && (
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className="text-white hover:bg-white/20 flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 hover:scale-105"
          >
            <Menu className="h-5 w-5" />
            <span className="text-sm font-medium">Menu</span>
          </Button>
        )}

        {/* Page title */}
        <h1
          className={cn(
            "text-xl font-semibold ml-4",
            sidebarCollapsed ? "text-white" : "text-gray-800",
          )}
        >
          Admin Dashboard
        </h1>
      </div>

      {/* Right section with user menu */}
      <div className="flex-1 flex items-center justify-end">
        <div className="flex items-center space-x-4">
          {/* Add other navbar items here */}
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "transition-colors",
              sidebarCollapsed
                ? "text-white hover:bg-white/20"
                : "text-gray-600 hover:bg-gray-100",
            )}
          >
            Notifications
          </Button>

          {/* User avatar */}
          <div
            className={cn(
              "w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium transition-all",
              sidebarCollapsed
                ? "bg-white/20 text-white hover:bg-white/30"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300",
            )}
          >
            A
          </div>
        </div>
      </div>
    </div>
  );
};

// Main layout component
export const AdminLayout: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { sidebarCollapsed } = useUI();

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main
        className={cn(
          "flex-1 transition-all duration-300 overflow-hidden flex flex-col",
          sidebarCollapsed
            ? "bg-gradient-to-br from-blue-50 via-white to-purple-50"
            : "bg-white",
        )}
      >
        <Navbar />

        {/* Page content */}
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </main>
    </div>
  );
};
