// src/pages/manager/Products.tsx
/**
 * Manager Products Page
 * Displays products filtered by the manager's assigned categories
 * Managers can only see products that belong to categories they manage
 */
import Products from '../admin/Products';

// Reuse the admin Products page
// Archive functionality and kebab menus are automatically disabled for manager module by GenericEntityPage
export default Products;
