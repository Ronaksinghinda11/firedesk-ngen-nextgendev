import { useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronRight, Home, GripVertical, Lock, Unlock, RotateCcw, Maximize2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KnowMoreProvider, Asset, AssetIoTData } from "../../contexts/KnowMoreContext";
import HeaderWidget from "../../widgets/PumpDetailsPage/HeaderWidget";
import PumpDetailsWidget from "../../widgets/PumpDetailsPage/PumpDetailsWidget";
import RuntimeAnalysisWidget from "../../widgets/PumpDetailsPage/RuntimeAnalysisWidget";
import ConditionLogWidget from "../../widgets/PumpDetailsPage/ConditionLogWidget";
import AutoManualWidget from "../../widgets/PumpDetailsPage/AutoManualWidget";
import { cn } from "@/lib/utils";

// -----------------------------------------------------
// TYPE DEFINITIONS
// -----------------------------------------------------

interface LocationState {
    assets: Asset[];
    assetData: AssetIoTData[];
    categoryId?: string;
}

// Widget size in 12-column grid system
type WidgetSize = 12 | 6;

interface WidgetItem {
    id: string;
    component: React.FC<{ widgetControls?: React.ReactNode }>;
    title: string;
    size: WidgetSize;
}

// Default widget order - all half width to show 2 per row
const getDefaultWidgets = (): WidgetItem[] => [
    { id: "pumpDetails", component: PumpDetailsWidget, title: "Pump Details", size: 6 },
    { id: "autoManual", component: AutoManualWidget, title: "Auto vs Manual", size: 6 },
    { id: "runtime", component: RuntimeAnalysisWidget, title: "Runtime Analysis", size: 6 },
    { id: "conditionLog", component: ConditionLogWidget, title: "Condition Log", size: 6 },
];

// Size label helper
const getSizeLabel = (size: WidgetSize): string => {
    switch (size) {
        case 12: return 'Full';
        case 6: return 'Half';
        default: return 'Half';
    }
};

// -----------------------------------------------------
// WIDGET SIZE SELECT
// -----------------------------------------------------

interface WidgetSizeSelectProps {
    currentSize: WidgetSize;
    onSizeChange: (size: WidgetSize) => void;
}

const WidgetSizeSelect: React.FC<WidgetSizeSelectProps> = ({ currentSize, onSizeChange }) => {
    return (
        <Select
            value={currentSize.toString()}
            onValueChange={(value) => onSizeChange(parseInt(value) as WidgetSize)}
        >
            <SelectTrigger className="w-[70px] h-6 text-[10px] bg-background/95 border-border/50 shadow-sm hover:bg-muted">
                <div className="flex items-center gap-1">
                    <Maximize2 className="h-3 w-3 text-muted-foreground" />
                    <SelectValue>
                        {getSizeLabel(currentSize)}
                    </SelectValue>
                </div>
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="12" className="text-xs">Full Width</SelectItem>
                <SelectItem value="6" className="text-xs">Half Width</SelectItem>
            </SelectContent>
        </Select>
    );
};

// -----------------------------------------------------
// SORTABLE WIDGET WRAPPER
// -----------------------------------------------------

interface SortableWidgetWrapperProps {
    id: string;
    widget: WidgetItem;
    isLocked: boolean;
    onSizeChange: (size: WidgetSize) => void;
}

const SortableWidgetWrapper: React.FC<SortableWidgetWrapperProps> = ({ id, widget, isLocked, onSizeChange }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id, disabled: isLocked });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
        zIndex: isDragging ? 50 : 'auto',
    };

    const widgetControls = (
        <div className="flex items-center gap-1">
            <WidgetSizeSelect
                currentSize={widget.size}
                onSizeChange={onSizeChange}
            />
            {!isLocked && (
                <button
                    className="p-1 rounded bg-muted/50 cursor-grab active:cursor-grabbing hover:bg-muted transition-colors"
                    {...attributes}
                    {...listeners}
                    aria-label="Drag to reorder"
                >
                    <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
            )}
        </div>
    );

    // Determine grid column span based on size
    const colSpanClass = widget.size === 12 ? 'lg:col-span-2' : 'lg:col-span-1';

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "col-span-1",
                colSpanClass,
                isDragging && "ring-2 ring-primary/50 rounded-lg"
            )}
        >
            <widget.component widgetControls={widgetControls} />
        </div>
    );
};

// -----------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------

const KnowMore: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { assets, assetData, categoryId } = location.state as LocationState;

    const roleBasePath = location.pathname.startsWith('/admin') ? '/admin' : '/manager';

    const [widgets, setWidgets] = useState<WidgetItem[]>(getDefaultWidgets);
    const [isLocked, setIsLocked] = useState<boolean>(false);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setWidgets((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    }, []);

    const handleSizeChange = useCallback((widgetId: string, newSize: WidgetSize) => {
        setWidgets((items) =>
            items.map((item) =>
                item.id === widgetId ? { ...item, size: newSize } : item
            )
        );
    }, []);

    const toggleLock = useCallback(() => {
        setIsLocked(prev => !prev);
    }, []);

    const resetLayout = useCallback(() => {
        setWidgets(getDefaultWidgets());
    }, []);

    return (
        <KnowMoreProvider
            assets={assets}
            assetData={assetData}
            customStartDate={dayjs()}
            customEndDate={dayjs()}
        >
            <div className="min-h-screen bg-background p-4">
                {/* Breadcrumb Navigation */}
                <div className="flex items-center justify-between mb-3">
                    <nav className="flex items-center gap-1.5 text-sm">
                        <button
                            onClick={() => {
                                const dashboardPath = roleBasePath === '/admin' ? '/admin/analytics-dashboard' : '/manager/premium-dashboard';
                                navigate(`${dashboardPath}${categoryId ? `?category=${categoryId}` : ''}`);
                            }}
                            className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors group"
                        >
                            <Home className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                            <span className="text-xs">Dashboard</span>
                        </button>
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-xs text-foreground font-medium">Pump Details</span>
                    </nav>

                    {/* Layout Controls */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={resetLayout}
                            className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted rounded-lg border border-border/30 transition-all"
                        >
                            <RotateCcw className="w-3 h-3" />
                            <span>Reset</span>
                        </button>
                        <button
                            onClick={toggleLock}
                            className={cn(
                                "flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded-lg border transition-all",
                                isLocked
                                    ? "bg-primary/10 border-primary/30 text-primary"
                                    : "bg-muted/50 border-border/30 text-muted-foreground hover:text-foreground hover:bg-muted"
                            )}
                        >
                            {isLocked ? (
                                <>
                                    <Lock className="w-3 h-3" />
                                    <span>Locked</span>
                                </>
                            ) : (
                                <>
                                    <Unlock className="w-3 h-3" />
                                    <span>Customize</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Header Widget */}
                <HeaderWidget />

                {/* Draggable Grid Layout */}
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={widgets.map(w => w.id)}
                        strategy={rectSortingStrategy}
                    >
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-3">
                            {widgets.map((widget) => (
                                <SortableWidgetWrapper
                                    key={widget.id}
                                    id={widget.id}
                                    widget={widget}
                                    isLocked={isLocked}
                                    onSizeChange={(size) => handleSizeChange(widget.id, size)}
                                />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            </div>
        </KnowMoreProvider>
    );
};

export default KnowMore;
