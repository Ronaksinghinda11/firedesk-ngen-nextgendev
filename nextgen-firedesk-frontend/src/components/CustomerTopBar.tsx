/**
 * CustomerTopBar Component
 *
 * Top navigation bar for Customer Portal with:
 * - Plant dropdown filter
 * - Product category dropdown filter
 * - Manager name and contact info (top right)
 * - Notifications bell
 * - User profile dropdown
 */

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Menu, User, LogOut, ChevronDown, Phone, Mail, Search, Loader2 } from "lucide-react";
import { useUI } from "@/contexts/UIContext";
import { useAuth } from "@/contexts/AuthContext";
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
import { Badge } from "@/components/ui/badge";

interface SearchResult {
  id: string;
  type: string;
  name: string;
  description?: string;
  path: string;
}

export const CustomerTopBar: React.FC = () => {
  const { user, logout } = useAuth();
  const { sidebarCollapsed, toggleSidebar } = useUI();
  const navigate = useNavigate();

  const [plants, setPlants] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedPlant, setSelectedPlant] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [managerInfo, setManagerInfo] = useState<any>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadFilters();
  }, []);

  const loadFilters = async () => {
    try {
      // Load plants
      // Load plants based on role
      const userRole = user?.role?.name?.toLowerCase();
      let sortedPlants = [];

      if (userRole === 'manager') {
        const plantsResponse: any = await api.get('/managers/me/plants');
        sortedPlants = (plantsResponse.plants || []).sort((a: any, b: any) =>
          (a.plantName || a.plant_name || '').localeCompare(b.plantName || b.plant_name || '')
        );
      } else {
        const plantsResponse: any = await api.get('/plant');
        sortedPlants = (plantsResponse.allPlants || []).sort((a: any, b: any) =>
          (a.plantName || a.plant_name || '').localeCompare(b.plantName || b.plant_name || '')
        );
      }
      setPlants(sortedPlants);

      // Load categories
      const categoriesResponse: any = await api.get('/category');
      setCategories(categoriesResponse.allCategories || []);

      // Load manager info (customer's assigned manager)
      const managerResponse: any = await api.get('/manager');
      if (managerResponse.allManager && managerResponse.allManager.length > 0) {
        setManagerInfo(managerResponse.allManager[0]);
      }
    } catch (error) {
      console.error('Error loading filters:', error);
    }
  };

  const handleLogout = () => logout();

  const getUserInitials = () => {
    if (!user?.name) return 'C';
    const names = user.name.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return user.name.slice(0, 2).toUpperCase();
  };

  // Transform search result paths from /admin/... to /customer/...
  const transformSearchPath = (path: string) => {
    if (path.startsWith('/admin/')) {
      return path.replace('/admin/', '/customer/');
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
            placeholder="Search anything: plants, incidents, assets..."
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
        <Select value={selectedPlant} onValueChange={setSelectedPlant}>
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
            <SelectItem value="all">All Plants</SelectItem>
            {plants.map((plant) => (
              <SelectItem key={plant.id} value={plant.id}>
                {plant.plantName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Category Dropdown */}
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
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
        </Select>
      </div>

      {/* CENTER - Manager Info */}
      {managerInfo && (
        <div className="flex items-center gap-2 px-4 border-l border-r">
          <div className="text-right">
            <p
              className={cn(
                "text-sm font-medium",
                sidebarCollapsed ? "text-white" : "text-foreground"
              )}
            >
              Manager: {managerInfo.user?.name || 'N/A'}
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Phone className="h-3 w-3" />
              <span>{managerInfo.user?.phone || 'N/A'}</span>
            </div>
          </div>
        </div>
      )}

      {/* RIGHT SECTION - Notifications + User Menu */}
      <div className="flex items-center space-x-4">
        {/* Notifications Bell */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "relative",
            sidebarCollapsed ? "text-white hover:bg-white/20" : ""
          )}
          onClick={() => navigate('/customer/notifications')}
        >
          <Bell className="h-5 w-5" />
          <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
            3
          </Badge>
        </Button>

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
                  {user?.name || "Customer"}
                </span>
                <span
                  className={cn(
                    "text-xs",
                    sidebarCollapsed ? "text-white/70" : "text-muted-foreground"
                  )}
                >
                  Customer
                </span>
              </div>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{user?.name || "Customer"}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => navigate('/customer/profile')}
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
