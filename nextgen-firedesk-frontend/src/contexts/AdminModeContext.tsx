import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import type { Asset } from '@/data/mockFloorplanAssets';

type AdminMode = 'navigation' | 'drag' | 'create';

interface AdminModeContextType {
  isAdminMode: boolean;
  currentMode: AdminMode;
  PENDINGChanges: Map<string, { x: number, y: number }>;
  isCreatingAsset: boolean;
  isDragMode: boolean;
  hasUnsavedChanges: boolean;
  setMode: (mode: AdminMode) => void;
  updateAssetPosition: (assetId: string, coords: { x: number, y: number }) => void;
  startAssetCreation: () => void;
  enableDragMode: () => void;
  setNavigationMode: () => void;
  cancelAssetCreation: () => void;
  createAsset: (coords: { x: number, y: number }) => void;
  saveChanges: () => Promise<void>;
  discardChanges: () => void;
  getAssetChanges: (assetId: string) => { x: number, y: number } | undefined;
  getPendingChangesCount: () => number;
}

const AdminModeContext = createContext<AdminModeContextType | undefined>(undefined);

interface AdminModeProviderProps {
  children: ReactNode;
  onSaveChanges?: (changes: Array<{ id: string, x: number, y: number }>) => Promise<void>;
  onCreateAsset?: (coords: { x: number, y: number }) => void;
}

export const AdminModeProvider: React.FC<AdminModeProviderProps> = ({
  children,
  onSaveChanges,
  onCreateAsset
}) => {
  const { user } = useAuth();
  const [PENDINGChanges, setPendingChanges] = useState<Map<string, { x: number, y: number }>>(new Map());
  const [currentMode, setCurrentMode] = useState<AdminMode>('navigation');

  // Check if user has admin permissions
  const isAdminMode = Boolean(
    user?.userType === 'admin' ||
    user?.permissions?.includes('asset_management') ||
    user?.permissions?.includes('floorplan_edit')
  );

  const hasUnsavedChanges = PENDINGChanges.size > 0;
  const isCreatingAsset = currentMode === 'create';
  const isDragMode = currentMode === 'drag';

  const updateAssetPosition = useCallback((assetId: string, coords: { x: number, y: number }) => {
    if (!isAdminMode) return;

    setPendingChanges(prev => {
      const newChanges = new Map(prev);
      newChanges.set(assetId, coords);
      return newChanges;
    });
  }, [isAdminMode]);

  const setMode = useCallback((mode: AdminMode) => {
    if (!isAdminMode) return;
    setCurrentMode(mode);
  }, [isAdminMode]);

  const startAssetCreation = useCallback(() => {
    if (!isAdminMode) return;
    setCurrentMode('create');
  }, [isAdminMode]);

  const enableDragMode = useCallback(() => {
    if (!isAdminMode) return;
    setCurrentMode('drag');
  }, [isAdminMode]);

  const setNavigationMode = useCallback(() => {
    if (!isAdminMode) return;
    setCurrentMode('navigation');
  }, [isAdminMode]);

  const cancelAssetCreation = useCallback(() => {
    setCurrentMode('navigation');
  }, []);

  const createAsset = useCallback((coords: { x: number, y: number }) => {
    if (!isAdminMode) return;

    setCurrentMode('navigation');
    onCreateAsset?.(coords);
  }, [isAdminMode, onCreateAsset]);

  const saveChanges = useCallback(async () => {
    if (!isAdminMode || PENDINGChanges.size === 0) return;

    try {
      const changes = Array.from(PENDINGChanges.entries()).map(([id, coords]) => ({
        id,
        x: coords.x,
        y: coords.y
      }));

      await onSaveChanges?.(changes);
      setPendingChanges(new Map());
    } catch (error) {
      console.error('Failed to save changes:', error);
      throw error;
    }
  }, [isAdminMode, PENDINGChanges, onSaveChanges]);

  const discardChanges = useCallback(() => {
    setPendingChanges(new Map());
    setCurrentMode('navigation');
  }, []);

  const getAssetChanges = useCallback((assetId: string) => {
    return PENDINGChanges.get(assetId);
  }, [PENDINGChanges]);

  const getPendingChangesCount = useCallback(() => {
    return PENDINGChanges.size;
  }, [PENDINGChanges]);

  const value: AdminModeContextType = {
    isAdminMode,
    currentMode,
    PENDINGChanges,
    isCreatingAsset,
    isDragMode,
    hasUnsavedChanges,
    setMode,
    updateAssetPosition,
    startAssetCreation,
    enableDragMode,
    setNavigationMode,
    cancelAssetCreation,
    createAsset,
    saveChanges,
    discardChanges,
    getAssetChanges,
    getPendingChangesCount
  };

  return (
    <AdminModeContext.Provider value={value}>
      {children}
    </AdminModeContext.Provider>
  );
};

export const useAdminMode = (): AdminModeContextType => {
  const context = useContext(AdminModeContext);
  if (context === undefined) {
    throw new Error('useAdminMode must be used within an AdminModeProvider');
  }
  return context;
};
