// // const safeGet = require('../utils/safeGet');
// const { getStatusClass } = require('../helpers/statusHelper');

const { getStatusClass } = require("../../../utils/helpers/statusHelper");
const safeGet = require("../../../utils/safeGet");

/**
 * Generate HTML report template with orange/slate theme
 *
 * @param {Object} config - Configuration object
 * @param {string} config.title - Report title
 * @param {string} config.subtitle - Report subtitle
 * @param {Object} config.meta - Meta information (date range, service type, plant, address, etc.)
 * @param {Object} config.stats - Statistics object with metrics
 * @param {string} config.statsHTML - Pre-generated stats HTML
 * @param {Array} config.columns - Column definitions array
 * @param {Object} config.columnDefs - Column definitions object
 * @param {Array} config.data - Data rows
 * @param {string} config.serviceType - Service type for column-specific rendering
 * @returns {string} - Complete HTML document
 */
function generateReportHTML(config) {
    const {
        title,
        subtitle,
        meta,
        statsHTML,
        columns,
        columnDefs,
        data,
        serviceType
    } = config;

    // Generate table headers
    const tableHeaders = columns
        .map(col => `<th>${columnDefs[col].label}</th>`)
        .join('');

    // Generate table rows
    const tableRows = data.map(row => {
        const cells = columns.map(col => {
            const colConfig = columnDefs[col];
            let value = safeGet(row, colConfig.path);

            // Format based on type
            if (colConfig.isDate && value !== 'N/A') {
                const dateValue = new Date(value);
                return `<td><span class="date-badge">${dateValue.toLocaleDateString()}</span></td>`;
            } else if (colConfig.isStatus) {
                const statusClass = getStatusClass(value, col);
                return `<td><span class="status-badge ${statusClass}">${value}</span></td>`;
            } else if (col === 'assetId') {
                return `<td><strong>${value}</strong></td>`;
            } else if (colConfig.align === 'center') {
                return `<td style="text-align: center;">${value}</td>`;
            } else if (colConfig.maxWidth) {
                return `<td style="font-size: 9px; max-width: ${colConfig.maxWidth};">${value}</td>`;
            } else {
                return `<td>${value}</td>`;
            }
        });

        return `<tr>${cells.join('')}</tr>`;
    }).join('');

    // Generate complete HTML
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Segoe UI', Arial, sans-serif;
          font-size: 11px;
          color: #333;
          line-height: 1.4;
        }
        .container {
          padding: 20px;
          max-width: 100%;
        }
        .header {
          text-align: center;
          margin-bottom: 20px;
          border-bottom: 3px solid #fb923c;
          padding-bottom: 15px;
        }
        .header h1 {
          font-size: 24px;
          color: #475569;
          margin-bottom: 5px;
        }
        .header p {
          color: #666;
          font-size: 10px;
          margin: 3px 0;
        }
        .report-meta {
          display: flex;
          justify-content: space-between;
          margin-bottom: 15px;
          padding: 10px;
          background-color: #f8fafc;
          border-radius: 4px;
          font-size: 10px;
        }
        .meta-item {
          flex: 1;
        }
        .meta-label {
          font-weight: 600;
          color: #475569;
          margin-bottom: 2px;
        }
        .meta-value {
          color: #555;
        }
        .stats-section {
          margin-bottom: 15px;
          padding: 10px;
          background-color: #ffedd5;
          border-left: 4px solid #fb923c;
          border-radius: 4px;
        }
        .stats-section h3 {
          color: #475569;
          font-size: 12px;
          margin-bottom: 8px;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
        }
        .stat-box {
          background: white;
          padding: 8px;
          border-radius: 4px;
          text-align: center;
          border: 1px solid #fdba74;
        }
        .stat-value {
          font-size: 18px;
          font-weight: bold;
          color: #f97316;
        }
        .stat-label {
          font-size: 9px;
          color: #666;
          margin-top: 2px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
          background: white;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        thead {
          background: #ffedd5;
          color: #475569;
        }
        th {
          padding: 10px 8px;
          text-align: left;
          font-weight: 600;
          border: 1px solid #fdba74;
          font-size: 10px;
        }
        td {
          padding: 8px;
          border: 1px solid #ddd;
          font-size: 10px;
        }
        tbody tr:nth-child(even) {
          background-color: #f9f9f9;
        }
        tbody tr:hover {
          background-color: #f0f0f0;
        }
        .footer {
          margin-top: 20px;
          padding-top: 10px;
          border-top: 1px solid #ddd;
          text-align: center;
          font-size: 9px;
          color: #999;
        }
        .no-data {
          text-align: center;
          padding: 20px;
          color: #666;
          font-style: italic;
        }
        .date-badge {
          background: #475569;
          color: white;
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 9px;
        }
        .status-badge {
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 9px;
          font-weight: 500;
        }
        .status-overdue {
          background-color: #fee2e2;
          color: #b91c1c;
        }
        .status-due-soon {
          background-color: #fef3c7;
          color: #92400e;
        }
        .status-ok {
          background-color: #dcfce7;
          color: #15803d;
        }
        .status-neutral {
          background-color: #e5e7eb;
          color: #374151;
        }
        .status-warning {
          background-color: #fce7f3;
          color: #9f1239;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${title}</h1>
          ${subtitle ? `<p>${subtitle}</p>` : ''}
        </div>

        <div class="report-meta">
          ${meta.reportPeriod ? `
            <div class="meta-item">
              <div class="meta-label">Report Period</div>
              <div class="meta-value">${meta.reportPeriod}</div>
            </div>
          ` : ''}
          ${meta.serviceType ? `
            <div class="meta-item">
              <div class="meta-label">Service Type</div>
              <div class="meta-value">${meta.serviceType}</div>
            </div>
          ` : ''}
          ${meta.generatedOn ? `
            <div class="meta-item">
              <div class="meta-label">Generated On</div>
              <div class="meta-value">${meta.generatedOn}</div>
            </div>
          ` : ''}
          ${meta.plant ? `
            <div class="meta-item">
              <div class="meta-label">Plant</div>
              <div class="meta-value">${meta.plant}</div>
            </div>
          ` : ''}
          ${meta.address ? `
            <div class="meta-item">
              <div class="meta-label">Address</div>
              <div class="meta-value">${meta.address}</div>
            </div>
          ` : ''}
        </div>

        ${statsHTML ? `
          <div class="stats-section">
            <h3>Summary Statistics</h3>
            <div class="stats-grid">
              ${statsHTML}
            </div>
          </div>
        ` : ''}

        ${data.length > 0 ? `
          <table>
            <thead>
              <tr>${tableHeaders}</tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        ` : `
          <div class="no-data">
            No data found for the selected criteria
          </div>
        `}

        <div class="footer">
          <p>This is an automated report. For more information, contact your administrator.</p>
          <p>Report ID: ${Date.now()}</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

module.exports = generateReportHTML;
