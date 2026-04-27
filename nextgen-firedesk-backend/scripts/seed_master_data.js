require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const { sequelize } = require('../config/config');
const { Industry, Category, User, Role, Manager } = require('../src/models');
const bcrypt = require('bcryptjs');

async function seed() {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        // 1. Seed Industry
        let industry = await Industry.findOne({ where: { industry_name: 'Manufacturing' } });
        if (industry) {
            if (industry.status !== 'Active') {
                await industry.update({ status: 'Active' });
                console.log('Updated Industry "Manufacturing" to Active.');
            } else {
                console.log('Industry "Manufacturing" is already Active.');
            }
        } else {
            industry = await Industry.create({
                industry_name: 'Manufacturing',
                industry_code: 'IND-MFG-001',
                status: 'Active'
            });
            console.log('Created Industry: Manufacturing');
        }

        // 2. Seed Category
        const [category, createdCat] = await Category.findOrCreate({
            where: { category_name: 'Fire Safety' },
            defaults: {
                category_code: 'CAT-FS-001',
                test_frequency_required: true,
                status: 'Active'
            }
        });
        console.log(createdCat ? 'Created Category: Fire Safety' : 'Category "Fire Safety" already exists.');

        // 3. Seed Manager Role & User
        // Check/Create Role
        const [role] = await Role.findOrCreate({
            where: { name: 'Manager' },
            defaults: {
                description: 'Plant Manager',
                is_system: true
            }
        });

        // Create User
        const email = 'manager@demo.com';
        let user = await User.findOne({ where: { email } });

        if (!user) {
            const hashedPassword = await bcrypt.hash('Password@123', 10);
            user = await User.create({
                first_name: 'Demo',
                last_name: 'Manager',
                email: email,
                password_hash: hashedPassword,
                role_id: role.id,
                status: 'Active',
                phone: '9876543210'
            });
            console.log('Created Manager User: manager@demo.com');
        } else {
            console.log('Manager user already exists.');
        }

        // Check/Create Manager Profile
        let managerProfile = await Manager.findOne({ where: { user_id: user.id } });
        if (!managerProfile) {
            await Manager.create({
                user_id: user.id,
                manager_code: 'MGR-DEMO-001',
                status: 'Active'
            });
            console.log('Created Manager Profile.');
        } else {
            console.log('Manager Profile already exists.');
        }

        console.log('Seeding completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
}

seed();
