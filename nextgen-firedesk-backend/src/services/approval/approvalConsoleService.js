/**
 * Approval Console Service
 * Business logic for the Service Approval Console — KPIs, queue, details, bulk ops, alerts
 */

const { Op, fn, col, literal, where: seqWhere } = require('sequelize');
const { sequelize } = require('../../../config/config');

const {
    ServiceSubmission,
    ServiceAnswer,
    AssetHealthHistory,
    Asset,
    Plant,
    Building,
    Floor,
    Wing,
    Category,
    Product,
    Form,
    Technician,
    User,
    Manager,
    PlantManager,
    InspectionFrequency,
    Question,
    Condition
} = require('../../models');

// ────────────────────────────────────────────────
//  Helpers
// ────────────────────────────────────────────────

/**
 * Get plant IDs a manager is assigned to
 */
const getManagerPlantIds = async (userId) => {
    const manager = await Manager.findOne({
        where: { user_id: userId },
        include: [{
            model: PlantManager,
            as: 'plant_assignments',
            include: [{ model: Plant, as: 'plant', attributes: ['id'] }]
        }]
    });
    if (!manager) return { plantIds: [], managerId: null };
    const plantIds = manager.plant_assignments?.map(pa => pa.plant?.id).filter(Boolean) || [];
    return { plantIds, managerId: manager.id };
};

/**
 * Derive risk level from calculated_priority_score
 */
const getRiskLevel = (score) => {
    if (score >= 70) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
};

// ────────────────────────────────────────────────
//  KPIs
// ────────────────────────────────────────────────

/**
 * Get KPI summary for the approval console
 */
const getKPIs = async (plantIds) => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    const today = new Date().toISOString().split('T')[0];

    const baseWhere = {
        status: { [Op.iLike]: 'submitted' },
        plant_id: { [Op.in]: plantIds }
    };

    // All submitted services in manager's plants
    const submissions = await ServiceSubmission.findAll({
        where: baseWhere,
        attributes: [
            'id', 'calculated_priority_score', 'scheduled_date',
            'critical_count', 'high_count', 'submitted_at'
        ],
        raw: true
    });

    const totalSubmittedToday = submissions.filter(s => {
        if (!s.submitted_at) return false;
        const d = new Date(s.submitted_at);
        return d >= todayStart && d <= todayEnd;
    }).length;

    const overdueCount = submissions.filter(s => s.scheduled_date && s.scheduled_date < today).length;

    const submissionIds = submissions.map(s => s.id);

    // Compute actual priority scores from answers (stored values may be stale/zero)
    let highRiskCount = 0;
    let complianceImpactCount = 0;
    if (submissionIds.length > 0) {
        const [metricsRows] = await sequelize.query(`
            SELECT sa.submission_id,
                   COALESCE(SUM(sa.priority_score), 0) AS total_priority,
                   COUNT(CASE WHEN sa.compliance_status != 'NA' THEN 1 END) AS answered_count
            FROM service_answers sa
            WHERE sa.submission_id IN (:ids)
            GROUP BY sa.submission_id
        `, { replacements: { ids: submissionIds } });

        const scoreMap = {};
        metricsRows.forEach(r => {
            const answered = parseInt(r.answered_count) || 1;
            scoreMap[r.submission_id] = Math.round(parseInt(r.total_priority) / answered);
        });

        highRiskCount = submissions.filter(s => {
            const computed = scoreMap[s.id];
            const score = computed !== undefined ? computed : (s.calculated_priority_score || 0);
            return score >= 70;
        }).length;

        // Compliance impact: submissions with at least one NON_COMPLIANT answer
        const complianceRows = await ServiceAnswer.findAll({
            attributes: [[fn('DISTINCT', col('submission_id')), 'submission_id']],
            where: {
                submission_id: { [Op.in]: submissionIds },
                compliance_status: 'NON_COMPLIANT'
            },
            raw: true
        });
        complianceImpactCount = complianceRows.length;
    }

    return {
        total_pending: submissions.length,
        total_submitted_today: totalSubmittedToday,
        high_risk_count: highRiskCount,
        compliance_impact_count: complianceImpactCount,
        overdue_count: overdueCount,
        ai_suggested_rejections: 0 // Placeholder — AI feature deferred
    };
};

// ────────────────────────────────────────────────
//  Approval Queue (Main Table)
// ────────────────────────────────────────────────

/**
 * Get the approval queue with filters, sorting, and pagination
 */
const getApprovalQueue = async (plantIds, filters = {}) => {
    const {
        page = 1,
        limit = 50,
        search,
        // Accept both frontend and backend param names
        service_type,
        inspection_type,
        technician_id,
        category_id,
        date_from,
        date_to,
        risk_level,        // 'high' | 'medium' | 'low'
        high_risk,         // toggle filter from frontend
        has_compliance_impact,
        compliance_impact, // toggle filter from frontend
        is_overdue,
        overdue,           // toggle filter from frontend
        no_photo_evidence,
        no_photo,          // toggle filter from frontend
        status_changed,
        sort_by = 'submitted_at',
        sort_order = 'DESC'
    } = filters;

    // Reconcile frontend / backend param name aliases
    const effectiveInspectionType = service_type || inspection_type;
    const effectiveComplianceImpact = compliance_impact || has_compliance_impact;
    const effectiveNoPhoto = no_photo || no_photo_evidence;
    const effectiveOverdue = overdue || is_overdue;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const today = new Date().toISOString().split('T')[0];

    // ---- Build WHERE ----
    const where = {
        status: { [Op.iLike]: 'submitted' },
        plant_id: { [Op.in]: plantIds }
    };

    if (effectiveInspectionType) where.inspection_type = { [Op.iLike]: effectiveInspectionType };
    if (technician_id) where.technician_id = technician_id;
    if (date_from && date_to) {
        where.scheduled_date = { [Op.between]: [date_from, date_to] };
    } else if (date_from) {
        where.scheduled_date = { [Op.gte]: date_from };
    } else if (date_to) {
        where.scheduled_date = { [Op.lte]: date_to };
    }

    // Risk level filter (dropdown or toggle)
    if (risk_level === 'high' || high_risk === 'true' || high_risk === true) {
        where.calculated_priority_score = { [Op.gte]: 70 };
    } else if (risk_level === 'medium') {
        where.calculated_priority_score = { [Op.between]: [40, 69] };
    } else if (risk_level === 'low') {
        where.calculated_priority_score = { [Op.lt]: 40 };
    }

    // Overdue filter
    if (effectiveOverdue === 'true' || effectiveOverdue === true) {
        where.scheduled_date = { ...(where.scheduled_date || {}), [Op.lt]: today };
    }

    // ---- Build INCLUDE ----
    const assetInclude = {
        model: Asset,
        as: 'asset',
        attributes: ['id', 'asset_code', 'location', 'health_status', 'category_id', 'product_id', 'plant_id', 'building_id', 'floor_id', 'wing_id'],
        include: [
            { model: Category, as: 'category', attributes: ['id', 'category_name', 'category_code'] },
            { model: Product, as: 'product', attributes: ['id', 'product_name'] },
            { model: Building, as: 'building', attributes: ['id', 'building_name'] },
            { model: Floor, as: 'floor', attributes: ['id', 'floor_name'] },
            { model: Wing, as: 'wing', attributes: ['id', 'wing_name'] }
        ]
    };

    // Category filter (through asset)
    if (category_id) {
        assetInclude.where = { category_id };
        assetInclude.required = true;
    }

    // Search filter: asset code, location, or technician name
    if (search) {
        const searchLike = `%${search}%`;
        // We use Op.or at submission level for asset_code search via sub-query
        // and at include level for asset location and technician name
        where[Op.or] = [
            literal(`EXISTS (SELECT 1 FROM assets a WHERE a.id = "ServiceSubmission"."asset_id" AND (a.asset_code ILIKE '${search.replace(/'/g, "''")}%' OR a.location ILIKE '%${search.replace(/'/g, "''")}%'))`),
            literal(`EXISTS (SELECT 1 FROM technicians t JOIN users u ON u.id = t.user_id WHERE t.id = "ServiceSubmission"."technician_id" AND u.name ILIKE '%${search.replace(/'/g, "''")}%')`),
            literal(`EXISTS (SELECT 1 FROM forms f WHERE f.id = "ServiceSubmission"."form_id" AND (f.service_name ILIKE '%${search.replace(/'/g, "''")}%' OR f.form_code ILIKE '${search.replace(/'/g, "''")}%'))`)
        ];
    }

    const include = [
        assetInclude,
        { model: Plant, as: 'plant', attributes: ['id', 'plant_name', 'plant_code'] },
        { model: Form, as: 'form', attributes: ['id', 'service_name', 'form_code'] },
        {
            model: Technician,
            as: 'technician',
            attributes: ['id', 'user_id'],
            include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }]
        },
        {
            model: Technician,
            as: 'submitter',
            attributes: ['id', 'user_id'],
            include: [{ model: User, as: 'user', attributes: ['id', 'name'] }]
        }
    ];

    // ---- Sorting ----
    const validSortFields = [
        'submitted_at', 'scheduled_date', 'calculated_priority_score',
        'inspection_type', 'created_at', 'critical_count'
    ];
    const sortField = validSortFields.includes(sort_by) ? sort_by : 'submitted_at';
    const order = [[sortField, sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC']];

    // ---- Query ----
    const { count, rows: submissions } = await ServiceSubmission.findAndCountAll({
        where,
        include,
        order,
        limit: parseInt(limit),
        offset,
        distinct: true,
        col: 'id'
    });

    // ---- Post-processing: enrich each row with computed fields ----
    const submissionIds = submissions.map(s => s.id);

    // Batch: photo evidence per submission
    let photoMap = {};
    if (submissionIds.length > 0) {
        const photoRows = await sequelize.query(`
            SELECT submission_id, 
                   CASE WHEN COUNT(*) FILTER (WHERE photo_urls IS NOT NULL AND photo_urls::text != '[]' AND photo_urls::text != 'null') > 0 
                        THEN true ELSE false END AS has_photos,
                   COUNT(*) FILTER (WHERE photo_urls IS NOT NULL AND photo_urls::text != '[]' AND photo_urls::text != 'null') AS photo_count
            FROM service_answers
            WHERE submission_id IN (:ids)
            GROUP BY submission_id
        `, {
            replacements: { ids: submissionIds },
            type: sequelize.QueryTypes.SELECT
        });
        photoRows.forEach(r => { photoMap[r.submission_id] = { has_photos: r.has_photos, photo_count: parseInt(r.photo_count) }; });
    }

    // Batch: compliance impact per submission (has any NON_COMPLIANT answer)
    let complianceMap = {};
    if (submissionIds.length > 0) {
        const compRows = await sequelize.query(`
            SELECT submission_id,
                   bool_or(compliance_status = 'NON_COMPLIANT') AS has_compliance_impact
            FROM service_answers
            WHERE submission_id IN (:ids)
            GROUP BY submission_id
        `, {
            replacements: { ids: submissionIds },
            type: sequelize.QueryTypes.SELECT
        });
        compRows.forEach(r => { complianceMap[r.submission_id] = r.has_compliance_impact === true; });
    }

    // Batch: deviation count per submission (NON_COMPLIANT answers)
    let deviationCountMap = {};
    if (submissionIds.length > 0) {
        const devRows = await sequelize.query(`
            SELECT submission_id, COUNT(*) AS deviation_count
            FROM service_answers
            WHERE submission_id IN (:ids) AND compliance_status = 'NON_COMPLIANT'
            GROUP BY submission_id
        `, {
            replacements: { ids: submissionIds },
            type: sequelize.QueryTypes.SELECT
        });
        devRows.forEach(r => { deviationCountMap[r.submission_id] = parseInt(r.deviation_count); });
    }

    // Batch: compute actual metrics from answers (severity counts, priority, health)
    // The precomputed fields on service_submissions may be stale/zero.
    //
    // Health logic: the NON_COMPLIANT answer with the highest priority_score
    // determines the health status via its health_impact value.
    // If no non-compliant answers → HEALTHY.
    let computedMetricsMap = {};
    if (submissionIds.length > 0) {
        // 1) Severity counts & totals per submission
        const metricsRows = await sequelize.query(`
            SELECT
                submission_id,
                COUNT(*) FILTER (WHERE compliance_status IN ('COMPLIANT','NON_COMPLIANT')) AS answered_count,
                COUNT(*) FILTER (WHERE compliance_status = 'NON_COMPLIANT' AND severity_level = 'CRITICAL') AS critical_count,
                COUNT(*) FILTER (WHERE compliance_status = 'NON_COMPLIANT' AND severity_level = 'HIGH') AS high_count,
                COUNT(*) FILTER (WHERE compliance_status = 'NON_COMPLIANT' AND severity_level = 'MEDIUM') AS medium_count,
                COUNT(*) FILTER (WHERE compliance_status = 'NON_COMPLIANT' AND severity_level = 'LOW') AS low_count,
                COALESCE(SUM(priority_score), 0) AS total_priority_score
            FROM service_answers
            WHERE submission_id IN (:ids)
            GROUP BY submission_id
        `, {
            replacements: { ids: submissionIds },
            type: sequelize.QueryTypes.SELECT
        });

        // 2) For each submission, get the health_impact of the non-compliant answer
        //    with the highest priority_score (the one that decides asset health).
        const healthRows = await sequelize.query(`
            SELECT DISTINCT ON (submission_id)
                submission_id, health_impact
            FROM service_answers
            WHERE submission_id IN (:ids)
              AND compliance_status = 'NON_COMPLIANT'
            ORDER BY submission_id, priority_score DESC
        `, {
            replacements: { ids: submissionIds },
            type: sequelize.QueryTypes.SELECT
        });
        const topHealthMap = {};
        healthRows.forEach(r => { topHealthMap[r.submission_id] = r.health_impact; });

        // Map DB health_impact text → standard status enum
        const mapHealthImpact = (val) => {
            if (!val) return 'HEALTHY';
            const lower = val.toLowerCase();
            if (lower.includes('not') && lower.includes('working')) return 'NOT_WORKING';
            if (lower.includes('attention')) return 'NEEDS_ATTENTION';
            return 'HEALTHY';
        };

        metricsRows.forEach(r => {
            const answeredCount = parseInt(r.answered_count) || 0;
            const critCount = parseInt(r.critical_count) || 0;
            const highCount = parseInt(r.high_count) || 0;
            const medCount = parseInt(r.medium_count) || 0;
            const lowCount = parseInt(r.low_count) || 0;
            const totalPriority = parseInt(r.total_priority_score) || 0;

            // Health = health_impact of the highest-priority non-compliant answer
            const topImpact = topHealthMap[r.submission_id];
            const healthStatus = mapHealthImpact(topImpact);

            // Priority score = average across all answered (non-NA) questions
            const calcPriorityScore = answeredCount > 0 ? Math.round(totalPriority / answeredCount) : 0;

            computedMetricsMap[r.submission_id] = {
                critical_count: critCount,
                high_count: highCount,
                medium_count: medCount,
                low_count: lowCount,
                total_priority_score: totalPriority,
                calculated_priority_score: calcPriorityScore,
                calculated_health_status: healthStatus
            };
        });
    }

    // Batch: previous health status from last approved submission for the same asset
    let beforeHealthMap = {};
    if (submissionIds.length > 0) {
        const assetIds = [...new Set(submissions.map(s => s.asset_id).filter(Boolean))];
        if (assetIds.length > 0) {
            const healthRows = await sequelize.query(`
                SELECT DISTINCT ON (asset_id) asset_id, health_status
                FROM asset_health_history
                WHERE asset_id IN (:assetIds)
                ORDER BY asset_id, created_at DESC
            `, {
                replacements: { assetIds },
                type: sequelize.QueryTypes.SELECT
            });
            healthRows.forEach(r => { beforeHealthMap[r.asset_id] = r.health_status; });
        }
    }

    // ---- Format response ----
    const enrichedSubmissions = submissions.map(sub => {
        const plain = sub.toJSON();
        const computed = computedMetricsMap[plain.id] || {};
        // Use computed metrics from answers, fall back to stored fields
        const criticalCount = computed.critical_count ?? (plain.critical_count || 0);
        const highCount = computed.high_count ?? (plain.high_count || 0);
        const mediumCount = computed.medium_count ?? (plain.medium_count || 0);
        const lowCount = computed.low_count ?? (plain.low_count || 0);
        const totalPriorityScore = computed.total_priority_score ?? (plain.total_priority_score || 0);
        const score = computed.calculated_priority_score ?? (plain.calculated_priority_score || 0);
        const healthStatus = computed.calculated_health_status || plain.calculated_health_status || 'HEALTHY';

        const timeTakenMs = plain.submitted_at && plain.started_at
            ? new Date(plain.submitted_at) - new Date(plain.started_at) : null;
        const timeTakenMinutes = timeTakenMs ? Math.round(timeTakenMs / 60000) : null;
        const beforeHealth = beforeHealthMap[plain.asset_id] || plain.asset?.health_status || 'HEALTHY';

        return {
            id: plain.id,
            submission_number: plain.submission_number,
            asset: plain.asset ? {
                id: plain.asset.id,
                asset_code: plain.asset.asset_code,
                location: plain.asset.location,
                current_health_status: plain.asset.health_status,
                category: plain.asset.category,
                product: plain.asset.product,
                building: plain.asset.building,
                floor: plain.asset.floor,
                wing: plain.asset.wing
            } : null,
            plant: plain.plant,
            form: plain.form,
            inspection_type: plain.inspection_type,
            frequency: plain.frequency,
            scheduled_date: plain.scheduled_date,
            submitted_at: plain.submitted_at,
            started_at: plain.started_at,
            technician: plain.technician?.user ? {
                id: plain.technician.id,
                name: plain.technician.user.name,
                email: plain.technician.user.email
            } : null,
            submitted_by: plain.submitter?.user ? {
                id: plain.submitter.id,
                name: plain.submitter.user.name
            } : null,

            // Severity / Risk (computed from actual answers)
            critical_count: criticalCount,
            high_count: highCount,
            medium_count: mediumCount,
            low_count: lowCount,
            total_priority_score: totalPriorityScore,
            calculated_priority_score: score,
            calculated_health_status: healthStatus,
            risk_level: getRiskLevel(score),

            // Derived fields
            before_health_status: beforeHealth,
            has_photos: photoMap[plain.id]?.has_photos || false,
            photo_count: photoMap[plain.id]?.photo_count || 0,
            has_compliance_impact: complianceMap[plain.id] || false,
            is_overdue: plain.scheduled_date ? plain.scheduled_date < new Date().toISOString().split('T')[0] : false,
            time_taken_minutes: timeTakenMinutes,
            status_changed: beforeHealth !== healthStatus,
            deviation_count: deviationCountMap[plain.id] || 0,

            // Flattened convenience fields for frontend display
            form_name: plain.form?.service_name || plain.form?.form_code || 'Unknown Form',
            asset_name: plain.asset?.asset_code || null,
            category_name: plain.asset?.category?.category_name || null,
            technician_name: plain.technician?.user?.name || null,
            location: plain.asset ? [
                plain.asset.building?.building_name,
                plain.asset.floor?.floor_name,
                plain.asset.wing?.wing_name
            ].filter(Boolean).join(' > ') || plain.asset.location || null : null,

            // AI placeholder
            ai_recommendation: null
        };
    });

    // ---- Post-query client-side filters (for fields derived from joins) ----
    let finalSubmissions = enrichedSubmissions;

    if (effectiveComplianceImpact === 'true' || effectiveComplianceImpact === true) {
        finalSubmissions = finalSubmissions.filter(s => s.has_compliance_impact);
    }
    if (effectiveNoPhoto === 'true' || effectiveNoPhoto === true) {
        finalSubmissions = finalSubmissions.filter(s => !s.has_photos);
    }
    if (status_changed === 'true' || status_changed === true) {
        finalSubmissions = finalSubmissions.filter(s => s.status_changed);
    }

    // ---- Post-query sorting (many fields are computed post-query) ----
    const sortDir = (sort_order || 'DESC').toUpperCase() === 'ASC' ? 1 : -1;
    const sortColumn = sort_by || 'submitted_at';

    finalSubmissions.sort((a, b) => {
        let valA, valB;
        switch (sortColumn) {
            case 'form_name':
                valA = (a.form_name || '').toLowerCase();
                valB = (b.form_name || '').toLowerCase();
                return valA < valB ? -1 * sortDir : valA > valB ? 1 * sortDir : 0;
            case 'technician_name':
                valA = (a.technician_name || '').toLowerCase();
                valB = (b.technician_name || '').toLowerCase();
                return valA < valB ? -1 * sortDir : valA > valB ? 1 * sortDir : 0;
            case 'submitted_at':
                valA = a.submitted_at || '';
                valB = b.submitted_at || '';
                return valA < valB ? -1 * sortDir : valA > valB ? 1 * sortDir : 0;
            case 'risk_level':
            case 'calculated_priority_score':
                valA = a.calculated_priority_score || 0;
                valB = b.calculated_priority_score || 0;
                return (valA - valB) * sortDir;
            case 'deviation_count':
                valA = a.deviation_count || 0;
                valB = b.deviation_count || 0;
                return (valA - valB) * sortDir;
            default:
                // Fallback: try numeric then string comparison
                valA = a[sortColumn];
                valB = b[sortColumn];
                if (typeof valA === 'number' && typeof valB === 'number') {
                    return (valA - valB) * sortDir;
                }
                valA = String(valA || '').toLowerCase();
                valB = String(valB || '').toLowerCase();
                return valA < valB ? -1 * sortDir : valA > valB ? 1 * sortDir : 0;
        }
    });

    return {
        submissions: finalSubmissions,
        pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            total_pages: Math.ceil(count / parseInt(limit))
        }
    };
};

// ────────────────────────────────────────────────
//  Submission Details (Inline Expansion)
// ────────────────────────────────────────────────

/**
 * Get detailed data for inline row expansion
 */
const getSubmissionDetails = async (submissionId) => {
    // 1. Fetch submission with answers
    const submission = await ServiceSubmission.findByPk(submissionId, {
        include: [
            { model: Asset, as: 'asset', attributes: ['id', 'asset_code', 'health_status'] },
            { model: Form, as: 'form', attributes: ['id', 'service_name'] }
        ]
    });

    if (!submission) return null;

    // 2. Fetch answers with question details
    const answers = await ServiceAnswer.findAll({
        where: { submission_id: submissionId },
        include: [
            {
                model: Question,
                as: 'question',
                attributes: ['id', 'question_text', 'question_type']
            }
        ],
        order: [['created_at', 'ASC']]
    });

    // 3. Deviation summary: non-compliant answers grouped by severity
    const deviations = answers
        .filter(a => a.compliance_status === 'NON_COMPLIANT')
        .map(a => ({
            id: a.id,
            question_text: a.question?.question_text || 'Unknown Question',
            section: null,
            condition_name: a.condition_name || null,
            condition_code: a.condition_code || null,
            compliance_status: a.compliance_status || 'NON_COMPLIANT',
            severity_level: a.severity_level || 'LOW',
            priority_score: a.priority_score || 0,
            health_impact: a.health_impact || null,
            notes: a.notes || null,
            answer_value: a.condition_name || a.text_value || (a.numeric_value != null ? String(a.numeric_value) : null) || (a.boolean_value != null ? String(a.boolean_value) : null) || null,
            photo_urls: a.photo_urls || null
        }));

    // 4. Technician remarks: all notes
    const remarks = answers
        .filter(a => a.notes && a.notes.trim() !== '')
        .map(a => ({
            question_text: a.question?.question_text || 'Unknown',
            notes: a.notes
        }));

    // 5. Photo URLs
    const photos = [];
    for (const answer of answers) {
        if (answer.photo_urls && Array.isArray(answer.photo_urls)) {
            for (const url of answer.photo_urls) {
                photos.push({
                    question_text: answer.question?.question_text || 'Photo',
                    url
                });
            }
        }
    }

    // 6. Failure history — last 3 completed/rejected submissions for same asset
    const failureHistory = await ServiceSubmission.findAll({
        where: {
            asset_id: submission.asset_id,
            id: { [Op.ne]: submissionId },
            status: { [Op.in]: ['approved', 'rejected'] }
        },
        attributes: [
            'id', 'submission_number', 'inspection_type', 'scheduled_date',
            'submitted_at', 'status', 'approval_status',
            'calculated_health_status', 'calculated_priority_score',
            'critical_count', 'high_count', 'medium_count', 'low_count'
        ],
        order: [['submitted_at', 'DESC']],
        limit: 3
    });

    // 7. Overall answer summary
    const totalAnswers = answers.length;
    const compliantCount = answers.filter(a => a.compliance_status === 'COMPLIANT').length;
    const nonCompliantCount = answers.filter(a => a.compliance_status === 'NON_COMPLIANT').length;
    const naCount = answers.filter(a => a.compliance_status === 'NA').length;
    const answeredCount = compliantCount + nonCompliantCount;
    const complianceRate = answeredCount > 0 ? Math.round((compliantCount / answeredCount) * 100) : 100;

    return {
        submission_id: submissionId,
        submission_number: submission.submission_number,
        asset: submission.asset,
        form: submission.form,
        deviations,
        remarks,
        photos,
        failure_history: failureHistory.map(fh => fh.toJSON()),
        answer_summary: {
            total: totalAnswers,
            compliant: compliantCount,
            non_compliant: nonCompliantCount,
            na: naCount,
            compliance_rate: complianceRate
        },
        // AI placeholder
        ai_recommendation: null
    };
};

// ────────────────────────────────────────────────
//  Bulk Approve
// ────────────────────────────────────────────────

/**
 * Bulk approve multiple submissions
 */
const bulkApprove = async (submissionIds, managerId, remarks = null, plantIds) => {
    const results = { approved: 0, failed: [] };

    for (const id of submissionIds) {
        const transaction = await sequelize.transaction();
        try {
            const service = await ServiceSubmission.findByPk(id, {
                include: [{ model: Asset, as: 'asset', attributes: ['id', 'asset_code'] }],
                transaction
            });

            if (!service) {
                results.failed.push({ id, error: 'Service not found' });
                await transaction.rollback();
                continue;
            }

            if (!plantIds.includes(service.plant_id)) {
                results.failed.push({ id, error: 'Access denied: plant not assigned to you' });
                await transaction.rollback();
                continue;
            }

            if (service.status.toUpperCase() !== 'SUBMITTED') {
                results.failed.push({ id, error: `Cannot approve service with status '${service.status}'` });
                await transaction.rollback();
                continue;
            }

            // Approve
            await service.update({
                approval_status: 'approved',
                approved_by: managerId,
                approved_at: new Date(),
                approval_remarks: remarks || null,
                status: 'approved',
                completed_at: new Date()
            }, { transaction });

            // Create asset health history
            if (service.asset_id) {
                await AssetHealthHistory.create({
                    asset_id: service.asset_id,
                    submission_id: service.id,
                    submitted_at: service.submitted_at || new Date(),
                    critical_count: service.critical_count || 0,
                    high_count: service.high_count || 0,
                    medium_count: service.medium_count || 0,
                    low_count: service.low_count || 0,
                    total_priority_score: service.total_priority_score || 0,
                    health_status: service.calculated_health_status || 'HEALTHY'
                }, { transaction });
            }

            await transaction.commit();

            // Post-commit: update asset health + notify (fire-and-forget)
            if (service.asset_id) {
                try {
                    const assetHealthService = require('../assets/assetHealthService');
                    await assetHealthService.updateAssetHealthFromService(service.asset_id, service.id);
                } catch (e) {
                    console.error(`[BulkApprove] Asset health update failed for ${id}:`, e.message);
                }

                // Update last_service_date and next_service_date on the asset
                try {
                    // last_service_date: most recent approved scheduled_date for this asset
                    const lastApproved = await ServiceSubmission.findOne({
                        where: {
                            asset_id: service.asset_id,
                            approval_status: 'approved',
                            scheduled_date: { [Op.ne]: null }
                        },
                        order: [['scheduled_date', 'DESC']],
                        attributes: ['scheduled_date']
                    });

                    // next_service_date: closest upcoming service not yet completed/rejected/cancelled
                    const nextPending = await ServiceSubmission.findOne({
                        where: {
                            asset_id: service.asset_id,
                            scheduled_date: { [Op.gte]: new Date() },
                            status: { [Op.notIn]: ['approved', 'rejected', 'cancelled'] }
                        },
                        order: [['scheduled_date', 'ASC']],
                        attributes: ['scheduled_date']
                    });

                    await Asset.update(
                        {
                            last_service_date: lastApproved ? lastApproved.scheduled_date : null,
                            next_service_date: nextPending ? nextPending.scheduled_date : null
                        },
                        { where: { id: service.asset_id } }
                    );
                } catch (e) {
                    console.error(`[BulkApprove] Service date update failed for ${id}:`, e.message);
                }
            }

            try {
                const { notify_service_approved } = require('../notifications/notificationService');
                await notify_service_approved(service, managerId);
            } catch (e) {
                console.error(`[BulkApprove] Notification failed for ${id}:`, e.message);
            }

            results.approved++;
        } catch (error) {
            await transaction.rollback();
            results.failed.push({ id, error: error.message });
        }
    }

    return results;
};

// ────────────────────────────────────────────────
//  Bulk Reject
// ────────────────────────────────────────────────

/**
 * Bulk reject multiple submissions
 */
const bulkReject = async (submissionIds, managerId, remarks, plantIds) => {
    if (!remarks || remarks.trim() === '') {
        throw new Error('Rejection remarks are required');
    }

    const results = { rejected: 0, failed: [] };

    for (const id of submissionIds) {
        const transaction = await sequelize.transaction();
        try {
            const service = await ServiceSubmission.findByPk(id, {
                include: [{ model: Asset, as: 'asset', attributes: ['id', 'asset_code'] }],
                transaction
            });

            if (!service) {
                results.failed.push({ id, error: 'Service not found' });
                await transaction.rollback();
                continue;
            }

            if (!plantIds.includes(service.plant_id)) {
                results.failed.push({ id, error: 'Access denied: plant not assigned to you' });
                await transaction.rollback();
                continue;
            }

            if (service.status.toUpperCase() !== 'SUBMITTED') {
                results.failed.push({ id, error: `Cannot reject service with status '${service.status}'` });
                await transaction.rollback();
                continue;
            }

            await service.update({
                approval_status: 'rejected',
                approved_by: managerId,
                approved_at: new Date(),
                approval_remarks: remarks,
                status: 'rejected'
            }, { transaction });

            await transaction.commit();

            // Post-commit: notify (fire-and-forget)
            try {
                const { notify_service_rejected } = require('../notifications/notificationService');
                await notify_service_rejected(service, managerId, remarks);
            } catch (e) {
                console.error(`[BulkReject] Notification failed for ${id}:`, e.message);
            }

            results.rejected++;
        } catch (error) {
            await transaction.rollback();
            results.failed.push({ id, error: error.message });
        }
    }

    return results;
};

// ────────────────────────────────────────────────
//  Alerts Panel
// ────────────────────────────────────────────────

/**
 * Get alert data for the right-side panel.
 *
 * Three sections:
 *  1. Assets "Not Working" — submitted services whose answers indicate the
 *     asset would become NOT_WORKING (highest-priority non-compliant answer
 *     has health_impact containing "not" + "working").
 *  2. Repeated Failures — assets that have > 1 NON_COMPLIANT answer across
 *     submitted (pending-approval) services.
 *  3. Critical Compliance — individual HIGH / CRITICAL severity non-compliant
 *     answers from submitted services, with question & asset details.
 */
const getAlerts = async (plantIds) => {
    // ── 1. Assets "Not Working" ──────────────────────────────────────
    //  For every submitted service, find the highest-priority non-compliant
    //  answer; if its health_impact indicates NOT_WORKING, surface the asset.
    let assetsNotWorking = [];
    try {
        assetsNotWorking = await sequelize.query(`
            WITH top_nc AS (
                SELECT DISTINCT ON (sa.submission_id)
                    sa.submission_id,
                    sa.health_impact,
                    sa.priority_score
                FROM service_answers sa
                JOIN service_submissions ss ON ss.id = sa.submission_id
                WHERE ss.status ILIKE 'submitted'
                  AND ss.plant_id IN (:plantIds)
                  AND sa.compliance_status = 'NON_COMPLIANT'
                ORDER BY sa.submission_id, sa.priority_score DESC
            )
            SELECT
                a.id              AS asset_id,
                a.asset_code,
                a.location,
                a.health_status   AS current_health,
                c.category_name,
                p.product_name,
                b.building_name,
                f.service_name    AS form_name,
                ss.id             AS submission_id,
                ss.submission_number,
                ss.inspection_type,
                ss.submitted_at,
                u_tech.name       AS technician_name
            FROM top_nc tnc
            JOIN service_submissions ss ON ss.id = tnc.submission_id
            JOIN assets a              ON a.id  = ss.asset_id
            LEFT JOIN categories  c    ON c.id  = a.category_id
            LEFT JOIN products    p    ON p.id  = a.product_id
            LEFT JOIN buildings   b    ON b.id  = a.building_id
            LEFT JOIN forms       f    ON f.id  = ss.form_id
            LEFT JOIN technicians t    ON t.id  = COALESCE(ss.submitted_by, ss.technician_id)
            LEFT JOIN users u_tech     ON u_tech.id = t.user_id
            WHERE LOWER(tnc.health_impact) LIKE '%not%'
              AND LOWER(tnc.health_impact) LIKE '%working%'
            ORDER BY tnc.priority_score DESC
            LIMIT 30
        `, {
            replacements: { plantIds },
            type: sequelize.QueryTypes.SELECT
        });
    } catch (e) {
        console.error('[Alerts] assetsNotWorking query error:', e.message);
    }

    // ── 2. Repeated Failures ─────────────────────────────────────────
    //  Assets with more than 1 NON_COMPLIANT answer across submitted services.
    let repeatedFailures = [];
    try {
        repeatedFailures = await sequelize.query(`
            SELECT
                a.id              AS asset_id,
                a.asset_code,
                a.location,
                a.health_status   AS current_health,
                c.category_name,
                p.product_name,
                b.building_name,
                COUNT(DISTINCT sa.id) AS nc_count,
                COUNT(DISTINCT ss.id) AS service_count,
                ARRAY_AGG(DISTINCT f.service_name) FILTER (WHERE f.service_name IS NOT NULL) AS form_names
            FROM service_answers sa
            JOIN service_submissions ss ON ss.id = sa.submission_id
            JOIN assets a              ON a.id  = ss.asset_id
            LEFT JOIN categories c     ON c.id  = a.category_id
            LEFT JOIN products   p     ON p.id  = a.product_id
            LEFT JOIN buildings  b     ON b.id  = a.building_id
            LEFT JOIN forms      f     ON f.id  = ss.form_id
            WHERE ss.status ILIKE 'submitted'
              AND ss.plant_id IN (:plantIds)
              AND sa.compliance_status = 'NON_COMPLIANT'
            GROUP BY a.id, a.asset_code, a.location, a.health_status,
                     c.category_name, p.product_name, b.building_name
            HAVING COUNT(DISTINCT sa.id) > 1
            ORDER BY COUNT(DISTINCT sa.id) DESC
            LIMIT 30
        `, {
            replacements: { plantIds },
            type: sequelize.QueryTypes.SELECT
        });
    } catch (e) {
        console.error('[Alerts] repeatedFailures query error:', e.message);
    }

    // ── 3. Critical Compliance ───────────────────────────────────────
    //  Individual HIGH or CRITICAL non-compliant answers from submitted
    //  services, enriched with question text, asset & form info.
    let criticalCompliance = [];
    try {
        criticalCompliance = await sequelize.query(`
            SELECT
                sa.id              AS answer_id,
                sa.submission_id,
                sa.severity_level,
                sa.priority_score,
                sa.health_impact,
                sa.compliance_status,
                sa.condition_name,
                q.question_text,
                q.question_code,
                ss.submission_number,
                ss.inspection_type,
                ss.submitted_at,
                a.id               AS asset_id,
                a.asset_code,
                a.location,
                c.category_name,
                p.product_name,
                b.building_name,
                f.service_name     AS form_name,
                u_tech.name        AS technician_name
            FROM service_answers sa
            JOIN service_submissions ss ON ss.id = sa.submission_id
            JOIN questions q           ON q.id  = sa.question_id
            JOIN assets a              ON a.id  = ss.asset_id
            LEFT JOIN categories  c    ON c.id  = a.category_id
            LEFT JOIN products    p    ON p.id  = a.product_id
            LEFT JOIN buildings   b    ON b.id  = a.building_id
            LEFT JOIN forms       f    ON f.id  = ss.form_id
            LEFT JOIN technicians t    ON t.id  = COALESCE(ss.submitted_by, ss.technician_id)
            LEFT JOIN users u_tech     ON u_tech.id = t.user_id
            WHERE ss.status ILIKE 'submitted'
              AND ss.plant_id IN (:plantIds)
              AND sa.compliance_status = 'NON_COMPLIANT'
              AND sa.severity_level IN ('CRITICAL', 'HIGH')
            ORDER BY
                CASE sa.severity_level WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 END,
                sa.priority_score DESC
            LIMIT 40
        `, {
            replacements: { plantIds },
            type: sequelize.QueryTypes.SELECT
        });
    } catch (e) {
        console.error('[Alerts] criticalCompliance query error:', e.message);
    }

    return {
        not_working: assetsNotWorking,
        repeated_failures: repeatedFailures,
        critical_compliance: criticalCompliance
    };
};

// ────────────────────────────────────────────────
//  Dropdown Data (for filters)
// ────────────────────────────────────────────────

/**
 * Get data for filter dropdowns (technicians, categories in manager's plants)
 */
const getFilterDropdownData = async (plantIds) => {
    // Distinct service/inspection types
    const serviceTypeRows = await sequelize.query(`
        SELECT DISTINCT inspection_type
        FROM service_submissions
        WHERE plant_id IN (:plantIds) AND inspection_type IS NOT NULL
        ORDER BY inspection_type ASC
    `, {
        replacements: { plantIds },
        type: sequelize.QueryTypes.SELECT
    });
    const service_types = serviceTypeRows.map(r => r.inspection_type);

    // Technicians assigned to manager's plants
    const technicians = await sequelize.query(`
        SELECT DISTINCT t.id, u.name, u.email
        FROM technicians t
        JOIN users u ON u.id = t.user_id
        JOIN technician_plants tp ON tp.technician_id = t.id
        WHERE tp.plant_id IN (:plantIds)
        ORDER BY u.name ASC
    `, {
        replacements: { plantIds },
        type: sequelize.QueryTypes.SELECT
    });

    // Categories that have completed services in manager's plants
    const categories = await sequelize.query(`
        SELECT DISTINCT c.id, c.category_name AS name, c.category_name, c.category_code
        FROM categories c
        JOIN assets a ON a.category_id = c.id
        JOIN service_submissions ss ON ss.asset_id = a.id
        WHERE ss.plant_id IN (:plantIds)
        ORDER BY c.category_name ASC
    `, {
        replacements: { plantIds },
        type: sequelize.QueryTypes.SELECT
    });

    return { service_types, technicians, categories };
};

module.exports = {
    getManagerPlantIds,
    getKPIs,
    getApprovalQueue,
    getSubmissionDetails,
    bulkApprove,
    bulkReject,
    getAlerts,
    getFilterDropdownData
};
