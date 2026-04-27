const { sequelize } = require('./config/config');

async function fixFK() {
  try {
    // 1. Find the name of the foreign key constraint on the tickets table for asset_id
    const query = `
      SELECT constraint_name
      FROM information_schema.key_column_usage
      WHERE table_name = 'tickets' AND column_name = 'asset_id' AND constraint_name LIKE '%fkey%';
    `;
    const [results] = await sequelize.query(query);
    
    if (results.length > 0) {
      const constraintName = results[0].constraint_name;
      console.log('Found constraint:', constraintName);
      
      // 2. Drop the old constraint
      await sequelize.query(`ALTER TABLE tickets DROP CONSTRAINT "${constraintName}";`);
      console.log('Dropped old constraint');
      
      // 3. Add new constraint with ON DELETE SET NULL
      await sequelize.query(`
        ALTER TABLE tickets 
        ADD CONSTRAINT "${constraintName}" 
        FOREIGN KEY (asset_id) 
        REFERENCES assets(id) 
        ON DELETE SET NULL;
      `);
      console.log('Added new constraint with SET NULL');
    } else {
      console.log('No existing foreign key constraint found for tickets.asset_id');
      
      // Try just adding it directly just in case it doesn't have one but needs one
      await sequelize.query(`
        ALTER TABLE tickets 
        ADD CONSTRAINT "tickets_asset_id_fkey" 
        FOREIGN KEY (asset_id) 
        REFERENCES assets(id) 
        ON DELETE SET NULL;
      `);
      console.log('Added constraint from scratch');
    }
  } catch (error) {
    console.error('Error fixing FK:', error);
  } finally {
    process.exit(0);
  }
}

fixFK();
