/**
 * AssetTestingSchedule Model
 * HP test dates and frequency
 */

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../../../config/config');

class AssetTestingSchedule extends Model {
    static associate(models) {
        AssetTestingSchedule.belongsTo(models.Asset, {
            foreignKey: 'asset_id',
            as: 'asset'
        });
    }
}

AssetTestingSchedule.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    asset_id: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        references: {
            model: 'assets',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    last_hp_test_date: {
        type: DataTypes.JSONB,
        allowNull: true
    },
    next_hp_test_due_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    test_frequency_months: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    last_refill_date: {
        type: DataTypes.JSONB,
        allowNull: true
    },
    next_refill_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
    }
}, {
    hooks: {
        beforeUpdate: async (record) => {
            if (record.changed('next_refill_date')) {
                const previousDate = record.previous('next_refill_date');
                if (previousDate) {
                    const currentHistory = record.last_refill_date || [];
                    const historyArray = Array.isArray(currentHistory) ? currentHistory : [currentHistory];

                    // Add previous date if not already in history (optional check, but good for data cleanliness)
                    if (!historyArray.includes(previousDate)) {
                        record.last_refill_date = [...historyArray, previousDate];
                    }
                }
            }
        }
    },
    sequelize,
    modelName: 'AssetTestingSchedule',
    tableName: 'asset_testing_schedule',
    underscored: true,
    timestamps: true,
    createdAt: false,
    updatedAt: 'updated_at'
});

module.exports = AssetTestingSchedule;
