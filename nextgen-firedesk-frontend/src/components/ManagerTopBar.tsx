/**
 * ManagerTopBar Component
 *
 * Enhanced top navigation bar for Manager Portal with:
 * - Plant dropdown filter (shows only assigned plants)
 * - Product category dropdown filter
 * - Manager contact info (top right)
 * - Notifications bell
 * - User profile dropdown
 */

import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Bell, Menu, User, LogOut, ChevronDown, Search, Loader2 } from "lucide-react";
import { useUI } from "@/contexts/UIContext";
import { useAuth } from "@/contexts/AuthContext";
import { usePlantFilter } from "@/contexts/PlantFilterContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { highlightText } from "@/utils/highlightText";
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
import { Badge } from "@/components/ui/badge";
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

export const ManagerTopBar: React.FC = () => {
  const { user, logout } = useAuth();
  const { sidebarCollapsed, toggleSidebar } = useUI();
  const { selectedPlantId, availablePlants, setSelectedPlantId } = usePlantFilter();
  const navigate = useNavigate();
  const location = useLocation();

  // Routes where the plant filter should be hidden
  const hideFilterRoutes = [
    '/manager',
    '/manager/premium-dashboard',
    '/dashboard',
    '/dashboard/premium-dashboard'
  ];

  // Determine basePath based on current location
  const basePath = location.pathname.startsWith('/dashboard') ? '/dashboard' : '/manager';

  // Get the role display name
  const getRoleDisplayName = () => {
    if (user?.role?.name) {
      return user.role.name;
    }
    return user?.userType === 'admin' ? 'Admin' : user?.userType === 'technician' ? 'Technician' : 'Manager';
  };

  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      console.log('🔄 Loading categories...');
      const categoriesResponse = await api.get<any>('/master-data/categories');
      setCategories(categoriesResponse.allCategories || categoriesResponse.activeCategories || []);
      console.log('✅ Categories loaded:', (categoriesResponse.allCategories || categoriesResponse.activeCategories)?.length || 0);
    } catch (error) {
      console.error('❌ Error loading categories:', error);
    }
  };

  // Use the notification system
  const {
    notifications,
    counts,
    loading: notificationsLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    filterByCategory,
  } = useNotifications(60000);

  const handlePlantChange = (value: string) => {
    if (value === 'all') {
      setSelectedPlantId(null);
    } else {
      setSelectedPlantId(value);
    }
  };

  const handleLogout = () => logout();

  const getUserInitials = () => {
    if (!user?.name) return 'M';
    const names = user.name.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return user.name.slice(0, 2).toUpperCase();
  };

  // Transform search result paths from /admin/... to /manager/...
  const transformSearchPath = (path: string) => {
    if (path.startsWith('/admin/')) {
      return path.replace('/admin/', '/manager/');
    }
    return path;
  };

  // Handle search query changes with debounce
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

  // Click outside to close search results
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

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setSearchQuery(e.target.value);

  const handleResultClick = (result: SearchResult) => {
    // Transform path and navigate
    const targetPath = transformSearchPath(result.path);
    navigate(targetPath);
    setSearchQuery("");
    setShowResults(false);
  };

  return (
    <header
      className={cn(
        "h-16 border-b border-border px-6 flex items-center justify-between transition-all duration-300",
        sidebarCollapsed
          ? "bg-gradient-to-r from-slate-700 to-slate-800 border-slate-600"
          : "bg-card"
      )}
    >
      {/* LEFT SECTION - Expand button + Search + Filters */}
      <div className="flex items-center gap-4 flex-1" ref={searchRef}>
        {/* Expand Button */}
        {sidebarCollapsed && (
          // <div className="flex items-center gap-3 mr-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="text-white hover:bg-white/20 w-10 h-10 rounded-lg"
            title="Expand Sidebar"
          >
            <Menu className="h-5 w-5" />
          </Button>
          //   <img
          //     src="/firedesklogo.png"
          //     alt="FireDesk Logo"
          //     className="h-8 w-auto object-contain"
          //   />
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
            placeholder="Search anything: users, plants, incidents, assets..."
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

        {/* Plant Dropdown */}
        {!hideFilterRoutes.includes(location.pathname) && (
          <Select value={selectedPlantId || "all"} onValueChange={handlePlantChange}>
            <SelectTrigger
              className={cn(
                "w-[200px]",
                sidebarCollapsed
                  ? "bg-white/20 text-white border-white/30"
                  : "bg-background"
              )}
            >
              <SelectValue placeholder="Select Plant" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All My Plants</SelectItem>
              {availablePlants.map((plant) => (
                <SelectItem key={plant.id} value={plant.id}>
                  {plant.plantName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Category Dropdown */}
        {/* <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger
            className={cn(
              "w-[200px]",
              sidebarCollapsed
                ? "bg-white/20 text-white border-white/30"
                : "bg-background"
            )}
          >
            <SelectValue placeholder="Select Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.categoryName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select> */}
      </div>

      {/* Quick Links */}
      <div className="flex-1 flex justify-end">
        <QuickLinks basePath={basePath} />
      </div>

      {/* RIGHT SECTION - Notifications + User Menu */}
      <div className="flex items-center space-x-4">
        {/* Notifications Bell - Same as Admin */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "relative",
                sidebarCollapsed ? "text-white hover:bg-white/20" : ""
              )}
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
            />
          </PopoverContent>
        </Popover>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "flex items-center space-x-2",
                sidebarCollapsed
                  ? "hover:bg-white/20 text-white"
                  : "hover:bg-muted"
              )}
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback
                  className={
                    sidebarCollapsed
                      ? "bg-white/20 text-white"
                      : "bg-primary text-primary-foreground"
                  }
                >
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col items-start">
                <span className="text-sm font-medium">
                  {user?.name || "Manager"}
                </span>
                <span
                  className={cn(
                    "text-xs",
                    sidebarCollapsed ? "text-white/70" : "text-muted-foreground"
                  )}
                >
                  {getRoleDisplayName()}
                </span>
              </div>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{user?.name || "Manager"}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => navigate(`${basePath}/profile`)}
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
