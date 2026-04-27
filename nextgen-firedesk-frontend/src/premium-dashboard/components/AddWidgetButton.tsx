/**
 * AddWidgetButton Component
 * Floating button to add new widgets to the dashboard
 */

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AddWidgetModal from './AddWidgetModal';

interface AddWidgetButtonProps {
  visibleWidgets: Record<string, boolean>;
  onToggleWidget: (widgetId: string) => void;
  role: 'admin' | 'manager';
  categoryName?: string | null;
}

export default function AddWidgetButton({
  visibleWidgets,
  onToggleWidget,
  role,
  categoryName
}: AddWidgetButtonProps) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <Button
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg gradient-orange text-white hover:scale-110 transition-transform"
        size="icon"
        onClick={() => setShowModal(true)}
      >
        <Plus className="h-6 w-6" />
      </Button>

      <AddWidgetModal
        open={showModal}
        onOpenChange={setShowModal}
        role={role}
        categoryName={categoryName}
        visibleWidgets={visibleWidgets}
        onToggleWidget={onToggleWidget}
      />
    </>
  );
}
