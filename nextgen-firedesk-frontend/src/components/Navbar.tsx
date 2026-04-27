import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Bell,
  User,
  LogOut,
  ChevronDown,
  Loader2,
  Menu,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUI } from "@/contexts/UIContext";
import { usePlantFilter } from "@/contexts/PlantFilterContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserAvatar } from "@/components/ui/UserAvatar";

// ... (in component)


import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import { highlightText } from "@/utils/highlightText";
import { useNotifications } from "@/hooks/useNotifications";
import { NotificationPanel } from "@/components/NotificationPanel";
import { QuickLinks } from "@/components/dashboard/QuickLinks";

interface SearchResult {
  id: string;
  type: string;
  name: string;
  description?: string;
  path: string;
}

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { notifications: legacyNotifications, sidebarCollapsed, toggleSidebar } = useUI();
  const { selectedPlantId, availablePlants, setSelectedPlantId } = usePlantFilter();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  // Routes where the plant filter should be hidden
  const hideFilterRoutes = [
    '/admin', // Often redirects to overview or dashboard
    '/admin/overview',
    '/admin/analytics-dashboard',
    '/manager', // Manager dashboard
    '/manager/premium-dashboard',
    '/admin/iot-setup',
    '/manager/iot-setup',
    '/admin/master-data/conditions',
    '/admin/vendors',
    '/admin/pump-room-summary',
    '/manager/pump-room-summary',
    '/dashboard/pump-room-summary'
  ];
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Use the new notification system
  const {
    notifications,
    counts,
    loading: notificationsLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    filterByCategory,
  } = useNotifications(60000);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);


  const getUserInitials = (name: string) => {
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  const handleLogout = () => logout();
  const handleProfileClick = () => {
    // Route to profile based on user type
    if (user?.userType === 'manager') {
      navigate("/manager/profile");
    } else {
      navigate("/admin/profile-settings");
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const performSearch = async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([]);
        setShowResults(false);
        return;
      }

      setIsSearching(true);
      try {
        const response: any = await api.get("/search", {
          params: { query: searchQuery, limit: 10 },
        });
        const results = response.results || [];
        setSearchResults(results);
        setShowResults(results.length > 0);
      } catch (error) {
        console.error("Search error:", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimer = setTimeout(performSearch, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setSearchQuery(e.target.value);

  const handleResultClick = (result: SearchResult) => {
    // Navigate directly to the page containing the entity
    navigate(result.path);
    setSearchQuery("");
    setShowResults(false);
  };

  const handlePlantChange = (value: string) => {
    if (value === 'all') {
      setSelectedPlantId(null);
    } else {
      setSelectedPlantId(value);
    }
  };

  const displayUser = user ?? {
    name: "Firedesk Admin",
    email: "",
    userType: "admin",
    profile_pic: "",
    profile: "",
    id: ""
  };

  return (
    <header
      className={`h-16 border-b border-border px-6 flex items-center justify-between transition-all duration-300 relative ${sidebarCollapsed
        ? "bg-gradient-to-r from-slate-700 to-slate-800 border-slate-600"
        : "bg-card"
        }`}
    >
      {/* LEFT SECTION (expand + search) */}
      <div className="flex items-center flex-1 gap-4" ref={searchRef}>
        {/* Expand Button */}
        {sidebarCollapsed && (
          // <div className="flex items-center gap-3 mr-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="text-white hover:bg-white/20 w-10 h-10 rounded-lg transition-all duration-200 hover:scale-105"
            title="Expand Sidebar"
          >
            <Menu className="h-5 w-5" />
          </Button>
          // <img
          //   src="/firedesklogo.png"
          //   alt="FireDesk Logo"
          //   className="h-8 w-auto object-contain"
          // />
          // </div>
        )}

        {/* Search Bar */}
        <div className="relative w-full max-w-lg">
          <Search
            className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${sidebarCollapsed ? "text-white/70" : "text-muted-foreground"
              }`}
          />
          <Input
            type="text"
            placeholder="Search anything: users, plants, incidents, vendors..."
            className={`pl-10 border-none transition-colors ${sidebarCollapsed
              ? "bg-white/20 text-white placeholder:text-white/70 focus:bg-white/30"
              : "bg-muted/50 focus:bg-background"
              }`}
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={() => searchResults.length > 0 && setShowResults(true)}
          />
          {isSearching && (
            <Loader2
              className={`absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin ${sidebarCollapsed ? "text-white/70" : "text-muted-foreground"
                }`}
            />
          )}

          {/* Search Results */}
          {showResults && searchResults.length > 0 && (
            <Card className="absolute top-full mt-2 w-full max-h-96 overflow-y-auto z-50 shadow-lg">
              <CardContent className="p-2">
                {(() => {
                  // Group results by type
                  const groupedResults: Record<string, SearchResult[]> = {};
                  searchResults.forEach((result) => {
                    if (!groupedResults[result.type]) {
                      groupedResults[result.type] = [];
                    }
                    groupedResults[result.type].push(result);
                  });

                  return Object.entries(groupedResults).map(([type, results]) => (
                    <div key={type} className="mb-3 last:mb-0">
                      {/* Type Header */}
                      <div className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase">
                        {type}s
                      </div>

                      {/* Results for this type */}
                      {results.map((result) => (
                        <button
                          key={`${result.type}-${result.id}`}
                          onClick={() => handleResultClick(result)}
                          className="w-full text-left px-3 py-2 rounded-md hover:bg-muted transition-colors flex items-start gap-3"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">
                                {highlightText(result.name, searchQuery)}
                              </span>
                            </div>
                            {result.description && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {highlightText(result.description, searchQuery)}
                              </p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  ));
                })()}
              </CardContent>
            </Card>
          )}

          {/* No Results */}
          {showResults &&
            searchResults.length === 0 &&
            !isSearching &&
            searchQuery.length >= 2 && (
              <Card className="absolute top-full mt-2 w-full z-50 shadow-lg">
                <CardContent className="p-4 text-center text-sm text-muted-foreground">
                  No results found for "{searchQuery}"
                </CardContent>
              </Card>
            )}
        </div>

        {/* Plant Filter Dropdown */}
        {!hideFilterRoutes.includes(location.pathname) && (
          <Select value={selectedPlantId || "all"} onValueChange={handlePlantChange}>
            <SelectTrigger
              className={`w-[200px] ${sidebarCollapsed
                ? "bg-white/20 text-white border-white/30"
                : "bg-background"
                }`}
            >
              <SelectValue placeholder="All Plants" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Plants</SelectItem>
              {availablePlants.map((plant) => (
                <SelectItem key={plant.id} value={plant.id}>
                  {plant.plantName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Quick Links */}
      <div className="flex-1 flex justify-end">
        <QuickLinks basePath="/admin" />
      </div>



      {/* RIGHT SECTION (notifications + user menu) */}
      <div className="flex items-center space-x-4">
        {/* NOTIFICATIONS */}
        <Popover open={notificationOpen} onOpenChange={setNotificationOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            >
              <Bell className="h-5 w-5" />
              {counts.unread > 0 && (
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[420px] p-0" align="end">
            <NotificationPanel
              notifications={notifications}
              counts={counts}
              loading={notificationsLoading}
              onMarkAsRead={markAsRead}
              onMarkAllAsRead={markAllAsRead}
              onDelete={deleteNotification}
              onFilterChange={filterByCategory}

              onActionClick={(url) => {
                setNotificationOpen(false);
                const userType = user?.userType || 'admin';
                let targetUrl = url;

                // Handle Service Submission URLs
                if (url.includes('service-forms/submissions?id=')) {
                  const id = url.split('id=')[1];
                  if (userType === 'manager') {
                    targetUrl = `/manager/service-form-view/${id}`;
                  } else if (userType === 'technician') {
                    targetUrl = `/technician/service-form/${id}`;
                  } else {
                    targetUrl = `/admin/service-submissions/${id}`;
                  }
                }
                // Handle standard role replacement for other URLs
                else if (userType === 'manager' && url.startsWith('/admin/')) {
                  targetUrl = url.replace('/admin/', '/manager/');
                } else if (userType === 'technician' && url.startsWith('/admin/')) {
                  targetUrl = url.replace('/admin/', '/technician/');
                }

                navigate(targetUrl);
              }}
            />
          </PopoverContent>
        </Popover>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={`flex items-center space-x-2 ${sidebarCollapsed
                ? "hover:bg-white/20 text-white"
                : "hover:bg-muted"
                }`}
            >
              <UserAvatar
                userId={displayUser?.id} // Use displayUser.id or user.id? displayUser is created from user.
                name={displayUser?.name}
                className="h-8 w-8"
                fallbackSrc={displayUser?.profile_pic || displayUser?.profile}
              />
              <div className="hidden md:flex flex-col items-start">
                <span className="text-sm font-medium">
                  {displayUser?.name || "User"}
                </span>
                <span
                  className={`text-xs ${sidebarCollapsed ? "text-white/70" : "text-muted-foreground"
                    }`}
                >
                  {displayUser?.userType}
                </span>
              </div>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">
                  {displayUser?.name || "User"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {displayUser?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={handleProfileClick}
            >
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer text-destructive focus:text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
