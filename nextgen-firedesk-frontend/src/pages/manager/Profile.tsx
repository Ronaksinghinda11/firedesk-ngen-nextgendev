/**
 * Manager Profile Page
 *
 * Allows managers to view and edit their own profile information.
 * Reuses the ProfileSettings component logic from admin panel.
 */

import React from 'react';
import ProfileSettings from '@/pages/admin/ProfileSettings';

export default function ManagerProfile() {
  return <ProfileSettings />;
}
