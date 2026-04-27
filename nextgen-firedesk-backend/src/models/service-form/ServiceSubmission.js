const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/config');

const ServiceSubmission = sequelize.define('ServiceSubmission', {
    id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
        field: 'id'
    },
    submission_number: {
        type: DataTypes.STRING(100),
        allowNull: true,
        unique: true,
        field: 'submission_number'
    },
    // Core relationships
    asset_id: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'asset_id',
        references: {
            model: 'assets',
            key: 'id'
        }
    },
    plant_id: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'plant_id',
        references: {
            model: 'plants',
            key: 'id'
        }
    },
    form_id: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'form_id',
        references: {
            model: 'forms',
            key: 'id'
        }
    },
    schedule_id: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'schedule_id',
        references: {
            model: 'maintenance_schedulers',
            key: 'id'
        }
    },
    frequency_id: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'frequency_id',
        references: {
            model: 'inspection_frequencies',
            key: 'id'
        }
    },
    // Assignment
    technician_id: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'technician_id',
        references: {
            model: 'technicians',
            key: 'id'
        },
        comment: 'Assigned later by manager or auto-assignment scheduler'
    },
    submitted_by: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'submitted_by',
        references: {
            model: 'technicians',
            key: 'id'
        }
    },
    manager_id: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'manager_id',
        references: {
            model: 'managers',
            key: 'id'
        }
    },
    // Submission metadata
    frequency: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'frequency',
        comment: 'Daily, Weekly, Monthly, etc.'
    },
    inspection_type: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'inspection_type',
        comment: 'Inspection, Testing, Maintenance'
    },
    scheduled_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        field: 'scheduled_date'
    },
    // Status tracking
    status: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'status',
        comment: 'draft, in_progress, submitted, approved, rejected, cancelled'
    },
    // Timestamps
    started_at: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'started_at'
    },
    submitted_at: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'submitted_at'
    },
    completed_at: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'completed_at'
    },
    // QR verification
    qr_verified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'qr_verified'
    },
    qr_verified_at: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'qr_verified_at'
    },
    // Override handling
    override_requested: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'override_requested'
    },
    override_requested_at: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'override_requested_at'
    },
    override_reason: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'override_reason'
    },
    override_status: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'override_status',
        comment: 'PENDING, approved, rejected'
    },
    override_approved_by: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'override_approved_by',
        references: {
            model: 'managers',
            key: 'id'
        }
    },
    override_approved_at: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'override_approved_at'
    },
    // Approval workflow
    approval_status: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'approval_status',
        comment: 'PENDING, approved, rejected'
    },
    approved_by: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'approved_by',
        references: {
            model: 'managers',
            key: 'id'
        }
    },
    approved_at: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'approved_at'
    },
    approval_remarks: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'approval_remarks'
    },
    // Cancellation
    cancelled_reason: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'cancelled_reason'
    },
    cancelled_at: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'cancelled_at'
    },
    // Precomputed metrics
    critical_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'critical_count',
        comment: 'Count of CRITICAL severity answers'
    },
    high_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'high_count',
        comment: 'Count of HIGH severity answers'
    },
    medium_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'medium_count',
        comment: 'Count of MEDIUM severity answers'
    },
    low_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'low_count',
        comment: 'Count of LOW severity answers'
    },
    total_priority_score: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'total_priority_score',
        comment: 'Sum of all priority scores'
    },
    // Health status (computed by trigger)
    calculated_health_status: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'calculated_health_status',
        comment: 'HEALTHY, NEEDS_ATTENTION, NOT_WORKING'
    },
    calculated_priority_score: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'calculated_priority_score',
        comment: 'Overall priority 0-100'
    },
    created_by: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'created_by',
        references: {
            model: 'users',
            key: 'id'
        },
        comment: 'NULL for system-generated services (scheduler), set for manual submissions'
    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'created_at'
    },
    updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'updated_at'
    }
}, {
    tableName: 'service_submissions',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = ServiceSubmission;
