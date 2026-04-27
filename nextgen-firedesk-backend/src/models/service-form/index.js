/**
 * Service Form Module - Index
 * Exports all service form models with associations
 */

const InspectionFrequency = require('./InspectionFrequency');
const Question = require('./Question');
const QuestionCategory = require('./QuestionCategory');
const QuestionProduct = require('./QuestionProduct');
const QuestionFrequency = require('./QuestionFrequency');
const QuestionCondition = require('./QuestionCondition');
const Form = require('./Form');
const FormSection = require('./FormSection');
const FormQuestion = require('./FormQuestion');
const ServiceSubmission = require('./ServiceSubmission');
const ServiceAnswer = require('./ServiceAnswer');
const AssetHealthHistory = require('./AssetHealthHistory');
const ServiceTechnician = require('./ServiceTechnician');

// Import related models for associations (matching pattern from plants/index.js)
const User = require('../user-management/user');
const Technician = require('../user-management/technician');
const Manager = require('../user-management/manager');
const Category = require('../master-data/category');
const Product = require('../master-data/product');
const Condition = require('../master-data/ConditionMaster');
const Plant = require('../plants/Plant');
const Asset = require('../assets/Asset');
const MaintenanceScheduler = require('../plants/Scheduler');

// ============================================
// QUESTION ASSOCIATIONS
// ============================================

// Question -> User (creator)
Question.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
User.hasMany(Question, { foreignKey: 'created_by', as: 'createdQuestions' });

// Question -> Plant (for proper grouping in UI)
Question.belongsTo(Plant, { foreignKey: 'plant_id', as: 'plant' });
Plant.hasMany(Question, { foreignKey: 'plant_id', as: 'questions' });

// Question <-> Category (many-to-many via QuestionCategory)
Question.belongsToMany(Category, {
    through: QuestionCategory,
    foreignKey: 'question_id',
    otherKey: 'category_id',
    as: 'categories'
});
Category.belongsToMany(Question, {
    through: QuestionCategory,
    foreignKey: 'category_id',
    otherKey: 'question_id',
    as: 'questions'
});

// Question <-> Product (many-to-many via QuestionProduct)
Question.belongsToMany(Product, {
    through: QuestionProduct,
    foreignKey: 'question_id',
    otherKey: 'product_id',
    as: 'products'
});
Product.belongsToMany(Question, {
    through: QuestionProduct,
    foreignKey: 'product_id',
    otherKey: 'question_id',
    as: 'questions'
});

// Question <-> InspectionFrequency (many-to-many via QuestionFrequency)
Question.belongsToMany(InspectionFrequency, {
    through: QuestionFrequency,
    foreignKey: 'question_id',
    otherKey: 'frequency_id',
    as: 'frequencies'
});
InspectionFrequency.belongsToMany(Question, {
    through: QuestionFrequency,
    foreignKey: 'frequency_id',
    otherKey: 'question_id',
    as: 'questions'
});

// Question <-> Condition (many-to-many via QuestionCondition)
Question.belongsToMany(Condition, {
    through: QuestionCondition,
    foreignKey: 'question_id',
    otherKey: 'condition_id',
    as: 'conditions'
});
Condition.belongsToMany(Question, {
    through: QuestionCondition,
    foreignKey: 'condition_id',
    otherKey: 'question_id',
    as: 'questions'
});

// Direct access to junction tables
Question.hasMany(QuestionCategory, { foreignKey: 'question_id', as: 'questionCategories' });
QuestionCategory.belongsTo(Question, { foreignKey: 'question_id' });
QuestionCategory.belongsTo(Category, { foreignKey: 'category_id' });

Question.hasMany(QuestionProduct, { foreignKey: 'question_id', as: 'questionProducts' });
QuestionProduct.belongsTo(Question, { foreignKey: 'question_id' });
QuestionProduct.belongsTo(Product, { foreignKey: 'product_id' });

Question.hasMany(QuestionFrequency, { foreignKey: 'question_id', as: 'questionFrequencies' });
QuestionFrequency.belongsTo(Question, { foreignKey: 'question_id' });
QuestionFrequency.belongsTo(InspectionFrequency, { foreignKey: 'frequency_id', as: 'frequency' });

Question.hasMany(QuestionCondition, { foreignKey: 'question_id', as: 'questionConditions' });
QuestionCondition.belongsTo(Question, { foreignKey: 'question_id' });
QuestionCondition.belongsTo(Condition, { foreignKey: 'condition_id', as: 'condition' });

// ============================================
// FORM ASSOCIATIONS
// ============================================

// Form -> User (creator)
Form.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
User.hasMany(Form, { foreignKey: 'created_by', as: 'createdForms' });

// Form -> Category (optional)
Form.belongsTo(Category, { foreignKey: 'category_id', as: 'category' });
Category.hasMany(Form, { foreignKey: 'category_id', as: 'forms' });

// Form -> Product (optional)
Form.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
Product.hasMany(Form, { foreignKey: 'product_id', as: 'forms' });

// Form -> Plant (optional)
Form.belongsTo(Plant, { foreignKey: 'plant_id', as: 'plant' });
Plant.hasMany(Form, { foreignKey: 'plant_id', as: 'forms' });

// Form -> InspectionFrequency (optional)
Form.belongsTo(InspectionFrequency, { foreignKey: 'frequency_id', as: 'frequency' });
InspectionFrequency.hasMany(Form, { foreignKey: 'frequency_id', as: 'forms' });

// Form -> FormSection
Form.hasMany(FormSection, { foreignKey: 'form_id', as: 'sections', onDelete: 'CASCADE' });
FormSection.belongsTo(Form, { foreignKey: 'form_id', as: 'form' });

// Form <-> Question (many-to-many via FormQuestion)
Form.belongsToMany(Question, {
    through: FormQuestion,
    foreignKey: 'form_id',
    otherKey: 'question_id',
    as: 'questions'
});
Question.belongsToMany(Form, {
    through: FormQuestion,
    foreignKey: 'question_id',
    otherKey: 'form_id',
    as: 'forms'
});

// Direct access to FormQuestion junction table
Form.hasMany(FormQuestion, { foreignKey: 'form_id', as: 'formQuestions', onDelete: 'CASCADE' });
FormQuestion.belongsTo(Form, { foreignKey: 'form_id', as: 'form' });
FormQuestion.belongsTo(Question, { foreignKey: 'question_id', as: 'question' });
FormQuestion.belongsTo(FormSection, { foreignKey: 'section_id', as: 'section' });

// FormSection -> FormQuestion
FormSection.hasMany(FormQuestion, { foreignKey: 'section_id', as: 'formQuestions' });

// ============================================
// SERVICE SUBMISSION ASSOCIATIONS
// ============================================

// ServiceSubmission -> Asset
ServiceSubmission.belongsTo(Asset, { foreignKey: 'asset_id', as: 'asset' });
Asset.hasMany(ServiceSubmission, { foreignKey: 'asset_id', as: 'serviceSubmissions' });

// ServiceSubmission -> Plant
ServiceSubmission.belongsTo(Plant, { foreignKey: 'plant_id', as: 'plant' });
Plant.hasMany(ServiceSubmission, { foreignKey: 'plant_id', as: 'serviceSubmissions' });

// ServiceSubmission -> Form
ServiceSubmission.belongsTo(Form, { foreignKey: 'form_id', as: 'form' });
Form.hasMany(ServiceSubmission, { foreignKey: 'form_id', as: 'submissions' });

// ServiceSubmission -> MaintenanceScheduler
ServiceSubmission.belongsTo(MaintenanceScheduler, { foreignKey: 'schedule_id', as: 'schedule' });
MaintenanceScheduler.hasMany(ServiceSubmission, { foreignKey: 'schedule_id', as: 'submissions' });

// ServiceSubmission -> InspectionFrequency
ServiceSubmission.belongsTo(InspectionFrequency, { foreignKey: 'frequency_id', as: 'inspectionFrequency' });
InspectionFrequency.hasMany(ServiceSubmission, { foreignKey: 'frequency_id', as: 'submissions' });

// ServiceSubmission -> Technician (assigned)
ServiceSubmission.belongsTo(Technician, { foreignKey: 'technician_id', as: 'technician' });
Technician.hasMany(ServiceSubmission, { foreignKey: 'technician_id', as: 'assignedSubmissions' });

// ServiceSubmission -> Technician (submitter)
ServiceSubmission.belongsTo(Technician, { foreignKey: 'submitted_by', as: 'submitter' });
Technician.hasMany(ServiceSubmission, { foreignKey: 'submitted_by', as: 'submittedSubmissions' });

// ServiceSubmission -> Manager
ServiceSubmission.belongsTo(Manager, { foreignKey: 'manager_id', as: 'manager' });
Manager.hasMany(ServiceSubmission, { foreignKey: 'manager_id', as: 'submissions' });

// ServiceSubmission -> Manager (override approver)
ServiceSubmission.belongsTo(Manager, { foreignKey: 'override_approved_by', as: 'overrideApprover' });

// ServiceSubmission -> Manager (approver)
ServiceSubmission.belongsTo(Manager, { foreignKey: 'approved_by', as: 'approver' });

// ServiceSubmission -> User (creator)
ServiceSubmission.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
User.hasMany(ServiceSubmission, { foreignKey: 'created_by', as: 'createdSubmissions' });

// ServiceSubmission -> ServiceAnswer
ServiceSubmission.hasMany(ServiceAnswer, { foreignKey: 'submission_id', as: 'answers', onDelete: 'CASCADE' });
ServiceAnswer.belongsTo(ServiceSubmission, { foreignKey: 'submission_id', as: 'submission' });

// ============================================
// SERVICE ANSWER ASSOCIATIONS
// ============================================

// ServiceAnswer -> Question
ServiceAnswer.belongsTo(Question, { foreignKey: 'question_id', as: 'question' });
Question.hasMany(ServiceAnswer, { foreignKey: 'question_id', as: 'answers' });

// ServiceAnswer -> Condition
ServiceAnswer.belongsTo(Condition, { foreignKey: 'selected_condition_id', as: 'selectedCondition' });
Condition.hasMany(ServiceAnswer, { foreignKey: 'selected_condition_id', as: 'selectedInAnswers' });

// ServiceAnswer -> Technician (answerer)
ServiceAnswer.belongsTo(Technician, { foreignKey: 'answered_by', as: 'answeredByTechnician' });
Technician.hasMany(ServiceAnswer, { foreignKey: 'answered_by', as: 'answers' });

// ============================================
// ASSET HEALTH HISTORY ASSOCIATIONS
// ============================================

// AssetHealthHistory -> Asset
AssetHealthHistory.belongsTo(Asset, { foreignKey: 'asset_id', as: 'asset' });
Asset.hasMany(AssetHealthHistory, { foreignKey: 'asset_id', as: 'healthHistory' });

// AssetHealthHistory -> ServiceSubmission
AssetHealthHistory.belongsTo(ServiceSubmission, { foreignKey: 'submission_id', as: 'submission' });
ServiceSubmission.hasOne(AssetHealthHistory, { foreignKey: 'submission_id', as: 'healthHistoryEntry' });

// ============================================
// EXPORTS
// ============================================

// ============================================
// SERVICE TECHNICIAN ASSOCIATIONS (Multi-Technician Assignment)
// ============================================

// ServiceSubmission <-> Technician (Many-to-Many via ServiceTechnician)
ServiceSubmission.belongsToMany(Technician, {
    through: ServiceTechnician,
    foreignKey: 'service_id',
    otherKey: 'technician_id',
    as: 'assignedTechnicians'
});

Technician.belongsToMany(ServiceSubmission, {
    through: ServiceTechnician,
    foreignKey: 'technician_id',
    otherKey: 'service_id',
    as: 'assignedServices'
});

// Direct associations for junction table access
ServiceTechnician.belongsTo(ServiceSubmission, {
    foreignKey: 'service_id',
    as: 'service'
});

ServiceTechnician.belongsTo(Technician, {
    foreignKey: 'technician_id',
    as: 'technician'
});

ServiceTechnician.belongsTo(Manager, {
    foreignKey: 'assigned_by',
    as: 'assignedByManager'
});

ServiceSubmission.hasMany(ServiceTechnician, {
    foreignKey: 'service_id',
    as: 'serviceTechnicians'
});

Technician.hasMany(ServiceTechnician, {
    foreignKey: 'technician_id',
    as: 'technicianAssignments'
});

module.exports = {
    InspectionFrequency,
    Question,
    QuestionCategory,
    QuestionProduct,
    QuestionFrequency,
    QuestionCondition,
    Condition,
    Form,
    FormSection,
    FormQuestion,
    ServiceSubmission,
    ServiceAnswer,
    AssetHealthHistory,
    ServiceTechnician
};
