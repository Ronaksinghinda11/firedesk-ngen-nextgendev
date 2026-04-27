import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    Platform,
    StatusBar,
    StyleSheet
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { serviceFormService, ServiceFormData, FormSection, FormQuestion, QuestionAnswer } from '../../services/serviceForm';
import { dashboardService, QRCodeData } from '../../services/dashboard';
import { geolocationService } from '../../services/api';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import {
    ArrowLeft,
    Camera,
    Check,
    Package,
    MapPin,
    Building2,
    Calendar,
    Clock,
    Play,
    X,
    Trash2,
    AlertCircle,
    ChevronDown,
    QrCode,
    Scan,
    ShieldCheck,
    RefreshCw
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { authService } from '../../services/auth';

export default function ServiceExecutionScreen() {
    const params = useLocalSearchParams();
    const id = params.id as string;
    const fromQRScan = params.fromQRScan === 'true';
    const scannedAssetId = params.scannedAssetId as string;
    const scannedPlantId = params.scannedPlantId as string;
    const requireQRVerification = params.requireQRVerification === 'true';
    const expectedAssetId = params.expectedAssetId as string;
    const router = useRouter();
    const [user, setUser] = useState<any>(null);

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [starting, setStarting] = useState(false);
    const [serviceData, setServiceData] = useState<ServiceFormData['service'] | null>(null);
    const [formData, setFormData] = useState<ServiceFormData['form'] | null>(null);
    const [answers, setAnswers] = useState<Record<string, QuestionAnswer>>({});
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [isBeforeDueDate, setIsBeforeDueDate] = useState(false);
    const [isReadOnly, setIsReadOnly] = useState(false);

    // For condition select modal
    const [conditionModalVisible, setConditionModalVisible] = useState(false);
    const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
    const [activeConditions, setActiveConditions] = useState<FormQuestion['conditions']>([]);

    // For date picker
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [datePickerQuestionId, setDatePickerQuestionId] = useState<string | null>(null);

    // QR Verification states
    const [qrVerified, setQrVerified] = useState(false);
    const [pendingRedoAfterQR, setPendingRedoAfterQR] = useState(false);
    const [qrScannerVisible, setQrScannerVisible] = useState(false);
    const [qrScanning, setQrScanning] = useState(false);
    const [qrScanned, setQrScanned] = useState(false);
    const [permission, requestPermission] = useCameraPermissions();
    const [qrVerificationShown, setQrVerificationShown] = useState(false);
    const [locationLoading, setLocationLoading] = useState(false);

    // Haversine formula to calculate distance between two GPS coordinates in meters
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
        const R = 6371000; // Earth's radius in meters
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // Distance in meters
    };

    // Get current device location with high accuracy
    const getCurrentLocation = async (): Promise<{ lat: string; long: string } | null> => {
        try {
            // Request location permissions
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                console.log('[Location] Permission denied');
                return null;
            }

            // Get current position with high accuracy for 5m threshold
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Highest,
            });

            return {
                lat: location.coords.latitude.toString(),
                long: location.coords.longitude.toString()
            };
        } catch (error) {
            console.error('[Location] Error getting location:', error);
            return null;
        }
    };

    // Handle geolocation update and displacement detection
    const handleGeolocationUpdate = async (assetUUID: string) => {
        try {
            setLocationLoading(true);

            // Get current device location
            const currentLocation = await getCurrentLocation();
            if (!currentLocation) {
                console.log('[Geolocation] Could not get device location, skipping geolocation update');
                return;
            }

            console.log('[Geolocation] Current location:', currentLocation);

            // Update asset geolocation
            const response = await geolocationService.updateAssetGeolocation(
                assetUUID,
                currentLocation.lat,
                currentLocation.long,
                `Updated via QR scan by ${user?.name || 'Technician'}`
            );

            console.log('[Geolocation] Update response:', response);

            if (response.success) {
                const { isFirstCapture, previousLat, previousLong, assetId, assetName, plantId, buildingId, floorId } = response.data;

                if (isFirstCapture) {
                    // First time capture - show success toast
                    Alert.alert(
                        '📍 Location Captured',
                        `Asset location has been recorded for the first time.\n\nLat: ${currentLocation.lat}\nLong: ${currentLocation.long}`,
                        [{ text: 'OK' }]
                    );
                } else if (previousLat && previousLong) {
                    // Calculate distance from previous location
                    const distance = calculateDistance(
                        parseFloat(previousLat),
                        parseFloat(previousLong),
                        parseFloat(currentLocation.lat),
                        parseFloat(currentLocation.long)
                    );

                    console.log('[Geolocation] Distance from previous location:', distance, 'meters');

                    // If distance > 5 meters, create displacement incident
                    if (distance > 5) {
                        console.log('[Geolocation] Asset displaced! Creating incident...');

                        // Create displacement incident
                        try {
                            const incidentResponse = await geolocationService.createDisplacementIncident({
                                assetId: assetId,
                                assetName: assetName || assetId,
                                previousLat: previousLat,
                                previousLong: previousLong,
                                currentLat: currentLocation.lat,
                                currentLong: currentLocation.long,
                                distance: distance,
                                plantId: plantId,
                                buildingId: buildingId || undefined,
                                floorId: floorId || undefined,
                                technicianId: user?.id || '',
                                technicianName: user?.name || 'Unknown Technician'
                            });

                            if (incidentResponse.success) {
                                Alert.alert(
                                    '⚠️ Asset Displacement Detected',
                                    `This asset has moved ${distance.toFixed(1)} meters from its registered location.\n\n` +
                                    `An incident (${incidentResponse.data.incidentNumber}) has been automatically created and sent to the manager.\n\n` +
                                    `Severity: ${incidentResponse.data.severity}\n\n` +
                                    `You can still proceed with the service.`,
                                    [{ text: 'OK, Continue' }]
                                );
                            }
                        } catch (incidentError) {
                            console.error('[Geolocation] Error creating displacement incident:', incidentError);
                            // Show alert but don't block the service
                            Alert.alert(
                                '⚠️ Asset Displacement Detected',
                                `This asset has moved ${distance.toFixed(1)} meters from its registered location.\n\n` +
                                `Failed to create incident automatically. Please report this to your manager.\n\n` +
                                `You can still proceed with the service.`,
                                [{ text: 'OK, Continue' }]
                            );
                        }
                    }
                }
            }
        } catch (error) {
            console.error('[Geolocation] Error updating geolocation:', error);
            // Don't block the service if geolocation update fails
        } finally {
            setLocationLoading(false);
        }
    };

    // Handle closing QR scanner - if verification is required and not verified, go back
    const handleCloseQRScanner = () => {
        setQrScannerVisible(false);
        setQrScanned(false);

        // QR verification is mandatory - if user closes scanner without verifying, they must go back
        // Skip for completed/read-only services
        const isCompleted = ['COMPLETED', 'APPROVED', 'SUBMITTED', 'REJECTED'].includes(serviceData?.status?.toUpperCase() || '');
        if (!qrVerified && !isReadOnly && !isCompleted) {
            Alert.alert(
                'Verification Required',
                'QR code verification is mandatory to access this service. You must scan the asset QR code to proceed.',
                [
                    { text: 'Go Back', onPress: () => router.back() }
                ]
            );
        }
    };

    useEffect(() => {
        if (id) {
            loadForm();
        }
        // Load user data for geolocation updates
        const loadUser = async () => {
            try {
                const userData = await authService.getUser();
                setUser(userData);
            } catch (error) {
                console.error('Error loading user:', error);
            }
        };
        loadUser();
    }, [id]);

    // If coming from QR scan on asset services page, verify with backend
    useEffect(() => {
        const verifyFromDashboardScan = async () => {
            if (fromQRScan && scannedAssetId && serviceData && !qrVerified) {
                // Verify the scanned asset UUID matches this service's asset UUID
                if (serviceData.asset?.id === scannedAssetId) {
                    try {
                        // Verify with backend - this is the source of truth for QR verification
                        const response = await dashboardService.verifyServiceQR(id, {
                            asset_id: scannedAssetId,
                            plant_id: scannedPlantId || '',
                            category: ''
                        });

                        if (response.success && response.data.verified) {
                            setQrVerified(true);
                            console.log('[QR Verification] Verified from dashboard scan via backend');
                        } else {
                            // Backend rejected verification - force user to scan again
                            console.error('[QR Verification] Backend rejected verification');
                            Alert.alert(
                                'Verification Failed',
                                'QR verification failed. Please scan the asset QR code again.',
                                [{ text: 'OK' }]
                            );
                        }
                    } catch (error) {
                        console.error('[QR Verification] Failed to verify with backend:', error);
                        // Security: Do NOT bypass backend verification on error
                        // Force user to scan QR again for security
                        Alert.alert(
                            'Verification Error',
                            'Could not verify QR code with server. Please try scanning again.',
                            [{ text: 'OK' }]
                        );
                    }
                } else {
                    // Asset UUID mismatch - this is a security concern
                    console.error('[QR Verification] Asset UUID mismatch - scanned:', scannedAssetId, 'expected:', serviceData.asset?.id);
                    Alert.alert(
                        'Wrong Asset',
                        'The scanned QR code does not match this service\'s asset. Please navigate to the correct asset.',
                        [{ text: 'Go Back', onPress: () => router.back() }]
                    );
                }
            }
        };

        verifyFromDashboardScan();
    }, [fromQRScan, scannedAssetId, serviceData, qrVerified]);

    // Auto-open QR scanner for ALL services that are not read-only (completed)
    // QR verification is MANDATORY - no service form can be accessed without it
    useEffect(() => {
        const openQRScanner = async () => {
            // Skip QR verification only for read-only (completed) services
            const isCompleted = ['COMPLETED', 'APPROVED', 'SUBMITTED', 'REJECTED'].includes(serviceData?.status?.toUpperCase() || '');
            if (isReadOnly || isCompleted) {
                setQrVerified(true); // Auto-verify for viewing completed services
                return;
            }

            // For all other services, QR verification is mandatory
            if (!qrVerified && !qrVerificationShown && serviceData && !loading) {
                setQrVerificationShown(true);

                // Request camera permission if not granted
                if (!permission?.granted) {
                    const result = await requestPermission();
                    if (!result.granted) {
                        Alert.alert(
                            'Camera Permission Required',
                            'Camera access is required to verify your location at the asset. Please enable camera permissions in your device settings.',
                            [{ text: 'Go Back', onPress: () => router.back() }]
                        );
                        return;
                    }
                }

                // Open QR scanner automatically
                setQrScanned(false);
                setQrScannerVisible(true);
            }
        };

        openQRScanner();
    }, [qrVerified, qrVerificationShown, serviceData, loading, permission, isReadOnly]);

    const loadForm = async () => {
        try {
            setLoading(true);
            const response = await serviceFormService.getServiceForm(id!);

            if (response.success && response.data) {
                setServiceData(response.data.service);
                setFormData(response.data.form);
                setIsReadOnly(response.data.isReadOnly || false);

                // Check if before due date
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const scheduledDate = new Date(response.data.service.scheduledDate);
                scheduledDate.setHours(0, 0, 0, 0);
                setIsBeforeDueDate(today < scheduledDate);

                // IMPORTANT: Do NOT auto-verify from backend data
                // QR verification must be done fresh each time a technician opens a service
                // The backend qrVerified flag is only used for audit/tracking purposes
                // Only skip QR verification for read-only (completed) services
                // qrVerified state remains false until user scans QR in this session

                // Pre-populate answers if they exist (for read-only view or redo after rejection)
                if (response.data.form.sections) {
                    const existingAnswers: Record<string, QuestionAnswer> = {};
                    response.data.form.sections.forEach(section => {
                        section.questions.forEach(question => {
                            if (question.answer) {
                                existingAnswers[question.id] = {
                                    formQuestionId: question.id,
                                    answerValue: question.answer.answerValue,
                                    notes: question.answer.notes,
                                    photoBase64: question.answer.photoBase64
                                };
                            }
                        });
                    });
                    setAnswers(existingAnswers);
                }
            } else {
                Alert.alert('Error', 'Failed to load service form');
                router.back();
            }
        } catch (error: any) {
            console.error('Error loading form:', error);
            Alert.alert('Error', error.response?.data?.message || 'Failed to load service form');
            router.back();
        } finally {
            setLoading(false);
        }
    };

    const parseQRCode = (data: string): QRCodeData | null => {
        console.log('[Service QR Parse] Input data:', data);

        // Method 1: Try to parse as JSON directly
        try {
            const parsed = JSON.parse(data);
            if (parsed.asset_id) {
                console.log('[Service QR Parse] Extracted asset_id from JSON:', parsed.asset_id);
                return {
                    asset_id: parsed.asset_id,
                    plant_id: parsed.plant_id || '',
                    category: parsed.category || ''
                };
            }
        } catch (e) {
            console.log('[Service QR Parse] Not valid JSON, trying other methods...');
        }

        // Method 2: Try to find JSON embedded in the string
        const jsonMatch = data.match(/\{[^}]*"asset_id"\s*:\s*"([^"]+)"[^}]*\}/);
        if (jsonMatch) {
            try {
                const parsed = JSON.parse(jsonMatch[0]);
                if (parsed.asset_id) {
                    console.log('[Service QR Parse] Extracted asset_id from embedded JSON:', parsed.asset_id);
                    return {
                        asset_id: parsed.asset_id,
                        plant_id: parsed.plant_id || '',
                        category: parsed.category || ''
                    };
                }
            } catch (e) {
                // Extract using regex
                const assetIdMatch = data.match(/"asset_id"\s*:\s*"([^"]+)"/);
                if (assetIdMatch && assetIdMatch[1]) {
                    console.log('[Service QR Parse] Extracted asset_id via regex:', assetIdMatch[1]);
                    return { asset_id: assetIdMatch[1], plant_id: '', category: '' };
                }
            }
        }

        // Method 3: Direct regex extraction for asset_id
        const assetIdRegex = /"asset_id"\s*:\s*"([^"]+)"/;
        const match = data.match(assetIdRegex);
        if (match && match[1]) {
            console.log('[Service QR Parse] Extracted asset_id via direct regex:', match[1]);
            return { asset_id: match[1], plant_id: '', category: '' };
        }

        // Method 4: If it looks like a UUID (with or without dashes)
        const uuidMatch = data.match(/^[0-9a-fA-F]{8}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{12}$/);
        if (uuidMatch) {
            console.log('[Service QR Parse] Detected UUID format:', data);
            return { asset_id: data.trim(), plant_id: '', category: '' };
        }

        console.log('[Service QR Parse] Could not extract asset_id from QR data');
        return null;
    };

    const handleQRScanned = async ({ data }: { data: string }) => {
        if (qrScanned || qrScanning) return;

        setQrScanned(true);
        setQrScanning(true);

        console.log('[Service QR Scan] Raw QR data:', data);

        try {
            const qrData = parseQRCode(data);
            console.log('[Service QR Scan] Parsed QR data:', qrData);

            if (!qrData) {
                Alert.alert(
                    'Invalid QR Code',
                    `Could not extract asset_id from this QR code.\n\nExpected format:\n{"asset_id":"<uuid>",...}`,
                    [
                        { text: 'Try Again', onPress: () => { setQrScanned(false); setQrScanning(false); } },
                        { text: 'Go Back', onPress: () => router.back(), style: 'cancel' }
                    ]
                );
                return;
            }

            // Verify scanned asset_id (UUID) matches the service's asset UUID
            const expectedAssetUUID = serviceData?.asset?.id;
            const expectedAssetCode = serviceData?.asset?.asset_code;
            console.log('[Service QR Scan] Comparing scanned UUID:', qrData.asset_id, 'vs expected UUID:', expectedAssetUUID);

            if (qrData.asset_id === expectedAssetUUID) {
                // Asset ID matches - verify with backend
                const response = await dashboardService.verifyServiceQR(id, qrData);

                if (response.success && response.data.verified) {
                    setQrVerified(true);
                    setQrScannerVisible(false);

                    // Get asset UUID for geolocation update
                    const assetUUID = serviceData?.asset?.id;
                    console.log('[Geolocation] Service data asset:', serviceData?.asset);
                    console.log('[Geolocation] Asset UUID for geolocation:', assetUUID);

                    if (assetUUID) {
                        // Update geolocation in background (don't block the verification)
                        console.log('[Geolocation] Starting geolocation update for asset:', assetUUID);
                        handleGeolocationUpdate(assetUUID);
                    } else {
                        console.log('[Geolocation] No asset UUID available, skipping geolocation update');
                    }

                    Alert.alert('✅ Verified', `Asset ${expectedAssetCode || qrData.asset_id} verified successfully.\n\nYou can now continue with the service.`);

                    // If this was triggered by Redo Service, start the service now
                    if (pendingRedoAfterQR) {
                        setPendingRedoAfterQR(false);
                        try {
                            setStarting(true);
                            await serviceFormService.startService(id);
                            Alert.alert('Success', 'Service restarted. You can now update and re-submit.');
                            await loadForm();
                        } catch (redoError: any) {
                            Alert.alert('Error', redoError.response?.data?.message || 'Failed to restart service');
                        } finally {
                            setStarting(false);
                        }
                    }
                } else {
                    Alert.alert('Error', 'Failed to verify with server. Please try again.', [
                        { text: 'Try Again', onPress: () => { setQrScanned(false); setQrScanning(false); } }
                    ]);
                }
            } else {
                // Asset ID doesn't match - go back to dashboard
                setQrScannerVisible(false);
                Alert.alert(
                    '❌ Wrong Asset',
                    `Scanned UUID: ${qrData.asset_id}\nExpected UUID: ${expectedAssetUUID}\n\nYou are not at the correct asset. Please go to the correct asset location.`,
                    [{ text: 'OK', onPress: () => router.replace('/(tabs)/dashboard') }]
                );
            }
        } catch (error: any) {
            console.error('[Service QR Scan] Error:', error);
            Alert.alert('Error', error.response?.data?.message || 'Failed to verify QR code', [
                { text: 'OK', onPress: () => { setQrScanned(false); setQrScanning(false); } }
            ]);
        } finally {
            setQrScanning(false);
        }
    };

    const handleStartService = async () => {
        if (!id) return;

        // QR verification is MANDATORY before starting any service
        if (!qrVerified) {
            // Request camera permission if not granted
            if (!permission?.granted) {
                const result = await requestPermission();
                if (!result.granted) {
                    Alert.alert(
                        'Camera Permission Required',
                        'You must scan the asset QR code to start this service. Please enable camera permissions in your device settings.',
                        [{ text: 'OK' }]
                    );
                    return;
                }
            }
            setQrScanned(false);
            setQrScannerVisible(true);
            return;
        }

        try {
            setStarting(true);
            await serviceFormService.startService(id);
            Alert.alert('Success', 'Service started successfully');
            await loadForm();
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to start service');
        } finally {
            setStarting(false);
        }
    };

    const handleRedoService = async () => {
        if (!id) return;

        // QR verification is MANDATORY before redoing a service
        // Reset qrVerified since it was auto-set for the read-only view
        setQrVerified(false);
        setPendingRedoAfterQR(true);

        // Request camera permission if not granted
        if (!permission?.granted) {
            const result = await requestPermission();
            if (!result.granted) {
                Alert.alert(
                    'Camera Permission Required',
                    'You must scan the asset QR code to redo this service. Please enable camera permissions in your device settings.',
                    [{ text: 'OK' }]
                );
                setPendingRedoAfterQR(false);
                return;
            }
        }
        setQrScanned(false);
        setQrScannerVisible(true);
    };

    const handleAnswerChange = (
        questionId: string,
        field: keyof QuestionAnswer,
        value: any
    ) => {
        setAnswers(prev => ({
            ...prev,
            [questionId]: {
                ...prev[questionId],
                formQuestionId: questionId,
                [field]: value,
            },
        }));
        // Clear validation errors when user makes changes
        setValidationErrors([]);
    };

    const handlePhotoCapture = async (questionId: string) => {
        try {
            // Request camera permissions
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Camera permission is required to take photos');
                return;
            }

            const result = await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.7,
                base64: true,
            });

            if (!result.canceled && result.assets[0].base64) {
                const base64String = `data:image/jpeg;base64,${result.assets[0].base64}`;
                handleAnswerChange(questionId, 'photoBase64', base64String);
            }
        } catch (error) {
            console.error('Error capturing photo:', error);
            Alert.alert('Error', 'Failed to capture photo');
        }
    };

    const handleRemovePhoto = (questionId: string) => {
        setAnswers(prev => {
            const updated = { ...prev };
            if (updated[questionId]) {
                delete updated[questionId].photoBase64;
            }
            return updated;
        });
    };

    const openConditionModal = (questionId: string, conditions: FormQuestion['conditions']) => {
        setActiveQuestionId(questionId);
        setActiveConditions(conditions || []);
        setConditionModalVisible(true);
    };

    const selectCondition = (conditionId: string) => {
        if (activeQuestionId) {
            handleAnswerChange(activeQuestionId, 'answerValue', conditionId);
        }
        setConditionModalVisible(false);
        setActiveQuestionId(null);
    };

    const openDatePicker = (questionId: string) => {
        setDatePickerQuestionId(questionId);
        setShowDatePicker(true);
    };

    const handleDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (selectedDate && datePickerQuestionId) {
            const dateString = selectedDate.toISOString().split('T')[0];
            handleAnswerChange(datePickerQuestionId, 'answerValue', dateString);
        }
        if (Platform.OS === 'android') {
            setDatePickerQuestionId(null);
        }
    };

    const validateForm = (): boolean => {
        if (!formData) return false;

        const errors: string[] = [];

        formData.sections.forEach(section => {
            section.questions.forEach(question => {
                if (question.isMandatory) {
                    const answer = answers[question.id];

                    if (!answer || !answer.answerValue) {
                        errors.push(`"${question.questionText}" is required`);
                    }

                    if (question.requiresPhoto && (!answer || !answer.photoBase64)) {
                        errors.push(`Photo is required for "${question.questionText}"`);
                    }

                    if (question.requiresNotes && (!answer || !answer.notes || answer.notes.trim() === '')) {
                        errors.push(`Notes are required for "${question.questionText}"`);
                    }
                }
            });
        });

        setValidationErrors(errors);
        return errors.length === 0;
    };

    const handleSubmit = async () => {
        if (isBeforeDueDate) {
            Alert.alert('Cannot Submit', 'This service is not yet due. You can only submit on or after the scheduled date.');
            return;
        }

        if (!validateForm()) {
            Alert.alert('Validation Error', 'Please fill in all required fields');
            return;
        }

        setSubmitting(true);
        try {
            const answersArray = Object.values(answers);
            await serviceFormService.submitServiceForm(id!, answersArray);
            Alert.alert('Success', 'Service form submitted successfully', [
                { text: 'OK', onPress: () => router.replace('/(tabs)/dashboard') }
            ]);
        } catch (error: any) {
            console.error('Error submitting form:', error);
            Alert.alert('Error', error.response?.data?.message || 'Failed to submit form');
        } finally {
            setSubmitting(false);
        }
    };

    const renderReadOnlyView = () => {
        if (!serviceData || !formData) return null;

        const totalQuestions = formData.sections.reduce((acc, section) => acc + section.questions.length, 0);
        const withPhotos = formData.sections.reduce((acc, section) =>
            acc + section.questions.filter(q => q.answer?.photoBase64).length, 0);
        const withNotes = formData.sections.reduce((acc, section) =>
            acc + section.questions.filter(q => q.answer?.notes).length, 0);

        const formatDate = (dateStr?: string) => {
            if (!dateStr) return 'N/A';
            const date = new Date(dateStr);
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        };

        const getAnswerDisplay = (question: FormQuestion) => {
            const answer = question.answer;
            if (!answer) return '-';

            // If condition ID, find condition name
            if (question.conditions && answer.answerValue && answer.answerValue.length > 10) {
                const cond = question.conditions.find(c => c.id === answer.answerValue);
                return cond ? cond.conditionName : 'Non-Compliant';
            }

            if (answer.answerValue === 'true') return 'Yes - Compliant';
            if (answer.answerValue === 'false') return 'No - Non-Compliant';
            if (answer.answerValue === 'NA') return 'N/A';
            return answer.answerValue;
        };

        return (
            <ScrollView style={{ flex: 1, backgroundColor: '#f9fafb' }} contentContainerStyle={{ paddingBottom: 40 }}>
                {/* 1. Orange Header */}
                <View style={{ backgroundColor: '#f97316', padding: 20, paddingBottom: 30 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                        <Text style={{ color: 'white', fontSize: 22, fontWeight: 'bold', flex: 1 }}>
                            {formData.serviceName}
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 12, textTransform: 'uppercase' }}>
                                    {serviceData.status}
                                </Text>
                            </View>
                        </View>
                    </View>

                    <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, marginBottom: 20 }}>
                        Submission #{serviceData.submissionNumber}
                    </Text>

                    {/* Info Grid */}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                        {/* Asset ID */}
                        <View style={{ width: '48%', backgroundColor: 'rgba(255,255,255,0.15)', padding: 12, borderRadius: 8 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                                <Package size={14} color="rgba(255,255,255,0.7)" />
                                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, marginLeft: 6, fontWeight: 'bold' }}>ASSET ID</Text>
                            </View>
                            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 14 }}>{serviceData.asset?.asset_code}</Text>
                        </View>

                        {/* Location */}
                        <View style={{ width: '48%', backgroundColor: 'rgba(255,255,255,0.15)', padding: 12, borderRadius: 8 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                                <MapPin size={14} color="rgba(255,255,255,0.7)" />
                                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, marginLeft: 6, fontWeight: 'bold' }}>LOCATION</Text>
                            </View>
                            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 14 }} numberOfLines={1}>{serviceData.asset?.location || 'N/A'}</Text>
                        </View>

                        {/* Building */}
                        <View style={{ width: '48%', backgroundColor: 'rgba(255,255,255,0.15)', padding: 12, borderRadius: 8 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                                <Building2 size={14} color="rgba(255,255,255,0.7)" />
                                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, marginLeft: 6, fontWeight: 'bold' }}>BUILDING</Text>
                            </View>
                            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 14 }} numberOfLines={1}>{serviceData.asset?.building || 'N/A'}</Text>
                        </View>

                        {/* Scheduled */}
                        <View style={{ width: '48%', backgroundColor: 'rgba(255,255,255,0.15)', padding: 12, borderRadius: 8 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                                <Calendar size={14} color="rgba(255,255,255,0.7)" />
                                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, marginLeft: 6, fontWeight: 'bold' }}>SCHEDULED</Text>
                            </View>
                            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 14 }}>{new Date(serviceData.scheduledDate).toLocaleDateString()}</Text>
                        </View>
                    </View>

                    {/* Timestamp Footer in Header */}
                    <View style={{ flexDirection: 'row', marginTop: 15, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)', paddingTop: 15 }}>
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10 }}>Submitted</Text>
                            <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>{formatDate(serviceData.submittedAt)}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10 }}>Reviewed</Text>
                            <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>{formatDate(serviceData.approvedAt || serviceData.completedAt)}</Text>
                        </View>
                    </View>
                </View>

                {/* 2. Service Completed Banner */}
                {serviceData.status === 'COMPLETED' && (
                    <View style={{
                        marginHorizontal: 16,
                        marginTop: 16,
                        marginBottom: 16,
                        backgroundColor: '#dcfce7',
                        borderRadius: 12,
                        padding: 16,
                        flexDirection: 'row',
                        alignItems: 'center',
                        borderWidth: 1,
                        borderColor: '#86efac'
                    }}>
                        <View style={{ backgroundColor: '#16a34a', borderRadius: 20, padding: 4, marginRight: 12 }}>
                            <Check size={16} color="white" strokeWidth={3} />
                        </View>
                        <View>
                            <Text style={{ color: '#14532d', fontSize: 16, fontWeight: 'bold' }}>Service Completed</Text>
                            <Text style={{ color: '#166534', fontSize: 13 }}>
                                Completed on {serviceData.completedAt ? new Date(serviceData.completedAt).toLocaleDateString() : 'Unknown Date'}
                            </Text>
                        </View>
                    </View>
                )}

                {/* Approval Remarks if any */}
                {(serviceData.approvalRemarks || serviceData.status?.toUpperCase() === 'REJECTED') && (
                    <View style={{ margin: 16, marginTop: 16, backgroundColor: serviceData.status?.toUpperCase() === 'REJECTED' ? '#fef2f2' : '#f0fdf4', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: serviceData.status?.toUpperCase() === 'REJECTED' ? '#fee2e2' : '#dcfce7' }}>
                        <Text style={{ fontWeight: 'bold', color: serviceData.status?.toUpperCase() === 'REJECTED' ? '#dc2626' : '#16a34a', marginBottom: 4 }}>
                            {serviceData.status?.toUpperCase() === 'REJECTED' ? 'Rejection Reason' : 'Manager Comments'}
                        </Text>
                        <Text style={{ color: '#374151' }}>
                            {serviceData.approvalRemarks || 'No comments provided.'}
                        </Text>
                    </View>
                )}

                {/* 3. Submitted Form Table */}
                <View style={{ marginTop: 20 }}>
                    <Text style={{ paddingHorizontal: 20, fontSize: 18, fontWeight: 'bold', color: '#1f2937', marginBottom: 10 }}>Submitted Form</Text>

                    {formData.sections.map((section, sIndex) => (
                        <View key={section.id} style={{ marginBottom: 20 }}>
                            <View style={{ backgroundColor: '#fff7ed', paddingVertical: 10, paddingHorizontal: 20, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#ffedd5' }}>
                                <Text style={{ color: '#c2410c', fontWeight: 'bold', fontSize: 14 }}>{section.sectionName}</Text>
                            </View>

                            {section.questions.map((question, qIndex) => (
                                <View key={question.id} style={{ backgroundColor: 'white', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                                        <Text style={{ color: '#9ca3af', fontWeight: '500', marginRight: 10, width: 24 }}>{sIndex + 1}.{qIndex + 1}</Text>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ color: '#1f2937', fontWeight: '600', marginBottom: 8 }}>{question.questionText}</Text>

                                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 20 }}>
                                                <View style={{ flex: 1, minWidth: 120 }}>
                                                    <Text style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2, textTransform: 'uppercase' }}>Answer</Text>
                                                    <Text style={{ color: '#374151', fontWeight: '500' }}>{getAnswerDisplay(question)}</Text>
                                                </View>

                                                <View style={{ flex: 1, minWidth: 120 }}>
                                                    <Text style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2, textTransform: 'uppercase' }}>Notes</Text>
                                                    <Text style={{ color: '#6b7280', fontSize: 13, fontStyle: question.answer?.notes ? 'normal' : 'italic' }}>
                                                        {question.answer?.notes || 'No notes'}
                                                    </Text>
                                                </View>

                                                <View style={{ flex: 1, minWidth: 100 }}>
                                                    <Text style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2, textTransform: 'uppercase' }}>Photo</Text>
                                                    {question.answer?.photoBase64 ? (
                                                        <TouchableOpacity
                                                            onPress={() => {
                                                                if (question.answer?.photoBase64) {
                                                                    // Ideally show full image modal
                                                                }
                                                            }}
                                                        >
                                                            <Image
                                                                source={{ uri: question.answer.photoBase64 }}
                                                                style={{ width: 40, height: 40, borderRadius: 4, backgroundColor: '#f3f4f6' }}
                                                            />
                                                        </TouchableOpacity>
                                                    ) : (
                                                        <Text style={{ color: '#9ca3af', fontSize: 13, fontStyle: 'italic' }}>No photo</Text>
                                                    )}
                                                </View>
                                            </View>
                                        </View>
                                    </View>
                                </View>
                            ))}
                        </View>
                    ))}
                </View>

                {/* Redo Service Button for rejected services */}
                {serviceData.status?.toUpperCase() === 'REJECTED' && (
                    <View style={{ marginHorizontal: 16, marginTop: 24, marginBottom: 8 }}>
                        <TouchableOpacity
                            onPress={handleRedoService}
                            disabled={starting}
                            style={{
                                backgroundColor: '#f97316',
                                borderRadius: 12,
                                paddingVertical: 16,
                                flexDirection: 'row',
                                justifyContent: 'center',
                                alignItems: 'center',
                                opacity: starting ? 0.7 : 1,
                                shadowColor: '#f97316',
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.3,
                                shadowRadius: 8,
                                elevation: 4,
                            }}
                        >
                            {starting ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <>
                                    <RefreshCw size={20} color="white" style={{ marginRight: 8 }} />
                                    <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>Redo Service</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>
        );
    };

    const getStatusBadge = (status: string) => {
        const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
            PENDING: { bg: '#fef3c7', text: '#d97706', label: 'Pending' },
            IN_PROGRESS: { bg: '#dbeafe', text: '#2563eb', label: 'In Progress' },
            SUBMITTED: { bg: '#f3e8ff', text: '#9333ea', label: 'Submitted' },
            COMPLETED: { bg: '#dcfce7', text: '#16a34a', label: 'Completed' },
            REJECTED: { bg: '#fee2e2', text: '#dc2626', label: 'Rejected' },
        };

        const config = statusConfig[status] || { bg: '#f3f4f6', text: '#6b7280', label: status };
        return (
            <View style={{ backgroundColor: config.bg, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
                <Text style={{ color: config.text, fontSize: 11, fontWeight: '600' }}>{config.label}</Text>
            </View>
        );
    };


    const getConditionName = (questionId: string, conditions: FormQuestion['conditions']) => {
        const answer = answers[questionId]?.answerValue;
        if (!answer || !conditions) return 'Select condition';
        const condition = conditions.find(c => c.id === answer);
        return condition ? `${condition.conditionName} (${condition.severityLevel})` : 'Select condition';
    };

    const renderAnswerInput = (question: FormQuestion) => {
        const answer = answers[question.id];

        switch (question.answerType) {
            case 'CONDITION_SELECT':
            case 'TEXT':
            case 'BOOLEAN':
            default:
                const isSatisfactory = answer?.answerValue === 'true';
                const isUnsatisfactory = answer?.answerValue === 'false' || (answer?.answerValue && answer.answerValue.length > 10 && answer.answerValue !== 'NA');
                const isNA = answer?.answerValue === 'NA';

                // Get selected condition name if specific condition is chosen
                let selectedConditionName = '';
                if (answer?.answerValue && answer.answerValue.length > 10 && answer.answerValue !== 'NA') {
                    const cond = question.conditions?.find(c => c.id === answer.answerValue);
                    if (cond) selectedConditionName = cond.conditionName;
                }

                return (
                    <View>
                        <View style={{ flexDirection: 'row', gap: 8, marginBottom: isUnsatisfactory ? 12 : 0 }}>
                            <TouchableOpacity
                                onPress={() => handleAnswerChange(question.id, 'answerValue', 'true')}
                                style={{
                                    flex: 1,
                                    padding: 12,
                                    borderRadius: 8,
                                    borderWidth: 1,
                                    backgroundColor: isSatisfactory ? '#dcfce7' : '#ffffff',
                                    borderColor: isSatisfactory ? '#16a34a' : '#e5e7eb',
                                    alignItems: 'center'
                                }}
                                disabled={isBeforeDueDate}
                            >
                                <Text style={{
                                    fontWeight: '600',
                                    color: isSatisfactory ? '#16a34a' : '#6b7280',
                                    fontSize: 13
                                }}>Yes</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => {
                                    if (question.conditions && question.conditions.length > 0) {
                                        openConditionModal(question.id, question.conditions);
                                    } else {
                                        handleAnswerChange(question.id, 'answerValue', 'false');
                                    }
                                }}
                                style={{
                                    flex: 1,
                                    padding: 12,
                                    borderRadius: 8,
                                    borderWidth: 1,
                                    backgroundColor: isUnsatisfactory ? '#fee2e2' : '#ffffff',
                                    borderColor: isUnsatisfactory ? '#dc2626' : '#e5e7eb',
                                    alignItems: 'center'
                                }}
                                disabled={isBeforeDueDate}
                            >
                                <Text style={{
                                    fontWeight: '600',
                                    color: isUnsatisfactory ? '#dc2626' : '#6b7280',
                                    fontSize: 13
                                }}>No</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => handleAnswerChange(question.id, 'answerValue', 'NA')}
                                style={{
                                    flex: 0.8,
                                    padding: 12,
                                    borderRadius: 8,
                                    borderWidth: 1,
                                    backgroundColor: isNA ? '#f3f4f6' : '#ffffff',
                                    borderColor: isNA ? '#6b7280' : '#e5e7eb',
                                    alignItems: 'center'
                                }}
                                disabled={isBeforeDueDate}
                            >
                                <Text style={{
                                    fontWeight: '600',
                                    color: isNA ? '#374151' : '#6b7280',
                                    fontSize: 13
                                }}>N/A</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Show selected condition if Unsatisfactory/No */}
                        {isUnsatisfactory && selectedConditionName && (
                            <TouchableOpacity
                                onPress={() => openConditionModal(question.id, question.conditions)}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    padding: 12,
                                    backgroundColor: '#fee2e2',
                                    borderRadius: 8,
                                    borderWidth: 1,
                                    borderColor: '#dc2626'
                                }}
                            >
                                <Text style={{ flex: 1, color: '#b91c1c', fontWeight: '500' }}>
                                    Issue: {selectedConditionName}
                                </Text>
                                <ChevronDown size={16} color="#b91c1c" />
                            </TouchableOpacity>
                        )}
                        {isUnsatisfactory && !selectedConditionName && question.conditions && question.conditions.length > 0 && (
                            <TouchableOpacity
                                onPress={() => openConditionModal(question.id, question.conditions)}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    padding: 12,
                                    backgroundColor: '#fee2e2',
                                    borderRadius: 8,
                                    borderWidth: 1,
                                    borderColor: '#dc2626',
                                    borderStyle: 'dashed'
                                }}
                            >
                                <Text style={{ flex: 1, color: '#b91c1c', fontWeight: '500' }}>
                                    Select Issue...
                                </Text>
                                <ChevronDown size={16} color="#b91c1c" />
                            </TouchableOpacity>
                        )}
                    </View>
                );

            case 'NUMBER':
                return (
                    <TextInput
                        style={{
                            backgroundColor: '#ffffff',
                            color: '#1f2937',
                            padding: 14,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: '#e5e7eb',
                            fontSize: 15
                        }}
                        placeholder="Enter number"
                        placeholderTextColor="#9ca3af"
                        keyboardType="numeric"
                        value={answer?.answerValue || ''}
                        onChangeText={(text) => handleAnswerChange(question.id, 'answerValue', text)}
                        editable={!isBeforeDueDate}
                    />
                );

            // BOOLEAN handled above

            case 'DATE':
                return (
                    <TouchableOpacity
                        onPress={() => openDatePicker(question.id)}
                        style={{
                            backgroundColor: '#ffffff',
                            padding: 14,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: '#e5e7eb',
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}
                        disabled={isBeforeDueDate}
                    >
                        <Text style={{ color: answer?.answerValue ? '#1f2937' : '#9ca3af' }}>
                            {answer?.answerValue || 'Select date'}
                        </Text>
                        <Calendar size={20} color="#f97316" />
                    </TouchableOpacity>
                );

            case 'PHOTO':
                return (
                    <TouchableOpacity
                        onPress={() => handlePhotoCapture(question.id)}
                        style={{
                            backgroundColor: '#fff7ed',
                            padding: 20,
                            borderRadius: 12,
                            borderWidth: 2,
                            borderStyle: 'dashed',
                            borderColor: '#fdba74',
                            alignItems: 'center'
                        }}
                        disabled={isBeforeDueDate}
                    >
                        <Camera size={28} color="#f97316" />
                        <Text style={{ color: '#ea580c', marginTop: 8, fontWeight: '500' }}>Tap to capture photo</Text>
                    </TouchableOpacity>
                );

            // Default case handled by unified block above
        }
    };

    const renderQuestion = (question: FormQuestion, index: number, sectionIndex: number) => {
        const answer = answers[question.id];
        const slNo = `${sectionIndex + 1}.${index + 1}`;

        return (
            <View key={question.id} style={{
                marginBottom: 16,
                backgroundColor: '#ffffff',
                padding: 16,
                borderRadius: 16,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
                elevation: 2,
            }}>
                {/* Question Header */}
                <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                    <View style={{ backgroundColor: '#fff7ed', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginRight: 12 }}>
                        <Text style={{ color: '#ea580c', fontSize: 12, fontWeight: '700' }}>{slNo}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={{ color: '#1f2937', fontWeight: '600', fontSize: 15 }}>
                            {question.questionText}
                            {question.isMandatory && <Text style={{ color: '#dc2626' }}> *</Text>}
                        </Text>
                        {question.helpText && (
                            <Text style={{ color: '#9ca3af', fontSize: 12, marginTop: 4 }}>{question.helpText}</Text>
                        )}
                    </View>
                </View>

                {/* Answer Input */}
                <View style={{ marginBottom: 12 }}>
                    {renderAnswerInput(question)}
                </View>

                {/* Notes Field */}
                <View style={{ marginBottom: 12 }}>
                    <Text style={{ color: '#6b7280', fontSize: 12, marginBottom: 6, fontWeight: '500' }}>
                        Notes {question.requiresNotes && <Text style={{ color: '#dc2626' }}>*</Text>}
                    </Text>
                    <TextInput
                        style={{
                            backgroundColor: '#f9fafb',
                            color: '#1f2937',
                            padding: 12,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: '#e5e7eb',
                            fontSize: 14,
                            minHeight: 60,
                            textAlignVertical: 'top'
                        }}
                        placeholder="Add notes..."
                        placeholderTextColor="#9ca3af"
                        multiline
                        numberOfLines={2}
                        value={answer?.notes || ''}
                        onChangeText={(text) => handleAnswerChange(question.id, 'notes', text)}
                        editable={!isBeforeDueDate}
                    />
                </View>

                {/* Photo Capture */}
                {(question.requiresPhoto || question.answerType === 'PHOTO') && (
                    <View>
                        <Text style={{ color: '#6b7280', fontSize: 12, marginBottom: 6, fontWeight: '500' }}>
                            Photo {question.requiresPhoto && <Text style={{ color: '#dc2626' }}>*</Text>}
                        </Text>
                        {!isBeforeDueDate && (
                            <TouchableOpacity
                                onPress={() => handlePhotoCapture(question.id)}
                                style={{
                                    backgroundColor: '#fff7ed',
                                    borderWidth: 1,
                                    borderColor: '#fdba74',
                                    padding: 14,
                                    borderRadius: 12,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <Camera size={18} color="#f97316" />
                                <Text style={{ color: '#ea580c', marginLeft: 8, fontWeight: '600' }}>Capture Photo</Text>
                            </TouchableOpacity>
                        )}

                        {answer?.photoBase64 && (
                            <View style={{ marginTop: 12, position: 'relative', alignSelf: 'flex-start' }}>
                                <Image
                                    source={{ uri: answer.photoBase64 }}
                                    style={{ width: 100, height: 100, borderRadius: 12 }}
                                    resizeMode="cover"
                                />
                                {!isBeforeDueDate && (
                                    <TouchableOpacity
                                        onPress={() => handleRemovePhoto(question.id)}
                                        style={{
                                            position: 'absolute',
                                            top: -8,
                                            right: -8,
                                            backgroundColor: '#dc2626',
                                            borderRadius: 12,
                                            padding: 4
                                        }}
                                    >
                                        <Trash2 size={14} color="white" />
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}
                    </View>
                )}
            </View>
        );
    };



    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: '#f9fafb', justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#f97316" />
                <Text style={{ color: '#6b7280', marginTop: 16 }}>Loading service form...</Text>
            </View>
        );
    }

    // Redirect for Read-Only View (Status Approved/Completed)
    const isCompleted = ['COMPLETED', 'APPROVED', 'SUBMITTED', 'REJECTED'].includes(serviceData?.status?.toUpperCase() || '');
    if (isReadOnly || isCompleted) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#f97316' }} edges={['top']}>
                <StatusBar barStyle="light-content" backgroundColor="#f97316" />

                {/* Custom Header for Read Only */}
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 }}>
                    <TouchableOpacity onPress={() => router.back()} style={{ padding: 8, marginRight: 8 }}>
                        <ArrowLeft color="white" size={24} />
                    </TouchableOpacity>
                    <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>Service Details</Text>
                </View>

                {renderReadOnlyView()}

                {/* QR Scanner Modal for Redo Service flow */}
                <Modal
                    visible={qrScannerVisible}
                    animationType="slide"
                    onRequestClose={() => {
                        setQrScannerVisible(false);
                        setPendingRedoAfterQR(false);
                        setQrScanned(false);
                    }}
                >
                    <SafeAreaView style={{ flex: 1, backgroundColor: '#000000' }}>
                        <View style={{ flex: 1, position: 'relative' }}>
                            <CameraView
                                style={StyleSheet.absoluteFillObject}
                                facing="back"
                                onBarcodeScanned={qrScanned ? undefined : handleQRScanned}
                                barcodeScannerSettings={{
                                    barcodeTypes: ["qr"],
                                }}
                            />

                            {/* Top Overlay */}
                            <View style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                paddingTop: 16,
                                paddingHorizontal: 20,
                                paddingBottom: 24,
                                backgroundColor: 'rgba(0,0,0,0.7)'
                            }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <ShieldCheck size={24} color="#f97316" />
                                        <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold', marginLeft: 8 }}>
                                            Verify Asset QR
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => {
                                            setQrScannerVisible(false);
                                            setPendingRedoAfterQR(false);
                                            setQrScanned(false);
                                        }}
                                        style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: 20 }}
                                    >
                                        <X size={24} color="white" />
                                    </TouchableOpacity>
                                </View>
                                <Text style={{ color: 'rgba(255,255,255,0.7)', marginTop: 8, fontSize: 13 }}>
                                    Scan the QR code on the asset to verify you're at the correct location
                                </Text>
                            </View>

                            {/* Center Frame */}
                            <View style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                justifyContent: 'center',
                                alignItems: 'center'
                            }}>
                                <View style={{
                                    width: 260,
                                    height: 260,
                                    borderWidth: 3,
                                    borderColor: '#f97316',
                                    borderRadius: 24,
                                    backgroundColor: 'transparent'
                                }}>
                                    <View style={{ position: 'absolute', top: -3, left: -3, width: 40, height: 40, borderTopWidth: 6, borderLeftWidth: 6, borderColor: '#f97316', borderTopLeftRadius: 24 }} />
                                    <View style={{ position: 'absolute', top: -3, right: -3, width: 40, height: 40, borderTopWidth: 6, borderRightWidth: 6, borderColor: '#f97316', borderTopRightRadius: 24 }} />
                                    <View style={{ position: 'absolute', bottom: -3, left: -3, width: 40, height: 40, borderBottomWidth: 6, borderLeftWidth: 6, borderColor: '#f97316', borderBottomLeftRadius: 24 }} />
                                    <View style={{ position: 'absolute', bottom: -3, right: -3, width: 40, height: 40, borderBottomWidth: 6, borderRightWidth: 6, borderColor: '#f97316', borderBottomRightRadius: 24 }} />
                                </View>
                            </View>

                            {/* Expected Asset Info */}
                            <View style={{
                                position: 'absolute',
                                bottom: 0,
                                left: 0,
                                right: 0,
                                padding: 24,
                                backgroundColor: 'rgba(0,0,0,0.8)',
                                borderTopLeftRadius: 24,
                                borderTopRightRadius: 24
                            }}>
                                <View style={{
                                    backgroundColor: 'rgba(249,115,22,0.2)',
                                    padding: 16,
                                    borderRadius: 16,
                                }}>
                                    <Text style={{ color: '#f97316', fontSize: 12, fontWeight: '600', marginBottom: 4 }}>
                                        EXPECTED ASSET
                                    </Text>
                                    <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>
                                        {serviceData?.asset?.asset_code || 'Unknown'}
                                    </Text>
                                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 4 }}>
                                        {serviceData?.asset?.location || ''} {serviceData?.asset?.building ? `• ${serviceData.asset.building}` : ''}
                                    </Text>
                                </View>
                            </View>

                            {/* Loading Overlay */}
                            {qrScanning && (
                                <View style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    backgroundColor: 'rgba(0,0,0,0.85)',
                                    justifyContent: 'center',
                                    alignItems: 'center'
                                }}>
                                    <View style={{
                                        backgroundColor: '#ffffff',
                                        padding: 32,
                                        borderRadius: 24,
                                        alignItems: 'center'
                                    }}>
                                        <ActivityIndicator size="large" color="#f97316" />
                                        <Text style={{ color: '#1f2937', marginTop: 16, fontWeight: 'bold' }}>
                                            Verifying...
                                        </Text>
                                    </View>
                                </View>
                            )}
                        </View>
                    </SafeAreaView>
                </Modal>
            </SafeAreaView>
        );
    }

    if (!serviceData || !formData) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
                <Text style={{ color: '#1f2937', fontSize: 18, marginBottom: 16 }}>Service form not found</Text>
                <TouchableOpacity
                    onPress={() => router.replace('/(tabs)/dashboard')}
                    style={{ backgroundColor: '#f97316', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}
                >
                    <Text style={{ color: 'white', fontWeight: 'bold' }}>Back to Dashboard</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    // Block access to form if QR verification is not completed (mandatory for all non-readonly services)
    if (!isReadOnly && !qrVerified && !qrScannerVisible) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
                <View style={{
                    backgroundColor: '#fff7ed',
                    padding: 24,
                    borderRadius: 20,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: '#fed7aa',
                    maxWidth: 320
                }}>
                    <View style={{
                        backgroundColor: '#f97316',
                        padding: 16,
                        borderRadius: 50,
                        marginBottom: 16
                    }}>
                        <QrCode size={32} color="white" />
                    </View>
                    <Text style={{ color: '#1f2937', fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 }}>
                        QR Verification Required
                    </Text>
                    <Text style={{ color: '#6b7280', fontSize: 14, textAlign: 'center', marginBottom: 24 }}>
                        You must scan the asset QR code to access this service form. This is mandatory for all services.
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        <TouchableOpacity
                            onPress={() => router.back()}
                            style={{
                                backgroundColor: '#ffffff',
                                paddingHorizontal: 20,
                                paddingVertical: 12,
                                borderRadius: 12,
                                borderWidth: 1,
                                borderColor: '#e5e7eb'
                            }}
                        >
                            <Text style={{ color: '#6b7280', fontWeight: '600' }}>Go Back</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={async () => {
                                // Request camera permission if not granted
                                if (!permission?.granted) {
                                    const result = await requestPermission();
                                    if (!result.granted) {
                                        Alert.alert(
                                            'Camera Permission Required',
                                            'You must scan the asset QR code to access this service. Please enable camera permissions in your device settings.',
                                            [{ text: 'OK' }]
                                        );
                                        return;
                                    }
                                }
                                setQrScanned(false);
                                setQrScannerVisible(true);
                            }}
                            style={{
                                backgroundColor: '#f97316',
                                paddingHorizontal: 20,
                                paddingVertical: 12,
                                borderRadius: 12
                            }}
                        >
                            <Text style={{ color: 'white', fontWeight: '600' }}>Scan QR Code</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* QR Scanner Modal - needed here too */}
                <Modal
                    visible={qrScannerVisible}
                    animationType="slide"
                    presentationStyle="fullScreen"
                    onRequestClose={handleCloseQRScanner}
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
                            <TouchableOpacity onPress={handleCloseQRScanner}>
                                <X size={24} color="white" />
                            </TouchableOpacity>
                        </View>
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                            {!qrScanned ? (
                                <>
                                    <CameraView
                                        style={{ width: 300, height: 300, borderRadius: 20, overflow: 'hidden' }}
                                        facing="back"
                                        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                                        onBarcodeScanned={qrScanned ? undefined : handleQRScanned}
                                    />
                                    <Text style={{ color: 'white', marginTop: 20, textAlign: 'center', paddingHorizontal: 20 }}>
                                        Point your camera at the asset's QR code to verify
                                    </Text>
                                </>
                            ) : (
                                <View style={{ alignItems: 'center' }}>
                                    <ActivityIndicator size="large" color="#f97316" />
                                    <Text style={{ color: 'white', marginTop: 16 }}>Verifying QR code...</Text>
                                </View>
                            )}
                        </View>
                    </SafeAreaView>
                </Modal>
            </SafeAreaView>
        );
    }

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
                    <Text style={{ color: '#1f2937', fontSize: 18, fontWeight: 'bold' }}>Service Form</Text>
                    <Text style={{ color: '#6b7280', fontSize: 12 }}>#{serviceData.submissionNumber}</Text>
                </View>
                {getStatusBadge(serviceData.status)}
            </View>

            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                {/* Due Date Warning */}
                {isBeforeDueDate && (
                    <View style={{
                        marginHorizontal: 16,
                        marginTop: 16,
                        padding: 16,
                        backgroundColor: '#fef9c3',
                        borderWidth: 1,
                        borderColor: '#fde047',
                        borderRadius: 12,
                        flexDirection: 'row'
                    }}>
                        <Clock size={20} color="#ca8a04" />
                        <View style={{ marginLeft: 12, flex: 1 }}>
                            <Text style={{ color: '#a16207', fontWeight: '600' }}>Service Not Yet Due</Text>
                            <Text style={{ color: '#ca8a04', fontSize: 12, marginTop: 4 }}>
                                Scheduled for {new Date(serviceData.scheduledDate).toLocaleDateString()}.
                                View only - submission allowed on or after the due date.
                            </Text>
                        </View>
                    </View>
                )}



                {/* Service Info Card */}
                <View style={{
                    marginHorizontal: 16,
                    marginTop: 16,
                    backgroundColor: '#f97316',
                    borderRadius: 20,
                    overflow: 'hidden'
                }}>
                    <View style={{ padding: 16 }}>
                        <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold' }}>{formData.serviceName}</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 4 }}>
                            {serviceData.inspectionType} • {serviceData.frequency?.frequencyName}
                        </Text>

                        {/* Info Grid */}
                        <View style={{ marginTop: 16, flexDirection: 'row', flexWrap: 'wrap' }}>
                            <View style={{ width: '50%', paddingRight: 8, marginBottom: 12 }}>
                                <View style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center' }}>
                                    <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: 8, marginRight: 12 }}>
                                        <Package size={16} color="white" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>Asset ID</Text>
                                        <Text style={{ color: 'white', fontWeight: '600', fontSize: 13 }} numberOfLines={1}>
                                            {serviceData.asset?.asset_code || 'N/A'}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            <View style={{ width: '50%', paddingLeft: 8, marginBottom: 12 }}>
                                <View style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center' }}>
                                    <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: 8, marginRight: 12 }}>
                                        <MapPin size={16} color="white" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>Location</Text>
                                        <Text style={{ color: 'white', fontWeight: '600', fontSize: 13 }} numberOfLines={1}>
                                            {serviceData.asset?.location || 'N/A'}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            <View style={{ width: '50%', paddingRight: 8 }}>
                                <View style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center' }}>
                                    <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: 8, marginRight: 12 }}>
                                        <Building2 size={16} color="white" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>Building</Text>
                                        <Text style={{ color: 'white', fontWeight: '600', fontSize: 13 }} numberOfLines={1}>
                                            {serviceData.asset?.building || 'N/A'}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            <View style={{ width: '50%', paddingLeft: 8 }}>
                                <View style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center' }}>
                                    <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: 8, marginRight: 12 }}>
                                        <Calendar size={16} color="white" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>Scheduled</Text>
                                        <Text style={{ color: 'white', fontWeight: '600', fontSize: 13 }} numberOfLines={1}>
                                            {new Date(serviceData.scheduledDate).toLocaleDateString()}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </View>

                        {/* Geo Location Row */}
                        {(serviceData.asset?.lat && serviceData.asset?.long) && (
                            <View style={{ marginTop: 12, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center' }}>
                                <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: 8, marginRight: 12 }}>
                                    <MapPin size={16} color="white" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>Geo Location</Text>
                                    <Text style={{ color: 'white', fontWeight: '600', fontSize: 13 }}>
                                        Lat: {serviceData.asset.lat}, Long: {serviceData.asset.long}
                                    </Text>
                                </View>
                            </View>
                        )}

                        {serviceData.startedAt && (
                            <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center' }}>
                                <Clock size={14} color="#fed7aa" />
                                <Text style={{ color: '#fed7aa', fontSize: 12, marginLeft: 8 }}>
                                    Started: {new Date(serviceData.startedAt).toLocaleString()}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* QR Verification Status */}
                {serviceData.status === 'PENDING' && (
                    <View style={{
                        marginHorizontal: 16,
                        marginTop: 16,
                        backgroundColor: qrVerified ? '#f0fdf4' : '#fff7ed',
                        borderRadius: 12,
                        padding: 16,
                        borderWidth: 1,
                        borderColor: qrVerified ? '#86efac' : '#fdba74'
                    }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            {qrVerified ? (
                                <>
                                    <ShieldCheck size={24} color="#22c55e" />
                                    <View style={{ marginLeft: 12, flex: 1 }}>
                                        <Text style={{ color: '#166534', fontWeight: '600' }}>Asset Verified</Text>
                                        <Text style={{ color: '#15803d', fontSize: 12, marginTop: 2 }}>
                                            QR code verified. You can start the service.
                                        </Text>
                                    </View>
                                </>
                            ) : (
                                <>
                                    <QrCode size={24} color="#ea580c" />
                                    <View style={{ marginLeft: 12, flex: 1 }}>
                                        <Text style={{ color: '#9a3412', fontWeight: '600' }}>QR Verification Required</Text>
                                        <Text style={{ color: '#c2410c', fontSize: 12, marginTop: 2 }}>
                                            Scan the asset QR code to verify your location before starting.
                                        </Text>
                                    </View>
                                </>
                            )}
                        </View>
                    </View>
                )}

                {/* Start Service Button */}
                {serviceData.status === 'PENDING' && (
                    <View style={{
                        marginHorizontal: 16,
                        marginTop: 12,
                        backgroundColor: '#ffffff',
                        borderRadius: 12,
                        padding: 16,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.05,
                        shadowRadius: 8,
                        elevation: 2,
                    }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <View style={{ flex: 1, marginRight: 16 }}>
                                <Text style={{ color: '#1f2937', fontWeight: '600' }}>
                                    {qrVerified ? 'Ready to start?' : 'Verify & Start'}
                                </Text>
                                <Text style={{ color: '#6b7280', fontSize: 12, marginTop: 4 }}>
                                    {qrVerified
                                        ? 'Mark this service as in progress'
                                        : 'Tap to scan QR and start service'}
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={handleStartService}
                                disabled={starting}
                                style={{
                                    backgroundColor: qrVerified ? '#22c55e' : '#f97316',
                                    paddingHorizontal: 20,
                                    paddingVertical: 12,
                                    borderRadius: 12,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    opacity: starting ? 0.7 : 1
                                }}
                            >
                                {starting ? (
                                    <ActivityIndicator size="small" color="white" />
                                ) : qrVerified ? (
                                    <>
                                        <Play size={16} color="white" />
                                        <Text style={{ color: 'white', fontWeight: 'bold', marginLeft: 8 }}>Start</Text>
                                    </>
                                ) : (
                                    <>
                                        <Scan size={16} color="white" />
                                        <Text style={{ color: 'white', fontWeight: 'bold', marginLeft: 8 }}>Scan QR</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Form Already Submitted/Completed Message */}
                {(serviceData.status === 'SUBMITTED' || serviceData.status === 'COMPLETED') ? (
                    <>
                        {/* Status Banner */}
                        <View style={{
                            marginHorizontal: 16,
                            marginTop: 16,
                            backgroundColor: serviceData.status === 'COMPLETED' ? '#f0fdf4' : '#faf5ff',
                            borderRadius: 12,
                            padding: 16,
                            borderWidth: 1,
                            borderColor: serviceData.status === 'COMPLETED' ? '#86efac' : '#d8b4fe',
                            flexDirection: 'row',
                            alignItems: 'center'
                        }}>
                            <View style={{
                                backgroundColor: serviceData.status === 'COMPLETED' ? '#dcfce7' : '#f3e8ff',
                                padding: 10,
                                borderRadius: 12
                            }}>
                                <Check size={24} color={serviceData.status === 'COMPLETED' ? '#22c55e' : '#9333ea'} />
                            </View>
                            <View style={{ marginLeft: 12, flex: 1 }}>
                                <Text style={{ color: serviceData.status === 'COMPLETED' ? '#166534' : '#6b21a8', fontWeight: '600', fontSize: 16 }}>
                                    {serviceData.status === 'SUBMITTED' ? 'Service Submitted' : 'Service Completed'}
                                </Text>
                                <Text style={{ color: serviceData.status === 'COMPLETED' ? '#15803d' : '#7e22ce', fontSize: 12, marginTop: 2 }}>
                                    {serviceData.status === 'SUBMITTED'
                                        ? 'Awaiting approval • View your submitted responses below'
                                        : `Completed on ${serviceData.completedAt ? new Date(serviceData.completedAt).toLocaleDateString() : 'N/A'}`}
                                </Text>
                            </View>
                        </View>

                        {/* Manager Remarks Section */}
                        {serviceData.approvalRemarks && (
                            <View style={{
                                marginHorizontal: 16,
                                marginTop: 16,
                                backgroundColor: '#ffffff',
                                borderRadius: 12,
                                padding: 16,
                                borderWidth: 1,
                                borderColor: '#e5e7eb',
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 1 },
                                shadowOpacity: 0.05,
                                shadowRadius: 4,
                                elevation: 1,
                            }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                                    <View style={{
                                        backgroundColor: '#eff6ff',
                                        padding: 8,
                                        borderRadius: 8,
                                        marginRight: 10
                                    }}>
                                        <AlertCircle size={18} color="#2563eb" />
                                    </View>
                                    <Text style={{ color: '#1f2937', fontWeight: '600', fontSize: 16 }}>Manager's Remarks</Text>
                                </View>
                                <View style={{
                                    backgroundColor: '#f9fafb',
                                    padding: 14,
                                    borderRadius: 10,
                                    borderLeftWidth: 3,
                                    borderLeftColor: '#2563eb'
                                }}>
                                    <Text style={{ color: '#374151', fontSize: 14, lineHeight: 20 }}>
                                        {serviceData.approvalRemarks}
                                    </Text>
                                </View>
                                {serviceData.approvedAt && (
                                    <Text style={{ color: '#9ca3af', fontSize: 11, marginTop: 8 }}>
                                        {serviceData.approvalStatus === 'APPROVED' ? 'Approved' : 'Reviewed'} on {new Date(serviceData.approvedAt).toLocaleString()}
                                    </Text>
                                )}
                            </View>
                        )}

                        {/* Read-only Form Sections */}
                        <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 }}>
                            {formData.sections.map((section, sectionIndex) => (
                                <View key={section.id} style={{ marginBottom: 24 }}>
                                    {/* Section Header */}
                                    <View style={{
                                        backgroundColor: '#f3f4f6',
                                        borderLeftWidth: 4,
                                        borderLeftColor: '#6b7280',
                                        paddingHorizontal: 16,
                                        paddingVertical: 12,
                                        borderTopRightRadius: 8,
                                        borderBottomRightRadius: 8,
                                        marginBottom: 16
                                    }}>
                                        <Text style={{ color: '#374151', fontWeight: 'bold', fontSize: 16 }}>
                                            {section.sectionName}
                                        </Text>
                                        {section.description && (
                                            <Text style={{ color: '#9ca3af', fontSize: 12, marginTop: 4 }}>{section.description}</Text>
                                        )}
                                    </View>

                                    {/* Questions - Read Only */}
                                    {section.questions.map((question, questionIndex) =>
                                        renderReadOnlyQuestion(question, questionIndex, sectionIndex)
                                    )}
                                </View>
                            ))}
                        </View>
                    </>
                ) : (
                    <>
                        {/* Validation Errors */}
                        {validationErrors.length > 0 && (
                            <View style={{
                                marginHorizontal: 16,
                                marginTop: 16,
                                backgroundColor: '#fef2f2',
                                borderWidth: 1,
                                borderColor: '#fecaca',
                                borderRadius: 12,
                                padding: 16
                            }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                    <AlertCircle size={18} color="#dc2626" />
                                    <Text style={{ color: '#dc2626', fontWeight: '600', marginLeft: 8 }}>Please fix the following:</Text>
                                </View>
                                {validationErrors.slice(0, 3).map((error, index) => (
                                    <Text key={index} style={{ color: '#b91c1c', fontSize: 12, marginLeft: 24, marginTop: 4 }}>• {error}</Text>
                                ))}
                                {validationErrors.length > 3 && (
                                    <Text style={{ color: '#dc2626', fontSize: 12, marginLeft: 24, marginTop: 4, opacity: 0.7 }}>
                                        ...and {validationErrors.length - 3} more errors
                                    </Text>
                                )}
                            </View>
                        )}

                        {/* Form Sections */}
                        <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 }}>
                            {formData.sections.map((section, sectionIndex) => (
                                <View key={section.id} style={{ marginBottom: 24 }}>
                                    {/* Section Header */}
                                    <View style={{
                                        backgroundColor: '#fff7ed',
                                        borderLeftWidth: 4,
                                        borderLeftColor: '#f97316',
                                        paddingHorizontal: 16,
                                        paddingVertical: 12,
                                        borderTopRightRadius: 8,
                                        borderBottomRightRadius: 8,
                                        marginBottom: 16
                                    }}>
                                        <Text style={{ color: '#ea580c', fontWeight: 'bold', fontSize: 16 }}>
                                            {section.sectionName}
                                        </Text>
                                        {section.description && (
                                            <Text style={{ color: '#9ca3af', fontSize: 12, marginTop: 4 }}>{section.description}</Text>
                                        )}
                                    </View>

                                    {/* Questions */}
                                    {section.questions.map((question, questionIndex) =>
                                        renderQuestion(question, questionIndex, sectionIndex)
                                    )}
                                </View>
                            ))}

                            {/* Submit Button */}
                            {!isBeforeDueDate && (
                                <TouchableOpacity
                                    onPress={handleSubmit}
                                    disabled={submitting}
                                    style={{
                                        backgroundColor: '#f97316',
                                        borderRadius: 12,
                                        paddingVertical: 16,
                                        flexDirection: 'row',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        marginTop: 16,
                                        opacity: submitting ? 0.7 : 1
                                    }}
                                >
                                    {submitting ? (
                                        <ActivityIndicator color="white" />
                                    ) : (
                                        <>
                                            <Check size={20} color="white" />
                                            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 18, marginLeft: 8 }}>Submit Form</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            )}
                        </View>
                    </>
                )}
            </ScrollView>

            {/* Condition Select Modal */}
            <Modal
                visible={conditionModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setConditionModalVisible(false)}
            >
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                    <View style={{ backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
                        <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingHorizontal: 16,
                            paddingVertical: 16,
                            borderBottomWidth: 1,
                            borderBottomColor: '#e5e7eb'
                        }}>
                            <Text style={{ color: '#1f2937', fontSize: 18, fontWeight: 'bold' }}>Select Condition</Text>
                            <TouchableOpacity onPress={() => setConditionModalVisible(false)}>
                                <X size={24} color="#6b7280" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={{ maxHeight: 384 }}>
                            {activeConditions?.map((condition) => (
                                <TouchableOpacity
                                    key={condition.id}
                                    onPress={() => selectCondition(condition.id)}
                                    style={{
                                        paddingHorizontal: 16,
                                        paddingVertical: 16,
                                        borderBottomWidth: 1,
                                        borderBottomColor: '#f3f4f6',
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'space-between'
                                    }}
                                >
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ color: '#1f2937', fontWeight: '500' }}>{condition.conditionName}</Text>
                                        <Text style={{ color: '#9ca3af', fontSize: 12, marginTop: 4 }}>
                                            {condition.healthImpact}
                                        </Text>
                                    </View>
                                    <View style={{
                                        paddingHorizontal: 8,
                                        paddingVertical: 4,
                                        borderRadius: 6,
                                        backgroundColor: condition.severityLevel === 'HIGH' || condition.severityLevel === 'CRITICAL'
                                            ? '#fef2f2'
                                            : condition.severityLevel === 'MEDIUM'
                                                ? '#fefce8'
                                                : '#f0fdf4'
                                    }}>
                                        <Text style={{
                                            fontSize: 12,
                                            fontWeight: 'bold',
                                            color: condition.severityLevel === 'HIGH' || condition.severityLevel === 'CRITICAL'
                                                ? '#dc2626'
                                                : condition.severityLevel === 'MEDIUM'
                                                    ? '#ca8a04'
                                                    : '#22c55e'
                                        }}>
                                            {condition.severityLevel}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        <View style={{ padding: 16 }}>
                            <TouchableOpacity
                                onPress={() => setConditionModalVisible(false)}
                                style={{ backgroundColor: '#f3f4f6', paddingVertical: 12, borderRadius: 12 }}
                            >
                                <Text style={{ color: '#6b7280', textAlign: 'center', fontWeight: '500' }}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Date Picker */}
            {showDatePicker && (
                <DateTimePicker
                    value={new Date()}
                    mode="date"
                    display="default"
                    onChange={handleDateChange}
                />
            )}

            {/* QR Scanner Modal */}
            <Modal
                visible={qrScannerVisible}
                animationType="slide"
                onRequestClose={handleCloseQRScanner}
            >
                <SafeAreaView style={{ flex: 1, backgroundColor: '#000000' }}>
                    <View style={{ flex: 1, position: 'relative' }}>
                        <CameraView
                            style={StyleSheet.absoluteFillObject}
                            facing="back"
                            onBarcodeScanned={qrScanned ? undefined : handleQRScanned}
                            barcodeScannerSettings={{
                                barcodeTypes: ["qr"],
                            }}
                        />

                        {/* Top Overlay */}
                        <View style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            paddingTop: 16,
                            paddingHorizontal: 20,
                            paddingBottom: 24,
                            backgroundColor: 'rgba(0,0,0,0.7)'
                        }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <ShieldCheck size={24} color="#f97316" />
                                    <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold', marginLeft: 8 }}>
                                        Verify Asset QR
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    onPress={handleCloseQRScanner}
                                    style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: 20 }}
                                >
                                    <X size={24} color="white" />
                                </TouchableOpacity>
                            </View>
                            <Text style={{ color: 'rgba(255,255,255,0.7)', marginTop: 8, fontSize: 13 }}>
                                Scan the QR code on the asset to verify you're at the correct location
                            </Text>
                        </View>

                        {/* Center Frame */}
                        <View style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            justifyContent: 'center',
                            alignItems: 'center'
                        }}>
                            <View style={{
                                width: 260,
                                height: 260,
                                borderWidth: 3,
                                borderColor: '#f97316',
                                borderRadius: 24,
                                backgroundColor: 'transparent'
                            }}>
                                <View style={{ position: 'absolute', top: -3, left: -3, width: 40, height: 40, borderTopWidth: 6, borderLeftWidth: 6, borderColor: '#f97316', borderTopLeftRadius: 24 }} />
                                <View style={{ position: 'absolute', top: -3, right: -3, width: 40, height: 40, borderTopWidth: 6, borderRightWidth: 6, borderColor: '#f97316', borderTopRightRadius: 24 }} />
                                <View style={{ position: 'absolute', bottom: -3, left: -3, width: 40, height: 40, borderBottomWidth: 6, borderLeftWidth: 6, borderColor: '#f97316', borderBottomLeftRadius: 24 }} />
                                <View style={{ position: 'absolute', bottom: -3, right: -3, width: 40, height: 40, borderBottomWidth: 6, borderRightWidth: 6, borderColor: '#f97316', borderBottomRightRadius: 24 }} />
                            </View>
                        </View>

                        {/* Expected Asset Info */}
                        <View style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            padding: 24,
                            backgroundColor: 'rgba(0,0,0,0.8)',
                            borderTopLeftRadius: 24,
                            borderTopRightRadius: 24
                        }}>
                            <View style={{
                                backgroundColor: 'rgba(249,115,22,0.2)',
                                padding: 16,
                                borderRadius: 16,
                            }}>
                                <Text style={{ color: '#f97316', fontSize: 12, fontWeight: '600', marginBottom: 4 }}>
                                    EXPECTED ASSET
                                </Text>
                                <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>
                                    {serviceData?.asset?.asset_code || 'Unknown'}
                                </Text>
                                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 4 }}>
                                    {serviceData?.asset?.location || ''} {serviceData?.asset?.building ? `• ${serviceData.asset.building}` : ''}
                                </Text>
                            </View>
                        </View>

                        {/* Loading Overlay */}
                        {qrScanning && (
                            <View style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                backgroundColor: 'rgba(0,0,0,0.85)',
                                justifyContent: 'center',
                                alignItems: 'center'
                            }}>
                                <View style={{
                                    backgroundColor: '#ffffff',
                                    padding: 32,
                                    borderRadius: 24,
                                    alignItems: 'center'
                                }}>
                                    <ActivityIndicator size="large" color="#f97316" />
                                    <Text style={{ color: '#1f2937', marginTop: 16, fontWeight: 'bold' }}>
                                        Verifying...
                                    </Text>
                                </View>
                            </View>
                        )}
                    </View>
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
}
