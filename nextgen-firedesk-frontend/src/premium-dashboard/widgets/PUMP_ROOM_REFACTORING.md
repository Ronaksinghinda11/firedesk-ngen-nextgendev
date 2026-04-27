# Pump Room Widget Refactoring - Complete Documentation

## Overview
This document describes the complete refactoring of the Pump Room module from a monolithic component into a widget-based architecture integrated with the Premium Dashboard.

## What Changed

### Before
- **Single Component**: `PumpRoom.tsx` rendered all three sections as a single component
- **Isolated State**: Each component managed its own data fetching and Socket.IO connection
- **Static Layout**: Always visible when category was selected, no widget customization
- **No Integration**: Rendered separately from the Premium Dashboard widget system

### After
- **Three Independent Widgets**:
  1. `PumpPerformanceWidget` - Pump asset monitoring
  2. `SupportSystemStatusWidget` - System health metrics
  3. `TrendsPerformanceWidget` - Historical trend analysis
- **Shared Context**: `PumpRoomDataContext` manages real-time data and Socket.IO for all widgets
- **Widget System Integration**: Full integration with dashboard's widget registry and visibility management
- **Enhanced UI**: Improved spacing, colors, gradients, shadows, and responsiveness

---

## Architecture

### 1. PumpRoomDataContext
**Location**: `src/premium-dashboard/contexts/PumpRoomDataContext.tsx`

**Purpose**: Centralized real-time data management for all Pump Room widgets

**Features**:
- Single Socket.IO connection shared across all widgets
- Unified data fetching from backend APIs
- Consistent error and loading state management
- Automatic cleanup on unmount

**Exported Hook**:
```typescript
const {
  pumpIotData,      // Real-time IoT sensor data
  timestamp,        // Last update timestamp
  pumpData,         // Static pump configuration
  assets,           // Pump asset list
  pumpIotDeviceId,  // Device identifier
  isLoading,        // Loading state
  error,            // Error state
  refreshData       // Manual refresh function
} = usePumpRoomData();
```

---

### 2. Widget 1: Pump Performance
**Location**: `src/premium-dashboard/widgets/PumpSystemOverview/PumpPerformanceWidget.tsx`

**Registry ID**: `pump-performance`

**Features**:
- 3-card carousel displaying pump assets (responsive: 1/2/3 cards)
- Real-time health status monitoring
- Operational mode indicators (Auto/Manual)
- Trip status and fault detection
- Diesel engine specific monitoring (Battery, Water Temp, Oil Pressure)
- Touch swipe support for mobile
- Navigation to detailed pump view

**UI Enhancements**:
- Gradient icon backgrounds (blue gradient)
- Enhanced card shadows with hover effects
- Color-coded health status badges
- Improved typography and spacing
- Gradient pagination dots
- Enhanced "Know More" button with gradient background

---

### 3. Widget 2: Support System Status
**Location**: `src/premium-dashboard/widgets/PumpMaintenanceOverview/SupportSystemStatusWidget.tsx`

**Registry ID**: `pump-support-system`

**Features**:
- Four status cards in responsive grid:
  - Diesel Storage (fuel level tracking)
  - Water Storage (main water tank)
  - Battery Status (voltage monitoring)
  - Header Pressure (system pressure)
- Circular progress indicators
- Color-coded status (Red/Yellow/Green)
- Real-time percentage calculations

**UI Enhancements**:
- Gradient icon backgrounds (purple gradient)
- Larger circular progress rings (28px radius)
- Enhanced status badge styling
- Improved card borders with hover effects
- Better spacing and alignment
- Gradient icon containers

---

### 4. Widget 3: Trends & Performance
**Location**: `src/premium-dashboard/widgets/PumpTrends/TrendsPerformanceWidget.tsx`

**Registry ID**: `pump-trends`

**Features**:
- Three trend cards (one at a time carousel):
  - Water Level Trend
  - Diesel Level Trend
  - Header Pressure Trend
- Timeframe selection (Day/Week/Month)
- Area charts with scrollable data
- Modal view for expanded analysis
- Last recorded value display

**UI Enhancements**:
- Gradient icon backgrounds (green gradient)
- Enhanced header styling
- Gradient pagination dots
- Improved timeframe selector buttons
- Better mobile responsiveness

---

## Widget Registry Integration

### Updated Files
1. **`src/premium-dashboard/types/dashboard.types.ts`**
   - Added widget IDs: `pump-performance`, `pump-support-system`, `pump-trends`

2. **`src/premium-dashboard/config/widgetRegistry.ts`**
   - Registered all 3 widgets with:
     - `requiresCategory: 'Pump Room'` - Only show when Pump Room category selected
     - `defaultVisible: true` - All three visible by default
     - Proper ordering (1 → 2 → 3)

---

## Premium Dashboard Integration

### Updated File
**`src/premium-dashboard/PremiumDashboard.tsx`**

**Changes**:
1. Removed direct `<PumpRoom>` component import
2. Added `PumpRoomDataProvider` wrapper
3. Added conditional rendering based on `showPumpRoomWidgets`
4. Widgets render in exact order: Performance → Support → Trends

**Code Structure**:
```tsx
{showPumpRoomWidgets && (
  <PumpRoomDataProvider selectedPlant={plantFilter} categoryId={categoryFilter}>
    {visibleWidgets['pump-performance'] && <PumpPerformanceWidget />}
    {visibleWidgets['pump-support-system'] && <SupportSystemStatusWidget />}
    {visibleWidgets['pump-trends'] && <TrendsPerformanceWidget />}
  </PumpRoomDataProvider>
)}
```

---

## Functionality Preserved

### Backend & Data Flow
✅ **Exact same API endpoints**:
- `GET /organisation/get-pump-iot-device-id-by-plant/{plantId}`
- `POST /organisation/get-pump-dashboard-data`
- `POST /organisation/dashboard/pump/water-level-trend`
- `POST /organisation/dashboard/pump/diesel-level-trend`
- `POST /organisation/dashboard/pump/header-pressure-trend`

✅ **Socket.IO behavior**:
- Same connection URL and path
- Same event subscriptions (`subscribe:device`, `live-data`)
- Same data payload structure
- Same cleanup on unmount

✅ **Calculations & Logic**:
- Health status determination
- Percentage calculations
- Status color coding (red/yellow/green)
- Trip condition monitoring
- Diesel engine fault detection

---

## UI/UX Improvements

### Design System Alignment
- **Card3D**: All widgets wrapped in `Card3D` component for consistency
- **Gradients**: Icon backgrounds use gradient themes (blue/purple/green)
- **Shadows**: Enhanced shadow effects with hover states
- **Typography**: Improved font weights, sizes, and spacing
- **Colors**: Consistent use of design system colors
- **Borders**: Thicker borders with hover effects
- **Spacing**: Increased padding and gaps for better readability

### Responsive Design
- **Mobile First**: Better touch interactions and mobile layouts
- **Breakpoints**: Proper responsive grid adjustments
- **Card Sizing**: Dynamic card widths based on viewport
- **Icon Scaling**: Responsive icon sizes

### Visual Enhancements
- **Status Badges**: Enhanced with borders and shadows
- **Progress Rings**: Larger and more prominent
- **Buttons**: Gradient backgrounds with hover animations
- **Pagination**: Animated gradient dots
- **Cards**: Hover effects and border color transitions

---

## File Structure

```
src/premium-dashboard/
├── contexts/
│   └── PumpRoomDataContext.tsx          # NEW: Shared context
├── widgets/
│   ├── PumpSystemOverview/
│   │   ├── PumpPerformanceWidget.tsx    # NEW: Widget 1
│   │   └── index.ts                     # NEW: Export
│   ├── PumpMaintenanceOverview/
│   │   ├── SupportSystemStatusWidget.tsx # NEW: Widget 2
│   │   └── index.ts                     # NEW: Export
│   └── PumpTrends/
│       ├── TrendsPerformanceWidget.tsx  # NEW: Widget 3
│       └── index.ts                     # NEW: Export
├── pumpRoom/
│   ├── PumpRoom.tsx                     # DEPRECATED (kept for reference)
│   └── components/
│       ├── PumpPerformance.tsx          # DEPRECATED
│       ├── SupportSystemStatus.tsx      # DEPRECATED
│       ├── TrendsPerformance.tsx        # DEPRECATED
│       └── Trend.tsx                    # STILL USED by widget
├── config/
│   └── widgetRegistry.ts                # UPDATED: 3 new widgets
├── types/
│   └── dashboard.types.ts               # UPDATED: 3 new widget IDs
└── PremiumDashboard.tsx                 # UPDATED: Integration
```

---

## Testing Checklist

### Widget Visibility
- [ ] Widgets appear when "Pump Room" category is selected
- [ ] Widgets hidden when other categories selected
- [ ] All 3 widgets visible by default (defaultVisible: true)
- [ ] Widgets can be toggled via AddWidgetButton
- [ ] Widget order is: Performance → Support → Trends

### Data Flow
- [ ] Socket.IO connection established on mount
- [ ] Real-time data updates all widgets simultaneously
- [ ] API calls successful for all trend data
- [ ] Loading states work correctly
- [ ] Error states display properly
- [ ] Context cleanup on unmount

### Functionality
- [ ] Pump Performance carousel works (navigation, swipe)
- [ ] Health status calculated correctly
- [ ] Mode indicators display correctly (Auto/Manual)
- [ ] Support System progress rings accurate
- [ ] Status color coding correct (red/yellow/green)
- [ ] Trend charts render with data
- [ ] Timeframe selectors update charts
- [ ] Modal expansion works in Trends
- [ ] "Know More" navigation functional

### Responsive Design
- [ ] Mobile: 1 pump card visible
- [ ] Tablet: 2 pump cards visible
- [ ] Desktop: 3 pump cards visible
- [ ] Support System grid responsive (1/2/4 columns)
- [ ] Trend carousel works on all devices
- [ ] Touch swipe works on mobile

### UI Enhancements
- [ ] Gradient backgrounds render correctly
- [ ] Shadows and hover effects work
- [ ] Typography clear and readable
- [ ] Colors match design system
- [ ] Spacing consistent across widgets
- [ ] Icons properly sized and aligned

---

## Migration Notes

### For Developers
1. **Do NOT delete old PumpRoom files yet** - Keep for reference during testing
2. **Test Socket.IO thoroughly** - Ensure no memory leaks from multiple connections
3. **Verify widget visibility logic** - Category name matching is case-insensitive
4. **Check localStorage** - Widget visibility persists per user/role

### For Users
- **No behavior changes** - All features work exactly as before
- **Better customization** - Can now hide/show individual widgets
- **Improved visuals** - Enhanced UI with better spacing and colors
- **Same data** - All real-time updates and historical data preserved

---

## Known Limitations

1. **Category Detection**: Relies on category name containing "pump room" (case-insensitive)
2. **Single Context**: All widgets share one Socket.IO connection (by design)
3. **Widget Order**: Order is hardcoded in PremiumDashboard (not drag-and-drop)

---

## Future Enhancements

- [ ] Drag-and-drop widget reordering
- [ ] Widget-specific settings (refresh intervals, alert thresholds)
- [ ] Export widget data to CSV/PDF
- [ ] Historical data comparison views
- [ ] Alert notifications for critical status
- [ ] Mobile-optimized detailed views

---

## Contact

For questions or issues with this refactoring:
- Review the exploration report in exploration logs
- Check existing PumpRoom components for reference
- Verify Socket.IO connection in browser DevTools
- Test with real device IDs and plant configurations

---

**Status**: ✅ Complete - Ready for Testing
**Date**: 2025-11-30
**Author**: Claude Code
