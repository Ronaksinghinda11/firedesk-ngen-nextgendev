import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePlantFilter } from '@/contexts/PlantFilterContext';
import IoTSetupPage from './IoTSetup';
import { EntityAccessGuard } from '@/components/PermissionGuard';
import { Entity } from '@/types/permissions';
import { AlertCircle } from 'lucide-react';

/**
 * Wrapper component that provides plant/category context to IoTSetupPage
 */
const IoTSetupPageWrapper: React.FC = () => {
    const { selectedPlantId, getPlantName } = usePlantFilter();
    const [searchParams] = useSearchParams();

    // Get category from URL params or default to empty (user will select)
    const categoryId = searchParams.get('categoryId') || '';
    const plantName = selectedPlantId ? getPlantName(selectedPlantId) : 'Selected Plant';

    return (
        <EntityAccessGuard
            entity={Entity.PLANTS}
            fallback={
                <div className="flex flex-col items-center justify-center p-12 text-center bg-gray-50 rounded-lg border border-gray-200 m-6">
                    <AlertCircle className="w-12 h-12 text-orange-500 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Restricted</h3>
                    <p className="text-gray-600 max-w-md">
                        You do not have the required permissions to access IoT Setup.
                        Please contact your administrator to request access to Plants.
                    </p>
                </div>
            }
        >
            <IoTSetupPage
                selectedPlant={selectedPlantId || ''}
                categoryId={categoryId}
                plantName={plantName}
                categoryName="IoT Devices"
            />
        </EntityAccessGuard>
    );
};

export default IoTSetupPageWrapper;
