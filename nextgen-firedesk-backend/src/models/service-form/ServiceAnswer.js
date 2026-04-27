const { DataTypes } = require('sequelize');
const { sequelize } = require('../../../config/config');

const ServiceAnswer = sequelize.define('ServiceAnswer', {
    id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
        field: 'id'
    },
    // Relationships
    submission_id: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'submission_id',
        references: {
            model: 'service_submissions',
            key: 'id'
        }
    },
    question_id: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'question_id',
        references: {
            model: 'questions',
            key: 'id'
        }
    },
    // Answer values (use appropriate field based on question type)
    text_value: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'text_value',
        comment: 'For text, textarea answers'
    },
    numeric_value: {
        type: DataTypes.DECIMAL,
        allowNull: true,
        field: 'numeric_value',
        comment: 'For number inputs'
    },
    boolean_value: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        field: 'boolean_value',
        comment: 'For yes/no, checkboxes'
    },
    date_value: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        field: 'date_value',
        comment: 'For date inputs'
    },
    json_value: {
        type: DataTypes.JSONB,
        allowNull: true,
        field: 'json_value',
        comment: 'For multi-select, complex answers'
    },
    // Condition-based answers (for inspection questions)
    selected_condition_id: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'selected_condition_id',
        references: {
            model: 'conditions',
            key: 'id'
        },
        comment: 'Selected condition from dropdown'
    },
    condition_code: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'condition_code',
        comment: 'Snapshot: condition code at time of answer'
    },
    condition_name: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'condition_name',
        comment: 'Snapshot: condition name'
    },
    severity_level: {
        type: DataTypes.STRING(20),
        allowNull: true,
        field: 'severity_level',
        comment: 'Snapshot: CRITICAL, HIGH, MEDIUM, LOW'
    },
    priority_score: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'priority_score',
        comment: 'Snapshot: 0-100'
    },
    health_impact: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'health_impact',
        comment: 'Snapshot: health impact description'
    },
    // Boolean compliance model fields
    compliance_status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'COMPLIANT',
        field: 'compliance_status',
        comment: 'COMPLIANT (YES), NON_COMPLIANT (NO), or NA'
    },
    non_compliance_condition_id: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'non_compliance_condition_id',
        references: {
            model: 'conditions',
            key: 'id'
        },
        comment: 'Condition applied when answer is NON_COMPLIANT'
    },
    // Rich content
    photo_urls: {
        type: DataTypes.JSONB,
        allowNull: true,
        field: 'photo_urls',
        comment: 'Array of photo URLs: ["url1", "url2"]'
    },
    signature_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
        field: 'signature_url',
        comment: 'Digital signature if required'
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'notes',
        comment: 'Technician notes/remarks'
    },
    // Answer metadata
    answered_by: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'answered_by',
        references: {
            model: 'technicians',
            key: 'id'
        }
    },
    answered_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'answered_at'
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
    tableName: 'service_answers',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            unique: true,
            fields: ['submission_id', 'question_id']
        }
    ]
});

module.exports = ServiceAnswer;
