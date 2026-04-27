/**
 * ManagerNavbar Component
 *
 * Top navigation bar for Manager users.
 * Displays:
 * - Expand/collapse sidebar toggle
 * - Page title
 * - User profile menu with logout
 *
 * Reuses the same UI patterns as AdminNavbar for consistency.
 */

import React, { useState } from 'react';
import { useNavigate } from "react-router-dom";
import { Bell, User, LogOut, ChevronDown, Menu } from 'lucide-react';
import { useUI } from "@/contexts/UIContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
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
} from '@/components/ui/popover';
import { usePlantFilter } from "@/contexts/PlantFilterContext";
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationPanel } from '@/components/NotificationPanel';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { cn } from "@/lib/utils";

export const ManagerNavbar: React.FC = () => {
  const { sidebarCollapsed, toggleSidebar } = useUI();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { selectedPlantId } = usePlantFilter(); // Use plant filter context

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

  const handleLogout = async () => {
    await logout();
  };

  const handleProfileClick = () => {
    navigate('/manager/profile');
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user?.name) return 'M';
    const names = user.name.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return user.name.slice(0, 2).toUpperCase();
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sticky top-0 z-30">
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="text-gray-500 hover:text-gray-700 hover:bg-gray-100"
        >
          <Menu className="h-5 w-5" />
        </Button>
        {/* Page title */}
        <h1 className="text-xl font-semibold text-gray-800">
          Manager Dashboard
        </h1>
      </div>

      <div className="flex items-center space-x-4">
        {/* NOTIFICATIONS */}
        <Popover>
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
                // Convert /admin/ URLs to /manager/ for manager dashboard
                let targetUrl = url;

                // Handle Service Submission URLs
                if (url.includes('service-forms/submissions?id=')) {
                  const id = url.split('id=')[1];
                  targetUrl = `/manager/service-form-view/${id}`;
                }
                // Handle standard replacement
                else if (url.startsWith('/admin/')) {
                  targetUrl = url.replace('/admin/', '/manager/');
                }

                navigate(targetUrl);
              }}
            />
          </PopoverContent>
        </Popover>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 hover:bg-gray-100"
            >
              <UserAvatar
                userId={user?.id}
                name={user?.name}
                className="h-8 w-8"
                fallbackSrc={user?.profile_pic || user?.profile}
              />
              <span className="text-sm font-medium">{user?.name || 'Manager'}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleProfileClick} className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
