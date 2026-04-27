/**
 * Utility functions for generating QR codes for assets
 */

/**
 * Generate QR code value for an asset
 * Uses UUIDs for asset_id, plant_id, and category_id for security
 */
export const generateAssetQRValue = (asset: any): string => {
  // Helper to get category ID from various possible locations
  const getCategoryId = () => {
    if (asset.productCategoryId) return asset.productCategoryId;
    if (asset.categoryObj?.id) return asset.categoryObj.id;
    if (asset.category?.id) return asset.category.id;
    if (asset.category_id) return asset.category_id;
    return null;
  };

  // Helper to get plant ID from various possible locations
  const getPlantId = () => {
    return asset.plantId || 
           asset.plantObj?.id || 
           asset.plant_id || 
           asset.plant?.id || 
           null;
  };

  const qr_data = {
    asset_id: asset.id,
    plant_id: getPlantId(),
    category_id: getCategoryId()
  };
  return JSON.stringify(qr_data);
};
