/**
 * Premium Manager Dashboard
 * Entry point for manager dashboard - uses the refactored modular dashboard
 */

import PremiumDashboard from '@/premium-dashboard/PremiumDashboard';

export default function ManagerPremiumDashboard() {
  return <PremiumDashboard role="manager" />;
}
