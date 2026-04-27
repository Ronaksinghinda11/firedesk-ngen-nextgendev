import React from "react";
import type { Asset } from "@/data/mockFloorplanAssets";
import { assetTypeConfig, statusConfig } from "@/data/mockFloorplanAssets";

interface AssetPopupProps {
    asset: Asset;
    position: { x: number; y: number };
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
}

export const AssetPopup: React.FC<AssetPopupProps> = ({
    asset,
    position,
    onMouseEnter,
    onMouseLeave
}) => {
    // Get asset type configuration
    const typeConfig = assetTypeConfig[asset.type as keyof typeof assetTypeConfig] || {
        color: "#6b7280",
        icon: "📦",
        label: asset.type || "Unknown"
    };

    // Get status color
    const statusColor = statusConfig[asset.status]?.color || "#6b7280";

    return (
        <div
            className="fixed bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-[9999] pointer-events-auto"
            style={{
                left: position.x + 20,
                top: position.y - 120,
                width: 340,
                minHeight: 240
            }}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            {/* Header Section */}
            <div className="flex justify-between items-start mb-3">
                <div>
                    <p className="text-xs text-gray-500 font-medium tracking-wide">ASSET ID</p>
                    <p className="text-base font-bold text-gray-900">
                        {(asset.assetId || asset.id?.slice(0, 8) || 'N/A').toUpperCase()}
                    </p>
                </div>
                <div
                    className={`px-3 py-1 rounded-full flex items-center gap-2 ${asset.status === 'green' ? 'bg-green-100' :
                        asset.status === 'yellow' ? 'bg-amber-100' : 'bg-red-100'
                        }`}
                >
                    <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: statusColor }}
                    />
                    <span className={`text-xs font-semibold ${asset.status === 'green' ? 'text-green-800' :
                        asset.status === 'yellow' ? 'text-amber-800' : 'text-red-800'
                        }`}>
                        {asset.status === 'green' ? 'Healthy' :
                            asset.status === 'yellow' ? 'Warning' : 'Critical'}
                    </span>
                </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-gray-200 mb-3" />

            {/* Asset Info Row */}
            <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                    <p className="text-xs text-gray-500 font-medium">Product</p>
                    <p className="text-sm font-semibold text-gray-900 truncate">
                        {asset.name}
                    </p>
                </div>
                <div>
                    <p className="text-xs text-gray-500 font-medium">Location</p>
                    <p className="text-sm text-gray-900 truncate">
                        {(asset.metadata as Record<string, unknown>)?.location as string || '-'}
                    </p>
                </div>
            </div>

            {/* Category & Geo Row */}
            <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                    <p className="text-xs text-gray-500 font-medium">Category</p>
                    <p className="text-sm text-gray-900 truncate">{typeConfig.label}</p>
                </div>
                <div>
                    <p className="text-xs text-gray-500 font-medium">Geo Location</p>
                    {asset.lat && asset.long ? (
                        <a
                            href={`https://www.google.com/maps?q=${asset.lat},${asset.long}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline"
                        >
                            View on Maps
                        </a>
                    ) : (
                        <p className="text-sm text-gray-400">Not available</p>
                    )}
                </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-gray-200 mb-3" />

            {/* Service Frequencies Section */}
            <div className="mb-3">
                <p className="text-xs text-gray-700 font-semibold tracking-wide mb-2">SERVICE FREQUENCIES</p>
                <div className="grid grid-cols-3 gap-2">
                    <div className="bg-gray-100 rounded px-2 py-1">
                        <p className="text-xs font-semibold text-gray-700">Inspection</p>
                        <p className="text-xs text-gray-500">{asset.serviceFrequencies?.inspection || '-'}</p>
                    </div>
                    <div className="bg-gray-100 rounded px-2 py-1">
                        <p className="text-xs font-semibold text-gray-700">Testing</p>
                        <p className="text-xs text-gray-500">{asset.serviceFrequencies?.testing || '-'}</p>
                    </div>
                    <div className="bg-gray-100 rounded px-2 py-1">
                        <p className="text-xs font-semibold text-gray-700">Maintenance</p>
                        <p className="text-xs text-gray-500">{asset.serviceFrequencies?.maintenance || '-'}</p>
                    </div>
                </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-gray-200 mb-3" />

            {/* Service Dates Section */}
            <div>
                <div className="flex items-center mb-2 px-1">
                    <p className="text-xs text-gray-700 font-semibold tracking-wide flex-1">SERVICE DATES</p>
                    <p className="text-xs text-gray-400 w-24 text-center">Last</p>
                    <p className="text-xs text-gray-400 w-24 text-center">Next</p>
                </div>
                <div className="space-y-1">
                    <div className="flex items-center px-1">
                        <span className="text-xs text-gray-700 font-medium flex-1">Inspection</span>
                        <span className="text-xs text-gray-900 w-24 text-center">
                            {asset.serviceDates?.lastServiceDates?.inspection
                                ? new Date(asset.serviceDates.lastServiceDates.inspection).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })
                                : '-'}
                        </span>
                        <span className="text-xs text-gray-900 w-24 text-center">
                            {asset.serviceDates?.nextServiceDates?.inspection
                                ? new Date(asset.serviceDates.nextServiceDates.inspection).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })
                                : '-'}
                        </span>
                    </div>
                    <div className="flex items-center px-1">
                        <span className="text-xs text-gray-700 font-medium flex-1">Testing</span>
                        <span className="text-xs text-gray-900 w-24 text-center">
                            {asset.serviceDates?.lastServiceDates?.testing
                                ? new Date(asset.serviceDates.lastServiceDates.testing).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })
                                : '-'}
                        </span>
                        <span className="text-xs text-gray-900 w-24 text-center">
                            {asset.serviceDates?.nextServiceDates?.testing
                                ? new Date(asset.serviceDates.nextServiceDates.testing).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })
                                : '-'}
                        </span>
                    </div>
                    <div className="flex items-center px-1">
                        <span className="text-xs text-gray-700 font-medium flex-1">Maintenance</span>
                        <span className="text-xs text-gray-900 w-24 text-center">
                            {asset.serviceDates?.lastServiceDates?.maintenance
                                ? new Date(asset.serviceDates.lastServiceDates.maintenance).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })
                                : '-'}
                        </span>
                        <span className="text-xs text-gray-900 w-24 text-center">
                            {asset.serviceDates?.nextServiceDates?.maintenance
                                ? new Date(asset.serviceDates.nextServiceDates.maintenance).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })
                                : '-'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};