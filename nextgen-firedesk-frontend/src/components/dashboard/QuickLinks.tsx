/**
 * Quick Links Component - Professional Design
 * 
 * Clean, modern navigation buttons matching the app's color scheme.
 * Uses orange accent with subtle hover effects.
 */

import { useNavigate } from 'react-router-dom';
import { Building2, BarChart3, Calendar } from 'lucide-react';

interface QuickLinkItem {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    path: string;
}

interface QuickLinksProps {
    basePath: string;
}

export function QuickLinks({ basePath }: QuickLinksProps) {
    const navigate = useNavigate();

    const quickLinks: QuickLinkItem[] = [
        {
            label: 'Floorplan',
            icon: Building2,
            path: `${basePath}/floorplans`,
        },
        {
            label: 'Reports',
            icon: BarChart3,
            path: basePath === '/manager' ? '/manager/premium-dashboard' : '/admin/analytics-dashboard',
        },
        {
            label: 'Calendar',
            icon: Calendar,
            path: `${basePath}/calendar`,
        },
    ];

    return (
        <div className="flex items-center justify-center gap-2">
            {quickLinks.map((link) => {
                const Icon = link.icon;
                return (
                    <button
                        key={link.label}
                        onClick={() => navigate(link.path)}
                        className="group relative flex items-center gap-2 px-3.5 py-2 bg-white border border-gray-200 rounded-lg hover:border-orange-300 hover:bg-orange-50/50 transition-all duration-200 hover:shadow-sm active:scale-[0.98]"
                    >
                        {/* Icon with subtle background */}
                        <div className="flex items-center justify-center p-1 rounded bg-gray-100 group-hover:bg-orange-100 transition-colors duration-200">
                            <Icon className="h-3.5 w-3.5 text-gray-600 group-hover:text-orange-600 transition-colors duration-200" strokeWidth={2.5} />
                        </div>

                        {/* Label */}
                        <span className="text-xs font-semibold text-gray-700 group-hover:text-orange-600 transition-colors duration-200 whitespace-nowrap">
                            {link.label}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
