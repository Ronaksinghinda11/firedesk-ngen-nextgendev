/**
 * Asset PDF Service
 * 
 * Generates comprehensive PDF reports for individual assets
 * matching the approved mockup design with current theme styling
 */

const moment = require('moment');
const models = require('../../models');
const { Asset, Plant, Category, Product, Manufacturer, AssetSpecValue, SpecDefinition, AssetDocument, ServiceSubmission, Form, Building, Floor, Wing, AssetMetadata } = models;
const { htmlToPdfBuffer } = require('../../utils/pdfGenerator');
const { generateAssetQRValue } = require('../../utils/asset_qr_code_generator');

class AssetPdfService {

  /**
   * Generate PDF report for a single asset
   */
  async generate_asset_pdf(asset_id, options = {}) {
    try {
      // Fetch complete asset data with all associations
      const asset = await Asset.findByPk(asset_id, {
        include: [
          { model: Plant, as: 'plant', attributes: ['id', 'plant_name'] },
          { model: Building, as: 'building', attributes: ['id', 'building_name'] },
          { model: Floor, as: 'floor', attributes: ['id', 'floor_name'] },
          { model: Wing, as: 'wing', attributes: ['id', 'wing_name'] },
          { model: Category, as: 'category', attributes: ['id', 'category_name'] },
          { model: Product, as: 'product', attributes: ['id', 'product_name', 'image'] },
          { model: Manufacturer, as: 'manufacturer', attributes: ['id', 'name'] },
          {
            model: AssetSpecValue,
            as: 'spec_values',
            include: [{
              model: SpecDefinition,
              as: 'spec_definition',
              attributes: ['id', 'spec_label', 'spec_name', 'spec_type', 'spec_unit']
            }]
          },
          { model: AssetDocument, as: 'documents', attributes: ['id', 'document_url', 'description'] },
          { model: AssetMetadata, as: 'metadata', attributes: ['tag', 'serial_number', 'model'] },
          { model: models.AssetTestingSchedule, as: 'testing_schedule' }
        ]
      });

      if (!asset) {
        throw new Error('Asset not found');
      }

      // Fetch active conditions
      let activeConditions = [];
      try {
        const assetHealthService = require('./assetHealthService');
        const conditions = await assetHealthService.getAssetActiveConditions(asset_id);
        activeConditions = (conditions || []).map(ac => ({
          conditionName: ac.condition?.condition_name || 'Unknown',
          severityLevel: ac.severity_level || ac.condition?.severity_level || 'MEDIUM'
        }));
      } catch (err) {
        // Fallback: check if Asset model has activeConditions if fetched differently, or ignore
        // console.warn('Could not fetch active conditions for PDF:', err.message);
      }
      asset.activeConditions = activeConditions;

      // Fetch last 6 services that have already occurred (scheduled_date <= today)
      const { Op } = require('sequelize');
      let service_history = await ServiceSubmission.findAll({
        where: {
          asset_id,
          scheduled_date: {
            [Op.lte]: new Date()
          }
        },
        include: [{
          model: Form,
          as: 'form',
          attributes: ['id', 'service_name']
        }],
        order: [['scheduled_date', 'DESC']],
        limit: 6
      });
      // Reverse to show in chronological order (oldest first)
      service_history = service_history.reverse();

      // Fetch ALL services for percentage calculation
      const all_services = await ServiceSubmission.findAll({
        where: { asset_id },
        attributes: ['status']
      });

      // Calculate service statistics based on ALL services
      // Status values: pending, in_progress, submitted, approved, rejected, cancelled
      const completed_services = all_services.filter(s =>
        ['submitted', 'approved', 'completed'].includes(s.status?.toLowerCase())
      ).length;
      const total_services = all_services.length;
      const completion_rate = total_services > 0 ? Math.round((completed_services / total_services) * 100) : 0;

      // Generate HTML for PDF
      const html = this._generate_html(asset, service_history, completion_rate, { total_services, completed_services });

      // Convert to PDF using Puppeteer
      const pdfBuffer = await htmlToPdfBuffer(html, {
        format: 'A4',
        printBackground: true,
        margin: {
          top: '10mm',
          right: '10mm',
          bottom: '10mm',
          left: '10mm'
        }
      });

      return pdfBuffer;
    } catch (error) {
      console.error('Error generating asset PDF:', error);
      throw error;
    }
  }

  /**
   * Generate HTML template for the PDF - matching old design
   */
  _generate_html(asset, service_history, completion_rate, stats = {}) {
    const format_date = (date) => {
      if (!date) return null;
      return moment(date).format('DD-MM-YYYY');
    };

    // Helper to render a field only if it has a value
    const render_field = (label, value, css_class = '') => {
      if (!value || value === '-' || value === 'null' || value === 'undefined') return '';
      return `
        <div class="field">
          <div class="field-label">${label.toUpperCase()}</div>
          <div class="field-value ${css_class}">${value}</div>
        </div>
      `;
    };

    // Stats text for display
    const total_services = stats.total_services || 0;
    const completed_services = stats.completed_services || 0;
    const stats_text = `${completed_services} of ${total_services} services completed`;

    // Active Conditions Badge Logic
    const active_conditions_html = (asset.activeConditions && asset.activeConditions.length > 0)
      ? asset.activeConditions.map(c => {
        const sevClass = (c.severityLevel || 'MEDIUM').toLowerCase();
        return `<span class="condition-badge ${sevClass}">${c.conditionName}</span>`;
      }).join(' ')
      : '<span class="condition-badge healthy">No Issues</span>';

    // Get spec values - use the selected unit from asset_spec_values.unit
    const spec_fields = [];

    // Add Capacity directly to specs or Asset Info? Let's add to Asset Info or Specs. 
    // Web view has Type/SubType in Specs.
    if (asset.capacity) spec_fields.push({ label: 'Capacity', value: `${asset.capacity} ${asset.capacity_unit || ''}` });

    if (asset.spec_values && asset.spec_values.length > 0) {
      asset.spec_values.forEach(sv => {
        const label = sv.spec_definition?.spec_label || sv.spec_definition?.spec_name || 'Unknown';
        const value = sv.spec_value;
        const selected_unit = sv.unit || '';
        if (value && value !== '' && value !== 'null') {
          spec_fields.push({
            label,
            value: selected_unit ? `${value} ${selected_unit}` : value
          });
        }
      });
    }

    // Generate QR code URL using shared utility for consistency
    const qr_data = generateAssetQRValue(asset);
    const qr_code_url = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(qr_data)}&color=FF6B35`;

    // Get product image if available
    const product_image = asset.product?.image || null;

    // Get metadata
    const metadata = asset.metadata || {};

    // Build dynamic Asset Information fields (matching old PDF layout)
    const asset_info_fields = [
      // 1. Location Group
      { label: 'Asset ID', value: asset.asset_code },
      { label: 'Plant', value: asset.plant?.plant_name },
      { label: 'Building', value: asset.building?.building_name },
      { label: 'Floor', value: asset.floor?.floor_name || asset.floor?.floorName },
      { label: 'Wing', value: asset.wing?.wing_name || asset.wing?.wingName },
      { label: 'Location', value: asset.location },
      // Geolocation coordinates
      { label: 'Latitude', value: asset.latitude ? String(asset.latitude) : null },
      { label: 'Longitude', value: asset.longitude ? String(asset.longitude) : null },

      // 2. Category Group
      { label: 'Category', value: asset.category?.category_name },
      { label: 'Product', value: asset.product?.product_name },
      { label: 'Type', value: asset.type },
      { label: 'Sub Type', value: asset.sub_type },

      // 3. Details Group
      { label: 'Manufacturer', value: asset.manufacturer?.name },
      { label: 'Model', value: metadata.model },
      { label: 'Serial No', value: metadata.serial_number },
      { label: 'Tag', value: metadata.tag },

      // 4. Status Group
      { label: 'Status', value: asset.status, css_class: asset.status === 'ACTIVE' ? 'highlight' : '' },
      {
        label: 'Health Status',
        value: asset.health_status?.replace(/_/g, ' '),
        css_class: asset.health_status === 'HEALTHY' ? 'highlight' : 'overdue'
      },
      { label: 'Maint. Status', value: asset.maintenance_status?.replace(/_/g, '-'), css_class: 'highlight' },
      { label: 'Conditions', value: active_conditions_html }, // Inject HTML directly
    ].filter(f => f.value && f.value !== '' && f.value !== 'null');

    // Build dynamic Dates fields
    // Map web view fields: Mfg, Install, Warranty End, Lifespan, Last HP, Next HP, Frequency, Last Refill, Next Refill
    const schedule = asset.testing_schedule || {};

    const date_fields = [
      { label: 'Manufacturing Date', value: format_date(asset.manufacturing_date) },
      { label: 'Installation Date', value: format_date(asset.install_date) },
      { label: 'Warranty End', value: format_date(asset.warranty_end_date) },
      { label: 'Lifespan', value: asset.lifespan_years ? `${asset.lifespan_years} Years` : null },

      { label: 'Last HP Test', value: format_date(schedule.last_hp_test_date && Array.isArray(schedule.last_hp_test_date) ? schedule.last_hp_test_date[schedule.last_hp_test_date.length - 1] : schedule.last_hp_test_date) },
      { label: 'Next HP Test Due', value: format_date(schedule.next_hp_test_due_date) },
      { label: 'HP Test Frequency', value: schedule.test_frequency_months ? `${schedule.test_frequency_months} Months` : null },

      { label: 'Last Refill', value: format_date(schedule.last_refill_date && Array.isArray(schedule.last_refill_date) ? schedule.last_refill_date[schedule.last_refill_date.length - 1] : schedule.last_refill_date) },
      { label: 'Next Refill', value: format_date(schedule.next_refill_date) },

      // Keep original Inspection Due if distinct, else rely on HP/Refill
      // { label: 'Next Inspection Due', value: format_date(asset.next_inspection_due), css_class: asset.next_inspection_due && moment().isAfter(moment(asset.next_inspection_due)) ? 'overdue' : '' },
    ].filter(f => f.value && f.value !== '' && f.value !== 'null');

    // Generate service history rows
    const service_rows = service_history.length > 0
      ? service_history.map((service, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${format_date(service.scheduled_date) || '-'}</td>
          <td>${service.form?.service_name || '-'}</td>
          <td><span class="status-badge ${(service.status || '').toLowerCase()}">${service.status || '-'}</span></td>
        </tr>
      `).join('')
      : '<tr><td colspan="4" style="text-align: center; color: #666;">No service history available</td></tr>';

    // Helper to render a section only if it has fields
    const render_section = (title, fields) => {
      if (!fields || fields.length === 0) return '';
      return `
        <div class="section">
          <div class="section-title">${title}</div>
          <div class="section-content">
            <div class="grid-3">
              ${fields.map(f => render_field(f.label, f.value, f.css_class || '')).join('')}
            </div>
          </div>
        </div>
      `;
    };

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 10px;
      line-height: 1.4;
      color: #333;
      background: #fff;
    }
    .container { max-width: 800px; margin: 0 auto; padding: 15px 20px; }
    
    /* Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
      padding-bottom: 12px;
      border-bottom: 3px solid #FF6B35;
    }
    .header-left { display: flex; align-items: center; gap: 10px; }
    .product-icon {
      width: 40px; height: 40px;
      background: #FF6B35;
      border-radius: 6px;
      display: flex; align-items: center; justify-content: center;
      color: #fff; font-size: 16px;
    }
    .product-image {
      width: 40px; height: 40px;
      border-radius: 6px;
      overflow: hidden;
      flex-shrink: 0;
      background: #f5f5f5;
    }
    .product-image img {
      width: 100%; height: 100%;
      object-fit: contain;
    }
    .product-title { font-size: 15px; font-weight: 600; color: #333; }
    .date-range { font-size: 9px; color: #666; }
    .qr-code { width: 65px; height: 65px; }
    .qr-code img { width: 100%; height: 100%; }
    
    /* Section styling */
    .section { margin-bottom: 8px; }
    .section-title {
      font-size: 9px; font-weight: 700; color: #333;
      margin-bottom: 8px; text-transform: uppercase;
      border-left: 3px solid #FF6B35;
      padding-left: 8px;
    }
    .section-content {
      background: #f9f9f9;
      padding: 6px 8px;
      border-radius: 4px;
      border: 1px solid #eee;
    }
    
    /* Grid */
    .grid-3 {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px 8px;
    }
    .field { margin-bottom: 4px; }
    .field-label {
      font-size: 8px; color: #888;
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    .field-value { font-size: 10px; font-weight: 500; color: #333; }
    .field-value.highlight { color: #22c55e; font-weight: 600; }
    .field-value.overdue { color: #dc2626; font-weight: 600; }
    
    /* Condition Badges */
    .condition-badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 9px; font-weight: 600;
      margin-right: 4px; border: 1px solid transparent;
    }
    .condition-badge.critical { background: #fee2e2; color: #991b1b; border-color: #fecaca; }
    .condition-badge.high { background: #ffedd5; color: #9a3412; border-color: #fed7aa; }
    .condition-badge.medium { background: #fef9c3; color: #854d0e; border-color: #fde047; }
    .condition-badge.low { background: #dbeafe; color: #1e40af; border-color: #bfdbfe; }
    .condition-badge.healthy { background: #dcfce7; color: #166534; border-color: #bbf7d0; }

    /* Table */
    .data-table { width: 100%; border-collapse: collapse; margin-top: 6px; }
    .data-table th {
      background: #f0f0f0;
      padding: 4px 6px;
      text-align: left;
      font-size: 8px; font-weight: 600;
      color: #666; text-transform: uppercase;
      border-bottom: 1px solid #e0e0e0;
    }
    .data-table td {
      padding: 4px 6px;
      border-bottom: 1px solid #e5e5e5;
      font-size: 9px;
    }
    .data-table tr:nth-child(even) { background: #fafafa; }
    
    /* Status Badge */
    .status-badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 10px;
      font-size: 7px; font-weight: 600;
      text-transform: uppercase;
    }
    .status-badge.completed { background: #dcfce7; color: #166534; }
    .status-badge.pending { background: #fef9c3; color: #854d0e; }
    .status-badge.in_progress { background: #dbeafe; color: #1e40af; }
    .status-badge.scheduled { background: #e0e7ff; color: #4338ca; }
    .status-badge.rejected { background: #fee2e2; color: #991b1b; }
    
    /* Service Trend - RESIZED (Moderately) */
    .trend-section {
      background: #f9f9f9;
      border: 1px solid #eee;
      border-radius: 5px;
      padding: 15px;
      margin-top: 12px;
    }
    .trend-wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .trend-title {
      font-size: 12px;
      font-weight: 600;
      color: #333;
      margin-bottom: 12px;
    }
    .donut-chart { 
      position: relative; 
      width: 80px; /* Reduced from 100px to 80px */
      height: 80px; 
      margin-bottom: 10px;
    }
    .donut-chart svg { transform: rotate(-90deg); overflow: visible; }
    .donut-chart circle { fill: none; stroke-width: 8; }
    .donut-bg { stroke: #1e3a5f; }
    .donut-progress { stroke: #f59e0b; stroke-linecap: round; }
    .donut-text {
      position: absolute; top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      font-size: 16px; font-weight: 700; color: #333;
    }
    .legend { 
      display: flex; 
      justify-content: center;
      gap: 20px; 
      font-size: 10px;
      color: #333;
      margin-top: 8px;
      padding-top: 12px;
      border-top: 1px solid #e5e5e5;
    }
    .legend-item { display: flex; align-items: center; gap: 6px; }
    .legend-dot { width: 12px; height: 12px; border-radius: 2px; }
    .legend-dot.scheduled { background: #1e3a5f; }
    .legend-dot.completed { background: #f59e0b; }
    
    /* Footer */
    .footer {
      margin-top: 15px; padding-top: 10px;
      border-top: 1px solid #ddd;
      text-align: center;
      font-size: 8px; color: #999;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="header-left">
        ${product_image
        ? `<div class="product-image"><img src="${product_image}" alt="Product" /></div>`
        : `<div class="product-icon">⚙</div>`
      }
        <div>
          <div class="product-title">${asset.product?.product_name || asset.asset_code}</div>
          <div class="date-range">${stats_text}</div>
        </div>
      </div>
      <div class="qr-code">
        <img src="${qr_code_url}" alt="QR Code" />
      </div>
    </div>
    
    ${render_section('ASSET INFORMATION', asset_info_fields)}
    
    ${spec_fields.length > 0 ? render_section('TECHNICAL SPECIFICATIONS', spec_fields) : ''}
    
    ${render_section('DATES & TIMELINE', date_fields)}
    
    ${asset.documents && asset.documents.length > 0 ? `
    <div class="section">
      <div class="section-title">DOCUMENTS</div>
      <div class="section-content">
        <p>${asset.documents.length} document(s) attached</p>
      </div>
    </div>
    ` : ''}
    
    <!-- SERVICE HISTORY -->
    <div class="section">
      <div class="section-title">SERVICE HISTORY</div>
      <div class="section-content">
        <table class="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>DATE</th>
              <th>SERVICE TYPE</th>
              <th>STATUS</th>
            </tr>
          </thead>
          <tbody>
            ${service_rows}
          </tbody>
        </table>
      </div>
    </div>
    
    <!-- SERVICE TREND -->
    ${total_services > 0 ? `
    <div class="trend-section">
      <div class="trend-wrapper">
        <div class="trend-title">Service Trend</div>
        <div class="donut-chart">
          <svg viewBox="0 0 42 42" width="80" height="80">
            <circle class="donut-bg" cx="21" cy="21" r="15.915"></circle>
            <circle class="donut-progress" cx="21" cy="21" r="15.915"
              stroke-dasharray="${completion_rate}, 100"></circle>
          </svg>
          <div class="donut-text">${completion_rate}%</div>
        </div>
        <div class="legend">
          <div class="legend-item">
            <div class="legend-dot scheduled"></div>
            <span>Scheduled</span>
          </div>
          <div class="legend-item">
            <div class="legend-dot completed"></div>
            <span>Completed</span>
          </div>
        </div>
      </div>
    </div>
    ` : ''}
    
    <!-- Footer -->
    <div class="footer">
      Generated by Firedesk | ${moment().format('DD MMM YYYY HH:mm')} | Asset: ${asset.asset_code}
    </div>
  </div>
</body>
</html>
    `;
  }
}

module.exports = new AssetPdfService();
