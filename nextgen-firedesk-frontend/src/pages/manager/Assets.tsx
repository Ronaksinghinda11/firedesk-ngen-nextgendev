/**
 * Manager Assets Page
 *
 * Displays assets from plants assigned to the current manager.
 * Uses GenericEntityPage template with the same configuration as Admin Assets.
 * Managers can view and manage assets from their assigned plants.
 */

import GenericEntityPage, { EntityConfig } from '@/components/generic/GenericEntityPage';
import { assetsConfig, QRPrintModal } from '@/pages/admin/Assets';

export default function ManagerAssets() {
  // Plant filter now handled automatically by GenericEntityPage
  // Disable archive for manager module
  const configWithPlantFilter: EntityConfig = {
    ...assetsConfig,
    enablePlantFilter: true,
    supportsArchive: false, // No archive support in manager module
    hideListingRowKebab: true, // Hide kebab menu from grid view rows
  };

  return (
    <>
      <GenericEntityPage config={configWithPlantFilter} />
      <QRPrintModal />
    </>
  );
}
