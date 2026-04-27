'use strict';

require('dotenv').config({
  path: require('path').resolve(__dirname, '../.env'),
});

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/config');

async function up() {
  const queryInterface = sequelize.getQueryInterface();

  console.log('Checking forms table...');

  const tableInfo = await queryInterface.describeTable('forms');

  if (!tableInfo.service_type) {
    console.log('Adding service_type column to forms table...');
    await queryInterface.addColumn('forms', 'service_type', {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'inspection, testing, maintenance',
    });
    console.log('✅ service_type column added');
  } else {
    console.log('ℹ️ service_type column already exists');
  }
}

async function down() {
  const queryInterface = sequelize.getQueryInterface();
  await queryInterface.removeColumn('forms', 'service_type');
}

/**
 * 👇 THIS PART MAKES IT RUN VIA `node file.js`
 */
if (require.main === module) {
  up()
    .then(() => {
      console.log('🎉 Migration completed successfully');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Migration failed:', err);
      process.exit(1);
    });
}

module.exports = { up, down };
