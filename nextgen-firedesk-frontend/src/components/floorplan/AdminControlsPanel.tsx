import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Save,
  RotateCcw,
  Plus,
  Settings,
  MousePointer2,
  Move,
  MapPin,
  Navigation,
  Hand
} from 'lucide-react';
import { useAdminMode } from '@/contexts/AdminModeContext';

interface AdminControlsPanelProps {
  selectedAsset?: { id: string; x: number; y: number } | null;
  onSave?: () => Promise<void>;
  onDiscard?: () => void;
  onStartCreation?: () => void;
  onCancelCreation?: () => void;
  isSaving?: boolean;
}

export const AdminControlsPanel: React.FC<AdminControlsPanelProps> = ({
  selectedAsset,
  onSave,
  onDiscard,
  onStartCreation,
  onCancelCreation,
  isSaving = false
}) => {
  const {
    isAdminMode,
    currentMode,
    hasUnsavedChanges,
    isCreatingAsset,
    isDragMode,
    enableDragMode,
    setNavigationMode,
    startAssetCreation,
    getPendingChangesCount
  } = useAdminMode();

  if (!isAdminMode) return null;

  const PENDINGCount = getPendingChangesCount();

  const handleSave = async () => {
    try {
      await onSave?.();
    } catch (error) {
      console.error('Failed to save changes:', error);
    }
  };

  const handleStartCreation = () => {
    if (hasUnsavedChanges) {
      const confirmDiscard = window.confirm(
        'You have unsaved changes. Starting asset creation will discard them. Continue?'
      );
      if (!confirmDiscard) return;
      onDiscard?.();
    }
    startAssetCreation();
    onStartCreation?.();
  };

  const handleEnableDragMode = () => {
    enableDragMode();
  };

  const handleSetNavigationMode = () => {
    setNavigationMode();
  };

  const getModeDisplay = () => {
    switch (currentMode) {
      case 'navigation':
        return {

        };
      case 'drag':
        return {
          icon: <Move className="h-4 w-4 text-green-600" />,
          label: 'Drag Mode',
          description: 'Drag assets to reposition'
        };
      case 'create':
        return {
          icon: <Plus className="h-4 w-4 text-orange-600" />,
          label: 'Asset Creation Mode',
          description: 'Click to place new assets'
        };
      default:
        return {
          icon: <MousePointer2 className="h-4 w-4 text-gray-600" />,
          label: 'Unknown Mode',
          description: 'Unknown mode'
        };
    }
  };

  const modeDisplay = getModeDisplay();

  return (
    <Card className="w-80 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Settings className="h-4 w-4" />
          Admin Controls
          <Badge variant="secondary" className="ml-auto">
            Admin Mode
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Current Mode Indicator */}
        <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
          {modeDisplay.icon}
          <div className="flex-1">
            <span className="text-sm font-medium">{modeDisplay.label}</span>
            <p className="text-xs text-muted-foreground">{modeDisplay.description}</p>
          </div>
        </div>

        {/* Mode Toggle Buttons */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Settings className="h-3 w-3" />
            Mode Selection
          </h4>

          <div className="grid grid-cols-1 gap-2">
            <Button
              variant={(currentMode === 'navigation' || currentMode === 'drag') ? 'default' : 'outline'}
              size="sm"
              onClick={handleSetNavigationMode}
              className="justify-start"
            >
              <Navigation className="h-3 w-3 mr-2" />

            </Button>

            <Button
              variant={currentMode === 'create' ? 'default' : 'outline'}
              size="sm"
              onClick={handleStartCreation}
              className="justify-start"
            >
              <Plus className="h-3 w-3 mr-2" />
              Add Assets Mode
            </Button>
          </div>
        </div>

        {/* Mode-specific Instructions */}
        {currentMode === 'create' && (
          <div className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
            <p className="text-sm text-orange-800 dark:text-orange-200 font-medium">
              Asset Creation Active
            </p>
            <p className="text-xs text-orange-600 dark:text-orange-300 mt-1">
              Click anywhere on the floorplan to place a new asset
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={onCancelCreation}
              className="w-full mt-2"
            >
              Cancel Creation
            </Button>
          </div>
        )}


        {(currentMode === 'navigation' || currentMode === 'drag') && (
          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">

            </p>
            <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
              Pan and zoom the floorplan. Click assets to view details.
            </p>
          </div>
        )}

        <Separator />

        {/* Pending Changes */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Move className="h-3 w-3" />
            Pending Changes
          </h4>

          {hasUnsavedChanges ? (
            <>
              <div className="flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                <span className="text-sm">
                  {PENDINGCount} asset{PENDINGCount !== 1 ? 's' : ''} modified
                </span>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1"
                >
                  <Save className="h-3 w-3 mr-1" />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onDiscard}
                  disabled={isSaving}
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
              </div>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              No PENDING changes
            </p>
          )}
        </div>

        <Separator />

        {/* Selected Asset Info */}
        {selectedAsset && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <MapPin className="h-3 w-3" />
              Selected Asset
            </h4>

            <div className="p-2 bg-muted/50 rounded-lg space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">ID:</span>
                <span className="font-mono">{selectedAsset.id}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Position:</span>
                <span className="font-mono">
                  {Math.round(selectedAsset.x)}, {Math.round(selectedAsset.y)}
                </span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Drag the asset marker to reposition
            </p>
          </div>
        )}

        {/* Instructions */}
        <div className="space-y-2 pt-2 border-t">
          <h4 className="text-sm font-medium">Instructions</h4>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>• Drag asset markers to reposition them</p>
            <p>• Click "Add New Asset" to place new assets</p>
            <p>• Changes are saved only when you click "Save"</p>
            <p>• Pan and zoom work normally when not creating</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};