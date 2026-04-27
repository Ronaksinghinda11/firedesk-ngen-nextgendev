/**
 * Premium Admin Dashboard
 * Entry point for admin dashboard - uses the refactored modular dashboard
 * Admin version: Shows ALL plants across the organization
 */

import PremiumDashboard from '@/premium-dashboard/PremiumDashboard';

export default function AdminPremiumDashboard() {
  return <PremiumDashboard role="admin" />;
}
