/**
 * AddWidgetModal Component
 * Modal for adding/removing widgets from the dashboard
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import { WIDGET_REGISTRY, getAvailableWidgets } from '../config/widgetRegistry';
import { WidgetId } from '../types/dashboard.types';

interface AddWidgetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: 'admin' | 'manager';
  categoryName?: string | null;
  visibleWidgets: Record<string, boolean>;
  onToggleWidget: (widgetId: string) => void;
}

export default function AddWidgetModal({
  open,
  onOpenChange,
  role,
  categoryName,
  visibleWidgets,
  onToggleWidget,
}: AddWidgetModalProps) {
  const availableWidgets = getAvailableWidgets(role, categoryName);

  // Group widgets by category
  const widgetsByCategory = availableWidgets.reduce((acc, widget) => {
    const category = widget.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(widget);
    return acc;
  }, {} as Record<string, typeof availableWidgets>);

  const categoryLabels = {
    metrics: 'Metrics & KPIs',
    charts: 'Charts & Visualizations',
    tables: 'Tables & Lists',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Manage Widgets</DialogTitle>
          <DialogDescription>
            Add or remove widgets from your dashboard. Click on a widget to toggle its visibility.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {Object.entries(widgetsByCategory).map(([category, widgets]) => (
            <div key={category}>
              <h3 className="text-sm font-bold text-foreground mb-3">
                {categoryLabels[category as keyof typeof categoryLabels] || category}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {widgets.map((widget) => {
                  const isVisible = visibleWidgets[widget.id] || false;
                  const Icon = widget.icon;

                  return (
                    <button
                      key={widget.id}
                      onClick={() => onToggleWidget(widget.id)}
                      className={cn(
                        'relative p-4 rounded-xl border-2 transition-all duration-200 text-left',
                        'hover:shadow-md hover:scale-[1.02]',
                        isVisible
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-card hover:border-primary/50'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          'p-2 rounded-lg flex-shrink-0',
                          isVisible ? 'bg-primary/10' : 'bg-muted'
                        )}>
                          <Icon className={cn(
                            'h-5 w-5',
                            isVisible ? 'text-primary' : 'text-muted-foreground'
                          )} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-bold text-foreground">
                              {widget.name}
                            </h4>
                            {isVisible && (
                              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                <Check className="h-3 w-3 text-white" />
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {widget.description}
                          </p>
                          {widget.requiresCategory && (
                            <span className="inline-block mt-2 px-2 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700 rounded-full">
                              {widget.requiresCategory} only
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mt-6 pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            {availableWidgets.filter(w => visibleWidgets[w.id]).length} of {availableWidgets.length} widgets visible
          </p>
          <Button onClick={() => onOpenChange(false)} className="gradient-orange text-white">
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
