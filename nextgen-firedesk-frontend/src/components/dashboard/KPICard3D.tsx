/**
 * 3D KPI Card Component
 * 
 * Premium card for displaying key metrics with animations
 * Uses 2D by default to avoid compatibility issues
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface KPICard3DProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    color?: string;
    trend?: number;
    use3D?: boolean;
}

export function KPICard3D({
    title,
    value,
    icon: Icon,
    color = 'from-blue-500 to-cyan-500',
    trend,
    use3D = false // Default to 2D for stability
}: KPICard3DProps) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="h-full"
        >
            <Card className="relative overflow-hidden h-full group cursor-pointer hover:shadow-2xl transition-all duration-300 border-2 border-slate-200">
                {/* Gradient background */}
                <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-5 group-hover:opacity-10 transition-opacity duration-300`} />

                <CardContent className="p-6 relative z-10">
                    {/* Premium 2D Visual */}
                    <div className={`h-32 mb-4 rounded-xl bg-gradient-to-br ${color} p-6 flex items-center justify-center relative overflow-hidden`}>
                        <motion.div
                            animate={{
                                scale: isHovered ? 1.1 : 1,
                                rotate: isHovered ? 5 : 0
                            }}
                            transition={{ duration: 0.3 }}
                        >
                            <Icon className="h-16 w-16 text-white opacity-90" />
                        </motion.div>

                        {/* Animated background effect */}
                        <motion.div
                            className="absolute inset-0 bg-white"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: isHovered ? 0.1 : 0 }}
                            transition={{ duration: 0.3 }}
                        />

                        {/* Floating particles effect */}
                        <div className="absolute inset-0 overflow-hidden">
                            {[...Array(3)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    className="absolute w-2 h-2 bg-white rounded-full opacity-30"
                                    animate={{
                                        y: [0, -100],
                                        x: [0, Math.random() * 50 - 25],
                                        opacity: [0.3, 0]
                                    }}
                                    transition={{
                                        duration: 2 + i,
                                        repeat: Infinity,
                                        delay: i * 0.5
                                    }}
                                    style={{
                                        left: `${20 + i * 30}%`,
                                        bottom: 0
                                    }}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Metrics */}
                    <div className="space-y-2">
                        <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
                            {title}
                        </p>
                        <div className="flex items-baseline gap-2">
                            <motion.p
                                className={`text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r ${color}`}
                                initial={{ scale: 0.9 }}
                                animate={{ scale: 1 }}
                                transition={{ duration: 0.3 }}
                            >
                                {value}
                            </motion.p>
                            {trend !== undefined && (
                                <motion.span
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className={`text-sm font-semibold ${trend >= 0 ? 'text-green-500' : 'text-red-500'}`}
                                >
                                    {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
                                </motion.span>
                            )}
                        </div>

                        {/* Icon badge */}
                        <div className="flex items-center gap-2 mt-4">
                            <div className={`p-2 rounded-lg bg-gradient-to-br ${color} bg-opacity-10`}>
                                <Icon className="h-4 w-4 text-slate-600" />
                            </div>
                            <span className="text-xs text-slate-500">Real-time data</span>
                        </div>
                    </div>
                </CardContent>

                {/* Glow effect on hover */}
                <motion.div
                    className={`absolute -inset-1 bg-gradient-to-r ${color} rounded-lg blur opacity-0 group-hover:opacity-25 transition-opacity duration-500 -z-10`}
                />
            </Card>
        </motion.div>
    );
}
