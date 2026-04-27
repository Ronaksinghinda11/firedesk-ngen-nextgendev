/**
 * Technician Performance Report PDF Service
 * Generates performance report PDFs using Puppeteer
 */

const puppeteer = require('puppeteer');
const { ServiceSubmission, ServiceTechnician, Asset, Form, InspectionFrequency, Plant, Technician, User, Manager, Category, Ticket } = require('../../models');
const { Op } = require('sequelize');

/**
 * Escape HTML special characters
 */
const escapeHtml = (text) => {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

/**
 * Format date for display
 */
const formatDate = (date, format = 'short') => {
    if (!date) return 'N/A';
    const d = new Date(date);

    if (format === 'short') {
        return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
    }

    return d.toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric'
    });
};

/**
 * Format date range for header
 */
const formatDateRange = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    return `${start.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}`;
};

/**
 * Get technician performance data for the report
 * @param {string} plantId - Optional plant filter
 */
const get_technician_performance_data = async (technicianId, startDate, endDate, plantId = null) => {
    // Convert dates
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Get technician with user details and related data using defined associations
    const technician = await Technician.findByPk(technicianId, {
        include: [
            {
                model: User,
                as: 'user',
                attributes: ['id', 'name', 'email', 'phone']
            },
            {
                model: Manager,
                as: 'managers',
                include: [{
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name']
                }]
            },
            {
                model: Plant,
                as: 'plants',
                attributes: ['id', 'plant_name', 'address_line1']
            },
            {
                model: Category,
                as: 'categories',
                attributes: ['id', 'category_name']
            }
        ]
    });

    if (!technician) {
        throw new Error('Technician not found');
    }

    // Get organization user (customer) details
    const orgUser = await User.findByPk(technician.org_user_id, {
        attributes: ['id', 'name', 'email']
    });

    // Extract managers from the technician's associations
    const managers = (technician.managers || []).map(m => ({
        name: m.user?.name || 'Unknown',
        role: 'Manager'
    }));

    // Extract plants from the technician's associations
    const plants = (technician.plants || []).map(p => p.plant_name || 'Unknown');

    // Extract categories from the technician's associations  
    const categories = (technician.categories || []).map(c => c.category_name || 'Unknown');

    // Get primary plant details for footer
    const primaryPlant = technician.plants && technician.plants.length > 0 ? technician.plants[0] : null;

    // Get service IDs from the junction table (for multi-technician assignments)
    const junctionAssignments = await ServiceTechnician.findAll({
        where: { technician_id: technicianId },
        attributes: ['service_id']
    });
    const junctionServiceIds = junctionAssignments.map(a => a.service_id);

    // Get service statistics within date range
    // Use OR to match services assigned to OR submitted by this technician, or in junction table
    const whereClause = {
        [Op.or]: [
            { technician_id: technicianId },
            { submitted_by: technicianId },
            { id: { [Op.in]: junctionServiceIds } }
        ],
        scheduled_date: {
            [Op.between]: [start, end]
        },
        ...(plantId && { plant_id: plantId })
    };

    // Count completed services (both status and approval_status, case-insensitive)
    const completedCount = await ServiceSubmission.count({
        where: {
            ...whereClause,
            [Op.or]: [
                { status: { [Op.in]: ['COMPLETED', 'SUBMITTED', 'APPROVED', 'completed', 'submitted', 'approved'] } },
                { approval_status: { [Op.in]: ['APPROVED', 'approved'] } }
            ]
        }
    });

    // Count lapsed services (scheduled before today and still pending/in-progress)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lapsedCount = await ServiceSubmission.count({
        where: {
            [Op.or]: [
                { technician_id: technicianId },
                { submitted_by: technicianId },
                { id: { [Op.in]: junctionServiceIds } }
            ],
            scheduled_date: {
                [Op.lt]: today,
                [Op.gte]: start
            },
            status: {
                [Op.in]: ['PENDING', 'IN_PROGRESS', 'pending', 'in_progress', 'draft']
            },
            ...(plantId && { plant_id: plantId })
        }
    });

    // Count pending services (scheduled for today or future, not completed)
    const pendingCount = await ServiceSubmission.count({
        where: {
            [Op.or]: [
                { technician_id: technicianId },
                { submitted_by: technicianId },
                { id: { [Op.in]: junctionServiceIds } }
            ],
            scheduled_date: {
                [Op.gte]: today,
                [Op.lte]: end
            },
            status: {
                [Op.in]: ['PENDING', 'IN_PROGRESS', 'pending', 'in_progress', 'draft']
            },
            ...(plantId && { plant_id: plantId })
        }
    });

    // --- Ticket Statistics ---
    let ticketsCompletedCount = 0;
    let ticketsLapsedCount = 0;
    let ticketsPendingCount = 0;
    let tickets = [];

    // Only query tickets if the Ticket model exists
    if (Ticket) {
        try {
            const ticketWhere = {
                technician_id: technicianId, // technician record ID
                target_date: {
                    [Op.between]: [start, end]
                },
                ...(plantId && { plant_id: plantId })
            };

            ticketsCompletedCount = await Ticket.count({
                where: {
                    ...ticketWhere,
                    completed_status: 'Completed'
                }
            });

            ticketsLapsedCount = await Ticket.count({
                where: {
                    ...ticketWhere,
                    target_date: { [Op.lt]: today },
                    completed_status: { [Op.in]: ['Pending', 'Rejected', 'Waiting for approval'] }
                }
            });

            ticketsPendingCount = await Ticket.count({
                where: {
                    ...ticketWhere,
                    target_date: { [Op.gte]: today },
                    completed_status: { [Op.in]: ['Pending', 'Rejected', 'Waiting for approval'] }
                }
            });

            // Get detailed tickets
            tickets = await Ticket.findAll({
                where: ticketWhere,
                include: [
                    {
                        model: Asset,
                        as: 'asset',
                        attributes: ['id', 'asset_code', 'location'],
                        required: false,
                        include: [{
                            model: Plant,
                            as: 'plant',
                            attributes: ['id', 'plant_name'],
                            required: false
                        }]
                    }
                ],
                order: [['target_date', 'ASC']]
            });
        } catch (ticketError) {
            console.log('[Performance Report] Ticket query skipped:', ticketError.message);
        }
    }

    // Combined Statistics
    const finalCompleted = completedCount + ticketsCompletedCount;
    const finalLapsed = lapsedCount + ticketsLapsedCount;
    const finalPending = pendingCount + ticketsPendingCount;
    const totalCount = finalCompleted + finalLapsed + finalPending;

    // Get detailed service log (limited to recent entries)
    const services = await ServiceSubmission.findAll({
        where: whereClause,
        include: [
            {
                model: Asset,
                as: 'asset',
                attributes: ['id', 'asset_code', 'location'],
                required: false,
                include: [{
                    model: Plant,
                    as: 'plant',
                    attributes: ['id', 'plant_name'],
                    required: false
                }]
            },
            {
                model: Form,
                as: 'form',
                attributes: ['id', 'service_name', 'form_code'],
                required: false
            },
            {
                model: InspectionFrequency,
                as: 'inspectionFrequency',
                attributes: ['id', 'frequency_name'],
                required: false
            },
            {
                model: Manager,
                as: 'approver',
                attributes: ['id'],
                required: false,
                include: [{
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name'],
                    required: false
                }]
            }
        ],
        order: [['scheduled_date', 'ASC']]
    });

    // Map service log entries
    const serviceLogItems = services.map(service => {
        let status = 'Pending';
        let statusClass = 'badge-pending';

        // Check status (case-insensitive) and approval_status
        const serviceStatus = (service.status || '').toUpperCase();
        const approvalStatus = (service.approval_status || '').toUpperCase();

        if (['COMPLETED', 'SUBMITTED', 'APPROVED'].includes(serviceStatus) || approvalStatus === 'APPROVED') {
            status = 'Completed';
            statusClass = 'badge-completed';
        } else if (['PENDING', 'IN_PROGRESS', 'DRAFT'].includes(serviceStatus) && new Date(service.scheduled_date) < today) {
            status = 'Lapsed';
            statusClass = 'badge-lapsed';
        }

        return {
            refId: `#SRV-${String(service.submission_number || '000').padStart(3, '0')}`,
            serviceName: service.form?.service_name || 'Service',
            inspectionType: service.inspection_type || 'Maintenance',
            isTicket: false,
            location: `${service.asset?.plant?.plant_name || 'N/A'} / ${service.asset?.location || 'N/A'}`,
            date: formatDate(service.scheduled_date),
            rawDate: new Date(service.scheduled_date),
            status,
            statusClass,
            remarks: service.approval_remarks || service.technician_remarks || '-',
            approvalStatus: service.approval_status || null,
            approverName: service.approver?.user?.name || null
        };
    });

    // Map ticket log entries
    const ticketLogItems = tickets.map(ticket => {
        let status = 'Pending';
        let statusClass = 'badge-pending';

        if (ticket.completed_status === 'Completed') {
            status = 'Completed';
            statusClass = 'badge-completed';
        } else if (new Date(ticket.target_date) < today) {
            status = 'Lapsed';
            statusClass = 'badge-lapsed';
        }

        return {
            refId: `#TKT-${String(ticket.ticket_id || ticket.id.slice(0, 4)).padStart(3, '0')}`,
            serviceName: ticket.task_name,
            inspectionType: ticket.ticket_type || 'Ticket',
            isTicket: true,
            location: `${ticket.asset?.plant?.plant_name || 'N/A'} / ${ticket.asset?.location || 'N/A'}`,
            date: formatDate(ticket.target_date),
            rawDate: new Date(ticket.target_date),
            status,
            statusClass,
            remarks: ticket.task_description || '-'
        };
    });

    // Combine and Sort
    const serviceLog = [...serviceLogItems, ...ticketLogItems].sort((a, b) => a.rawDate - b.rawDate);

    return {
        technician: {
            name: technician.user?.name || 'Unknown',
            id: technician.technician_code || technician.id,
            phone: technician.user?.phone || 'N/A',
            email: technician.user?.email || 'N/A'
        },
        organization: {
            name: orgUser?.name || 'Organization'
        },
        dateRange: formatDateRange(startDate, endDate),
        managers,
        plants,
        categories,
        primaryPlant: primaryPlant ? {
            name: primaryPlant.plant_name,
            address: primaryPlant.address_line1 || 'Address not available'
        } : null,
        statistics: {
            completed: finalCompleted,
            lapsed: finalLapsed,
            pending: finalPending,
            total: totalCount,
            completedPercentage: totalCount > 0 ? Math.round((finalCompleted / totalCount) * 100) : 0,
            lapsedPercentage: totalCount > 0 ? Math.round((finalLapsed / totalCount) * 100) : 0
        },
        serviceLog
    };
};

/**
 * Generate HTML for the performance report
 */
const generatePerformanceReportHTML = (data) => {
    const generatedDate = new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric'
    });

    // Generate managers HTML
    const managersHTML = data.managers.length > 0
        ? data.managers.map(m => `<div>${escapeHtml(m.name)} <span style="font-size:0.8rem; color:#94a3b8; font-weight:500;">(${m.role})</span></div>`).join('')
        : '<div>No managers assigned</div>';

    // Generate plants tags HTML
    const plantsHTML = data.plants.length > 0
        ? data.plants.map(p => `<span class="plant-tag">${escapeHtml(p)}</span>`).join('')
        : '<span class="plant-tag">No plants assigned</span>';

    // Generate categories tags HTML
    const categoriesHTML = data.categories.length > 0
        ? data.categories.map(c => `<span class="tech-tag">${escapeHtml(c)}</span>`).join('')
        : '<span class="tech-tag">No categories assigned</span>';

    // Generate service/ticket log table rows HTML
    const serviceLogHTML = data.serviceLog.length > 0
        ? data.serviceLog.map(service => {
            // Determine color for inspection type and visual differentiation for Tickets
            let typeColor = '#6366f1'; // default purple
            let visualIcon = '';

            if (service.isTicket) {
                // Ticket visual differentiation
                const tType = (service.inspectionType || '').toLowerCase();
                if (tType.includes('asset')) typeColor = '#e11d48'; // rose for asset tickets
                else typeColor = '#d946ef'; // fuchsia for general tickets

                visualIcon = '<i class="fa-solid fa-ticket" style="margin-right: 4px; color: #d946ef;"></i>';
            } else {
                // Service logic
                const type = (service.inspectionType || '').toLowerCase();
                if (type.includes('inspection')) typeColor = '#0ea5e9'; // blue
                else if (type.includes('testing')) typeColor = '#f59e0b'; // amber
                else if (type.includes('maintenance')) typeColor = '#22c55e'; // green
            }

            // Build remarks with approval status
            let remarksHtml = escapeHtml(service.remarks);
            if (service.approvalStatus && service.approverName) {
                if (service.approvalStatus === 'APPROVED') {
                    remarksHtml = `<span style="color: #22c55e; font-weight: 600;">Approved by ${escapeHtml(service.approverName)}</span>${service.remarks !== '-' ? ': ' + escapeHtml(service.remarks) : ''}`;
                } else if (service.approvalStatus === 'REJECTED') {
                    remarksHtml = `<span style="color: #ef4444; font-weight: 600;">Rejected by ${escapeHtml(service.approverName)}</span>${service.remarks !== '-' ? ': ' + escapeHtml(service.remarks) : ''}`;
                }
            }

            // row style for ticket
            const rowStyle = service.isTicket ? 'background-color: #fdf4ff;' : ''; // Very subtle purple tint for tickets

            return `
        <tr style="${rowStyle}">
          <td style="font-family: monospace; font-weight: 600; color: var(--primary-dark);">${escapeHtml(service.refId)}</td>
          <td>${visualIcon} ${escapeHtml(service.serviceName)} <span style="color: ${typeColor}; font-weight: 700; font-size: 0.5rem;">(${escapeHtml(service.inspectionType)})</span></td>
          <td>${escapeHtml(service.location)}</td>
          <td>${escapeHtml(service.date)}</td>
          <td><span class="badge ${service.statusClass}">${service.status}</span></td>
          <td class="remarks-col">${remarksHtml}</td>
        </tr>
      `;
        }).join('')
        : `<tr><td colspan="6" style="text-align: center; color: #94a3b8; padding: 2rem;">No services or tickets found in this date range</td></tr>`;

    // Calculate progress bar widths
    const completedWidth = data.statistics.completedPercentage;
    const lapsedWidth = data.statistics.lapsedPercentage;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Technician Performance Report</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">

    <style>
        @page {
            margin-top: 25mm;
            margin-bottom: 10mm;
            @top-center {
                content: "${escapeHtml(data.primaryPlant?.name || '')} | ${escapeHtml(data.primaryPlant?.address || '')} | Generated ${generatedDate}";
                font-family: 'Inter', sans-serif;
                font-size: 8px;
                color: #64748b;
            }
        }

        :root {
            --primary: #4F46E5;
            --primary-dark: #3730a3;
            --secondary: #64748b;
            
            /* Visual Colors */
            --success-bright: #22c55e;
            --success-bg: #dcfce7;
            --success-text: #166534;
            --danger-bright: #ef4444;
            --danger-bg: #fee2e2;
            --danger-text: #991b1b;
            
            --card-border: #e2e8f0;
            --text-main: #0f172a;
            --text-muted: #64748b;
        }

        @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; }
            .page-container { box-shadow: none; border: none; margin: 0; width: 100%; max-width: 100%; border-radius: 0; }
            .report-body { padding-bottom: 3rem; }
            .table-section { page-break-inside: auto; margin-bottom: 3rem; }
            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; page-break-after: auto; }
            thead { display: table-header-group; }
            tfoot { display: table-footer-group; }
        }

        /* Page break handling */
        .table-section { page-break-inside: auto; }
        table { page-break-inside: auto; }
        tr { page-break-inside: avoid; page-break-after: auto; }
        thead { display: table-header-group; }
        tfoot { display: table-footer-group; }

        body {
            font-family: 'Inter', sans-serif;
            background-color: white;
            color: var(--text-main);
            margin: 0;
            padding: 0;
        }

        .page-container {
            width: 100%;
            max-width: 100%;
            background: white;
            border-radius: 0;
            box-shadow: none;
            border: none;
            display: flex;
            flex-direction: column;
            min-height: 100vh;
        }

        /* --- HEADER --- */
        .report-header {
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            color: white;
            padding: 1.25rem 2.5rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 3px solid var(--primary);
        }

        .header-left h1 {
            font-size: 1.2rem;
            font-weight: 700;
            margin: 0;
            letter-spacing: -0.02em;
            line-height: 1.1;
        }
        
        .header-left p {
            margin: 2px 0 0 0;
            opacity: 0.7;
            font-size: 0.65rem;
            font-weight: 400;
        }

        .header-right {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 12px;
        }

        .customer-branding {
            display: flex;
            align-items: center;
            gap: 12px;
            background: rgba(255, 255, 255, 0.05);
            padding: 8px 16px 8px 12px;
            border-radius: 8px;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .customer-logo {
            height: 32px;
            width: auto;
            display: block;
        }

        .customer-name {
            font-size: 1.1rem;
            font-weight: 700;
            color: #ffffff;
            letter-spacing: 0.02em;
        }

        .report-meta {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 0.85rem;
            color: #cbd5e1;
            font-weight: 500;
        }
        
        .report-meta i { color: var(--primary); }

        .report-body { padding: 1.5rem 2.5rem; flex: 1; }

        /* --- Tech Grid --- */
        .tech-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 1rem 1rem;
            margin-bottom: 1.5rem;
            padding-bottom: 1rem;
            border-bottom: 1px dashed #e2e8f0;
        }

        .tech-item h3 {
            font-size: 0.55rem;
            text-transform: uppercase;
            color: var(--text-muted);
            margin: 0 0 0.4rem 0;
            font-weight: 700;
            letter-spacing: 0.05em;
            display: flex; align-items: center; gap: 4px;
        }
        .tech-item h3 i { color: var(--primary); background: #e0e7ff; padding: 3px; border-radius: 4px; font-size: 0.7em;}
        .tech-data { font-size: 0.75rem; font-weight: 600; color: var(--text-main); line-height: 1.4; }
        .contact-row { display: flex; align-items: center; gap: 6px; font-size: 0.65rem; margin-bottom: 3px; font-weight: 500; color: var(--secondary);}
        .contact-row i { color: var(--text-muted); font-size: 0.75em; }
        .tag-container { display: flex; flex-wrap: wrap; gap: 4px; }
        .tech-tag, .plant-tag { padding: 2px 6px; border-radius: 4px; font-size: 0.55rem; font-weight: 600; }
        .tech-tag { background: #eff6ff; color: var(--primary-dark); border: 1px solid #dbeafe; }
        .plant-tag { background: #f8fafc; color: #475569; border: 1px solid #e2e8f0; }

        /* --- VISUAL STATS SECTION --- */
        .stats-overview-wrapper {
            background: #f8fafc;
            border-radius: 8px;
            padding: 1rem;
            border: 1px solid var(--card-border);
            margin-bottom: 1.5rem;
        }

        .stats-container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
            margin-bottom: 1rem;
        }

        .stat-card {
            border-radius: 8px;
            padding: 0.75rem 1rem;
            background: white;
            border: 1px solid var(--card-border);
            position: relative;
            overflow: hidden;
        }

        .stat-card::after {
            content: '';
            position: absolute;
            right: -10px;
            bottom: -10px;
            font-family: "Font Awesome 6 Free";
            font-weight: 900;
            font-size: 4rem;
            opacity: 0.06;
            z-index: 0;
        }
        .stat-card.completed::after { content: '\\f00c'; color: var(--success-bright); }
        .stat-card.lapsed::after { content: '\\f071'; color: var(--danger-bright); }

        .stat-content { position: relative; z-index: 1; }
        .stat-label { font-size: 0.55rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); margin-bottom: 0.25rem; font-weight: 700; }
        .stat-value { font-size: 1.5rem; font-weight: 800; line-height: 1; margin-bottom: 0.25rem; display: flex; align-items: center; gap: 6px;}
        .stat-subtext { font-size: 0.6rem; font-weight: 500; color: var(--secondary); }

        .val-success { color: var(--success-bright); }
        .val-danger { color: var(--danger-bright); }

        /* Visual Bar */
        .visual-summary-section h4 {
            margin: 0 0 0.5rem 0;
            font-size: 0.6rem;
            text-transform: uppercase;
            color: var(--text-muted);
            font-weight: 700;
        }

        .stacked-progress-container {
            height: 16px;
            width: 100%;
            background: #e2e8f0;
            border-radius: 8px;
            overflow: hidden;
            display: flex;
            margin-bottom: 0.5rem;
            border: 1px solid white;
        }

        .prog-bar-segment { height: 100%; }
        .segment-success { background: linear-gradient(90deg, var(--success-bright), #4ade80); }
        .segment-danger { background: linear-gradient(90deg, #f87171, var(--danger-bright)); }

        .progress-labels {
            display: flex;
            justify-content: space-between;
            font-size: 0.6rem;
            font-weight: 600;
            color: var(--text-muted);
        }
        .prog-label-item { display: flex; align-items: center; gap: 4px; }
        .dot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; }

        /* --- Table Section --- */
        .table-section {
            margin-bottom: 2rem;
        }
        .table-section h2 {
            font-size: 0.8rem;
            margin-bottom: 0.75rem;
            font-weight: 700;
            color: var(--text-main);
            display: flex; align-items: center; gap: 6px;
        }
        .table-section h2::before { content:''; display: block; width: 4px; height: 14px; background: var(--primary); border-radius: 2px; }

        table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 0.6rem; }
        th { text-align: left; padding: 0.4rem 0.5rem; background-color: #f8fafc; color: var(--secondary); font-weight: 700; font-size: 0.5rem; text-transform: uppercase; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; }
        th:first-child { border-top-left-radius: 4px; border-left: 1px solid #e2e8f0; }
        th:last-child { border-top-right-radius: 4px; border-right: 1px solid #e2e8f0; }
        td { padding: 0.4rem 0.5rem; border-bottom: 1px solid #e2e8f0; vertical-align: top; color: var(--text-main); font-size: 0.55rem; }
        td:first-child { border-left: 1px solid #e2e8f0; }
        td:last-child { border-right: 1px solid #e2e8f0; }
        tr:last-child td:first-child { border-bottom-left-radius: 4px; }
        tr:last-child td:last-child { border-bottom-right-radius: 4px; }
        td.remarks-col { color: var(--secondary); font-style: italic; line-height: 1.3; font-size: 0.55rem; background: #fafafa; }

        .badge { display: inline-flex; align-items: center; padding: 2px 6px; border-radius: 50px; font-size: 0.5rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.03em;}
        .badge-completed { background-color: var(--success-bg); color: var(--success-text); }
        .badge-lapsed { background-color: var(--danger-bg); color: var(--danger-text); }
        .badge-pending { background-color: #fff7ed; color: #c2410c; border: 1px solid #ffedd5; }

        /* --- FOOTER --- */
        .report-footer {
            margin-top: 2rem;
            padding: 0.75rem 2.5rem;
            background: #f8fafc;
            border-top: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 0.55rem;
            color: #94a3b8;
            font-weight: 500;
        }

        .footer-left {
            flex: 1;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .footer-center-address {
            flex: 2;
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
            color: var(--secondary);
        }
        .plant-name-footer {
            font-weight: 700;
            color: var(--text-main);
            font-size: 0.85rem;
            display: flex; align-items: center; gap: 6px;
        }
        .plant-address-footer {
            font-size: 0.75rem;
            max-width: 300px;
            line-height: 1.3;
        }
        
        .footer-right {
            flex: 1;
            text-align: right;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
    </style>
</head>
<body>

    <div class="page-container">
        <div class="report-header">
            
            <div class="header-left">
                <h1>Technician Report</h1>
                <p>Maintenance Performance Review</p>
            </div>

            <div class="header-right">
                
                <div class="customer-branding">
                    <i class="fa-solid fa-industry" style="font-size: 20px; color: #fff;"></i>
                    <div class="customer-name">${escapeHtml(data.primaryPlant?.name || data.plants[0] || 'Plant')}</div>
                </div>

                <div class="report-meta">
                    <i class="fa-regular fa-calendar"></i> ${escapeHtml(data.dateRange)}
                </div>

            </div>
        </div>

        <div class="report-body">
            
            <div class="tech-grid">
                <div class="tech-item">
                    <h3><i class="fa-solid fa-user"></i> Technician Details</h3>
                    <div class="tech-data">${escapeHtml(data.technician.name)}</div>
                    <div style="font-size: 0.9rem; color: #64748b; margin-top:4px; font-weight: 500;">ID: ${escapeHtml(data.technician.id)}</div>
                </div>
                <div class="tech-item">
                    <h3><i class="fa-solid fa-address-book"></i> Contact Info</h3>
                    <div class="tech-data">
                        <div class="contact-row"><i class="fa-solid fa-phone"></i> ${escapeHtml(data.technician.phone)}</div>
                        <div class="contact-row"><i class="fa-solid fa-envelope"></i> ${escapeHtml(data.technician.email)}</div>
                    </div>
                </div>
                 <div class="tech-item">
                    <h3><i class="fa-solid fa-user-tie"></i> Reporting Managers</h3>
                    <div class="tech-data" style="display: flex; flex-direction: column; gap: 4px;">
                        ${managersHTML}
                    </div>
                </div>
                
                <div class="tech-item">
                    <h3><i class="fa-solid fa-industry"></i> Assigned Plants</h3>
                    <div class="tag-container">
                        ${plantsHTML}
                    </div>
                </div>
                <div class="tech-item" style="grid-column: span 2;">
                    <h3><i class="fa-solid fa-layer-group"></i> Assigned Categories</h3>
                    <div class="tag-container">
                        ${categoriesHTML}
                    </div>
                </div>
            </div>


            <div class="stats-overview-wrapper">
                <div class="stats-container">
                    <div class="stat-card completed">
                        <div class="stat-content">
                            <div class="stat-label">Tasks Completed</div>
                            <div class="stat-value val-success">
                                ${String(data.statistics.completed).padStart(2, '0')} <i class="fa-solid fa-circle-check" style="font-size: 0.6em;"></i>
                            </div>
                            <div class="stat-subtext">${data.statistics.completedPercentage}% of total assigned tasks</div>
                        </div>
                    </div>
                    <div class="stat-card lapsed">
                         <div class="stat-content">
                            <div class="stat-label">Tasks Lapsed</div>
                            <div class="stat-value val-danger">
                                ${String(data.statistics.lapsed).padStart(2, '0')} <i class="fa-solid fa-triangle-exclamation" style="font-size: 0.6em;"></i>
                            </div>
                            <div class="stat-subtext">${data.statistics.lapsed > 0 ? 'Action required immediately' : 'All tasks on track'}</div>
                        </div>
                    </div>
                </div>

                <div class="visual-summary-section">
                    <h4>Overall Performance Goal (Total: ${data.statistics.total})</h4>
                    <div class="stacked-progress-container">
                        <div class="prog-bar-segment segment-success" style="width: ${completedWidth}%;"></div>
                        <div class="prog-bar-segment segment-danger" style="width: ${lapsedWidth}%;"></div>
                    </div>
                    <div class="progress-labels">
                        <div class="prog-label-item">
                            <span class="dot" style="background: var(--success-bright)"></span> ${data.statistics.completedPercentage}% Completed
                        </div>
                        <div class="prog-label-item">
                            ${data.statistics.lapsedPercentage}% Lapsed <span class="dot" style="background: var(--danger-bright)"></span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="table-section">
                <h2>Service Log Details</h2>
                <table>
                    <thead>
                        <tr>
                            <th width="10%">Ref ID</th>
                            <th width="20%">Task / Service</th>
                            <th width="15%">Location</th>
                            <th width="12%">Date</th>
                            <th width="10%">Status</th>
                            <th width="33%">Manager Remarks</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${serviceLogHTML}
                    </tbody>
                </table>
            </div>
        </div>

    </div>

</body>
</html>
  `;
};

/**
 * Generate Performance Report PDF
 * @param {string} plantId - Optional plant filter
 */
/**
 * Generate Performance Report PDF
 * @param {string} plantId - Optional plant filter
 */
const generate_performance_pdf = async (technicianId, startDate, endDate, plantId = null) => {
    // Get data
    const data = await get_technician_performance_data(technicianId, startDate, endDate, plantId);

    // Generate HTML
    const html = generatePerformanceReportHTML(data);

    console.log('[Performance Report] Generating PDF...');

    // Use shared PDF generator
    const { htmlToPdfBuffer } = require('../../utils/pdfGenerator');

    return await htmlToPdfBuffer(html, {
        format: 'A4',
        printBackground: true,
        margin: {
            top: '10mm',
            right: '10mm',
            bottom: '10mm',
            left: '10mm'
        }
    });
};

module.exports = {
    get_technician_performance_data,
    generatePerformanceReportHTML,
    generate_performance_pdf
};
