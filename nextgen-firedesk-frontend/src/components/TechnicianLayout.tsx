import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
    LogOut,
    User,
    Settings,
    ChevronLeft,
    Bell,
    Menu
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface TechnicianLayoutProps {
    children?: React.ReactNode;
}

export const TechnicianLayout = ({ children }: TechnicianLayoutProps) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const isDashboard = location.pathname === '/technician/dashboard';

    return (
        <div className="min-h-screen bg-slate-50/50">
            {/* Sticky Header with Blur Effect */}
            <header className="sticky top-0 z-50 w-full border-b border-slate-200/60 bg-white/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {!isDashboard && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => navigate(-1)}
                                className="hover:bg-slate-100 rounded-full text-slate-600"
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </Button>
                        )}
                        <div className="flex items-center gap-3">
                            <div className="bg-gradient-to-tr from-orange-500 to-amber-500 p-1.5 rounded-lg shadow-sm">
                                <img
                                    src="/firedesklogo.png"
                                    alt="FireDesk"
                                    className="h-6 w-auto brightness-0 invert"
                                />
                            </div>
                            <span className="font-semibold text-slate-800 tracking-tight hidden sm:inline-block">
                                Technician Portal
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-4">
                        {/* Notifications - Placeholder */}
                        <Button variant="ghost" size="icon" className="relative text-slate-500 hover:text-slate-700 hover:bg-slate-100/50 rounded-full">
                            <Bell className="h-5 w-5" />
                            <span className="absolute top-2 right-2 h-2 w-2 bg-rose-500 rounded-full border-2 border-white"></span>
                        </Button>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="relative h-9 w-9 data-[state=open]:bg-slate-100 rounded-full p-0">
                                    <Avatar className="h-9 w-9 border border-slate-200">
                                        <AvatarImage src={`/api/users/${user?.id}/avatar`} alt={user?.name || 'User'} />
                                        <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-medium">
                                            {(user?.name || 'T').charAt(0).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56" align="end" forceMount>
                                <DropdownMenuLabel className="font-normal">
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium leading-none">{user?.name}</p>
                                        <p className="text-xs leading-none text-muted-foreground">
                                            {user?.email}
                                        </p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => navigate('/technician/dashboard')}>
                                    Dashboard
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => navigate('/technician/my-services')}>
                                    My Services
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => navigate('/technician/calendar')}>
                                    Calendar
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleLogout} className="text-rose-600 focus:text-rose-600">
                                    <LogOut className="mr-2 h-4 w-4" />
                                    <span>Log out</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="container mx-auto px-4 py-6 sm:py-8">
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {children || <Outlet />}
                </div>
            </main>
        </div>
    );
};
