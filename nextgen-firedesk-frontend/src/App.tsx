import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { UIProvider } from "./contexts/UIContext";
import { PlantFilterProvider } from "./contexts/PlantFilterContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminLayout } from "./components/AdminLayout";
import { ManagerLayout } from "./components/ManagerLayout";
import { UserLayout } from "./components/UserLayout";
import Index from "./pages/Index";
import Login from "./pages/Login";
import TechnicianLogin from "./pages/TechnicianLogin";
import VerifyOTP from "./pages/VerifyOTP";
import ResetPassword from "./pages/ResetPassword";
import Unauthorized from "./pages/Unauthorized";
import Dashboard from "./pages/admin/Dashboard";
import PremiumAnalyticsDashboard from "./pages/admin/PremiumAnalyticsDashboard";
import Overview from "./pages/admin/Overview";
import States from "./pages/admin/States";
import Cities from "./pages/admin/Cities";
import Industries from "./pages/admin/Industries";
import Plants from "./pages/admin/PlantsPage";
import PlantCreate from "./pages/admin/PlantCreate";
import PlantEdit from "./pages/admin/PlantEdit";
// import PlantView from "./pages/admin/PlantView";
import NotFound from "./pages/NotFound";
import ServiceForms from "./pages/admin/ServiceForms";
import Categories from "./pages/admin/Categories";
import Products from "./pages/admin/Products";
import { VendorsPage } from "./pages/admin/VendorsPage";
import { UsersPage } from "./pages/admin/UsersPage";
import { RolesPage } from "./pages/admin/RolesPage";
import { ServiceFormPage } from "./pages/admin/ServiceFormPage";
import ServiceSubmissionView from "./pages/admin/ServiceSubmissionView";
import { ManagersPage } from "./pages/admin/ManagersPage";
import { TechniciansPage } from "./pages/admin/TechniciansPage";
import ProfileSettings from "./pages/admin/ProfileSettings"; // Add this import
import ActivitiesPage from "./pages/admin/ActivitiesPage"; // Add this import
import Assets from "./pages/admin/Assets"; // Add this import
// import AssetCreate from "./pages/admin/AssetCreate";
import AssetView from "./pages/admin/AssetView";
// import AssetEdit from "./pages/admin/AssetEdit";
import QuestionsPage from "./pages/admin/questions/QuestionsPage";
import SchedulerPage from "./pages/admin/scheduler/SchedulerPage";
import PlantQuestionsView from "./pages/admin/PlantQuestionsView";
import FloorplanDashboard from "./pages/admin/floorplan/FloorplanDashboard";
import FloorplanViewer from "./pages/admin/floorplan/FloorplanViewer";
import ConditionMaster from "./pages/admin/masterData/ConditionMaster";
import AdminCalendar from "./pages/admin/Calendar";
import FormBuilderPage from "./pages/admin/FormBuilderPage";
import AdminTickets from "./pages/admin/Tickets";
import TechnicianDashboard from "./pages/technician/TechnicianDashboard";
import TechnicianServiceForm from "./pages/technician/TechnicianServiceForm";
import MyServices from "./pages/technician/MyServices";
import ServiceDetails from "./pages/technician/ServiceDetails";
import TechnicianCalendar from "./pages/technician/TechnicianCalendar";
import TechnicianServiceFormPage from "./pages/technician/ServiceFormPage";
import TechnicianTickets from "./pages/technician/Tickets";
import TicketDetail from "./pages/technician/TicketDetail";
import { TechnicianLayout } from "./components/TechnicianLayout";
import TicketCreatePage from "./pages/shared/TicketCreatePage";
// SAMS imports
import SAMSDashboard from "./pages/admin/sams/SAMSDashboard";
import IncidentsList from "./pages/admin/sams/incidents/IncidentsList";
import IncidentCreate from "./pages/admin/sams/incidents/IncidentCreate";
import IncidentView from "./pages/admin/sams/incidents/IncidentView";
import AuditsList from "./pages/admin/sams/audits/AuditsList";
import AuditCreate from "./pages/admin/sams/audits/AuditCreate";
import AuditView from "./pages/admin/sams/audits/AuditView";
import TrainingsList from "./pages/admin/sams/trainings/TrainingsList";
import TrainingCreate from "./pages/admin/sams/trainings/TrainingCreate";
import TrainingView from "./pages/admin/sams/trainings/TrainingView";

// New Master Data Pages
import IncidentTypesPage from "./pages/admin/sams/master-data/IncidentTypesPage";
import IncidentSubtypesPage from "./pages/admin/sams/master-data/IncidentSubtypesPage";
import CapaStepsPage from "./pages/admin/sams/master-data/CapaStepsPage";

// Manager pages
import ManagerDashboard from "./pages/manager/Dashboard";
import PremiumManagerDashboard from "./pages/manager/PremiumDashboard";
import ManagerProfile from "./pages/manager/Profile";
import ManagerPlants from "./pages/manager/Plants";
import ManagerAssets from "./pages/manager/Assets";
import ManagerCalendar from "./pages/manager/Calendar";
import ManagerTechnicians from "./pages/manager/Technicians";
import ManagerTickets from "./pages/manager/Tickets";
import TicketDetailView from "./pages/manager/TicketDetailView";
import ManagerCategories from "./pages/manager/Categories";
import ManagerProducts from "./pages/manager/Products";
import ManagerGroupService from "./pages/manager/GroupService";
import ManagerAudits from "./pages/manager/Audits";
import ManagerArchive from "./pages/manager/Archive";
import ManagerReports from "./pages/manager/Reports";
import ManagerServiceForms from "./pages/manager/ServiceForms";
import ServiceFormView from "./pages/manager/ServiceFormView";
import ServiceFormPreview from "./pages/manager/ServiceFormPreview";
import ServiceApprovalConsole from "./pages/manager/ServiceApprovalConsole";
import ManagerInventory from "./pages/manager/Inventory";

// Manager SAMS pages
import ManagerSAMSDashboard from "./pages/manager/sams/SAMSDashboard";
// import ManagerIncidentsList from "./pages/manager/sams/incidents/IncidentsList";
// import ManagerIncidentCreate from "./pages/manager/sams/incidents/IncidentCreate";
// import ManagerIncidentView from "./pages/manager/sams/incidents/IncidentView";
import ManagerAuditsList from "./pages/manager/sams/audits/AuditsList";
import ManagerAuditCreate from "./pages/manager/sams/audits/AuditCreate";
import ManagerAuditView from "./pages/manager/sams/audits/AuditView";
import ManagerTrainingsList from "./pages/manager/sams/trainings/TrainingsList";
import ManagerTrainingCreate from "./pages/manager/sams/trainings/TrainingCreate";
import ManagerTrainingView from "./pages/manager/sams/trainings/TrainingView";

// User SAMS pages
import UserMyIncidents from "./pages/user/sams/incidents/MyIncidents";
import UserIncidentView from "./pages/user/sams/incidents/IncidentView";
import UserIncidentCreate from "./pages/user/sams/incidents/IncidentCreate";

// Technician SAMS pages
import TechnicianMyIncidents from "./pages/technician/sams/incidents/MyIncidents";
import TechnicianIncidentView from "./pages/technician/sams/incidents/IncidentView";
import TechnicianIncidentCreate from "./pages/technician/sams/incidents/IncidentCreate";

// IoT Setup page
import IoTSetupPage from "./pages/IoTSetupWrapper";

// Pump Room Summary page
import { PumpRoomSummary } from "./pages/admin/PumpRoomSummary";

// Command Center pages
import PlantCommandCenterPage from "./pages/PlantCommandCenterPage";
import RegionalEHSCommandCenterPage from "./pages/RegionalEHSCommandCenterPage";

// Dynamic Dashboard for custom roles
import DynamicDashboard from "./pages/DynamicDashboard";
import AssetQRView from "./pages/AssetQRView";
import KnowMore from "./premium-dashboard/pumpRoom/components/knowMore";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <PlantFilterProvider>
            <UIProvider>
              <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/login" element={<Login />} />
                <Route path="/technician/login" element={<TechnicianLogin />} />
                <Route path="/verify-otp" element={<VerifyOTP />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/unauthorized" element={<Unauthorized />} />

                {/* Public QR Code Route */}
                <Route path="/qr/asset/:id" element={<AssetQRView />} />

                {/* Admin Routes */}
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute requireAdmin>
                      <AdminLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Overview />} />
                  <Route path="overview" element={<Overview />} />
                  <Route
                    path="analytics-dashboard"
                    element={<PremiumAnalyticsDashboard />}
                  />
                  <Route
                    path="pump-product-details/:id"
                    element={<KnowMore />}
                  />
                  <Route path="states" element={<States />} />
                  <Route path="cities" element={<Cities />} />
                  <Route path="industries" element={<Industries />} />
                  <Route path="plants" element={<Plants />} />
                  <Route path="plants/create" element={<PlantCreate />} />
                  {/* <Route path="plants/:id" element={<PlantView />} /> */}
                  <Route path="plants/:id/edit" element={<PlantEdit />} />
                  <Route
                    path="plants/:id/questions-view"
                    element={<PlantQuestionsView />}
                  />
                  <Route path="categories" element={<Categories />} />
                  <Route path="products" element={<Products />} />
                  <Route path="vendors" element={<VendorsPage />} />
                  <Route path="questions" element={<QuestionsPage />} />
                  <Route path="scheduler" element={<SchedulerPage />} />
                  <Route path="service-forms" element={<ServiceForms />} />
                  <Route
                    path="service-forms/create"
                    element={<FormBuilderPage />}
                  />
                  <Route
                    path="service-forms/create/:step"
                    element={<FormBuilderPage />}
                  />
                  <Route
                    path="service-forms/:id/edit"
                    element={<FormBuilderPage />}
                  />
                  <Route
                    path="service-forms/:id/edit/:step"
                    element={<FormBuilderPage />}
                  />
                  <Route
                    path="service-forms/:id"
                    element={<ServiceFormPage />}
                  />
                  <Route
                    path="service-submissions/:id"
                    element={<ServiceSubmissionView />}
                  />
                  <Route
                    path="master-data/conditions"
                    element={<ConditionMaster />}
                  />
                  <Route path="managers" element={<ManagersPage />} />
                  <Route path="technicians" element={<TechniciansPage />} />
                  <Route path="assets" element={<Assets />} />
                  <Route path="assets/create" element={<Assets />} />
                  <Route path="assets/:id" element={<AssetView />} />
                  <Route path="assets/:id/edit" element={<Assets />} />
                  <Route path="assets/:id/edit" element={<Assets />} />
                  <Route path="calendar" element={<AdminCalendar />} />
                  <Route path="tickets" element={<AdminTickets />} />
                  <Route path="tickets/create" element={<TicketCreatePage />} />
                  <Route path="tickets/:id" element={<TicketDetailView />} />
                  <Route path="inventory" element={<ManagerInventory />} />
                  <Route path="floorplans" element={<FloorplanDashboard />} />
                  <Route path="floorplans/:id" element={<FloorplanViewer />} />
                  <Route
                    path="floorplans/manufacturing-facility"
                    element={<FloorplanViewer />}
                  />
                  <Route path="roles" element={<RolesPage />} />
                  <Route path="users" element={<UsersPage />} />
                  <Route path="activities" element={<ActivitiesPage />} />{" "}
                  {/* Add this route */}
                  <Route
                    path="profile-settings"
                    element={<ProfileSettings />}
                  />{" "}
                  {/* Add this route */}
                  <Route path="incidents" element={<IncidentsList />} />{" "}
                  {/* Allow direct access to incidents */}
                  {/* IoT Setup Route */}
                  <Route path="iot-setup" element={<IoTSetupPage />} />
                  {/* Pump Room Summary Route */}
                  <Route
                    path="pump-room-summary"
                    element={<PumpRoomSummary />}
                  />
                  {/* Command Center Routes */}
                  <Route
                    path="plant-command-center/:plantId"
                    element={<PlantCommandCenterPage />}
                  />
                  <Route
                    path="regional-ehs"
                    element={<RegionalEHSCommandCenterPage />}
                  />
                  {/* SAMS Routes */}
                  <Route path="sams" element={<SAMSDashboard />} />
                  {/* Master Data Routes */}
                  <Route
                    path="sams/master-data/types"
                    element={<IncidentTypesPage />}
                  />
                  <Route
                    path="sams/master-data/subtypes"
                    element={<IncidentSubtypesPage />}
                  />
                  <Route
                    path="sams/master-data/capa-steps"
                    element={<CapaStepsPage />}
                  />
                  {/* Incident Routes */}
                  <Route path="sams/incidents" element={<IncidentsList />} />
                  <Route
                    path="sams/incidents/create"
                    element={<IncidentCreate />}
                  />
                  <Route path="sams/incidents/:id" element={<IncidentView />} />
                  {/* Audit Routes */}
                  <Route path="sams/audits" element={<AuditsList />} />
                  <Route path="sams/audits/create" element={<AuditCreate />} />
                  <Route path="sams/audits/:id" element={<AuditView />} />
                  {/* Training Routes */}
                  <Route path="sams/trainings" element={<TrainingsList />} />
                  <Route
                    path="sams/trainings/create"
                    element={<TrainingCreate />}
                  />
                  <Route path="sams/trainings/:id" element={<TrainingView />} />
                </Route>

                {/* Manager Routes - Allow custom roles with dashboard permissions */}
                <Route
                  path="/manager"
                  element={
                    <ProtectedRoute requireManager allowCustomRoles>
                      <ManagerLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Overview basePath="/manager" />} />
                  <Route
                    path="pump-product-details/:id"
                    element={<KnowMore />}
                  />
                  <Route
                    path="premium-dashboard"
                    element={<PremiumManagerDashboard />}
                  />
                  <Route path="profile" element={<ManagerProfile />} />
                  <Route path="plants" element={<ManagerPlants />} />
                  <Route
                    path="plants/:id/questions-view"
                    element={<PlantQuestionsView />}
                  />
                  <Route path="plants/:id/edit" element={<PlantEdit />} />
                  <Route path="categories" element={<ManagerCategories />} />
                  <Route path="products" element={<ManagerProducts />} />
                  <Route path="technicians" element={<ManagerTechnicians />} />
                  <Route path="assets" element={<ManagerAssets />} />
                  <Route path="assets/create" element={<ManagerAssets />} />
                  <Route path="assets/:id" element={<AssetView />} />
                  <Route path="assets/:id/edit" element={<ManagerAssets />} />
                  <Route path="calendar" element={<ManagerCalendar />} />
                  <Route path="group-service" element={<ManagerGroupService />} />
                  <Route path="tickets" element={<ManagerTickets />} />
                  <Route path="tickets/create" element={<TicketCreatePage />} />
                  <Route path="tickets/:id" element={<TicketDetailView />} />
                  <Route path="audits" element={<ManagerAudits />} />
                  <Route path="archive" element={<ManagerArchive />} />
                  <Route path="reports" element={<ManagerReports />} />
                  <Route
                    path="service-forms"
                    element={<ManagerServiceForms />}
                  />
                  <Route
                    path="approval-console"
                    element={<ServiceApprovalConsole />}
                  />

                  <Route path="scheduler" element={<SchedulerPage />} />
                  <Route path="inventory" element={<ManagerInventory />} />
                  <Route
                    path="service-forms/:formId"
                    element={<ServiceFormPreview />}
                  />
                  <Route
                    path="service-form-view/:serviceId"
                    element={<ServiceFormView />}
                  />
                  {/* Manager Floorplan Routes */}
                  <Route path="floorplans" element={<FloorplanDashboard />} />
                  <Route path="floorplans/:id" element={<FloorplanViewer />} />
                  {/* IoT Setup Route */}
                  <Route path="iot-setup" element={<IoTSetupPage />} />
                  {/* Pump Room Summary Route */}
                  <Route
                    path="pump-room-summary"
                    element={<PumpRoomSummary />}
                  />
                  {/* Command Center Routes */}
                  <Route
                    path="plant-command-center/:plantId"
                    element={<PlantCommandCenterPage />}
                  />
                  <Route
                    path="regional-ehs"
                    element={<RegionalEHSCommandCenterPage />}
                  />
                  {/* Manager SAMS Routes */}
                  <Route path="sams" element={<SAMSDashboard />} />
                  <Route path="sams/incidents" element={<IncidentsList />} />
                  <Route
                    path="sams/incidents/create"
                    element={<IncidentCreate />}
                  />
                  <Route path="sams/incidents/:id" element={<IncidentView />} />
                  <Route path="sams/audits" element={<ManagerAuditsList />} />
                  <Route
                    path="sams/audits/create"
                    element={<ManagerAuditCreate />}
                  />
                  <Route
                    path="sams/audits/:id"
                    element={<ManagerAuditView />}
                  />
                  <Route
                    path="sams/trainings"
                    element={<ManagerTrainingsList />}
                  />
                  <Route
                    path="sams/trainings/create"
                    element={<ManagerTrainingCreate />}
                  />
                  <Route
                    path="sams/trainings/:id"
                    element={<ManagerTrainingView />}
                  />
                </Route>

                {/* Dynamic Dashboard Route for custom roles */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute allowCustomRoles>
                      <ManagerLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Overview basePath="/dashboard" />} />
                  <Route
                    path="pump-product-details/:id"
                    element={<KnowMore />}
                  />
                  <Route
                    path="premium-dashboard"
                    element={<PremiumManagerDashboard />}
                  />
                  <Route path="profile" element={<ManagerProfile />} />
                  <Route path="plants" element={<ManagerPlants />} />
                  <Route
                    path="plants/:id/questions-view"
                    element={<PlantQuestionsView />}
                  />
                  <Route path="plants/:id/edit" element={<PlantEdit />} />
                  <Route path="categories" element={<ManagerCategories />} />
                  <Route path="products" element={<ManagerProducts />} />
                  <Route path="technicians" element={<ManagerTechnicians />} />
                  <Route path="assets" element={<ManagerAssets />} />
                  <Route path="assets/create" element={<ManagerAssets />} />
                  <Route path="assets/:id" element={<AssetView />} />
                  <Route path="assets/:id/edit" element={<ManagerAssets />} />
                  <Route path="calendar" element={<ManagerCalendar />} />
                  <Route path="group-service" element={<ManagerGroupService />} />
                  <Route path="tickets" element={<ManagerTickets />} />
                  <Route path="tickets/create" element={<TicketCreatePage />} />
                  <Route path="tickets/:id" element={<TicketDetailView />} />
                  <Route path="audits" element={<ManagerAudits />} />
                  <Route path="archive" element={<ManagerArchive />} />
                  <Route path="reports" element={<ManagerReports />} />
                  <Route
                    path="service-forms"
                    element={<ManagerServiceForms />}
                  />
                  <Route path="scheduler" element={<SchedulerPage />} />
                  <Route path="inventory" element={<ManagerInventory />} />
                  <Route
                    path="service-forms/:formId"
                    element={<ServiceFormPreview />}
                  />
                  <Route
                    path="service-form-view/:serviceId"
                    element={<ServiceFormView />}
                  />
                  <Route path="floorplans" element={<FloorplanDashboard />} />
                  <Route path="floorplans/:id" element={<FloorplanViewer />} />
                  <Route path="iot-setup" element={<IoTSetupPage />} />
                  <Route
                    path="pump-room-summary"
                    element={<PumpRoomSummary />}
                  />
                  {/* Command Center Routes */}
                  <Route
                    path="plant-command-center/:plantId"
                    element={<PlantCommandCenterPage />}
                  />
                  <Route
                    path="regional-ehs"
                    element={<RegionalEHSCommandCenterPage />}
                  />
                </Route>

                {/* Technician Routes */}
                <Route
                  path="/technician"
                  element={
                    <ProtectedRoute requireTechnician>
                      <TechnicianLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route path="dashboard" element={<TechnicianDashboard />} />
                  <Route
                    path="asset/:assetId/service"
                    element={<TechnicianServiceForm />}
                  />
                  <Route path="my-services" element={<MyServices />} />
                  <Route path="service/:id" element={<ServiceDetails />} />
                  <Route
                    path="service-form/:serviceId"
                    element={<TechnicianServiceFormPage />}
                  />
                  <Route path="calendar" element={<TechnicianCalendar />} />
                  <Route path="tickets" element={<TechnicianTickets />} />
                  <Route path="tickets/create" element={<TicketCreatePage />} />
                  <Route path="tickets/:id" element={<TicketDetail />} />

                  {/* Technician SAMS Routes */}
                  <Route
                    path="sams/incidents"
                    element={<TechnicianMyIncidents />}
                  />
                  <Route
                    path="sams/incidents/create"
                    element={<TechnicianIncidentCreate />}
                  />
                  <Route
                    path="sams/incidents/:id"
                    element={<TechnicianIncidentView />}
                  />
                </Route>

                {/* Final 404 */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </UIProvider>
          </PlantFilterProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
