import React from 'react';
import { AlertCircle, Power, Zap, Droplets, Gauge, Battery } from 'lucide-react';
import { usePumpRoomData } from '../contexts/PumpRoomDataContext';

/**
 * Multi-Device Pump Room Overview Widget
 * Groups assets by device and shows device-level infrastructure sensors
 */
const MultiDevicePumpOverview: React.FC = () => {
    const { deviceData, assetData, deviceMappings, deviceIds, isLoading } = usePumpRoomData();

    if (isLoading) {
        return (
            <div className="p-6 bg-white rounded-lg shadow">
                <div className="animate-pulse">Loading IoT data...</div>
            </div>
        );
    }

    if (deviceIds.length === 0) {
        return (
            <div className="p-6 bg-white rounded-lg shadow">
                <div className="flex items-center text-gray-500">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    <span>No IoT devices configured. Please set up device mappings in IoT Setup.</span>
                </div>
            </div>
        );
    }

    // Group mappings by device
    const assetsByDevice = deviceMappings.reduce((acc, mapping) => {
        if (!acc[mapping.device_id]) {
            acc[mapping.device_id] = [];
        }

        const iotData = assetData[mapping.asset_code];
        if (iotData) {
            acc[mapping.device_id].push({
                mapping,
                iotData,
                asset: mapping.asset,
            });
        }

        return acc;
    }, {} as Record<string, any[]>);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Pump Room Overview</h2>
                <div className="text-sm text-gray-500">
                    {deviceIds.length} Device{deviceIds.length > 1 ? 's' : ''} • {deviceMappings.length} Pump
                    {deviceMappings.length > 1 ? 's' : ''}
                </div>
            </div>

            {/* Device Cards */}
            <div className="space-y-4">
                {Object.entries(assetsByDevice).map(([deviceId, assets]) => {
                    const device = deviceData[deviceId];

                    return (
                        <div key={deviceId} className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
                            {/* Device Header - Shows WLS/DLS/PLS */}
                            <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 border-b border-blue-200">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <h3 className="font-bold text-lg text-gray-900">{deviceId}</h3>
                                        <p className="text-sm text-gray-600">{assets.length} Pump(s) Monitored</p>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                                        <span className="text-sm font-medium text-green-700">Live</span>
                                    </div>
                                </div>

                                {/* Pump Room Infrastructure Sensors (Device Level) */}
                                {device && (
                                    <div className="grid grid-cols-3 gap-4">
                                        {/* Water Level */}
                                        <div className="bg-white rounded-lg p-3 shadow-sm">
                                            <div className="flex items-center mb-1">
                                                <Droplets className="w-4 h-4 text-blue-600 mr-2" />
                                                <span className="text-xs font-medium text-gray-600">Water Level</span>
                                            </div>
                                            <div className="text-2xl font-bold text-gray-900">
                                                {device.WLS !== undefined ? device.WLS : 'N/A'}
                                                <span className="text-sm font-normal text-gray-500 ml-1">kL</span>
                                            </div>
                                            <div className="text-xs text-gray-500 mt-1">
                                                {device.WLS !== undefined && device.WLS < 75 ? (
                                                    <span className="text-orange-600 font-medium">⚠️ Low</span>
                                                ) : (
                                                    <span className="text-green-600">✓ Normal</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Diesel Level */}
                                        <div className="bg-white rounded-lg p-3 shadow-sm">
                                            <div className="flex items-center mb-1">
                                                <Zap className="w-4 h-4 text-yellow-600 mr-2" />
                                                <span className="text-xs font-medium text-gray-600">Diesel Level</span>
                                            </div>
                                            <div className="text-2xl font-bold text-gray-900">
                                                {device.DLS !== undefined ? device.DLS : 'N/A'}
                                                <span className="text-sm font-normal text-gray-500 ml-1">L</span>
                                            </div>
                                            <div className="text-xs text-gray-500 mt-1">
                                                {device.DLS !== undefined && device.DLS < 75 ? (
                                                    <span className="text-orange-600 font-medium">⚠️ Low</span>
                                                ) : (
                                                    <span className="text-green-600">✓ Normal</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Header Pressure */}
                                        <div className="bg-white rounded-lg p-3 shadow-sm">
                                            <div className="flex items-center mb-1">
                                                <Gauge className="w-4 h-4 text-purple-600 mr-2" />
                                                <span className="text-xs font-medium text-gray-600">Header Pressure</span>
                                            </div>
                                            <div className="text-2xl font-bold text-gray-900">
                                                {device.PLS !== undefined ? device.PLS.toFixed(1) : 'N/A'}
                                                <span className="text-sm font-normal text-gray-500 ml-1">Bar</span>
                                            </div>
                                            <div className="text-xs text-gray-500 mt-1">
                                                {device.PLS !== undefined && device.PLS >= 6 && device.PLS <= 8 ? (
                                                    <span className="text-green-600">✓ Normal</span>
                                                ) : (
                                                    <span className="text-orange-600 font-medium">⚠️ Check</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Battery Status */}
                                {device && (device.BAT1 !== undefined || device.BAT2 !== undefined) && (
                                    <div className="mt-3 flex items-center space-x-4 text-sm">
                                        {device.BAT1 !== undefined && (
                                            <div className="flex items-center">
                                                <Battery className="w-4 h-4 text-green-600 mr-1" />
                                                <span className="text-gray-700">BAT1: {device.BAT1.toFixed(1)}V</span>
                                            </div>
                                        )}
                                        {device.BAT2 !== undefined && (
                                            <div className="flex items-center">
                                                <Battery className="w-4 h-4 text-green-600 mr-1" />
                                                <span className="text-gray-700">BAT2: {device.BAT2.toFixed(1)}V</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Pumps for this Device (Asset-Specific Data) */}
                            <div className="p-4">
                                <div className="grid grid-cols-3 gap-4">
                                    {assets.map(({ mapping, iotData, asset }) => (
                                        <div
                                            key={mapping.asset_code}
                                            className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                                        >
                                            {/* Asset Header */}
                                            <div className="flex items-center justify-between mb-3">
                                                <div>
                                                    <h4 className="font-semibold text-gray-900">{mapping.asset_code}</h4>
                                                    <p className="text-xs text-gray-500">{asset?.type || 'Pump'}</p>
                                                </div>
                                                <div className="px-2 py-1 text-xs font-semibold rounded bg-blue-100 text-blue-800">
                                                    {mapping.data_key}
                                                </div>
                                            </div>

                                            {/* Asset Location */}
                                            <div className="text-xs text-gray-600 mb-3">
                                                {asset?.building || 'N/A'} • {asset?.location || 'N/A'}
                                            </div>

                                            {/* Asset Status Indicators */}
                                            <div className="space-y-2">
                                                {/* Running Status */}
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm text-gray-600">Status</span>
                                                    <div className="flex items-center">
                                                        <div
                                                            className={`w-2 h-2 rounded-full mr-2 ${iotData.liveData.status ? 'bg-green-500' : 'bg-gray-300'
                                                                }`}
                                                        ></div>
                                                        <span
                                                            className={`text-sm font-medium ${iotData.liveData.status ? 'text-green-700' : 'text-gray-500'
                                                                }`}
                                                        >
                                                            {iotData.liveData.status ? 'ON' : 'OFF'}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Power Status */}
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm text-gray-600">Power</span>
                                                    <div className="flex items-center">
                                                        <Power
                                                            className={`w-4 h-4 mr-1 ${iotData.liveData.powerStatus ? 'text-green-600' : 'text-gray-400'
                                                                }`}
                                                        />
                                                        <span
                                                            className={`text-sm font-medium ${iotData.liveData.powerStatus ? 'text-green-700' : 'text-gray-500'
                                                                }`}
                                                        >
                                                            {iotData.liveData.powerStatus ? 'ON' : 'OFF'}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Trip Status */}
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm text-gray-600">Trip</span>
                                                    <span
                                                        className={`text-sm font-medium px-2 py-1 rounded ${iotData.liveData.tripStatus
                                                            ? 'bg-green-100 text-green-700'
                                                            : 'bg-red-100 text-red-700'
                                                            }`}
                                                    >
                                                        {iotData.liveData.tripStatus ? 'OK' : 'TRIPPED'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Asset Health */}
                                            <div className="mt-3 pt-3 border-t border-gray-200">
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="text-gray-600">Health</span>
                                                    <span
                                                        className={`font-medium ${asset?.healthStatus === 'Healthy' ? 'text-green-600' : 'text-yellow-600'
                                                            }`}
                                                    >
                                                        {asset?.healthStatus || 'Unknown'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default MultiDevicePumpOverview;
