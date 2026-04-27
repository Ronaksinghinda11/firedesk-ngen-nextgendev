import { api } from './api';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export interface Plant {
    id: string;
    plantName: string;
    address?: string;
}

export interface PerformanceReportData {
    technician: {
        name: string;
        id: string;
        phone: string;
        email: string;
    };
    dateRange: string;
    managers: { name: string; role: string }[];
    plants: string[];
    categories: string[];
    primaryPlant: { name: string; address: string } | null;
    statistics: {
        completed: number;
        lapsed: number;
        pending: number;
        total: number;
        completedPercentage: number;
        lapsedPercentage: number;
    };
    serviceLog: {
        refId: string;
        serviceName: string;
        inspectionType: string;
        location: string;
        date: string;
        status: string;
        statusClass: string;
        remarks: string;
        approvalStatus: string | null;
        approverName: string | null;
        isTicket?: boolean;
    }[];
}

export const performanceReportService = {
    /**
     * Get technician's assigned plants for filtering
     */
    async getMyPlants(): Promise<Plant[]> {
        try {
            const response = await api.get('/technician/performance-report/plants');
            return response.data.plants || [];
        } catch (error) {
            console.error('[PerformanceReport] Failed to fetch plants:', error);
            return [];
        }
    },

    /**
     * Get performance report data from API
     */
    async getReportData(startDate: string, endDate: string, plantId?: string): Promise<PerformanceReportData> {
        let url = `/technician/performance-report/data?startDate=${startDate}&endDate=${endDate}`;
        if (plantId) {
            url += `&plantId=${plantId}`;
        }
        const response = await api.get(url);
        return response.data;
    },

    /**
     * Generate HTML for the performance report
     */
    generateReportHTML(data: PerformanceReportData): string {
        const generatedDate = new Date().toLocaleDateString('en-US', {
            month: 'short',
            day: '2-digit',
            year: 'numeric'
        });

        // Generate managers HTML
        const managersHTML = data.managers.length > 0
            ? data.managers.map(m => `<div>${m.name} <span style="font-size:0.8rem; color:#94a3b8;">(${m.role})</span></div>`).join('')
            : '<div>No managers assigned</div>';

        // Generate plants tags HTML
        const plantsHTML = data.plants.length > 0
            ? data.plants.map(p => `<span class="plant-tag">${p}</span>`).join('')
            : '<span class="plant-tag">No plants assigned</span>';

        // Generate categories tags HTML
        const categoriesHTML = data.categories.length > 0
            ? data.categories.map(c => `<span class="tech-tag">${c}</span>`).join('')
            : '<span class="tech-tag">No categories assigned</span>';

        // Generate service log table rows HTML
        const serviceLogHTML = data.serviceLog.length > 0
            ? data.serviceLog.map(service => {
                let typeColor = '#6366f1';
                const type = service.inspectionType?.toLowerCase() || '';
                if (type.includes('inspection')) typeColor = '#0ea5e9';
                else if (type.includes('testing')) typeColor = '#f59e0b';
                else if (type.includes('maintenance')) typeColor = '#22c55e';

                let remarksHtml = service.remarks;
                if (service.approvalStatus && service.approverName) {
                    if (service.approvalStatus === 'APPROVED') {
                        remarksHtml = `<span style="color: #22c55e; font-weight: 600;">Approved by ${service.approverName}</span>${service.remarks !== '-' ? ': ' + service.remarks : ''}`;
                    } else if (service.approvalStatus === 'REJECTED') {
                        remarksHtml = `<span style="color: #ef4444; font-weight: 600;">Rejected by ${service.approverName}</span>${service.remarks !== '-' ? ': ' + service.remarks : ''}`;
                    }
                }

                let visualIcon = '';

                if (service.isTicket) {
                    // Ticket visual differentiation
                    const tType = (service.inspectionType || '').toLowerCase();
                    if (tType.includes('asset')) typeColor = '#e11d48'; // rose
                    else typeColor = '#d946ef'; // fuchsia

                    // Simple text icon for offline safety or use a unicode char? 
                    // Using FontAwesome might fail if not loaded. Using simple colored text or just the label color.
                    // Or I can embed SVG? Too complex.
                    // I will stick to distinct colors and maybe a pre-label like "TKT".
                    visualIcon = '<span style="color: #d946ef; font-weight: 800; margin-right: 4px;">TKT</span>';
                }

                return `
                <tr style="${service.isTicket ? 'background-color: #fdf4ff;' : ''}">
                    <td style="font-family: monospace; font-weight: 600; color: #3730a3;">${service.refId}</td>
                    <td>${visualIcon}${service.serviceName} <span style="color: ${typeColor}; font-weight: 700; font-size: 0.5rem;">(${service.inspectionType})</span></td>
                    <td>${service.location}</td>
                    <td>${service.date}</td>
                    <td><span class="badge badge-${service.status.toLowerCase()}">${service.status}</span></td>
                    <td class="remarks-col">${remarksHtml}</td>
                </tr>`;
            }).join('')
            : '<tr><td colspan="6" style="text-align: center; color: #94a3b8; padding: 2rem;">No services found in this date range</td></tr>';

        const completedWidth = data.statistics.completedPercentage;
        const lapsedWidth = data.statistics.lapsedPercentage;

        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Technician Performance Report</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 10px; color: #0f172a; background: white; padding: 20px; }
        
        .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: white; padding: 16px 20px; border-radius: 8px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
        .header h1 { font-size: 18px; font-weight: 700; }
        .header p { font-size: 10px; opacity: 0.7; }
        .header-right { text-align: right; }
        .header-right .plant-name { font-size: 14px; font-weight: 700; }
        .header-right .date-range { font-size: 10px; color: #94a3b8; margin-top: 4px; }
        
        .section { margin-bottom: 16px; }
        .section-title { font-size: 11px; font-weight: 700; color: #64748b; margin-bottom: 8px; text-transform: uppercase; }
        
        .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px; }
        .grid-item label { font-size: 8px; color: #64748b; text-transform: uppercase; font-weight: 700; }
        .grid-item .value { font-size: 11px; font-weight: 600; color: #0f172a; margin-top: 4px; }
        
        .tag-container { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
        .tech-tag, .plant-tag { padding: 2px 8px; border-radius: 4px; font-size: 9px; font-weight: 600; }
        .tech-tag { background: #eff6ff; color: #3730a3; }
        .plant-tag { background: #f8fafc; color: #475569; border: 1px solid #e2e8f0; }
        
        .stats-container { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
        .stat-card { padding: 12px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; }
        .stat-label { font-size: 8px; text-transform: uppercase; color: #64748b; font-weight: 700; }
        .stat-value { font-size: 24px; font-weight: 800; margin-top: 4px; }
        .stat-value.success { color: #22c55e; }
        .stat-value.danger { color: #ef4444; }
        
        .progress-bar { height: 12px; background: #e2e8f0; border-radius: 6px; overflow: hidden; display: flex; margin: 8px 0; }
        .progress-segment { height: 100%; }
        .segment-success { background: #22c55e; }
        .segment-danger { background: #ef4444; }
        
        table { width: 100%; border-collapse: collapse; font-size: 9px; }
        th { text-align: left; padding: 8px; background: #f8fafc; color: #64748b; font-weight: 700; font-size: 8px; text-transform: uppercase; border: 1px solid #e2e8f0; }
        td { padding: 8px; border: 1px solid #e2e8f0; vertical-align: top; }
        .remarks-col { color: #64748b; font-style: italic; }
        
        .badge { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 8px; font-weight: 700; text-transform: uppercase; }
        .badge-completed { background: #dcfce7; color: #166534; }
        .badge-lapsed { background: #fee2e2; color: #991b1b; }
        .badge-pending { background: #fff7ed; color: #c2410c; }
        
        .footer { margin-top: 20px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 8px; color: #94a3b8; display: flex; justify-content: space-between; }
    </style>
</head>
<body>
    <div class="header">
        <div>
            <h1>Technician Report</h1>
            <p>Maintenance Performance Review</p>
        </div>
        <div class="header-right">
            <div class="plant-name">${data.primaryPlant?.name || data.plants[0] || 'Plant'}</div>
            <div class="date-range">${data.dateRange}</div>
        </div>
    </div>

    <div class="grid">
        <div class="grid-item">
            <label>Technician Details</label>
            <div class="value">${data.technician.name}</div>
            <div style="font-size: 9px; color: #64748b;">ID: ${data.technician.id}</div>
        </div>
        <div class="grid-item">
            <label>Contact Info</label>
            <div class="value">${data.technician.phone || 'N/A'}</div>
            <div style="font-size: 9px; color: #64748b;">${data.technician.email || 'N/A'}</div>
        </div>
        <div class="grid-item">
            <label>Reporting Managers</label>
            <div class="value">${managersHTML}</div>
        </div>
    </div>

    <div class="grid">
        <div class="grid-item">
            <label>Assigned Plants</label>
            <div class="tag-container">${plantsHTML}</div>
        </div>
        <div class="grid-item" style="grid-column: span 2;">
            <label>Assigned Categories</label>
            <div class="tag-container">${categoriesHTML}</div>
        </div>
    </div>

    <div class="section">
        <div class="stats-container">
            <div class="stat-card">
                <div class="stat-label">Tasks Completed</div>
                <div class="stat-value success">${data.statistics.completed}</div>
                <div style="font-size: 9px; color: #64748b;">${data.statistics.completedPercentage}% of total</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Tasks Lapsed</div>
                <div class="stat-value danger">${data.statistics.lapsed}</div>
                <div style="font-size: 9px; color: #64748b;">${data.statistics.lapsedPercentage}% of total</div>
            </div>
        </div>
        <div style="font-size: 9px; font-weight: 700; color: #64748b; margin-bottom: 4px;">Overall Performance (Total: ${data.statistics.total})</div>
        <div class="progress-bar">
            <div class="progress-segment segment-success" style="width: ${completedWidth}%;"></div>
            <div class="progress-segment segment-danger" style="width: ${lapsedWidth}%;"></div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">Service Log Details</div>
        <table>
            <thead>
                <tr>
                    <th>Ref ID</th>
                    <th>Service Name</th>
                    <th>Location</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Manager Remarks</th>
                </tr>
            </thead>
            <tbody>
                ${serviceLogHTML}
            </tbody>
        </table>
    </div>

    <div class="footer">
        <div>Generated on ${generatedDate}</div>
        <div>${data.primaryPlant ? `${data.primaryPlant.name} | ${data.primaryPlant.address}` : ''}</div>
        <div>Confidential</div>
    </div>
</body>
</html>`;
    },

    /**
     * Generate and open/share PDF
     */
    /**
     * Generate PDF (returns URI)
     */
    async generatePDF(startDate: string, endDate: string, plantId?: string): Promise<string> {
        console.log('[PerformanceReport] Generating PDF...');

        // Get data from API
        const data = await this.getReportData(startDate, endDate, plantId);

        // Generate HTML
        const html = this.generateReportHTML(data);

        // Generate PDF using expo-print
        const { uri } = await Print.printToFileAsync({
            html,
            base64: false
        });

        console.log('[PerformanceReport] PDF generated at:', uri);
        return uri;
    },

    /**
     * View PDF (uses Print Preview as simple viewer)
     */
    async viewPDF(uri: string): Promise<void> {
        try {
            await Print.printAsync({ uri });
        } catch (error) {
            console.error('[PerformanceReport] Failed to view PDF:', error);
            throw new Error('Failed to open PDF viewer');
        }
    },

    /**
     * Share PDF
     */
    async sharePDF(uri: string): Promise<void> {
        if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(uri, {
                mimeType: 'application/pdf',
                dialogTitle: 'Performance Report',
                UTI: 'com.adobe.pdf'
            });
        } else {
            throw new Error('Sharing is not available on this device');
        }
    }
};
