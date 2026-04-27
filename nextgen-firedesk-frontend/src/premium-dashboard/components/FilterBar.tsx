/**
 * FilterBar Component
 * Global filters for the Premium Dashboard
 */


import { Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface FilterBarProps {
  role: 'admin' | 'manager';
  plantFilter: string;
  categoryFilter: string;
  buildingFilter: string;
  dateRangeFilter: string;
  productFilter: string;
  typeFilter: string;
  capacityFilter: string;
  plants: Array<{ id: string; plantName: string }>;
  categories: Array<{ id: string; categoryName: string }>;
  buildings: Array<{ id: string; buildingName: string }>;
  products: Array<{ _id: string; productName: string }>;
  types: string[];
  capacities: string[];
  onPlantChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onBuildingChange: (value: string) => void;
  onDateRangeChange: (value: string) => void;
  onProductChange: (value: string) => void;
  onTypeChange: (value: string) => void;
  onCapacityChange: (value: string) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export default function FilterBar({
  plantFilter,
  categoryFilter,
  buildingFilter,
  dateRangeFilter,
  productFilter,
  typeFilter,
  capacityFilter,
  plants,
  categories,
  buildings,
  products,
  types,
  capacities,
  onPlantChange,
  onCategoryChange,
  onBuildingChange,
  onDateRangeChange,
  onProductChange,
  onTypeChange,
  onCapacityChange,
}: FilterBarProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-2">
      <div className="flex flex-nowrap items-center gap-1.5 overflow-x-auto">
        <Filter className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />

        <Select
          value={plantFilter}
          onValueChange={onPlantChange}
          disabled={plants.length === 0}
        >
          <SelectTrigger className="w-36 h-7 text-xs">
            <SelectValue placeholder={plants.length === 0 ? "Loading plants..." : "Select Plant"} />
          </SelectTrigger>
          <SelectContent>
            {plants.map(plant => (
              <SelectItem key={plant.id} value={plant.id}>
                {plant.plantName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={categoryFilter}
          onValueChange={onCategoryChange}
          disabled={!plantFilter || categories.length === 0}
        >
          <SelectTrigger className="w-36 h-7 text-xs">
            <SelectValue placeholder={categories.length === 0 ? "Loading categories..." : "Select Category"} />
          </SelectTrigger>
          <SelectContent>
            {categories.map(category => (
              <SelectItem key={category.id} value={category.id}>
                {category.categoryName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={buildingFilter}
          onValueChange={onBuildingChange}
          disabled={!plantFilter || buildings.length === 0}
        >
          <SelectTrigger className="w-36 h-7 text-xs">
            <SelectValue placeholder="All Buildings" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Buildings</SelectItem>
            {buildings.map(building => (
              <SelectItem key={building.id} value={building.id}>
                {building.buildingName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={dateRangeFilter} onValueChange={onDateRangeChange}>
          <SelectTrigger className="w-36 h-7 text-xs">
            <SelectValue placeholder="Date Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="quarter">This Quarter</SelectItem>
            <SelectItem value="year">This Year</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={productFilter}
          onValueChange={onProductChange}
          disabled={!plantFilter || !categoryFilter || products.length === 0}
        >
          <SelectTrigger className="w-36 h-7 text-xs">
            <SelectValue placeholder="All Products" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Products</SelectItem>
            {products.map(product => (
              <SelectItem key={product._id} value={product._id}>
                {product.productName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={typeFilter}
          onValueChange={onTypeChange}
          disabled={!plantFilter || !categoryFilter || types.length === 0}
        >
          <SelectTrigger className="w-36 h-7 text-xs">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {types.map(type => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={capacityFilter}
          onValueChange={onCapacityChange}
          disabled={!plantFilter || !categoryFilter || capacities.length === 0}
        >
          <SelectTrigger className="w-36 h-7 text-xs">
            <SelectValue placeholder="All Capacities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Capacities</SelectItem>
            {capacities.map(capacity => (
              <SelectItem key={capacity} value={capacity}>
                {capacity}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
