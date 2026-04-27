import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import {
    ArrowLeft,
    QrCode,
    MapPin,
    Check,
    X,
    Navigation,
    Scan,
    AlertCircle,
} from 'lucide-react-native';
import { geolocationService, api } from '../services/api';
import { authService } from '../services/auth';

interface ScannedAsset {
    assetId: string;
    assetUUID: string;
    assetName?: string;
}

export default function AssignLocationScreen() {
    const router = useRouter();
    const [permission, requestPermission] = useCameraPermissions();
    const [user, setUser] = useState<any>(null);

    // QR Scanner state
    const [scannerVisible, setScannerVisible] = useState(false);
    const [scanning, setScanning] = useState(false);
    const [scanned, setScanned] = useState(false);

    // Location state
    const [currentLocation, setCurrentLocation] = useState<{ lat: string; long: string } | null>(null);
    const [locationLoading, setLocationLoading] = useState(false);
    const [locationError, setLocationError] = useState<string | null>(null);

    // Scanned asset state
    const [scannedAsset, setScannedAsset] = useState<ScannedAsset | null>(null);

    // Assignment state
    const [assigning, setAssigning] = useState(false);
    const [assignmentResult, setAssignmentResult] = useState<{
        success: boolean;
        message: string;
        isFirstCapture?: boolean;
    } | null>(null);

    useEffect(() => {
        loadUser();
        getCurrentLocation();
    }, []);

    const loadUser = async () => {
        try {
            const userData = await authService.getUser();
            setUser(userData);
        } catch (error) {
            console.error('Error loading user:', error);
        }
    };

    const getCurrentLocation = async () => {
        try {
            setLocationLoading(true);
            setLocationError(null);

            // Request location permissions
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setLocationError('Location permission denied. Please enable location access in settings.');
                return;
            }

            // Get current position with high accuracy
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
            });

            setCurrentLocation({
                lat: location.coords.latitude.toString(),
                long: location.coords.longitude.toString()
            });
        } catch (error: any) {
            console.error('Error getting location:', error);
            setLocationError('Failed to get current location. Please try again.');
        } finally {
            setLocationLoading(false);
        }
    };

    const openScanner = async () => {
        if (permission && !permission.granted) {
            const result = await requestPermission();
            if (!result.granted) {
                Alert.alert('Permission Denied', 'Camera permission is required to scan QR codes');
                return;
            }
        }

        // Reset states
        setScanned(false);
        setScannedAsset(null);
        setAssignmentResult(null);
        setScannerVisible(true);
    };

    const parseQRCode = (data: string): { asset_id: string; asset_uuid?: string } | null => {
        console.log('[AssignLocation] Parsing QR data:', data);

        // Try to parse as JSON
        try {
            const parsed = JSON.parse(data);
            if (parsed.asset_id) {
                // asset_id now contains the UUID
                return {
                    asset_id: parsed.asset_id,
                    asset_uuid: parsed.asset_id // asset_id IS the UUID now
                };
            }
        } catch (e) {
            // Not JSON, try regex
        }

        // Try regex extraction
        const assetIdMatch = data.match(/"asset_id"\s*:\s*"([^"]+)"/);

        if (assetIdMatch && assetIdMatch[1]) {
            return {
                asset_id: assetIdMatch[1],
                asset_uuid: assetIdMatch[1] // asset_id IS the UUID now
            };
        }

        // Check if it's a UUID format (with or without dashes)
        if (data.match(/^[0-9a-fA-F]{8}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{12}$/)) {
            return { asset_id: data.trim(), asset_uuid: data.trim() };
        }

        return null;
    };

    const handleQRScanned = async ({ data }: { data: string }) => {
        if (scanned || scanning) return;

        setScanned(true);
        setScanning(true);

        try {
            const qrData = parseQRCode(data);

            if (!qrData) {
                Alert.alert(
                    'Invalid QR Code',
                    'Could not read asset information from this QR code.',
                    [
                        { text: 'Try Again', onPress: () => { setScanned(false); setScanning(false); } },
                        { text: 'Cancel', onPress: () => setScannerVisible(false), style: 'cancel' }
                    ]
                );
                return;
            }

            // We need to fetch the asset details from the backend
            // The API now supports both UUID and human-readable assetId
            try {
                console.log('[AssignLocation] Fetching asset details for:', qrData.asset_id);
                const response = await api.get(`/public/assets/${qrData.asset_id}`);
                const assetData = response.data;

                console.log('[AssignLocation] Asset response:', assetData);

                if (assetData.success && (assetData.data || assetData.asset)) {
                    const asset = assetData.data || assetData.asset;
                    setScannedAsset({
                        assetId: asset.assetId,
                        assetUUID: asset.id,
                        assetName: asset.assetName || asset.product?.productName
                    });
                    setScannerVisible(false);
                } else {
                    // Use asset_id directly since backend now supports it
                    setScannedAsset({
                        assetId: qrData.asset_id,
                        assetUUID: qrData.asset_id, // Backend will resolve this
                        assetName: undefined
                    });
                    setScannerVisible(false);
                }
            } catch (fetchError: any) {
                console.error('[AssignLocation] Error fetching asset:', fetchError.response?.data || fetchError.message);
                // Still allow assignment with just the asset_id since backend supports it
                setScannedAsset({
                    assetId: qrData.asset_id,
                    assetUUID: qrData.asset_id, // Backend will resolve this
                    assetName: undefined
                });
                setScannerVisible(false);
            }
        } catch (error) {
            console.error('Error scanning QR:', error);
            Alert.alert('Error', 'Failed to process QR code', [
                { text: 'Try Again', onPress: () => { setScanned(false); setScanning(false); } }
            ]);
        } finally {
            setScanning(false);
        }
    };

    const assignLocation = async () => {
        if (!scannedAsset || !currentLocation) {
            Alert.alert('Error', 'Please scan an asset and ensure location is available');
            return;
        }

        try {
            setAssigning(true);

            console.log('[AssignLocation] Assigning location:', {
                assetUUID: scannedAsset.assetUUID,
                assetId: scannedAsset.assetId,
                lat: currentLocation.lat,
                long: currentLocation.long
            });

            const response = await geolocationService.updateAssetGeolocation(
                scannedAsset.assetUUID,
                currentLocation.lat,
                currentLocation.long,
                `Location assigned by ${user?.name || 'Technician'} on ${new Date().toLocaleString()}`
            );

            console.log('[AssignLocation] Response:', response);

            if (response.success) {
                setAssignmentResult({
                    success: true,
                    message: response.data.isFirstCapture
                        ? 'Location captured for the first time!'
                        : 'Location updated successfully!',
                    isFirstCapture: response.data.isFirstCapture
                });
            } else {
                console.log('[AssignLocation] Response not successful:', response);
                setAssignmentResult({
                    success: false,
                    message: response.message || 'Failed to assign location. Please try again.'
                });
            }
        } catch (error: any) {
            console.error('[AssignLocation] Error assigning location:', error);
            console.error('[AssignLocation] Error details:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status
            });
            setAssignmentResult({
                success: false,
                message: error.response?.data?.message || `Failed to assign location: ${error.message}`
            });
        } finally {
            setAssigning(false);
        }
    };

    const resetAndScanAnother = () => {
        setScannedAsset(null);
        setAssignmentResult(null);
        getCurrentLocation(); // Refresh location
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
            {/* Header */}
            <View style={{
                paddingHorizontal: 16,
                paddingVertical: 12,
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#ffffff',
                borderBottomWidth: 1,
                borderBottomColor: '#e5e7eb'
            }}>
                <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16, padding: 4 }}>
                    <ArrowLeft size={24} color="#1f2937" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={{ color: '#1f2937', fontSize: 18, fontWeight: 'bold' }}>Assign Location to asset</Text>
                    <Text style={{ color: '#6b7280', fontSize: 12 }}>Capture GPS coordinates for assets</Text>
                </View>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
                {/* Current Location Card */}
                <View style={{
                    backgroundColor: '#ffffff',
                    borderRadius: 16,
                    padding: 16,
                    marginBottom: 16,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 2,
                    elevation: 1
                }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                        <View style={{ backgroundColor: '#dbeafe', padding: 8, borderRadius: 8 }}>
                            <Navigation size={20} color="#2563eb" />
                        </View>
                        <Text style={{ marginLeft: 12, fontSize: 16, fontWeight: '600', color: '#1f2937' }}>
                            Your Current Location
                        </Text>
                    </View>

                    {locationLoading ? (
                        <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                            <ActivityIndicator size="small" color="#f97316" />
                            <Text style={{ color: '#6b7280', marginTop: 8 }}>Getting location...</Text>
                        </View>
                    ) : locationError ? (
                        <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                            <AlertCircle size={24} color="#ef4444" />
                            <Text style={{ color: '#ef4444', marginTop: 8, textAlign: 'center' }}>{locationError}</Text>
                            <TouchableOpacity
                                onPress={getCurrentLocation}
                                style={{ marginTop: 12, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#f97316', borderRadius: 8 }}
                            >
                                <Text style={{ color: 'white', fontWeight: '600' }}>Retry</Text>
                            </TouchableOpacity>
                        </View>
                    ) : currentLocation ? (
                        <View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                                <Text style={{ color: '#6b7280' }}>Latitude</Text>
                                <Text style={{ color: '#1f2937', fontWeight: '500' }}>{parseFloat(currentLocation.lat).toFixed(6)}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                                <Text style={{ color: '#6b7280' }}>Longitude</Text>
                                <Text style={{ color: '#1f2937', fontWeight: '500' }}>{parseFloat(currentLocation.long).toFixed(6)}</Text>
                            </View>
                            <TouchableOpacity
                                onPress={getCurrentLocation}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    paddingVertical: 8,
                                    backgroundColor: '#f3f4f6',
                                    borderRadius: 8
                                }}
                            >
                                <Navigation size={16} color="#6b7280" />
                                <Text style={{ color: '#6b7280', marginLeft: 6, fontWeight: '500' }}>Refresh Location</Text>
                            </TouchableOpacity>
                        </View>
                    ) : null}
                </View>

                {/* Scanned Asset Card */}
                {scannedAsset ? (
                    <View style={{
                        backgroundColor: '#ffffff',
                        borderRadius: 16,
                        padding: 16,
                        marginBottom: 16,
                        borderWidth: 2,
                        borderColor: '#f97316',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.05,
                        shadowRadius: 2,
                        elevation: 1
                    }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                            <View style={{ backgroundColor: '#fed7aa', padding: 8, borderRadius: 8 }}>
                                <QrCode size={20} color="#ea580c" />
                            </View>
                            <Text style={{ marginLeft: 12, fontSize: 16, fontWeight: '600', color: '#1f2937' }}>
                                Scanned Asset
                            </Text>
                        </View>

                        <View style={{ backgroundColor: '#fff7ed', padding: 12, borderRadius: 8, marginBottom: 12 }}>
                            <Text style={{ color: '#ea580c', fontWeight: 'bold', fontSize: 18 }}>
                                {scannedAsset.assetId}
                            </Text>
                            {scannedAsset.assetName && (
                                <Text style={{ color: '#9a3412', marginTop: 4 }}>
                                    {scannedAsset.assetName}
                                </Text>
                            )}
                        </View>

                        {/* Assignment Result */}
                        {assignmentResult ? (
                            <View style={{
                                backgroundColor: assignmentResult.success ? '#dcfce7' : '#fee2e2',
                                padding: 12,
                                borderRadius: 8,
                                marginBottom: 12
                            }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    {assignmentResult.success ? (
                                        <Check size={20} color="#16a34a" />
                                    ) : (
                                        <AlertCircle size={20} color="#dc2626" />
                                    )}
                                    <Text style={{
                                        marginLeft: 8,
                                        color: assignmentResult.success ? '#16a34a' : '#dc2626',
                                        fontWeight: '600'
                                    }}>
                                        {assignmentResult.message}
                                    </Text>
                                </View>
                            </View>
                        ) : null}

                        {/* Action Buttons */}
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity
                                onPress={resetAndScanAnother}
                                style={{
                                    flex: 1,
                                    paddingVertical: 12,
                                    backgroundColor: '#f3f4f6',
                                    borderRadius: 8,
                                    alignItems: 'center'
                                }}
                            >
                                <Text style={{ color: '#6b7280', fontWeight: '600' }}>Scan Another</Text>
                            </TouchableOpacity>

                            {!assignmentResult?.success && (
                                <TouchableOpacity
                                    onPress={assignLocation}
                                    disabled={assigning || !currentLocation}
                                    style={{
                                        flex: 1,
                                        paddingVertical: 12,
                                        backgroundColor: assigning || !currentLocation ? '#fdba74' : '#f97316',
                                        borderRadius: 8,
                                        alignItems: 'center',
                                        flexDirection: 'row',
                                        justifyContent: 'center'
                                    }}
                                >
                                    {assigning ? (
                                        <ActivityIndicator size="small" color="white" />
                                    ) : (
                                        <>
                                            <MapPin size={18} color="white" />
                                            <Text style={{ color: 'white', fontWeight: '600', marginLeft: 6 }}>
                                                Assign Location
                                            </Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                ) : (
                    /* Scan Asset Button */
                    <TouchableOpacity
                        onPress={openScanner}
                        style={{
                            backgroundColor: '#f97316',
                            borderRadius: 16,
                            padding: 24,
                            alignItems: 'center',
                            shadowColor: '#f97316',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.3,
                            shadowRadius: 8,
                            elevation: 4
                        }}
                    >
                        <View style={{
                            backgroundColor: 'rgba(255,255,255,0.2)',
                            padding: 16,
                            borderRadius: 50,
                            marginBottom: 12
                        }}>
                            <Scan size={40} color="white" />
                        </View>
                        <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>
                            Scan Asset QR Code
                        </Text>
                        <Text style={{ color: 'rgba(255,255,255,0.8)', marginTop: 4, textAlign: 'center' }}>
                            Scan any asset to assign your current location
                        </Text>
                    </TouchableOpacity>
                )}

                {/* Instructions */}
                <View style={{
                    backgroundColor: '#eff6ff',
                    borderRadius: 12,
                    padding: 16,
                    marginTop: 16,
                    borderWidth: 1,
                    borderColor: '#bfdbfe'
                }}>
                    <Text style={{ color: '#1e40af', fontWeight: '600', marginBottom: 8 }}>
                        How it works:
                    </Text>
                    <Text style={{ color: '#3b82f6', lineHeight: 20 }}>
                        1. Stand at the asset's location{'\n'}
                        2. Scan the asset's QR code{'\n'}
                        3. Your current GPS coordinates will be saved{'\n'}
                        4. This location will be used for future verifications
                    </Text>
                </View>
            </ScrollView>

            {/* QR Scanner Modal */}
            <Modal
                visible={scannerVisible}
                animationType="slide"
                presentationStyle="fullScreen"
                onRequestClose={() => setScannerVisible(false)}
            >
                <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
                    <View style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: 16,
                        backgroundColor: 'rgba(0,0,0,0.8)'
                    }}>
                        <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>Scan Asset QR Code</Text>
                        <TouchableOpacity onPress={() => setScannerVisible(false)}>
                            <X size={24} color="white" />
                        </TouchableOpacity>
                    </View>
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        {!scanned ? (
                            <>
                                <CameraView
                                    style={{ width: 300, height: 300, borderRadius: 20, overflow: 'hidden' }}
                                    facing="back"
                                    barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                                    onBarcodeScanned={handleQRScanned}
                                />
                                <Text style={{ color: 'white', marginTop: 20, textAlign: 'center', paddingHorizontal: 20 }}>
                                    Point your camera at the asset's QR code
                                </Text>
                            </>
                        ) : (
                            <View style={{ alignItems: 'center' }}>
                                <ActivityIndicator size="large" color="#f97316" />
                                <Text style={{ color: 'white', marginTop: 16 }}>Processing...</Text>
                            </View>
                        )}
                    </View>
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
}
