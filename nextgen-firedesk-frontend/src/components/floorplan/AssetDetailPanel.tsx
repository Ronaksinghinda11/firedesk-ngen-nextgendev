import { X, MapPin, Package, Calendar, AlertTriangle, CheckCircle, Thermometer, Battery } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { Asset } from "@/data/mockFloorplanAssets";
import { assetTypeConfig, statusConfig } from "@/data/mockFloorplanAssets";
import { formatDate } from "@/lib/floorplanUtils";

interface AssetDetailPanelProps {
  asset: Asset;
  onClose: () => void;
}

export const AssetDetailPanel: React.FC<AssetDetailPanelProps> = ({
  asset,
  onClose
}) => {
  // Get asset type configuration
  const typeConfig = assetTypeConfig[asset.type as keyof typeof assetTypeConfig] || {
    color: "#6b7280",
    icon: "📦",
    label: asset.type || "Unknown"
  };

  // Get status configuration (repository style)
  const statusConfigItem = statusConfig[asset.status] || {
    color: "#6b7280",
    label: asset.status,
    priority: 0
  };

  const getStatusBadge = (status: "green" | "yellow" | "red") => {
    const config = statusConfig[status];
    return (
      <div className="flex items-center gap-2">
        {status === 'green' && <CheckCircle className="h-4 w-4 text-green-600" />}
        {status === 'yellow' && <AlertTriangle className="h-4 w-4 text-yellow-600" />}
        {status === 'red' && <AlertTriangle className="h-4 w-4 text-red-600" />}
        <Badge
          variant="outline"
          style={{
            backgroundColor: `${config.color}20`,
            borderColor: `${config.color}40`,
            color: config.color
          }}
        >
          {config.label}
        </Badge>
      </div>
    );
  };

  return (
    <div className="w-96 bg-background border-l border-border h-full overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
              style={{ backgroundColor: typeConfig.color }}
            >
              {typeConfig.icon}
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{asset.asset_code}</h3>
              <p className="text-xs text-muted-foreground">{typeConfig.label}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" />
              Asset Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Asset ID</span>
              <span className="text-sm font-medium">{asset.asset_code}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Type</span>
              <span className="text-sm font-medium">{typeConfig.label}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Name</span>
              <span className="text-sm font-medium">{asset.name}</span>
            </div>

            <Separator />

            <div className="flex justify-between items-start">
              <span className="text-sm text-muted-foreground">Status</span>
              <div>{getStatusBadge(asset.status)}</div>
            </div>
          </CardContent>
        </Card>

        {/* Location Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Location Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Facility</span>
              <span className="text-sm font-medium">Manufacturing Facility</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Coordinates (SVG)</span>
              <span className="text-sm font-medium">
                {Math.round(asset.x)}, {Math.round(asset.y)}
              </span>
            </div>

            {asset.x_norm && asset.y_norm && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Coordinates (Normalized)</span>
                <span className="text-sm font-medium">
                  {asset.x_norm.toFixed(3)}, {asset.y_norm.toFixed(3)}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Metadata/Sensor Data */}
        {asset.meta && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Status & Monitoring
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {asset.meta.lastCheck && (
                <div className="flex justify-between items-start">
                  <span className="text-sm text-muted-foreground">Last Check</span>
                  <span className="text-sm font-medium text-right">
                    {formatDate(asset.meta.lastCheck)}
                  </span>
                </div>
              )}

              {asset.meta.temperature !== undefined && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Thermometer className="h-3 w-3" />
                    Temperature
                  </span>
                  <span className="text-sm font-medium">{asset.meta.temperature}°C</span>
                </div>
              )}

              {asset.meta.battery !== undefined && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Battery className="h-3 w-3" />
                    Battery
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{asset.meta.battery}%</span>
                    <div className="w-12 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 transition-all duration-300"
                        style={{
                          width: `${asset.meta.battery}%`,
                          backgroundColor: asset.meta.battery > 20 ? '#10b981' :
                            asset.meta.battery > 10 ? '#f59e0b' : '#ef4444'
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {asset.meta.description && (
                <>
                  <Separator />
                  <div>
                    <span className="text-sm text-muted-foreground">Description</span>
                    <p className="text-sm mt-1 p-2 bg-muted/50 rounded text-foreground">
                      {asset.meta.description}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" size="sm" className="w-full justify-start">
              View Full Details
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start">
              Schedule Service
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start">
              Update Status
            </Button>
            {asset.status === 'red' && (
              <Button variant="destructive" size="sm" className="w-full justify-start">
                Report Issue
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};