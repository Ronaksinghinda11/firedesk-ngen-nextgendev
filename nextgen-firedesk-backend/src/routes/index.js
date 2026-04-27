/**
 * Routes Index
 * Exports all route modules
 */
const express = require("express");
const router = express.Router();

// ==============================
// USER / CORE ROUTES
// ==============================

// User Management Routes
const userManagementRoutes = require("./user-management");
router.use("/", userManagementRoutes);

// Master Data Routes
const masterDataRoutes = require("./masterDataRoutes");
router.use("/master-data", masterDataRoutes);

// Asset Routes
const assetRoutes = require("./asset_routes");
router.use("/assets", assetRoutes);

// Plant Routes
const plantRoutes = require("./plantRoutes");
router.use("/", plantRoutes);

// ==============================
// SAMS (Safety & Audit Management System)
// ==============================
const samsRoutes = require("./samsRoutes");
const samsAdminRoutes = require("./samsAdminRoutes");
router.use("/sams", samsRoutes);
router.use("/sams/admin", samsAdminRoutes);

// ==============================
// UPLOADS
// ==============================
const uploadRoutes = require("./uploadRoutes");
router.use("/upload", uploadRoutes);

// ==============================
// SERVICE FORMS
// ==============================
const serviceFormRoutes = require("./serviceFormRoutes");
router.use("/service-forms", serviceFormRoutes);

// ==============================
// CALENDAR & SCHEDULER
// ==============================
const calendarRoutes = require("./calendarRoutes");
router.use("/calendar", calendarRoutes);

const schedulerRoutes = require("./schedulerRoutes");
router.use("/schedulers", schedulerRoutes);

// ==============================
// TECHNICIAN & MANAGER
// ==============================
const technicianRoutes = require("./technicianRoutes");
router.use("/technician", technicianRoutes);

// Manager Routes (kept for backward compatibility)
const managerRoutes = require("./managerRoutes");
router.use("/manager", managerRoutes);
router.use("/api/manager", managerRoutes);

// Approval Console Routes (manager sub-path)
const approvalConsoleRoutes = require("./approvalConsoleRoutes");
router.use("/manager/approval-console", approvalConsoleRoutes);

// ==============================
// TICKETS (FROM feature/cal)
// ==============================
const ticketRoutes = require("./ticketRoutes");
router.use("/tickets", ticketRoutes);

// ==============================
// INVENTORY
// ==============================
const inventoryRoutes = require("./inventoryRoutes");
router.use("/inventory", inventoryRoutes);

// ==============================
// IOT (FROM plant-module)
// ==============================
const iotRoutes = require("./iotRoutes");
const iotDeviceController = require("../controllers/iot/iotDeviceController");

router.use("/send-iot-data", iotDeviceController.receiveIoTData);
router.use("/iot", iotRoutes);

// ==============================
// DASHBOARD
// ==============================
const dashboardRoutes = require("./dashboardRoutes");
router.use("/dashboard", dashboardRoutes);
// Audit Routes
const auditRoutes = require("./audit/auditRoutes");
router.use("/audit", auditRoutes);

// Comment Routes
const commentRoutes = require("./comments/commentRoutes");
router.use("/comments", commentRoutes);

// ==============================
// SEARCH
// ==============================
const searchRoutes = require("./searchRoutes");
router.use("/search", searchRoutes);

// ==============================
// NOTIFICATIONS
// ==============================
const notificationRoutes = require("./notificationRoutes");
router.use("/notifications", notificationRoutes);

// ==============================
// EXPORT
// ==============================
module.exports = router;
