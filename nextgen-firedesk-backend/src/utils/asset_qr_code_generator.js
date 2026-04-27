/**
 * Asset QR Code Generator Utility
 * 
 * Centralized utility for generating consistent QR code data across all asset-related features.
 * This ensures QR codes are identical whether generated from:
 * - View QR modal
 * - Asset detail page
 * - Print label
 * - Bulk QR download
 * - Asset PDF report
 */

/**
 * Generate QR code value for an asset
 * Returns JSON string with asset_id, plant_id, and category_id (all UUIDs)
 * 
 * @param {Object} asset - Asset object with id and relations
 * @returns {String} JSON string for QR code
 */
const generateAssetQRValue = (asset) => {
  // Helper to get category_id from various possible fields
  const getCategoryId = () => {
    if (asset.productCategoryId) return asset.productCategoryId;
    if (asset.category?.id) return asset.category.id;
    if (asset.category_id) return asset.category_id;
    return null;
  };

  // Helper to get plant_id from various possible fields
  const getPlantId = () => {
    if (asset.plantId) return asset.plantId;
    if (asset.plant?.id) return asset.plant.id;
    if (asset.plant_id) return asset.plant_id;
    return null;
  };

  return JSON.stringify({
    asset_id: asset.id,
    plant_id: getPlantId(),
    category_id: getCategoryId()
  });
};

module.exports = {
  generateAssetQRValue
};
