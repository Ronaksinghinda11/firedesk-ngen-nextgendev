/**
 * PermissionLevelSelector Component
 * Allows admins to select permission levels for each entity when creating/editing roles
 */

import React from "react";
import { Shield, Eye, Edit, Key, X, Check, ChevronDown } from "lucide-react";
import {
  PermissionLevel,
  Entity,
  PERMISSION_LEVEL_LABELS,
  PERMISSION_LEVEL_DESCRIPTIONS,
  ENTITY_LABELS,
  ENTITY_DESCRIPTIONS,
  getPermissionLevelOptions,
} from "../../types/permissions";

interface PermissionLevelSelectorProps {
  entity: Entity;
  value: PermissionLevel;
  onChange: (entity: Entity, level: PermissionLevel) => void;
  disabled?: boolean;
}

const getLevelIcon = (level: PermissionLevel) => {
  switch (level) {
    case PermissionLevel.NONE:
      return <X className="h-4 w-4" />;
    case PermissionLevel.VIEW:
      return <Eye className="h-4 w-4" />;
    case PermissionLevel.ASSIGN_UPDATE_VIEW:
      return <Edit className="h-4 w-4" />;
    case PermissionLevel.FULL_CRUD:
      return <Key className="h-4 w-4" />;
  }
};

const getLevelColor = (level: PermissionLevel) => {
  switch (level) {
    case PermissionLevel.NONE:
      return "border-gray-300 bg-gray-50 hover:bg-gray-100";
    case PermissionLevel.VIEW:
      return "border-blue-300 bg-blue-50 hover:bg-blue-100";
    case PermissionLevel.ASSIGN_UPDATE_VIEW:
      return "border-amber-300 bg-amber-50 hover:bg-amber-100";
    case PermissionLevel.FULL_CRUD:
      return "border-green-300 bg-green-50 hover:bg-green-100";
  }
};

const getActiveLevelColor = (level: PermissionLevel) => {
  switch (level) {
    case PermissionLevel.NONE:
      return "border-gray-500 bg-gray-100 shadow-sm";
    case PermissionLevel.VIEW:
      return "border-blue-600 bg-blue-100 shadow-sm";
    case PermissionLevel.ASSIGN_UPDATE_VIEW:
      return "border-amber-600 bg-amber-100 shadow-sm";
    case PermissionLevel.FULL_CRUD:
      return "border-green-600 bg-green-100 shadow-sm";
  }
};

export const PermissionLevelSelector: React.FC<
  PermissionLevelSelectorProps
> = ({ entity, value, onChange, disabled = false }) => {
  const options = getPermissionLevelOptions(entity);

  return (
    <div className="bg-white border border-slate-200 rounded-md transition-all shadow-sm">
      <div className="px-3 py-2 border-b border-slate-100 bg-white">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-800">
              {ENTITY_LABELS[entity]}
            </label>
            <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
              {ENTITY_DESCRIPTIONS[entity]}
            </p>
          </div>
        </div>
      </div>

      <div className="p-2">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
          {options.map((level) => {
            const isActive = value === level;
            return (
              <button
                key={level}
                type="button"
                onClick={() => !disabled && onChange(entity, level)}
                disabled={disabled}
                className={`
                  relative flex flex-col items-center gap-1 px-2 py-1.5 rounded border transition-all
                  ${
                    isActive
                      ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                      : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  }
                  ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                `}
              >
                <div
                  className={`${isActive ? "text-white" : "text-slate-500"}`}
                >
                  {getLevelIcon(level)}
                </div>
                <span
                  className={`text-[10px] font-medium text-center leading-tight ${isActive ? "text-white" : "text-slate-700"}`}
                >
                  {PERMISSION_LEVEL_LABELS[level]}
                </span>
                {isActive && (
                  <div className="absolute -top-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5">
                    <Check className="h-2.5 w-2.5" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {value !== PermissionLevel.NONE && (
          <div className="mt-2 px-2 py-1.5 bg-white border border-slate-200 rounded text-[10px] text-slate-600">
            <span className="font-semibold text-slate-800">Access:</span>{" "}
            {PERMISSION_LEVEL_DESCRIPTIONS[value]}
          </div>
        )}
      </div>
    </div>
  );
};

interface PermissionsSectionProps {
  permissions: Record<Entity, PermissionLevel>;
  onChange: (entity: Entity, level: PermissionLevel) => void;
  onBulkChange?: (updates: Record<Entity, PermissionLevel>) => void;
  disabled?: boolean;
}

/**
 * Complete permissions section with all entities in a compact table layout
 */
export const PermissionsSection: React.FC<PermissionsSectionProps> = ({
  permissions,
  onChange,
  onBulkChange,
  disabled = false,
}) => {
  // Group entities by category - MUST match backend permission_constants.js
  const entityGroups = {
    "User Management": [
      Entity.USERS,
      Entity.ROLES,
      Entity.PERMISSIONS,
      Entity.MANAGERS,
      Entity.TECHNICIANS,
    ],
    Operations: [
      Entity.PLANTS,
      Entity.JOBS,
      Entity.TASK_STATUS,
      Entity.ASSETS,
      Entity.FLOORPLANS,
      Entity.SCHEDULER,
      Entity.INVENTORY,
    ],
    "Service Management": [
      Entity.SERVICE_FORMS,
      Entity.GROUP_SERVICE,
      Entity.SERVICES,
      Entity.TICKETS,
      Entity.AUDITS,
      Entity.INCIDENTS,
      Entity.CAPA_STEPS,
    ],
    "Data & Reporting": [
      Entity.DASHBOARD,
      Entity.REPORTS,
      Entity.ARCHIVE,
      Entity.CALENDAR,
    ],
    "Master Data": [
      Entity.CATEGORIES,
      Entity.PRODUCTS,
      Entity.VENDORS,
      Entity.INDUSTRIES,
      Entity.CONDITIONS,
    ],
  };

  const setAllEntitiesLevel = (level: PermissionLevel) => {
    if (onBulkChange) {
      const updates: Record<Entity, PermissionLevel> = {} as Record<
        Entity,
        PermissionLevel
      >;
      Object.values(Entity).forEach((entity) => {
        updates[entity as Entity] = level;
      });
      onBulkChange(updates);
    } else {
      Object.values(Entity).forEach((e) => onChange(e as Entity, level));
    }
  };

  const setGroupLevel = (groupName: string, level: PermissionLevel) => {
    const entities = entityGroups[groupName as keyof typeof entityGroups];
    if (onBulkChange) {
      const updates = { ...permissions };
      entities.forEach((entity) => {
        updates[entity] = level;
      });
      onBulkChange(updates);
    } else {
      entities.forEach((entity) => onChange(entity, level));
    }
  };

  const PermissionToggle = ({
    entity,
    level,
    currentLevel,
  }: {
    entity: Entity;
    level: PermissionLevel;
    currentLevel: PermissionLevel;
  }) => {
    const isActive = currentLevel === level;
    const levelStyles: Record<
      PermissionLevel,
      { active: string; inactive: string; icon: React.ReactNode }
    > = {
      [PermissionLevel.NONE]: {
        active: "bg-slate-600 text-white border-slate-600",
        inactive:
          "bg-white text-slate-400 border-slate-200 hover:border-slate-400",
        icon: <X className="h-3 w-3" />,
      },
      [PermissionLevel.VIEW]: {
        active: "bg-sky-500 text-white border-sky-500",
        inactive: "bg-white text-sky-400 border-slate-200 hover:border-sky-400",
        icon: <Eye className="h-3 w-3" />,
      },
      [PermissionLevel.ASSIGN_UPDATE_VIEW]: {
        active: "bg-orange-500 text-white border-orange-500",
        inactive:
          "bg-white text-orange-400 border-slate-200 hover:border-orange-400",
        icon: <Edit className="h-3 w-3" />,
      },
      [PermissionLevel.FULL_CRUD]: {
        active: "bg-emerald-500 text-white border-emerald-500",
        inactive:
          "bg-white text-emerald-400 border-slate-200 hover:border-emerald-400",
        icon: <Key className="h-3 w-3" />,
      },
    };

    const style = levelStyles[level];

    return (
      <button
        type="button"
        onClick={() => !disabled && onChange(entity, level)}
        disabled={disabled}
        className={`
          w-8 h-8 flex items-center justify-center rounded-md border transition-all
          ${isActive ? style.active : style.inactive}
          ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        `}
        title={PERMISSION_LEVEL_LABELS[level]}
      >
        {style.icon}
      </button>
    );
  };

  return (
    <div className="overflow-hidden">
      <table className="w-full bg-white">
        {/* Header Row */}
        <thead>
          <tr className="bg-white border-b border-gray-100">
            <th className="text-left text-xs font-semibold text-slate-800 px-3 py-2">
              Permissions
            </th>
            <th className="text-center w-14 px-1 py-2">
              <button
                type="button"
                onClick={() => setAllEntitiesLevel(PermissionLevel.NONE)}
                disabled={disabled}
                className="text-[10px] font-medium text-slate-500 hover:text-slate-800 transition-colors disabled:opacity-50"
              >
                None
              </button>
            </th>
            <th className="text-center w-14 px-1 py-2">
              <button
                type="button"
                onClick={() => setAllEntitiesLevel(PermissionLevel.VIEW)}
                disabled={disabled}
                className="text-[10px] font-medium text-sky-600 hover:text-sky-800 transition-colors disabled:opacity-50"
              >
                View
              </button>
            </th>
            <th className="text-center w-14 px-1 py-2">
              <button
                type="button"
                onClick={() =>
                  setAllEntitiesLevel(PermissionLevel.ASSIGN_UPDATE_VIEW)
                }
                disabled={disabled}
                className="text-[10px] font-medium text-orange-600 hover:text-orange-800 transition-colors disabled:opacity-50"
              >
                Edit
              </button>
            </th>
            <th className="text-center w-14 px-1 py-2">
              <button
                type="button"
                onClick={() => setAllEntitiesLevel(PermissionLevel.FULL_CRUD)}
                disabled={disabled}
                className="text-[10px] font-medium text-emerald-600 hover:text-emerald-800 transition-colors disabled:opacity-50"
              >
                Full
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(entityGroups).map(([groupName, entities]) => (
            <React.Fragment key={groupName}>
              {/* Group Header Row - Clean white style */}
              <tr className="bg-slate-50/50 border-t border-b border-slate-100">
                <td className="px-3 py-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                    {groupName}
                  </span>
                </td>
                <td className="text-center w-14 px-1 py-1">
                  <button
                    type="button"
                    onClick={() =>
                      setGroupLevel(groupName, PermissionLevel.NONE)
                    }
                    disabled={disabled}
                    title="Set all to None"
                    className="w-4 h-4 mx-auto flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors disabled:opacity-50"
                  >
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </td>
                <td className="text-center w-14 px-1 py-1">
                  <button
                    type="button"
                    onClick={() =>
                      setGroupLevel(groupName, PermissionLevel.VIEW)
                    }
                    disabled={disabled}
                    title="Set all to View"
                    className="w-4 h-4 mx-auto flex items-center justify-center text-sky-300 hover:text-sky-600 hover:bg-sky-50 rounded transition-colors disabled:opacity-50"
                  >
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </td>
                <td className="text-center w-14 px-1 py-1">
                  <button
                    type="button"
                    onClick={() =>
                      setGroupLevel(
                        groupName,
                        PermissionLevel.ASSIGN_UPDATE_VIEW,
                      )
                    }
                    disabled={disabled}
                    title="Set all to Edit"
                    className="w-4 h-4 mx-auto flex items-center justify-center text-orange-300 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors disabled:opacity-50"
                  >
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </td>
                <td className="text-center w-14 px-1 py-1">
                  <button
                    type="button"
                    onClick={() =>
                      setGroupLevel(groupName, PermissionLevel.FULL_CRUD)
                    }
                    disabled={disabled}
                    title="Set all to Full"
                    className="w-4 h-4 mx-auto flex items-center justify-center text-emerald-300 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors disabled:opacity-50"
                  >
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </td>
              </tr>
              {/* Entity Rows */}
              {entities.map((entity, idx) => {
                const currentLevel =
                  permissions[entity] || PermissionLevel.NONE;
                return (
                  <tr
                    key={entity}
                    className={`${idx % 2 === 0 ? "bg-white" : "bg-white"} hover:bg-sky-50 transition-colors`}
                  >
                    <td className="px-3 py-1 pl-6">
                      <span className="text-xs text-slate-700">
                        {ENTITY_LABELS[entity]}
                      </span>
                    </td>
                    <td className="text-center w-14 px-1 py-1">
                      <button
                        type="button"
                        onClick={() =>
                          !disabled && onChange(entity, PermissionLevel.NONE)
                        }
                        disabled={disabled}
                        className={`w-5 h-5 mx-auto flex items-center justify-center rounded-full border-2 transition-all
                          ${
                            currentLevel === PermissionLevel.NONE
                              ? "bg-slate-600 border-slate-600"
                              : "bg-white border-slate-300 hover:border-slate-400"
                          }
                          ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                        `}
                      >
                        {currentLevel === PermissionLevel.NONE && (
                          <div className="w-2 h-2 bg-white rounded-full" />
                        )}
                      </button>
                    </td>
                    <td className="text-center w-14 px-1 py-1">
                      <button
                        type="button"
                        onClick={() =>
                          !disabled && onChange(entity, PermissionLevel.VIEW)
                        }
                        disabled={disabled}
                        className={`w-5 h-5 mx-auto flex items-center justify-center rounded-full border-2 transition-all
                          ${
                            currentLevel === PermissionLevel.VIEW
                              ? "bg-sky-500 border-sky-500"
                              : "bg-white border-slate-300 hover:border-sky-400"
                          }
                          ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                        `}
                      >
                        {currentLevel === PermissionLevel.VIEW && (
                          <div className="w-2 h-2 bg-white rounded-full" />
                        )}
                      </button>
                    </td>
                    <td className="text-center w-14 px-1 py-1">
                      <button
                        type="button"
                        onClick={() =>
                          !disabled &&
                          onChange(entity, PermissionLevel.ASSIGN_UPDATE_VIEW)
                        }
                        disabled={disabled}
                        className={`w-5 h-5 mx-auto flex items-center justify-center rounded-full border-2 transition-all
                          ${
                            currentLevel === PermissionLevel.ASSIGN_UPDATE_VIEW
                              ? "bg-orange-500 border-orange-500"
                              : "bg-white border-slate-300 hover:border-orange-400"
                          }
                          ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                        `}
                      >
                        {currentLevel ===
                          PermissionLevel.ASSIGN_UPDATE_VIEW && (
                          <div className="w-2 h-2 bg-white rounded-full" />
                        )}
                      </button>
                    </td>
                    <td className="text-center w-14 px-1 py-1">
                      <button
                        type="button"
                        onClick={() =>
                          !disabled &&
                          onChange(entity, PermissionLevel.FULL_CRUD)
                        }
                        disabled={disabled}
                        className={`w-5 h-5 mx-auto flex items-center justify-center rounded-full border-2 transition-all
                          ${
                            currentLevel === PermissionLevel.FULL_CRUD
                              ? "bg-emerald-500 border-emerald-500"
                              : "bg-white border-slate-300 hover:border-emerald-400"
                          }
                          ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                        `}
                      >
                        {currentLevel === PermissionLevel.FULL_CRUD && (
                          <div className="w-2 h-2 bg-white rounded-full" />
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};

interface PermissionLevelBadgeProps {
  level: PermissionLevel;
  className?: string;
}

/**
 * Colored text component to display permission level with appropriate styling
 * Using color scheme: Slate Gray (None), Sky Blue (View), Flame Orange (Edit), Emerald Green (Full)
 */
export const PermissionLevelBadge: React.FC<PermissionLevelBadgeProps> = ({
  level,
  className = "",
}) => {
  const colorClasses = {
    [PermissionLevel.NONE]: "text-slate-500",
    [PermissionLevel.VIEW]: "text-sky-500",
    [PermissionLevel.ASSIGN_UPDATE_VIEW]: "text-orange-500",
    [PermissionLevel.FULL_CRUD]: "text-emerald-600",
  };

  return (
    <span className={`text-xs font-medium ${colorClasses[level]} ${className}`}>
      {PERMISSION_LEVEL_LABELS[level]}
    </span>
  );
};

interface PermissionSummaryProps {
  permissions: Record<Entity, PermissionLevel>;
  className?: string;
}

/**
 * Summary view of all permissions - useful for displaying role details
 * Displays permission counts with colored text
 */
export const PermissionSummary: React.FC<PermissionSummaryProps> = ({
  permissions,
  className = "",
}) => {
  // Count permissions by level
  const counts = Object.values(permissions).reduce(
    (acc, level) => {
      acc[level] = (acc[level] || 0) + 1;
      return acc;
    },
    {} as Record<PermissionLevel, number>,
  );

  const colorClasses = {
    [PermissionLevel.NONE]: "text-slate-500",
    [PermissionLevel.VIEW]: "text-sky-500",
    [PermissionLevel.ASSIGN_UPDATE_VIEW]: "text-orange-500",
    [PermissionLevel.FULL_CRUD]: "text-emerald-600",
  };

  return (
    <div className={`flex flex-wrap gap-3 ${className}`}>
      {Object.entries(counts).map(([level, count]) => (
        <span
          key={level}
          className={`text-xs font-medium ${colorClasses[level as PermissionLevel]}`}
        >
          {PERMISSION_LEVEL_LABELS[level as PermissionLevel]} ×{count}
        </span>
      ))}
    </div>
  );
};
