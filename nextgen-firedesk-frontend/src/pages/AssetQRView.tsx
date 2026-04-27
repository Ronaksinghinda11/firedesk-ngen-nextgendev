import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { QRCodeSVG } from 'qrcode.react';

export default function AssetQRView() {
  const { id } = useParams();
  const [asset, setAsset] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchAsset();
  }, [id]);

  const fetchAsset = async () => {
    setIsLoading(true);
    setError(false);
    try {
      // Use public endpoint without auth for QR viewing
      const apiUrl = import.meta.env.VITE_INTERNAL_API_PATH || 'https://nextgenfiredeskqa.atvisai.in/api';
      const response = await fetch(`${apiUrl}/public/assets/${id}`);
      const data = await response.json();
      
      if (data.success && data.asset) {
        setAsset(data.asset);
      } else {
        setError(true);
      }
    } catch (err) {
      console.error('Failed to fetch asset:', err);
      setError(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <p className="text-gray-600">Loading asset details...</p>
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-6 text-center">
          <p className="text-red-600 font-medium mb-2">Asset Not Found</p>
          <p className="text-gray-600 text-sm">The requested asset could not be found.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white shadow-lg">
        {/* Header */}
        <div className="border-b-2 border-gray-900 px-6 py-4 bg-gray-100">
          <h1 className="text-2xl font-bold text-center text-gray-900">
            ASSET ID: {asset.assetId || asset.id}
          </h1>
        </div>

        {/* Asset Details */}
        <div className="px-6 py-6 space-y-4 text-base">
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="font-bold text-gray-900 text-sm mb-1">PRODUCT:</p>
            <p className="text-gray-800 text-lg">{asset.product?.productName || 'N/A'}</p>
          </div>

          {asset.category?.categoryName && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="font-bold text-gray-900 text-sm mb-1">CATEGORY:</p>
              <p className="text-gray-800 text-lg">{asset.category.categoryName}</p>
            </div>
          )}

          {asset.manufacturer?.name && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="font-bold text-gray-900 text-sm mb-1">CAPACITY:</p>
              <p className="text-gray-800 text-lg">{asset.manufacturer.name}</p>
            </div>
          )}

          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="font-bold text-gray-900 text-sm mb-1">PLANT:</p>
            <p className="text-gray-800 text-lg">{asset.plant?.plantName || 'N/A'}</p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="font-bold text-gray-900 text-sm mb-1">BUILDING:</p>
            <p className="text-gray-800 text-lg">{asset.building || 'N/A'}</p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="font-bold text-gray-900 text-sm mb-1">LOCATION:</p>
            <p className="text-gray-800 text-lg">{asset.location || 'N/A'}</p>
          </div>

          {asset.healthStatus && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="font-bold text-gray-900 text-sm mb-2">HEALTH STATUS:</p>
              <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
                asset.healthStatus === "Not Working" 
                  ? "bg-red-100 text-red-800" 
                  : asset.healthStatus === "Need Attention" 
                  ? "bg-orange-100 text-orange-800"
                  : asset.healthStatus === "Healthy" 
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-800"
              }`}>
                {asset.healthStatus}
              </span>
            </div>
          )}

          {asset.installDate && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="font-bold text-gray-900 text-sm mb-1">INSTALL DATE:</p>
              <p className="text-gray-800 text-lg">{new Date(asset.installDate).toLocaleDateString()}</p>
            </div>
          )}

          {asset.manufacturingDate && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="font-bold text-gray-900 text-sm mb-1">MANUFACTURING DATE:</p>
              <p className="text-gray-800 text-lg">{new Date(asset.manufacturingDate).toLocaleDateString()}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-100 border-t text-center">
          <p className="text-sm font-medium text-gray-700">
            NextGen FireDesk - Asset Management System
          </p>
        </div>
      </Card>
    </div>
  );
}
