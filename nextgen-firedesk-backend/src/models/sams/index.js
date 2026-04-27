/**
 * SAMS (Safety & Audit Management System) Models
 * Defines all models and their associations for the Incident & CAPA system
 */

const IncidentType = require('./IncidentType');
const IncidentSubtype = require('./IncidentSubtype');
const CapaStepDefinition = require('./CapaStepDefinition');
const Incident = require('./Incident');
const IncidentAssignment = require('./IncidentAssignment');
const IncidentCapaStep = require('./IncidentCapaStep');
const IncidentActivity = require('./IncidentActivity');

// Import User, Manager, Technician models from user-management
const User = require('../user-management/user');
const Manager = require('../user-management/manager');
const Technician = require('../user-management/technician');

// Import Plant, Building, Floor models
const Plant = require('../plants/Plant');
const Building = require('../plants/Building');
const Floor = require('../plants/Floor');

// ============================================
// ASSOCIATIONS
// ============================================

// IncidentType <-> IncidentSubtype
IncidentType.hasMany(IncidentSubtype, {
    foreignKey: 'incidentTypeId',
    as: 'subtypes',
    onDelete: 'CASCADE'
});
IncidentSubtype.belongsTo(IncidentType, {
    foreignKey: 'incidentTypeId',
    as: 'incidentType'
});

// Incident <-> IncidentSubtype
Incident.belongsTo(IncidentSubtype, {
    foreignKey: 'incidentSubtypeId',
    as: 'subtype'
});
IncidentSubtype.hasMany(Incident, {
    foreignKey: 'incidentSubtypeId',
    as: 'incidents'
});

// Incident <-> Plant, Building, Floor
Incident.belongsTo(Plant, {
    foreignKey: 'plantId',
    as: 'plant'
});
Plant.hasMany(Incident, {
    foreignKey: 'plantId',
    as: 'incidents'
});

Incident.belongsTo(Building, {
    foreignKey: 'buildingId',
    as: 'building'
});
Building.hasMany(Incident, {
    foreignKey: 'buildingId',
    as: 'incidents'
});

Incident.belongsTo(Floor, {
    foreignKey: 'floorId',
    as: 'floor'
});
Floor.hasMany(Incident, {
    foreignKey: 'floorId',
    as: 'incidents'
});

// Incident <-> User (Creator, Team Creator, Team Leader)
Incident.belongsTo(User, {
    foreignKey: 'createdBy',
    as: 'creator'
});
User.hasMany(Incident, {
    foreignKey: 'createdBy',
    as: 'createdIncidents'
});

Incident.belongsTo(User, {
    foreignKey: 'teamCreatorId',
    as: 'teamCreator'
});
User.hasMany(Incident, {
    foreignKey: 'teamCreatorId',
    as: 'managedIncidents'
});

Incident.belongsTo(User, {
    foreignKey: 'teamLeaderId',
    as: 'teamLeader'
});
User.hasMany(Incident, {
    foreignKey: 'teamLeaderId',
    as: 'ledIncidents'
});

// Incident <-> IncidentAssignment
Incident.hasMany(IncidentAssignment, {
    foreignKey: 'incidentId',
    as: 'assignments',
    onDelete: 'CASCADE'
});
IncidentAssignment.belongsTo(Incident, {
    foreignKey: 'incidentId',
    as: 'incident'
});

// IncidentAssignment <-> User
IncidentAssignment.belongsTo(User, {
    foreignKey: 'userId',
    as: 'assignedUser'
});
User.hasMany(IncidentAssignment, {
    foreignKey: 'userId',
    as: 'incidentAssignments'
});

IncidentAssignment.belongsTo(User, {
    foreignKey: 'assignedBy',
    as: 'assigner'
});
User.hasMany(IncidentAssignment, {
    foreignKey: 'assignedBy',
    as: 'assignmentsMade'
});

// Incident <-> IncidentCapaStep
Incident.hasMany(IncidentCapaStep, {
    foreignKey: 'incidentId',
    as: 'capaSteps',
    onDelete: 'CASCADE'
});
IncidentCapaStep.belongsTo(Incident, {
    foreignKey: 'incidentId',
    as: 'incident'
});

// IncidentCapaStep <-> CapaStepDefinition
IncidentCapaStep.belongsTo(CapaStepDefinition, {
    foreignKey: 'capaStepDefinitionId',
    as: 'definition'
});
CapaStepDefinition.hasMany(IncidentCapaStep, {
    foreignKey: 'capaStepDefinitionId',
    as: 'instances'
});

// IncidentCapaStep <-> User (Submitter, Approver, Rejector)
IncidentCapaStep.belongsTo(User, {
    foreignKey: 'submittedBy',
    as: 'submitter'
});
User.hasMany(IncidentCapaStep, {
    foreignKey: 'submittedBy',
    as: 'submittedCapaSteps'
});

IncidentCapaStep.belongsTo(User, {
    foreignKey: 'approvedBy',
    as: 'approver'
});
User.hasMany(IncidentCapaStep, {
    foreignKey: 'approvedBy',
    as: 'approvedCapaSteps'
});

IncidentCapaStep.belongsTo(User, {
    foreignKey: 'rejectedBy',
    as: 'rejector'
});
User.hasMany(IncidentCapaStep, {
    foreignKey: 'rejectedBy',
    as: 'rejectedCapaSteps'
});

// Incident <-> IncidentActivity
Incident.hasMany(IncidentActivity, {
    foreignKey: 'incidentId',
    as: 'activities',
    onDelete: 'CASCADE'
});
IncidentActivity.belongsTo(Incident, {
    foreignKey: 'incidentId',
    as: 'incident'
});

// IncidentActivity <-> User
IncidentActivity.belongsTo(User, {
    foreignKey: 'performedBy',
    as: 'performer'
});
User.hasMany(IncidentActivity, {
    foreignKey: 'performedBy',
    as: 'performedActivities'
});

// User associations with IncidentType, IncidentSubtype, CapaStepDefinition (Creator)
IncidentType.belongsTo(User, {
    foreignKey: 'createdBy',
    as: 'creator'
});

IncidentSubtype.belongsTo(User, {
    foreignKey: 'createdBy',
    as: 'creator'
});

CapaStepDefinition.belongsTo(User, {
    foreignKey: 'createdBy',
    as: 'creator'
});

// ============================================
// EXPORTS
// ============================================

module.exports = {
    IncidentType,
    IncidentSubtype,
    CapaStepDefinition,
    Incident,
    IncidentAssignment,
    IncidentCapaStep,
    IncidentActivity
};
