import React, { useRef, useEffect, useState, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
// Vite resolves the worker file from node_modules at build time via ?url suffix
import pdfjsWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { AssetMarker } from "./AssetMarker";
import { AssetPopup } from "./AssetPopup";
import { FloorplanNavigator } from "./FloorplanNavigator";
import type { Layout } from "@/lib/api";
import type { Asset } from "@/data/mockFloorplanAssets";
import { statusConfig } from "@/data/mockFloorplanAssets";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuCheckboxItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ZoomIn, ZoomOut, RotateCcw, Maximize2, Expand, Shrink, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

interface PDFFloorplanViewerProps {
    svgUrl: string; // actually the PDF data URL in this component
    assets: Asset[];
    allAssets?: Asset[];
    onAssetClick?: (asset: Asset) => void;
    selectedAsset?: Asset | null;
    enablePanZoom?: boolean;
    className?: string;
    isAdminMode?: boolean;
    currentMode?: 'navigation' | 'drag' | 'create';
    isDragMode?: boolean;
    isCreatingAsset?: boolean;
    isReadOnly?: boolean;
    onAssetDrag?: (asset: Asset, newCoords: { x: number; y: number }) => void;
    onAssetDragEnd?: (asset: Asset, newCoords: { x: number; y: number }) => void;
    onFloorplanClick?: (coords: { x: number; y: number }) => void;
    onModeChange?: (mode: 'navigation' | 'drag' | 'create') => void;
    onFullscreenChange?: (isFullscreen: boolean) => void;
    onFilterChange?: (filters: Record<string, string | string[] | undefined>) => void;
    currentFilters?: Record<string, string | string[] | undefined>;
    currentLayout?: Layout | null;
    plantId?: string;
}

interface Transform {
    scale: number;
    translateX: number;
    translateY: number;
}

export const PDFFloorplanViewer: React.FC<PDFFloorplanViewerProps> = ({
    svgUrl: pdfUrl,
    assets,
    allAssets = [],
    onAssetClick: _onAssetClick, // intentionally unused — PDF viewer uses inline popup only
    selectedAsset,
    enablePanZoom = true,
    className = "",
    isAdminMode = false,
    currentMode = 'navigation',
    isDragMode = false,
    isCreatingAsset = false,
    isReadOnly = false,
    onAssetDrag,
    onAssetDragEnd,
    onFloorplanClick,
    onModeChange,
    onFullscreenChange,
    onFilterChange,
    currentFilters = {},
    currentLayout,
    plantId,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const floorplanRef = useRef<HTMLDivElement>(null);

    const [transform, setTransform] = useState<Transform>({ scale: 1, translateX: 0, translateY: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [pdfDimensions, setPdfDimensions] = useState({ width: 800, height: 600 });
    const [placementPreview, setPlacementPreview] = useState<{ x: number; y: number } | null>(null);
    const [searchValue, setSearchValue] = useState("");

    // Popup state
    const [hoveredAsset, setHoveredAsset] = useState<Asset | null>(null);
    const [popupPosition, setPopupPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const [isPopupPinned, setIsPopupPinned] = useState(false);

    const { toast } = useToast();

    // ─── Load & render PDF ─────────────────────────────────────────────────────
    useEffect(() => {
        if (!pdfUrl) return;

        const renderPdf = async () => {
            try {
                setIsLoading(true);
                setError(null);

                console.log("📄 PDF render start, pdfUrl length:", pdfUrl.length);

                // Convert data URL to binary for pdfjs-dist v5
                let docSrc: string | { data: Uint8Array } = pdfUrl;
                if (pdfUrl.startsWith('data:')) {
                    const base64 = pdfUrl.split(',')[1];
                    const raw = atob(base64);
                    const bytes = new Uint8Array(raw.length);
                    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
                    docSrc = { data: bytes };
                    console.log("📄 Converted data URL to binary, bytes:", bytes.length);
                }
                const loadingTask = pdfjsLib.getDocument(docSrc);
                const pdf = await loadingTask.promise;
                console.log("📄 PDF loaded, pages:", pdf.numPages);

                // Render page 1
                const page = await pdf.getPage(1);
                const viewport = page.getViewport({ scale: 1 });
                console.log("📄 Page 1 viewport:", viewport.width, "x", viewport.height);

                const canvasEl = canvasRef.current;
                if (!canvasEl) {
                    console.error("📄 Canvas ref is null!");
                    return;
                }

                // High-DPI rendering
                const dpr = window.devicePixelRatio || 1;
                const renderScale = 2 * dpr; // render at 2x for sharpness
                const scaledViewport = page.getViewport({ scale: renderScale });

                canvasEl.width = scaledViewport.width;
                canvasEl.height = scaledViewport.height;
                // CSS size remains at 1x viewport so layout math uses PDF points
                canvasEl.style.width = `${viewport.width}px`;
                canvasEl.style.height = `${viewport.height}px`;

                console.log("📄 Canvas size set:", canvasEl.width, "x", canvasEl.height, "CSS:", viewport.width, "x", viewport.height);

                // Use canvasContext (backwards-compat) since canvas-only mode may have issues
                const ctx = canvasEl.getContext("2d");
                if (!ctx) {
                    console.error("📄 Could not get 2D context!");
                    return;
                }

                const renderTask = page.render({
                    canvas: null,
                    canvasContext: ctx,
                    viewport: scaledViewport,
                });
                await renderTask.promise;
                console.log("📄 Render complete!");

                // PDF point dimensions (used for coordinate system — same as SVG user units)
                const pdfW = viewport.width;
                const pdfH = viewport.height;
                setPdfDimensions({ width: pdfW, height: pdfH });
                console.log("📄 PDF dimensions set:", pdfW, "x", pdfH);

                // Auto-fit to container — with retry loop matching SVG viewer behaviour.
                // getBoundingClientRect() may return 0×0 immediately after render, so we
                // retry up to 5 times with 200 ms gaps until the container has real dimensions.
                const fitPdf = (attempts = 0) => {
                    const container = containerRef.current;
                    if (!container) return;

                    const rect = container.getBoundingClientRect();

                    if ((rect.width === 0 || rect.height === 0) && attempts < 5) {
                        setTimeout(() => fitPdf(attempts + 1), 200);
                        return;
                    }

                    const cw = rect.width || 1000;
                    const ch = rect.height || 600;
                    const fitScale = Math.min(cw / pdfW, ch / pdfH) * 0.9;
                    const tx = (cw - pdfW * fitScale) / 2;
                    const ty = (ch - pdfH * fitScale) / 2;
                    setTransform({ scale: fitScale, translateX: tx, translateY: ty });
                    console.log("📄 Auto-fit:", { fitScale, tx, ty, containerSize: { cw, ch } });
                };

                // Small initial delay so the DOM has a chance to paint
                setTimeout(() => fitPdf(), 100);
            } catch (err) {
                console.error("📄 PDF render error:", err);
                setError("Failed to load PDF floorplan");
                toast({ title: "Error", description: "Failed to load PDF floorplan.", variant: "destructive" });
            } finally {
                setIsLoading(false);
            }
        };

        renderPdf();
    }, [pdfUrl, toast]);

    // ─── Zoom ──────────────────────────────────────────────────────────────────
    const handleZoom = useCallback((delta: number, centerPoint?: { x: number; y: number }) => {
        if (!enablePanZoom) return;
        setTransform(prev => {
            const newScale = Math.max(0.1, Math.min(5, prev.scale + delta));
            const ratio = newScale / prev.scale;
            let tx = prev.translateX;
            let ty = prev.translateY;
            if (centerPoint) {
                tx = centerPoint.x - (centerPoint.x - prev.translateX) * ratio;
                ty = centerPoint.y - (centerPoint.y - prev.translateY) * ratio;
            }
            return { scale: newScale, translateX: tx, translateY: ty };
        });
    }, [enablePanZoom]);

    const handleWheel = useCallback((e: WheelEvent) => {
        if (!enablePanZoom) return;
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
            handleZoom(delta, { x: e.clientX - rect.left, y: e.clientY - rect.top });
        }
    }, [enablePanZoom, handleZoom]);

    // ─── Fullscreen ────────────────────────────────────────────────────────────
    const toggleFullscreen = useCallback(async () => {
        if (!floorplanRef.current) return;
        try {
            if (!document.fullscreenElement) {
                await floorplanRef.current.requestFullscreen();
                setIsFullscreen(true);
                onFullscreenChange?.(true);
            } else {
                await document.exitFullscreen();
                setIsFullscreen(false);
                onFullscreenChange?.(false);
            }
        } catch { /* ignore */ }
    }, [onFullscreenChange]);

    useEffect(() => {
        const onFsChange = () => {
            const fs = !!document.fullscreenElement;
            setIsFullscreen(fs);
            onFullscreenChange?.(fs);
        };
        document.addEventListener("fullscreenchange", onFsChange);
        return () => document.removeEventListener("fullscreenchange", onFsChange);
    }, [onFullscreenChange]);

    // ─── Re-center PDF on fullscreen toggle ────────────────────────────────────
    // When going fullscreen (or exiting), the container dimensions change so we
    // need to recalculate the centered fit. Retry up to 5× with 200 ms gaps to
    // wait for the fullscreen transition to finish painting.
    useEffect(() => {
        const { width: pdfW, height: pdfH } = pdfDimensions;
        if (pdfW === 0 || pdfH === 0) return; // PDF not loaded yet

        const reFit = (attempts = 0) => {
            const container = containerRef.current;
            if (!container) return;
            const rect = container.getBoundingClientRect();
            if ((rect.width === 0 || rect.height === 0) && attempts < 5) {
                setTimeout(() => reFit(attempts + 1), 200);
                return;
            }
            const cw = rect.width || window.innerWidth;
            const ch = rect.height || window.innerHeight;
            const fitScale = Math.min(cw / pdfW, ch / pdfH) * 0.9;
            const tx = (cw - pdfW * fitScale) / 2;
            const ty = (ch - pdfH * fitScale) / 2;
            setTransform({ scale: fitScale, translateX: tx, translateY: ty });
        };

        // Small delay to let the browser finish the fullscreen transition
        setTimeout(() => reFit(), 150);
    }, [isFullscreen, pdfDimensions]);

    // ─── Pan ───────────────────────────────────────────────────────────────────
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (e.button !== 0) return;

        // Click-to-place mode
        if (isAdminMode && isCreatingAsset && !isReadOnly) {
            e.preventDefault();
            e.stopPropagation();
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                const pdfX = (e.clientX - rect.left - transform.translateX) / transform.scale;
                const pdfY = (e.clientY - rect.top - transform.translateY) / transform.scale;
                onFloorplanClick?.({ x: pdfX, y: pdfY });
            }
            return;
        }

        if (!enablePanZoom) return;
        setIsPanning(true);
        setPanStart({ x: e.clientX - transform.translateX, y: e.clientY - transform.translateY });
        e.preventDefault();
    }, [enablePanZoom, transform, isAdminMode, isCreatingAsset, isReadOnly, onFloorplanClick]);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (isAdminMode && isCreatingAsset && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const pdfX = (e.clientX - rect.left - transform.translateX) / transform.scale;
            const pdfY = (e.clientY - rect.top - transform.translateY) / transform.scale;
            setPlacementPreview({ x: pdfX, y: pdfY });
        }
        if (!isPanning || !enablePanZoom) return;
        setTransform(prev => ({
            ...prev,
            translateX: e.clientX - panStart.x,
            translateY: e.clientY - panStart.y,
        }));
    }, [isPanning, enablePanZoom, panStart, isAdminMode, isCreatingAsset, transform]);

    const handleMouseUp = useCallback(() => setIsPanning(false), []);

    useEffect(() => {
        const container = containerRef.current;
        if (!container || !enablePanZoom) return;
        container.addEventListener("wheel", handleWheel, { passive: false });
        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
        return () => {
            container.removeEventListener("wheel", handleWheel);
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };
    }, [enablePanZoom, handleWheel, handleMouseMove, handleMouseUp]);

    // ─── Fit to window ─────────────────────────────────────────────────────────
    const fitToWindow = useCallback(() => {
        if (!containerRef.current || pdfDimensions.width <= 0) return;
        const rect = containerRef.current.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const fitScale = Math.min(rect.width / pdfDimensions.width, rect.height / pdfDimensions.height) * 0.9;
        setTransform({
            scale: fitScale,
            translateX: (rect.width - pdfDimensions.width * fitScale) / 2,
            translateY: (rect.height - pdfDimensions.height * fitScale) / 2,
        });
    }, [pdfDimensions]);

    // ─── Shared layer transform style ──────────────────────────────────────────
    const layerStyle: React.CSSProperties = {
        transform: `translate(${transform.translateX}px, ${transform.translateY}px) scale(${transform.scale})`,
        transformOrigin: "0 0",
        transition: isPanning ? "none" : "transform 0.2s ease-out",
        position: "absolute",
        top: 0,
        left: 0,
    };


    // ─── Render ────────────────────────────────────────────────────────────────

    return (
        <div
            ref={floorplanRef}
            className={`relative h-full min-h-[400px] overflow-hidden ${className} ${isFullscreen ? "bg-white" : "bg-muted/30"}`}
        >
            {/* Loading overlay */}
            {isLoading && (
                <div className="absolute inset-0 z-40 flex items-center justify-center bg-muted/30">
                    <div className="text-center space-y-2">
                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                        <p className="text-sm text-muted-foreground">Loading PDF floorplan...</p>
                    </div>
                </div>
            )}

            {/* Error overlay */}
            {error && (
                <div className="absolute inset-0 z-40 flex items-center justify-center bg-muted/30">
                    <div className="text-center space-y-4 p-8">
                        <p className="text-destructive font-medium">{error}</p>
                        <Button onClick={() => window.location.reload()} size="sm">Retry</Button>
                    </div>
                </div>
            )}
            {/* Zoom Controls */}
            {enablePanZoom && (
                <div className="absolute top-4 right-4 z-30 flex flex-col gap-2">
                    <Button variant="secondary" size="icon" onClick={() => handleZoom(0.2)} title="Zoom In">
                        <ZoomIn className="h-4 w-4" />
                    </Button>
                    <Button variant="secondary" size="icon" onClick={() => handleZoom(-0.2)} title="Zoom Out">
                        <ZoomOut className="h-4 w-4" />
                    </Button>
                    <Button variant="secondary" size="icon" onClick={fitToWindow} title="Reset View">
                        <RotateCcw className="h-4 w-4" />
                    </Button>
                    <Button variant="secondary" size="icon" onClick={fitToWindow} title="Fit to Window">
                        <Maximize2 className="h-4 w-4" />
                    </Button>
                    <Button variant="secondary" size="icon" onClick={toggleFullscreen} title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}>
                        {isFullscreen ? <Shrink className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
                    </Button>
                </div>
            )}

            {/* Fullscreen Filter Panel - matches SVGFloorplanViewer */}
            {isFullscreen && (
                <div className="absolute top-4 left-4 right-20 z-30 flex flex-col gap-2">
                    <div className="flex items-center gap-3 flex-wrap">
                        {/* Quick Navigation */}
                        <div className="bg-background/95 backdrop-blur-sm rounded-lg shadow-lg border p-1 px-3">
                            <FloorplanNavigator
                                currentLayout={currentLayout || null}
                                plantId={plantId}
                                className="text-sm"
                                titleClassName="text-base"
                                usePortal={false}
                            />
                        </div>

                        {/* Category Buttons */}
                        {allAssets.length > 0 && (
                            <div className="flex items-center gap-2 bg-background/95 backdrop-blur-sm rounded-lg shadow-lg border p-2">
                                <span className="text-xs font-medium text-muted-foreground px-2">Category:</span>
                                {Array.from(new Set(allAssets.map(a => (a.metadata as any)?.category || 'Unknown')))
                                    .sort()
                                    .map((category: unknown) => {
                                        const catName = String(category);
                                        const isActive = currentFilters.category
                                            ? Array.isArray(currentFilters.category)
                                                ? currentFilters.category.includes(catName)
                                                : currentFilters.category === catName
                                            : false;
                                        return (
                                            <Button
                                                key={catName}
                                                variant={isActive ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => {
                                                    if (isActive) {
                                                        onFilterChange?.({ ...currentFilters, category: undefined });
                                                    } else {
                                                        onFilterChange?.({ ...currentFilters, category: catName });
                                                    }
                                                }}
                                                className="h-7 text-xs"
                                            >
                                                {catName.length > 20 ? catName.substring(0, 20) + '...' : catName}
                                            </Button>
                                        );
                                    })}
                            </div>
                        )}

                        {/* Health Status Buttons */}
                        <div className="flex items-center gap-2 bg-background/95 backdrop-blur-sm rounded-lg shadow-lg border p-2">
                            <span className="text-xs font-medium text-muted-foreground px-2">Health:</span>
                            {Object.entries(statusConfig).map(([key, config]) => {
                                const isActive = currentFilters.health
                                    ? Array.isArray(currentFilters.health)
                                        ? currentFilters.health.includes(key)
                                        : currentFilters.health === key
                                    : false;
                                return (
                                    <Button
                                        key={key}
                                        variant={isActive ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => {
                                            const currentHealth = currentFilters.health;
                                            let newHealth: string | string[] | undefined;
                                            if (!currentHealth) {
                                                newHealth = [key];
                                            } else {
                                                const currentArray = Array.isArray(currentHealth) ? currentHealth : [currentHealth];
                                                if (currentArray.includes(key)) {
                                                    newHealth = currentArray.filter(h => h !== key);
                                                    if (newHealth.length === 0) newHealth = undefined;
                                                } else {
                                                    newHealth = [...currentArray, key];
                                                }
                                            }
                                            onFilterChange?.({ ...currentFilters, health: newHealth });
                                        }}
                                        className="h-7 text-xs flex items-center gap-1.5"
                                    >
                                        <div
                                            className="w-2 h-2 rounded-full"
                                            style={{ backgroundColor: config.color }}
                                        />
                                        {config.label}
                                    </Button>
                                );
                            })}
                        </div>

                        {/* Results & Clear */}
                        <div className="flex items-center gap-2 bg-background/95 backdrop-blur-sm rounded-lg shadow-lg border p-2">
                            <span className="text-xs text-muted-foreground">
                                <span className="font-medium text-foreground">{assets.length}</span>/{allAssets.length}
                            </span>
                            {Object.values(currentFilters).filter(v => v !== undefined).length > 0 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => { onFilterChange?.({}); setSearchValue(""); }}
                                    className="h-6 text-xs text-muted-foreground hover:text-foreground px-2"
                                >
                                    <RotateCcw className="h-3 w-3 mr-1" />
                                    Clear
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Dynamic Category-Specific Filters Row - same as SVGFloorplanViewer */}
                    {currentFilters.category && (() => {
                        const selectedCategory = Array.isArray(currentFilters.category)
                            ? currentFilters.category[0]
                            : currentFilters.category;

                        const isFireExtinguisher = selectedCategory?.toLowerCase().startsWith('fire extinguisher');
                        const isFireHydrant = selectedCategory?.toLowerCase().startsWith('fire hydrant');

                        const categoryAssets = allAssets.filter(a => {
                            const assetCategory = (a.metadata as any)?.category || 'Unknown';
                            return assetCategory.toLowerCase() === selectedCategory?.toLowerCase();
                        });

                        const getFilterFields = () => {
                            if (isFireExtinguisher) {
                                return [
                                    { key: 'productName', label: 'Product Name', metadataKey: 'productName' },
                                    { key: 'make', label: 'Make', metadataKey: 'make' },
                                    { key: 'assetType', label: 'Type', metadataKey: 'type' },
                                    { key: 'subType', label: 'Sub Type', metadataKey: 'subType' },
                                    { key: 'capacity', label: 'Capacity', metadataKey: 'capacity' },
                                    { key: 'age', label: 'Age', metadataKey: 'age' },
                                    { key: 'condition', label: 'Condition', metadataKey: 'condition' },
                                    { key: 'fireRating', label: 'Fire Rating', metadataKey: 'fireRating' },
                                    { key: 'serviceStatus', label: 'Service Status', metadataKey: 'serviceStatus' },
                                ];
                            }
                            if (isFireHydrant) {
                                return [
                                    { key: 'productName', label: 'Product', metadataKey: 'productName' },
                                    { key: 'assetType', label: 'Type', metadataKey: 'type' },
                                    { key: 'subType', label: 'Sub Type', metadataKey: 'subType' },
                                    { key: 'serviceStatus', label: 'Service Status', metadataKey: 'serviceStatus' },
                                    { key: 'condition', label: 'Condition', metadataKey: 'condition' },
                                    { key: 'healthStatus', label: 'Health Status', metadataKey: 'healthStatus' },
                                    { key: 'make', label: 'Make', metadataKey: 'make' },
                                ];
                            }
                            return [
                                { key: 'productName', label: 'Product Name', metadataKey: 'productName' },
                                { key: 'assetType', label: 'Type', metadataKey: 'type' },
                            ];
                        };

                        const filterFields = getFilterFields();

                        const getFilteredUniqueValues = (metadataKey: string, excludeKey: string) => {
                            let relevantAssets = [...categoryAssets];
                            for (const field of filterFields) {
                                if (field.metadataKey === excludeKey) continue;
                                const filterKey = `metadata_${field.metadataKey}`;
                                const filterValue = (currentFilters as any)[filterKey];
                                if (filterValue) {
                                    const filterArray = Array.isArray(filterValue) ? filterValue : [filterValue];
                                    relevantAssets = relevantAssets.filter(asset => {
                                        const assetValue = (asset.metadata as any)?.[field.metadataKey];
                                        if (!assetValue) return false;
                                        return filterArray.some((v: string) =>
                                            String(assetValue).toLowerCase() === String(v).toLowerCase()
                                        );
                                    });
                                }
                            }
                            const values = new Set<string>();
                            relevantAssets.forEach(asset => {
                                const value = (asset.metadata as any)?.[metadataKey];
                                if (value && typeof value === 'string' && value.trim()) values.add(value);
                            });
                            return Array.from(values).sort();
                        };

                        return (
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-medium text-foreground bg-primary/10 rounded-lg px-3 py-1.5">
                                    Filters for: {selectedCategory}
                                </span>

                                {filterFields.map(field => {
                                    const uniqueValues = getFilteredUniqueValues(field.metadataKey, field.metadataKey);
                                    if (uniqueValues.length === 0) return null;

                                    const filterKey = `metadata_${field.metadataKey}` as keyof typeof currentFilters;
                                    const currentValue = (currentFilters as any)[filterKey];
                                    const currentArray = currentValue
                                        ? (Array.isArray(currentValue) ? currentValue : [currentValue])
                                        : [];
                                    const selectedCount = currentArray.length;

                                    const getDisplayText = () => {
                                        if (selectedCount === 0) return null;
                                        if (selectedCount === 1) return currentArray[0];
                                        if (selectedCount === 2) return currentArray.join(', ');
                                        return `${currentArray[0]}, ${currentArray[1]} +${selectedCount - 2}`;
                                    };

                                    return (
                                        <DropdownMenu key={field.key}>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className={`h-7 text-xs gap-1 shadow-lg border ${selectedCount > 0
                                                        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                                                        : 'bg-background/95 backdrop-blur-sm'
                                                        }`}
                                                >
                                                    <span className="font-medium">{field.label}:</span>
                                                    {selectedCount > 0 ? (
                                                        <span className="max-w-[120px] truncate">{getDisplayText()}</span>
                                                    ) : (
                                                        <span className="text-muted-foreground">(All)</span>
                                                    )}
                                                    <ChevronDown className="h-3 w-3 ml-1 flex-shrink-0" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent
                                                align="start"
                                                className="max-h-60 overflow-y-auto min-w-[150px] z-[100]"
                                            >
                                                {uniqueValues.map(value => {
                                                    const isActive = currentArray.includes(value);
                                                    return (
                                                        <DropdownMenuCheckboxItem
                                                            key={value}
                                                            checked={isActive}
                                                            onCheckedChange={(checked) => {
                                                                const newFilters = { ...currentFilters };
                                                                if (checked) {
                                                                    (newFilters as any)[filterKey] = [...currentArray, value];
                                                                } else {
                                                                    const newArray = currentArray.filter((v: string) => v !== value);
                                                                    if (newArray.length === 0) {
                                                                        delete (newFilters as any)[filterKey];
                                                                    } else {
                                                                        (newFilters as any)[filterKey] = newArray;
                                                                    }
                                                                }
                                                                onFilterChange?.(newFilters);
                                                            }}
                                                            className="text-xs"
                                                        >
                                                            {value}
                                                        </DropdownMenuCheckboxItem>
                                                    );
                                                })}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    );
                                })}
                            </div>
                        );
                    })()}
                </div>
            )}

            {/* Current Mode Indicator - Only show in create mode (matches SVG viewer) */}
            {isAdminMode && currentMode === 'create' && (
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-30">
                    <Badge variant="secondary" className="px-3 py-1 bg-background/90 backdrop-blur-sm">
                        <span className="flex items-center gap-1">
                            <span className="text-xs">+</span>
                            Creation Mode
                        </span>
                    </Badge>
                </div>
            )}

            {/* Main pan/zoom container */}
            <div
                ref={containerRef}
                className="w-full h-full min-h-[400px] relative"
                onMouseDown={handleMouseDown}
                onClick={() => {
                    if (hoveredAsset) { setHoveredAsset(null); setIsPopupPinned(false); }
                }}
                style={{ cursor: isCreatingAsset ? "crosshair" : isPanning ? "grabbing" : "grab" }}
            >
                {/* Layer 1 — PDF canvas */}
                <div style={{ ...layerStyle, zIndex: 1 }}>
                    <canvas ref={canvasRef} className="block" />
                </div>

                {/* Layer 2 — Asset Markers overlay (identical system to SVGFloorplanViewer) */}
                <div style={{ ...layerStyle, zIndex: 10, pointerEvents: "none" }}>
                    <svg
                        width={pdfDimensions.width}
                        height={pdfDimensions.height}
                        viewBox={`0 0 ${pdfDimensions.width} ${pdfDimensions.height}`}
                        style={{ pointerEvents: "none", overflow: "visible" }}
                    >
                        {assets.map(asset => (
                            <AssetMarker
                                key={asset.id}
                                asset={asset}
                                isSelected={selectedAsset?.id === asset.id}
                                isActive={hoveredAsset?.id === asset.id}
                                scale={1 / transform.scale}
                                onClick={(a, screenPos) => {
                                    // Toggle popup; do NOT call onAssetClick — PDF viewer uses inline popup only
                                    if (hoveredAsset?.id === a.id && isPopupPinned) {
                                        setHoveredAsset(null);
                                        setIsPopupPinned(false);
                                    } else {
                                        setHoveredAsset(a);
                                        setPopupPosition(screenPos);
                                        setIsPopupPinned(true);
                                    }
                                }}
                                onHover={(a, screenPos) => {
                                    if (!isPopupPinned) { setHoveredAsset(a); setPopupPosition(screenPos); }
                                }}
                                onHoverEnd={() => { if (!isPopupPinned) setHoveredAsset(null); }}
                            />
                        ))}

                        {/* Placement preview crosshair */}
                        {isAdminMode && isCreatingAsset && placementPreview && (
                            <g transform={`translate(${placementPreview.x}, ${placementPreview.y})`}>
                                <circle cx="0" cy="0" r="8" fill="rgba(59,130,246,0.3)" stroke="#3b82f6" strokeWidth="2" strokeDasharray="4 4" className="animate-pulse" />
                                <text x="0" y="1" textAnchor="middle" dominantBaseline="central" fontSize="8" fill="#3b82f6" fontWeight="bold">+</text>
                            </g>
                        )}
                    </svg>
                </div>
            </div>

            {/* Status bar */}
            <div className="absolute bottom-4 left-4 z-30 bg-background/90 backdrop-blur-sm rounded-lg p-3 shadow-lg border">
                <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        <span>Healthy: {assets.filter(a => a.status === "green").length}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-yellow-500" />
                        <span>Warning: {assets.filter(a => a.status === "yellow").length}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <span>Critical: {assets.filter(a => a.status === "red").length}</span>
                    </div>
                    <div className="text-muted-foreground border-l pl-4 ml-2">
                        Zoom: {Math.round(transform.scale * 100)}% · PDF
                    </div>
                </div>
            </div>

            {/* Asset popup */}
            {hoveredAsset && <AssetPopup asset={hoveredAsset} position={popupPosition} />}
        </div>
    );
};
