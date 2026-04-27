const { sequelize } = require('./config/config');
const { User, Technician, Plant, ServiceSubmission } = require('./src/models');

const checkTechnician = async () => {
    try {
        console.log('Connecting to DB...');
        await sequelize.authenticate();
        console.log('Connected.');

        const phone = '7439746027'; // From logs
        const user = await User.findOne({ where: { phone } });

        if (!user) {
            console.log('User not found!');
            return;
        }

        console.log(`User found: ID=${user.id}, Name=${user.name}, RoleID=${user.role_id}`);

        const technician = await Technician.findOne({
            where: { user_id: user.id },
            include: [{
                model: Plant,
                as: 'plants'
            }]
        });

        if (!technician) {
            console.log('Technician record not found for this user!');
        } else {
            console.log(`Technician found: ID=${technician.id}`);
            console.log(`Assigned Plants: ${technician.plants ? technician.plants.length : 0}`);
            if (technician.plants) {
                technician.plants.forEach(p => console.log(` - ${p.plant_name} (${p.id})`));
            }
        }

        if (technician) {
            const services = await ServiceSubmission.count({
                where: { technician_id: technician.id }
            });
            console.log(`Service Submissions count: ${services}`);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await sequelize.close();
    }
};

checkTechnician();
