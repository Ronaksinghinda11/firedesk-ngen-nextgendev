'use strict';

/**
 * Migration: Convert service forms to boolean compliance model
 * 
 * Changes:
 * 1. Add compliance_status to service_answers
 * 2. Add non_compliance_condition_id to service_answers
 * 3. Convert all questions to BOOLEAN type
 * 4. Create INFO condition for compliant answers (priority 0)
 * 5. Migrate all existing answers to compliance model
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('Starting boolean compliance migration...');
      
      // Step 1: Add compliance_status column to service_answers
      console.log('Adding compliance_status column...');
      await queryInterface.addColumn('service_answers', 'compliance_status', {
        type: Sequelize.STRING(20),
        allowNull: true,
        comment: 'COMPLIANT, NON_COMPLIANT, or NA'
      }, { transaction });

      // Step 2: Add non_compliance_condition_id column to service_answers
      console.log('Adding non_compliance_condition_id column...');
      await queryInterface.addColumn('service_answers', 'non_compliance_condition_id', {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'conditions',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Condition applied when answer is NON_COMPLIANT'
      }, { transaction });

      // Step 3: Create INFO condition for compliant answers (priority 0)
      console.log('Creating INFO condition...');
      const [infoCondition] = await queryInterface.sequelize.query(
        `INSERT INTO conditions (id, condition_code, condition_name, severity_level, priority_score, health_impact, recommended_action, requires_immediate_action, is_active, created_at, updated_at)
         VALUES (
           gen_random_uuid(),
           'COMPLIANT_OK',
           'Compliant / Satisfactory',
           'INFO',
           0,
           'No impact - item meets requirements',
           'No action required',
           false,
           true,
           NOW(),
           NOW()
         )
         ON CONFLICT (condition_code) DO NOTHING
         RETURNING id`,
        { transaction, type: Sequelize.QueryTypes.INSERT }
      );

      const infoConditionId = infoCondition[0]?.id || (await queryInterface.sequelize.query(
        `SELECT id FROM conditions WHERE condition_code = 'COMPLIANT_OK'`,
        { transaction, type: Sequelize.QueryTypes.SELECT }
      ))[0].id;

      console.log(`INFO condition ID: ${infoConditionId}`);

      // Step 4: Update all questions to BOOLEAN type
      console.log('Converting all questions to BOOLEAN type...');
      await queryInterface.sequelize.query(
        `UPDATE questions SET question_type = 'BOOLEAN' WHERE question_type != 'BOOLEAN'`,
        { transaction }
      );

      // Step 5: Migrate existing answers to compliance model
      console.log('Migrating existing answers...');
      
      // First, mark all answers with boolean_value = true as COMPLIANT
      await queryInterface.sequelize.query(
        `UPDATE service_answers 
         SET compliance_status = 'COMPLIANT',
             selected_condition_id = $1,
             condition_code = 'COMPLIANT_OK',
             condition_name = 'Compliant / Satisfactory',
             severity_level = 'INFO',
             priority_score = 0,
             health_impact = 'No impact - item meets requirements'
         WHERE boolean_value = true`,
        { bind: [infoConditionId], transaction }
      );

      // Mark answers with boolean_value = false as NON_COMPLIANT
      // Keep their existing selected_condition_id as non_compliance_condition_id
      await queryInterface.sequelize.query(
        `UPDATE service_answers 
         SET compliance_status = 'NON_COMPLIANT',
             non_compliance_condition_id = selected_condition_id
         WHERE boolean_value = false`,
        { transaction }
      );

      // Handle answers with selected_condition_id but no boolean_value
      // If condition is SATISFACTORY/INFO/LOW priority (0-20), mark as COMPLIANT
      await queryInterface.sequelize.query(
        `UPDATE service_answers 
         SET compliance_status = 'COMPLIANT',
             boolean_value = true,
             selected_condition_id = $1,
             condition_code = 'COMPLIANT_OK',
             condition_name = 'Compliant / Satisfactory',
             severity_level = 'INFO',
             priority_score = 0
         WHERE compliance_status IS NULL 
         AND (priority_score <= 20 OR priority_score IS NULL OR severity_level IN ('INFO', 'LOW'))`,
        { bind: [infoConditionId], transaction }
      );

      // Remaining answers with higher priority conditions are NON_COMPLIANT
      await queryInterface.sequelize.query(
        `UPDATE service_answers 
         SET compliance_status = 'NON_COMPLIANT',
             boolean_value = false,
             non_compliance_condition_id = selected_condition_id
         WHERE compliance_status IS NULL 
         AND selected_condition_id IS NOT NULL`,
        { transaction }
      );

      // Handle text/numeric/date answers - mark as COMPLIANT if they have values
      await queryInterface.sequelize.query(
        `UPDATE service_answers 
         SET compliance_status = 'COMPLIANT',
             boolean_value = true,
             selected_condition_id = $1,
             condition_code = 'COMPLIANT_OK',
             condition_name = 'Compliant / Satisfactory',
             severity_level = 'INFO',
             priority_score = 0
         WHERE compliance_status IS NULL 
         AND (text_value IS NOT NULL OR numeric_value IS NOT NULL OR date_value IS NOT NULL)`,
        { bind: [infoConditionId], transaction }
      );

      // Any remaining NULL answers default to COMPLIANT
      await queryInterface.sequelize.query(
        `UPDATE service_answers 
         SET compliance_status = 'COMPLIANT',
             boolean_value = true,
             selected_condition_id = $1,
             condition_code = 'COMPLIANT_OK',
             condition_name = 'Compliant / Satisfactory',
             severity_level = 'INFO',
             priority_score = 0
         WHERE compliance_status IS NULL`,
        { bind: [infoConditionId], transaction }
      );

      // Step 6: Make compliance_status NOT NULL now that all rows have values
      console.log('Making compliance_status NOT NULL...');
      await queryInterface.changeColumn('service_answers', 'compliance_status', {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'COMPLIANT'
      }, { transaction });

      await transaction.commit();
      console.log('Boolean compliance migration completed successfully!');
      
    } catch (error) {
      await transaction.rollback();
      console.error('Migration failed:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('Reverting boolean compliance migration...');
      
      // Remove compliance columns
      await queryInterface.removeColumn('service_answers', 'non_compliance_condition_id', { transaction });
      await queryInterface.removeColumn('service_answers', 'compliance_status', { transaction });
      
      // Revert questions to CONDITION_SELECT
      await queryInterface.sequelize.query(
        `UPDATE questions SET question_type = 'CONDITION_SELECT' WHERE question_type = 'BOOLEAN'`,
        { transaction }
      );
      
      // Remove INFO condition
      await queryInterface.sequelize.query(
        `DELETE FROM conditions WHERE condition_code = 'COMPLIANT_OK'`,
        { transaction }
      );
      
      await transaction.commit();
      console.log('Boolean compliance migration reverted successfully!');
      
    } catch (error) {
      await transaction.rollback();
      console.error('Revert failed:', error);
      throw error;
    }
  }
};
