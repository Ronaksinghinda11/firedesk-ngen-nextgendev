/**
 * Bulk QR Print Service
 * Generates PDF with multiple QR code labels for assets
 * For >1000 assets, creates multiple PDFs in a ZIP file
 */
const puppeteer = require('puppeteer');
const QRCode = require('qrcode');
const archiver = require('archiver');
const { Readable } = require('stream');
const { generateAssetQRValue } = require('../../utils/asset_qr_code_generator');
const fs = require('fs');
const path = require('path');

// A4 page dimensions in mm
const A4_WIDTH = 210;
const A4_HEIGHT = 297;
const MARGIN = 10;

// Card aspect ratio (30:50 = 3:5)
const CARD_ASPECT_RATIO = 30 / 50;

/**
 * Generate QR code as data URL
 */
const generate_qr_data_url = async (asset_data) => {
  // Use shared utility for consistent QR format across all features
  const qr_data = generateAssetQRValue(asset_data);

  return await QRCode.toDataURL(qr_data, {
    width: 400,
    margin: 1,
    color: {
      dark: '#FF6B35',
      light: '#ffffff'
    }
  });
};

/**
 * Calculate dimensions for grid layout
 */
const calculate_dimensions = (columns, rows) => {
  const available_width = A4_WIDTH - (MARGIN * 2);
  const available_height = A4_HEIGHT - (MARGIN * 2);

  const gap = Math.max(2, 6 - Math.max(columns, rows) / 2);
  const total_gap_width = gap * Math.max(0, columns - 1);
  const total_gap_height = gap * Math.max(0, rows - 1);

  const space_for_cards_width = available_width - total_gap_width;
  const space_for_cards_height = available_height - total_gap_height;

  const max_card_width = space_for_cards_width / columns;
  const max_card_height = space_for_cards_height / rows;

  let card_width, card_height;
  if (max_card_width / max_card_height > CARD_ASPECT_RATIO) {
    card_height = max_card_height;
    card_width = card_height * CARD_ASPECT_RATIO;
  } else {
    card_width = max_card_width;
    card_height = card_width / CARD_ASPECT_RATIO;
  }

  // Pure percentage-based scaling - matched to modal proportions
  const qr_size = card_height * 0.50;             // 50% - QR is dominant element
  const header_font_size = card_height * 0.05;    // 5% - asset ID
  const detail_font_size = card_height * 0.038;   // 3.8% - detail text
  const footer_text_size = card_height * 0.018;   // 1.8% - tiny "Powered by"
  const footer_logo_size = card_height * 0.075;   // 7.5% - logo size (15% bigger)
  const padding = card_height * 0.02;             // 2% - reduced padding
  const border_radius = card_height * 0.025;      // 2.5% - rounded corners
  const grid_width = (card_width * columns) + total_gap_width;

  return { card_width, card_height, qr_size, gap, header_font_size, detail_font_size, footer_text_size, footer_logo_size, padding, border_radius, grid_width };
};

/**
 * Generate card HTML - Display values only (no labels)
 * Shows: Asset ID, Product + Type, Capacity + Unit, Building, Location
 */
const generate_card_html = (asset, dims, logoBase64) => {
  // Extract capacity and unit from spec_values
  const capacitySpec = asset.spec_values?.find(sv => sv.spec_definition?.spec_name === 'Capacity');
  const capacityValue = capacitySpec?.spec_value || '';
  const capacityUnit = capacitySpec?.unit || '';
  const capacityDisplay = capacityValue && capacityUnit ? `${capacityValue} ${capacityUnit}` : (capacityValue || '-');

  // Product and Type separate
  const productName = asset.product?.product_name || '-';
  const typeName = asset.type || '-';

  return `
  <div class="qr-card">
    <div class="asset-id">${asset.asset_code || '-'}</div>
    <div class="qr-container"><img src="${asset.qr_data_url}" alt="QR" /></div>
    <div class="details">
      <div class="detail-item">${productName}</div>
      <div class="detail-item">${typeName}</div>
      <div class="detail-item">${capacityDisplay || '-'}</div>
      <div class="detail-item">${asset.building?.building_name || '-'}</div>
      <div class="detail-item">${asset.location || '-'}</div>
    </div>
    <div class="footer"><span class="footer-content"><span class="powered-text">Powered by </span><span class="brand-text">Firedesk</span><span class="tm-text">™</span></span></div>
  </div>
`;
};

/**
 * Generate complete HTML
 */
const generate_bulk_qr_html = async (assets, columns = 2, rows = 5) => {
  const dims = calculate_dimensions(columns, rows);
  const cards_per_page = columns * rows;

  // Load and convert logo to base64
  const logoPath = path.join(__dirname, '../../../public/firedesklogo.png');
  let logoBase64 = '';
  try {
    if (fs.existsSync(logoPath)) {
      const logoBuffer = fs.readFileSync(logoPath);
      logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
    }
  } catch (error) {
    console.warn('Could not load logo:', error.message);
  }

  const assets_with_qr = await Promise.all(
    assets.map(async (asset) => ({ ...asset, qr_data_url: await generate_qr_data_url(asset) }))
  );

  const pages = [];
  for (let i = 0; i < assets_with_qr.length; i += cards_per_page) {
    pages.push(assets_with_qr.slice(i, i + cards_per_page));
  }

  const pages_html = pages.map((page_assets) => {
    const cards_html = page_assets.map(asset => generate_card_html(asset, dims, logoBase64)).join('');
    return `<div class="page"><div class="grid">${cards_html}</div></div>`;
  }).join('');

  const available_width = A4_WIDTH - (MARGIN * 2);
  const available_height = A4_HEIGHT - (MARGIN * 2);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Asset QR Labels</title>
  <style>
    @page { size: A4; margin: ${MARGIN}mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; background: white; }
    
    .page {
      width: ${available_width}mm;
      height: ${available_height}mm;
      page-break-after: always;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .page:last-child { page-break-after: auto; }
    
    .grid {
      width: ${dims.grid_width}mm;
      display: grid;
      grid-template-columns: repeat(${columns}, ${dims.card_width}mm);
      gap: ${dims.gap}mm;
    }
    
    .qr-card {
      width: ${dims.card_width}mm;
      height: ${dims.card_height}mm;
      border: 1px solid #d1d5db;
      border-radius: ${dims.border_radius}mm;
      padding: ${dims.padding}mm;
      padding-bottom: ${dims.padding * 2.5}mm;
      background: white;
      display: flex;
      flex-direction: column;
      align-items: center;
      overflow: hidden;
      position: relative;
    }
    
    .asset-id {
      font-size: ${dims.header_font_size}mm;
      text-align: center;
      color: #111827;
      font-weight: 700;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      width: 100%;
      padding-bottom: ${dims.padding * 0.4}mm;
      margin-bottom: ${dims.padding * 0.3}mm;
      border-bottom: 1px solid #e5e7eb;
      flex-shrink: 0;
    }
    
    .qr-container {
      width: ${dims.qr_size}mm;
      height: ${dims.qr_size}mm;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin: ${dims.padding * 0.2}mm 0 ${dims.padding * 0.3}mm;
    }
    .qr-container img { width: 100%; height: 100%; object-fit: contain; }
    
    .details {
      width: ${dims.qr_size}mm;
      font-size: ${dims.detail_font_size * 0.85}mm;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: ${dims.padding * 0.3}mm;
      margin-top: ${dims.padding * 0.5}mm;
      flex-grow: 1;
    }
    
    .detail-item {
      text-align: left;
      color: #374151;
      font-weight: 600;
      width: 100%;
      line-height: 1.15;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .footer {
      width: calc(100% - ${dims.padding * 2}mm);
      height: ${dims.card_height * 0.08}mm;
      position: absolute;
      bottom: ${dims.card_height * 0.04}mm;
      left: ${dims.padding}mm;
      display: flex;
      align-items: center;
      justify-content: center;
      border-top: 1px solid #e5e7eb;
      background: white;
      box-sizing: border-box;
    }
    
    .footer-content {
      display: inline;
      white-space: nowrap;
      line-height: 1;
    }
    
    .powered-text {
      font-size: ${dims.footer_text_size * 1.1}mm;
      color: #6b7280;
      font-weight: 500;
    }
    
    .brand-text {
      font-size: ${dims.footer_logo_size * 0.55}mm;
      font-weight: 700;
      color: #FF6B35;
    }
    
    .tm-text {
      font-size: ${dims.footer_text_size * 1.15}mm;
      font-weight: 500;
      color: #FF6B35;
      position: relative;
      top: -${dims.footer_logo_size * 0.15}mm;
    }
    
    @media print {
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    }
  </style>
</head>
<body>${pages_html}</body>
</html>`;
};

/**
 * Generate PDF with QR codes for multiple assets
 * @param {Array} assets - Array of asset objects
 * @param {Object} options - Options { columns, rows }
 * @returns {Promise<Buffer>} PDF buffer
 */
const generate_single_pdf = async (assets, options = {}) => {
  const { columns = 4, rows = 5 } = options;
  const valid_columns = Math.min(9, Math.max(1, parseInt(columns) || 2));
  const valid_rows = Math.min(9, Math.max(1, parseInt(rows) || 5));

  const html = await generate_bulk_qr_html(assets, valid_columns, valid_rows);
  const { htmlToPdfBuffer } = require('../../utils/pdfGenerator');

  return await htmlToPdfBuffer(html, {
    format: 'A4',
    printBackground: true,
    margin: { top: `${MARGIN}mm`, right: `${MARGIN}mm`, bottom: `${MARGIN}mm`, left: `${MARGIN}mm` }
  });
};

/**
 * Generate PDF or ZIP with QR codes - AUTO SPLIT for >1000 assets
 * @param {Array} assets - Array of asset objects
 * @param {Object} options - Options { columns, rows }
 * @returns {Promise<{buffer: Buffer, isZip: boolean}>} PDF or ZIP buffer
 */
const generate_bulk_qr_pdf = async (assets, options = {}) => {
  const { columns = 4, rows = 5 } = options;

  if (!assets || assets.length === 0) {
    throw new Error('No assets provided');
  }

  const BATCH_SIZE = 1000;

  // Single PDF for ≤1000 assets
  if (assets.length <= BATCH_SIZE) {
    console.log(`[BulkQRPrint] Generating single PDF for ${assets.length} assets`);
    const buffer = await generate_single_pdf(assets, { columns, rows });
    return { buffer, isZip: false };
  }

  // Multiple PDFs in ZIP for >1000 assets
  console.log(`[BulkQRPrint] Generating ${Math.ceil(assets.length / BATCH_SIZE)} PDFs for ${assets.length} assets`);

  // Generate PDFs in parallel batches (3 at a time to avoid memory issues)
  const batches = [];
  for (let i = 0; i < assets.length; i += BATCH_SIZE) {
    batches.push({
      assets: assets.slice(i, Math.min(i + BATCH_SIZE, assets.length)),
      index: Math.floor(i / BATCH_SIZE) + 1
    });
  }

  // Collect all PDF buffers first
  const allPdfBuffers = [];
  const PARALLEL_LIMIT = 3;

  for (let i = 0; i < batches.length; i += PARALLEL_LIMIT) {
    const parallelBatches = batches.slice(i, i + PARALLEL_LIMIT);

    const pdfPromises = parallelBatches.map(async (batch) => {
      const startTime = Date.now();
      const pdfBuffer = await generate_single_pdf(batch.assets, { columns, rows });
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`[BulkQRPrint] PDF ${batch.index}/${batches.length} complete (${batch.assets.length} assets in ${elapsed}s)`);

      // Convert to Buffer if needed
      let buffer = pdfBuffer;
      if (!Buffer.isBuffer(buffer)) {
        console.log(`[BulkQRPrint] PDF ${batch.index} converting to Buffer, type: ${typeof buffer}`);
        buffer = Buffer.from(buffer);
      }

      return { buffer, index: batch.index, count: batch.assets.length };
    });

    const results = await Promise.all(pdfPromises);
    allPdfBuffers.push(...results);
  }

  // Now create ZIP with all collected PDFs
  return new Promise((resolve, reject) => {
    const archive = archiver('zip', { zlib: { level: 6 } });
    const chunks = [];

    archive.on('data', chunk => chunks.push(chunk));
    archive.on('end', () => {
      console.log(`[BulkQRPrint] ZIP created with ${allPdfBuffers.length} PDFs`);
      resolve({ buffer: Buffer.concat(chunks), isZip: true });
    });
    archive.on('error', reject);

    // Add all PDFs to archive
    allPdfBuffers.forEach(({ buffer, index, count }) => {
      const filename = `asset_qr_labels_batch_${index}_${count}_assets.pdf`;

      if (!Buffer.isBuffer(buffer)) {
        return reject(new Error(`Cannot append ${filename}: Not a valid Buffer`));
      }

      archive.append(buffer, { name: filename });
    });

    archive.finalize();
  });
};

module.exports = {
  generate_bulk_qr_pdf,
  generate_bulk_qr_html,
  generate_qr_data_url,
  calculate_dimensions
};
