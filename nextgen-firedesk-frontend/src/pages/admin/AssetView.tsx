import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Eye, FileText, FileDown, Loader2, Clock, Wrench, Droplets, Package, IndianRupee, AlertTriangle, CheckCircle2, Boxes, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { QRCodeSVG } from 'qrcode.react';
import { generateAssetQRValue } from '@/utils/qr_code_utils';
import { HistoryButton } from "@/components/audit";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AssetView() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const [asset, setAsset] = useState(null);
  const [product, setProduct] = useState(null);
  const [scheduler, setScheduler] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [serviceHistory, setServiceHistory] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showAllServices, setShowAllServices] = useState(false);
  const itemsPerPage = 10;

  // BM Spare History
  const [showSpareLog, setShowSpareLog] = useState(false);
  const [spareHistory, setSpareHistory] = useState<any[]>([]);
  const [isLoadingSpares, setIsLoadingSpares] = useState(false);

  // Lifecycle stats
  const [lifecycleStats, setLifecycleStats] = useState<any>(null);
  const [isLoadingLifecycle, setIsLoadingLifecycle] = useState(false);
  
  // Timeline Sheet State
  const [isTimelineSheetOpen, setIsTimelineSheetOpen] = useState(false);
  const [timelineEvents, setTimelineEvents] = useState<any[]>([]);
  const [timelinePage, setTimelinePage] = useState(1);
  const [timelineTotalPages, setTimelineTotalPages] = useState(1);
  const [timelineFilter, setTimelineFilter] = useState('ALL');
  const [isLoadingMoreTimeline, setIsLoadingMoreTimeline] = useState(false);

  useEffect(() => {
    fetchAsset();
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchServiceHistory(1);
      fetchLifecycleStats();
    }
  }, [id]);

  const fetchAsset = async () => {
    setIsLoading(true);
    try {
      const response: any = await api.get(`/assets/${id}`);
      // v2 API returns data in response.data instead of response.asset
      const assetData = response.data || response.asset;
      const schedulerData = response.scheduler;

      if (assetData) {
        setAsset(assetData);
        setScheduler(schedulerData);

        // Fetch product details if productId exists (handle both camelCase and snake_case)
        const prodId = assetData.productId || assetData.product_id || assetData.product?.id;

        if (prodId) {
          fetchProduct(prodId, assetData.product);
        } else if (assetData.product) {
          // If we have product object but no ID explicitly at top level, use the object
          setProduct(assetData.product);
        }
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to load asset details.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProduct = async (productId: string, fallbackProduct: any = null) => {
    try {
      const response: any = await api.get(`/master-data/products/${productId}`);
      const productData = response.product || response.data || response;
      if (productData) {
        setProduct(productData);
      }
    } catch (error) {
      // If primary endpoint fails, try singular or just log
      console.warn('Failed to fetch product details from primary endpoint, trying fallback...', error);
      try {
        // Fallback to singular if plural failed
        const response: any = await api.get(`/product/${productId}`);
        const productData = response.product || response.data || response;
        if (productData) setProduct(productData);
      } catch (e) {
        console.error('Failed to fetch product details:', e);
        // Final fallback: use provided fallback object
        if (fallbackProduct) setProduct(fallbackProduct);
      }
    }
  };
  // ... skipping to JSX lines ...


  const fetchServiceHistory = async (page: number) => {
    try {
      const response: any = await api.get(`/assets/${id}/service-history?page=${page}&limit=${itemsPerPage}`);
      if (response.success) {
        setServiceHistory(response.data);
        setTotalPages(response.pagination.totalPages);
        setCurrentPage(response.pagination.currentPage);
      }
    } catch (error) {
      console.error('Failed to fetch service history:', error);
    }
  };

  const fetchSpareHistory = async () => {
    if (!id) return;
    setIsLoadingSpares(true);
    try {
      // Asset ID in URL is the asset.id not assetId. 
      // Let's use `id` for /api/tickets/asset/:id/bm-spares 
      // or we use managerTicketApi if needed, but api.get is already authorized.
      const response: any = await api.get(`/tickets/asset/${id}/bm-spares`);
      setSpareHistory(response.spares || response.data || []);
      setShowSpareLog(true);
    } catch (error) {
      console.error('Failed to fetch spare history:', error);
      toast({
        title: "Error",
        description: "Failed to load spare history.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingSpares(false);
    }
  };

  const fetchLifecycleStats = async () => {
    if (!id) return;
    setIsLoadingLifecycle(true);
    try {
      const response: any = await api.get(`/assets/${id}/lifecycle-stats`);
      setLifecycleStats(response.data || null);
    } catch (error) {
      console.error('Failed to fetch lifecycle stats:', error);
    } finally {
      setIsLoadingLifecycle(false);
    }
  };

  const fetchTimeline = async (page: number, type: string = timelineFilter) => {
    if (!id) return;
    setIsLoadingMoreTimeline(true);
    try {
      const response: any = await api.get(`/assets/${id}/lifecycle-timeline?page=${page}&limit=20&type=${type}`);
      if (page === 1) {
        setTimelineEvents(response.data || []);
      } else {
        setTimelineEvents(prev => [...prev, ...(response.data || [])]);
      }
      setTimelinePage(page);
      setTimelineTotalPages(response.pagination?.total_pages || 1);
    } catch (error) {
      console.error('Failed to fetch timeline:', error);
      toast({
        title: "Error",
        description: "Failed to load timeline events.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingMoreTimeline(false);
    }
  };

  useEffect(() => {
    if (isTimelineSheetOpen) {
      fetchTimeline(1, timelineFilter);
    }
  }, [isTimelineSheetOpen, timelineFilter]);

  const handleViewDocument = (documentUrl: string) => {
    if (!documentUrl) {
      toast({
        title: "View failed",
        description: "Document URL not available",
        variant: "destructive",
      });
      return;
    }
    // For PDFs, convert to blob to avoid browser security restrictions
    if (documentUrl.startsWith('data:application/pdf')) {
      const base64Data = documentUrl.split(',')[1];
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
      // Clean up the blob URL after a delay
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } else {
      // For images, open directly
      window.open(documentUrl, '_blank');
    }
  };

  const handleDownloadDocument = (doc: any, index: number) => {
    // Handle both snake_case and camelCase from backend
    const docUrl = doc.documentUrl || doc.document_url;

    if (!docUrl) {
      toast({
        title: "Download failed",
        description: "Document URL not available",
        variant: "destructive",
      });
      return;
    }

    const link = document.createElement('a');
    link.href = docUrl;

    // Determine file extension from base64 data or URL
    let extension = 'file';
    if (docUrl.startsWith('data:image/png')) extension = 'png';
    else if (docUrl.startsWith('data:image/jpeg') || docUrl.startsWith('data:image/jpg')) extension = 'jpg';
    else if (docUrl.startsWith('data:image/gif')) extension = 'gif';
    else if (docUrl.startsWith('data:image/svg')) extension = 'svg';
    else if (docUrl.startsWith('data:application/pdf')) extension = 'pdf';
    else if (docUrl.includes('.pdf')) extension = 'pdf';
    else if (docUrl.includes('.png')) extension = 'png';
    else if (docUrl.includes('.jpg') || docUrl.includes('.jpeg')) extension = 'jpg';

    link.download = `${doc.description || `Document-${index + 1}`}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Download started",
      description: "Your document is being downloaded",
    });
  };

  const getFileTypeFromBase64 = (base64: string) => {
    if (!base64 || typeof base64 !== 'string') return 'Document';
    if (base64.startsWith('data:image/png')) return 'PNG Image';
    if (base64.startsWith('data:image/svg')) return 'SVG Image';
    if (base64.startsWith('data:application/pdf')) return 'PDF Document';
    return 'Document';
  };

  const handleDownloadPdf = async () => {
    if (!id) return;

    setIsDownloadingPdf(true);
    try {
      // Download PDF directly using the assets/:id/pdf endpoint
      const baseURL = import.meta.env.VITE_INTERNAL_API_PATH || 'http://localhost:3001';
      const token = localStorage.getItem('accessToken');

      const response = await fetch(`${baseURL}/assets/${id}/pdf`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to generate PDF report');
      }

      const blob = await response.blob();

      // Create download link
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `Asset_Report_${asset?.assetId || id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up
      window.URL.revokeObjectURL(blobUrl);

      toast({
        title: "Success",
        description: "PDF report downloaded successfully",
      });
    } catch (error: any) {
      console.error('PDF download error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to download PDF report",
        variant: "destructive",
      });
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Loading asset details...</p>
      </div>
    );
  }
  if (!asset) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-muted-foreground mb-4">Asset not found</p>
        <Button onClick={() => {
          const currentPath = window.location.pathname;
          const isManagerContext = currentPath.startsWith('/manager');
          const basePath = isManagerContext ? '/manager' : '/admin';
          navigate(`${basePath}/assets`);
        }}>
          Back to Assets
        </Button>
      </div>
    );
  }
  return (
    <div className="flex-1 flex flex-col bg-background">
      <div className="px-8 pt-6 pb-3 border-b border-border bg-card">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const currentPath = window.location.pathname;
                const isManagerContext = currentPath.startsWith('/manager');
                const basePath = isManagerContext ? '/manager' : '/admin';
                navigate(`${basePath}/assets`);
              }}
              className="px-2"
            >
              <ArrowLeft className="h-5 w-5 mr-1" /> Back to Assets
            </Button>
            <span className="text-2xl font-semibold">{asset.assetId}</span>
          </div>
          <div className="flex items-center gap-2">
            {/* <HistoryButton
              entityType="asset"
              entityId={id}
              variant="outline"
              size="sm"
            /> */}
            {/* <Button
              variant="outline"
              size="sm"
              onClick={fetchSpareHistory}
              disabled={isLoadingSpares}
            >
              {isLoadingSpares ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Clock className="h-4 w-4 mr-2" />}
              Spares Log
            </Button> */}
            <Button
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {isDownloadingPdf ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileDown className="h-4 w-4 mr-2" />
                  Download PDF
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
      <div className="flex-1 p-8 overflow-auto">
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Sidebar - QR Code & Image */}
            <div className="lg:col-span-3 space-y-3">
              {/* Product Image & QR Combo Card */}
              <Card className="shadow-sm">
                <CardContent className="p-3">
                  {/* 1. Asset QR (First) */}
                  <div className="mb-4">
                    <h2 className="text-sm font-semibold mb-2">Asset QR</h2>
                    <div className="flex flex-col items-center">
                      <div className="bg-white border border-gray-200 rounded p-2 mb-2">
                        <QRCodeSVG
                          id={`asset-qr-${asset.id}`}
                          value={generateAssetQRValue(asset)}
                          size={180}
                          level="H"
                          includeMargin={true}
                          fgColor="#FF6B35"
                        />
                      </div>
                      <p className="font-semibold text-xs">{asset.assetId}</p>
                    </div>
                  </div>

                  {/* 2. Product Image (Second - Under QR) */}
                  {(product?.image || asset.product?.image) && (
                    <div className="border-t pt-3">
                      <h2 className="text-sm font-semibold mb-2">Product Image</h2>
                      <div className="flex justify-center bg-gray-50 rounded-md border p-2">
                        <img
                          src={product?.image || asset.product?.image}
                          alt={product?.productName || asset.product?.productName || "Product"}
                          className="h-32 w-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground text-center mt-1 truncate">
                        {product?.productName || asset.product?.productName}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Geolocation Card (Compact) */}
              {(asset.latitude || asset.longitude) && (
                <Card className="shadow-sm">
                  <CardContent className="p-3">
                    <h2 className="text-sm font-semibold mb-2">Geolocation</h2>
                    <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                      <div>
                        <span className="text-[10px] text-muted-foreground block">LATITUDE</span>
                        <span className="font-medium">{asset.latitude || '-'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block">LONGITUDE</span>
                        <span className="font-medium">{asset.longitude || '-'}</span>
                      </div>
                    </div>
                    <a
                      href={`https://www.google.com/maps?q=${asset.latitude},${asset.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center w-full py-1.5 text-[10px] font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded border border-blue-100 transition-colors"
                    >
                      View on Maps
                    </a>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Column - Data Sections (Dense) */}
            <div className="lg:col-span-9 space-y-3">
              {/* Asset Information */}
              <Card className="shadow-sm">
                <CardContent className="p-3">

                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Asset ID</p>
                      <p className="text-xs font-semibold text-gray-900 mt-0.5 truncate" title={asset.assetId || asset.asset_code}>{asset.assetId || asset.asset_code}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Plant</p>
                      <p className="text-xs font-medium text-gray-900 mt-0.5 truncate">{asset.plant?.plantName || asset.plant?.plant_name || "-"}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Building</p>
                      <p className="text-xs font-medium text-gray-900 mt-0.5 truncate">
                        {typeof asset.building === 'object'
                          ? (asset.building?.building_name || asset.building?.name || '-')
                          : (asset.building ?? "-")}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Floor</p>
                      <p className="text-xs font-medium text-gray-900 mt-0.5 truncate">
                        {typeof asset.floor === 'object'
                          ? (asset.floor?.floor_name || asset.floor?.floorName || '-')
                          : (asset.floor ?? "-")}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Wing</p>
                      <p className="text-xs font-medium text-gray-900 mt-0.5 truncate">
                        {typeof asset.wing === 'object'
                          ? (asset.wing?.wing_name || asset.wing?.wingName || '-')
                          : (asset.wing ?? "-")}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Category</p>
                      <p className="text-xs font-medium text-gray-900 mt-0.5 truncate">{asset.category?.categoryName || asset.category?.category_name || "-"}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Product</p>
                      <p className="text-xs font-medium text-gray-900 mt-0.5 truncate">{asset.product?.productName || asset.product?.product_name || "-"}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Location</p>
                      <p className="text-xs font-medium text-gray-900 mt-0.5 truncate">{asset.location ?? "-"}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Maintenance Status</p>
                      {(() => {
                        const mStatus = asset.maintenanceStatus || asset.maintenance_status || "";
                        const statusLabels: Record<string, string> = {
                          'IN_HOUSE': 'In-House',
                          'UNDER_WARRANTY': 'Under Warranty',
                          'OUT_OF_WARRANTY': 'Out of Warranty',
                          'UNDER_AMC': 'Under AMC',
                          'OUT_OF_AMC': 'Out of AMC'
                        };
                        const statusColors: Record<string, string> = {
                          'IN_HOUSE': 'bg-gray-50 text-gray-700 border-gray-100',
                          'UNDER_WARRANTY': 'bg-green-50 text-green-700 border-green-100',
                          'OUT_OF_WARRANTY': 'bg-red-50 text-red-700 border-red-100',
                          'UNDER_AMC': 'bg-blue-50 text-blue-700 border-blue-100',
                          'OUT_OF_AMC': 'bg-orange-50 text-orange-700 border-orange-100'
                        };
                        return (
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-[3px] text-[10px] font-bold mt-0.5 uppercase border ${statusColors[mStatus] || 'bg-gray-50 text-gray-700 border-gray-100'}`}>
                            {statusLabels[mStatus] || mStatus || "-"}
                          </span>
                        );
                      })()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Status</p>
                      {(() => {
                        const assetStatus = asset.status || "";
                        const isActive = assetStatus === "ACTIVE";
                        return (
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-[3px] text-[10px] font-bold mt-0.5 uppercase border ${isActive ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                            {isActive ? "Active" : assetStatus || "-"}
                          </span>
                        );
                      })()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Health Status</p>
                      {(() => {
                        const status = asset.healthStatus || asset.health_status || "";
                        const isNotWorking = status === "Not Working" || status === "NOT_WORKING";
                        const isNeedsAttention = status === "Need Attention" || status === "NEEDS_ATTENTION";
                        const isHealthy = status === "Healthy" || status === "HEALTHY";

                        return (
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-[3px] text-[10px] font-bold mt-0.5 uppercase ${isNotWorking ? "bg-red-50 text-red-700 border border-red-100"
                            : isNeedsAttention ? "bg-orange-50 text-orange-700 border border-orange-100"
                              : isHealthy ? "bg-green-50 text-green-700 border border-green-100"
                                : "bg-gray-50 text-gray-700 border border-gray-100"
                            }`}>
                            {isNotWorking ? "Not Working"
                              : isNeedsAttention ? "Needs Attention"
                                : isHealthy ? "Healthy"
                                  : status || "-"}
                          </span>
                        );
                      })()}
                    </div>
                    <div className="col-span-1 md:col-span-2 lg:col-span-4 min-w-0">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Condition</p>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {asset.activeConditions && asset.activeConditions.length > 0 ? (
                          asset.activeConditions.map((condition: any, index: number) => {
                            // Handle both string and object formats
                            const conditionName = typeof condition === 'string' ? condition : (condition.conditionName || condition.condition_name || 'Unknown');
                            const severity = typeof condition === 'object' ? (condition.severityLevel || condition.severity_level || 'MEDIUM') : 'MEDIUM';

                            const severityColors = {
                              CRITICAL: 'bg-red-100 text-red-800 border-red-200',
                              HIGH: 'bg-orange-100 text-orange-800 border-orange-200',
                              MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-200',
                              LOW: 'bg-blue-100 text-blue-800 border-blue-200'
                            };

                            return (
                              <span
                                key={index}
                                className={`px-1.5 py-0.5 rounded-[3px] text-[10px] font-medium border ${severityColors[severity] || 'bg-red-50 text-red-700 border-red-100'}`}
                              >
                                {conditionName}
                              </span>
                            );
                          })
                        ) : (
                          <span className="text-xs text-green-600 font-medium flex items-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5"></span>
                            No Issues
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Specs & Manufacturer Combo Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <Card className="shadow-sm h-full">
                  <CardContent className="p-3">
                    <h2 className="text-sm font-semibold mb-3 pb-1 border-b text-gray-800">Specs & Capacity</h2>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Type</p>
                        <p className="text-xs font-medium text-gray-900 mt-0.5 truncate">{asset.type || "-"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Sub Type</p>
                        <p className="text-xs font-medium text-gray-900 mt-0.5 truncate">{asset.subType || asset.sub_type || "-"}</p>
                      </div>
                      {(asset.capacity || asset.capacityUnit) && (
                        <div>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">Capacity</p>
                          <p className="text-xs font-medium text-gray-900 mt-0.5 truncate">
                            {asset.capacity} {asset.capacityUnit || ""}
                          </p>
                        </div>
                      )}
                      {/* Show spec values from both camelCase and snake_case */}
                      {(asset.specValues || asset.spec_values)?.map((spec: any) => {
                        const label = spec.specDefinition?.label || spec.spec_definition?.spec_label || spec.spec_definition?.spec_name;
                        const value = spec.value || spec.spec_value;
                        const unit = spec.unit ? ` ${spec.unit}` : '';
                        return (
                          <div key={spec.id}>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase truncate" title={label}>{label}</p>
                            <p className="text-xs font-medium text-gray-900 mt-0.5 truncate" title={`${value}${unit}`}>{value ? `${value}${unit}` : "-"}</p>
                          </div>
                        );
                      })}
                      {!asset.type && !(asset.subType || asset.sub_type) && !asset.capacity && !(asset.specValues?.length || asset.spec_values?.length) && (
                        <p className="text-[10px] text-muted-foreground col-span-2 italic">No specifications</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-sm h-full">
                  <CardContent className="p-3">
                    <h2 className="text-sm font-semibold mb-3 pb-1 border-b text-gray-800">Manufacturer & Details</h2>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Manufacturer</p>
                        <p className="text-xs font-medium text-gray-900 mt-0.5 truncate">{asset.manufacturer?.name || "-"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Model</p>
                        <p className="text-xs font-medium text-gray-900 mt-0.5 truncate">{asset.model || asset.metadata?.model || "-"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Serial / Part No</p>
                        <p className="text-xs font-medium text-gray-900 mt-0.5 font-mono truncate">{asset.slNo || asset.metadata?.serial_number || "-"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Tag</p>
                        <p className="text-xs font-medium text-gray-900 mt-0.5 truncate">{asset.tag || asset.metadata?.tag || "-"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Created At</p>
                        <p className="text-xs font-medium text-gray-900 mt-0.5">
                          {(asset.createdAt || asset.created_at) ? new Date(asset.createdAt || asset.created_at).toLocaleDateString() : "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Updated At</p>
                        <p className="text-xs font-medium text-gray-900 mt-0.5">
                          {(asset.updatedAt || asset.updated_at) ? new Date(asset.updatedAt || asset.updated_at).toLocaleDateString() : "-"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Timeline Row */}
              <Card className="shadow-sm">
                <CardContent className="p-3">
                  <h2 className="text-sm font-semibold mb-3 pb-1 border-b text-gray-800">Dates & Schedule</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-3">
                    {/* Basic Dates */}
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Manufacturing Date</p>
                      <p className="text-xs font-medium text-gray-900 mt-0.5">
                        {(asset.manufacturingDate || asset.manufacturing_date)
                          ? new Date(asset.manufacturingDate || asset.manufacturing_date).toLocaleDateString()
                          : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Install Date</p>
                      <p className="text-xs font-medium text-gray-900 mt-0.5">
                        {(asset.installDate || asset.install_date)
                          ? new Date(asset.installDate || asset.install_date).toLocaleDateString()
                          : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Warranty End</p>
                      <p className="text-xs font-medium text-gray-900 mt-0.5">
                        {(asset.warrantyEndDate || asset.warranty_end_date)
                          ? new Date(asset.warrantyEndDate || asset.warranty_end_date).toLocaleDateString()
                          : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Lifespan</p>
                      <p className="text-xs font-medium text-gray-900 mt-0.5">
                        {(asset.lifespanYears || asset.lifespan_years)
                          ? `${asset.lifespanYears || asset.lifespan_years} Years`
                          : "-"}
                      </p>
                    </div>

                    {/* Service Dates */}
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Last Service Date</p>
                      <p className="text-xs font-medium text-gray-900 mt-0.5">
                        {(asset.lastServiceDate || asset.last_service_date)
                          ? new Date(asset.lastServiceDate || asset.last_service_date).toLocaleDateString()
                          : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">Next Service Date</p>
                      <p className="text-xs font-medium text-gray-900 mt-0.5">
                        {(asset.nextServiceDate || asset.next_service_date)
                          ? new Date(asset.nextServiceDate || asset.next_service_date).toLocaleDateString()
                          : "-"}
                      </p>
                    </div>

                    {/* HP Test Schedule - Only show when category has testFrequencyRequired */}
                    {(asset.category?.testFrequencyRequired || asset.category?.test_frequency_required) && (
                      <>
                        <div>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">Last HP Test Date</p>
                          <p className="text-xs font-medium text-gray-900 mt-0.5">
                            {(() => {
                              const lastHpTest = asset.lastHPTestDate || asset.testing_schedule?.last_hp_test_date;
                              if (!lastHpTest) return "-";
                              // Handle both single date and array of dates
                              if (Array.isArray(lastHpTest) && lastHpTest.length > 0) {
                                return new Date(lastHpTest[lastHpTest.length - 1]).toLocaleDateString();
                              }
                              return new Date(lastHpTest).toLocaleDateString();
                            })()}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">Next HP Test Due</p>
                          <p className="text-xs font-medium text-gray-900 mt-0.5">
                            {(asset.nextHPTestDueDate || asset.testing_schedule?.next_hp_test_due_date)
                              ? new Date(asset.nextHPTestDueDate || asset.testing_schedule?.next_hp_test_due_date).toLocaleDateString()
                              : "-"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">HP Test Frequency</p>
                          <p className="text-xs font-medium text-gray-900 mt-0.5">
                            {(asset.testFrequencyMonths || asset.testing_schedule?.test_frequency_months)
                              ? `${asset.testFrequencyMonths || asset.testing_schedule?.test_frequency_months} Months`
                              : "-"}
                          </p>
                        </div>

                        {/* Refill Schedule */}
                        <div>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">Last Refill Date</p>
                          <p className="text-xs font-medium text-gray-900 mt-0.5">
                            {(() => {
                              const lastRefill = asset.lastRefillDate || asset.testing_schedule?.last_refill_date;
                              if (!lastRefill) return "-";
                              // Handle both single date and array of dates
                              if (Array.isArray(lastRefill) && lastRefill.length > 0) {
                                return new Date(lastRefill[lastRefill.length - 1]).toLocaleDateString();
                              }
                              return new Date(lastRefill).toLocaleDateString();
                            })()}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">Next Refill Date</p>
                          <p className="text-xs font-medium text-gray-900 mt-0.5">
                            {(asset.nextRefillDate || asset.testing_schedule?.next_refill_date)
                              ? new Date(asset.nextRefillDate || asset.testing_schedule?.next_refill_date).toLocaleDateString()
                              : "-"}
                          </p>
                        </div>
                      </>
                    )}

                    {/* AMC Schedule */}
                    {(scheduler?.startDate || asset.amcStartDate) && (
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">AMC Start</p>
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-medium text-gray-900 mt-0.5">{new Date(scheduler?.startDate || asset.amcStartDate).toLocaleDateString()}</span>
                          {scheduler?.startDate && <span className="text-[8px] text-blue-600 bg-blue-50 px-1 rounded">SCHEDULER</span>}
                        </div>
                      </div>
                    )}
                    {(scheduler?.endDate || asset.amcEndDate) && (
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">AMC End</p>
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-medium text-gray-900 mt-0.5">{new Date(scheduler?.endDate || asset.amcEndDate).toLocaleDateString()}</span>
                          {scheduler?.endDate && <span className="text-[8px] text-blue-600 bg-blue-50 px-1 rounded">SCHEDULER</span>}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* ───── Lifecycle Cost & Tracking ───── */}
              <Card className="shadow-sm">
                <CardContent className="p-0">
                  {/* Header */}
                  <div className="flex items-center justify-between px-3 py-2 border-b">
                    <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                      <IndianRupee className="h-3.5 w-3.5 text-orange-500" />
                      Lifecycle Cost &amp; Tracking
                    </h2>
                    {isLoadingLifecycle && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                  </div>

                  {/* Stat Pills Row */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-0 divide-x divide-y md:divide-y-0 border-b">
                    {/* BM Tickets */}
                    <div className="flex items-center gap-2 px-3 py-2.5">
                      <div className="flex items-center justify-center h-7 w-7 rounded-md bg-red-50 shrink-0">
                        <Wrench className="h-3.5 w-3.5 text-red-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold leading-none">BM Tickets</p>
                        <p className="text-base font-bold text-gray-900 leading-snug">
                          {isLoadingLifecycle ? '…' : lifecycleStats?.summary?.bm_tickets?.total ?? 0}
                          <span className="text-[10px] font-normal text-muted-foreground ml-1">
                            ({lifecycleStats?.summary?.bm_tickets?.completed ?? 0} done)
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Refill Tickets */}
                    <div className="flex items-center gap-2 px-3 py-2.5">
                      <div className="flex items-center justify-center h-7 w-7 rounded-md bg-blue-50 shrink-0">
                        <Droplets className="h-3.5 w-3.5 text-blue-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold leading-none">Refills</p>
                        <p className="text-base font-bold text-gray-900 leading-snug">
                          {isLoadingLifecycle ? '…' : lifecycleStats?.summary?.refill_tickets?.total ?? 0}
                          <span className="text-[10px] font-normal text-muted-foreground ml-1">
                            ({lifecycleStats?.summary?.refill_tickets?.completed ?? 0} done)
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Spares Consumed */}
                    <div className="flex items-center gap-2 px-3 py-2.5">
                      <div className="flex items-center justify-center h-7 w-7 rounded-md bg-amber-50 shrink-0">
                        <Boxes className="h-3.5 w-3.5 text-amber-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold leading-none">Spares Used</p>
                        <p className="text-base font-bold text-gray-900 leading-snug">
                          {isLoadingLifecycle ? '…' : lifecycleStats?.summary?.total_spare_qty ?? 0}
                          <span className="text-[10px] font-normal text-muted-foreground ml-1">
                            ({lifecycleStats?.summary?.unique_spare_types ?? 0} types)
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Spare Cost */}
                    <div className="flex items-center gap-2 px-3 py-2.5">
                      <div className="flex items-center justify-center h-7 w-7 rounded-md bg-emerald-50 shrink-0">
                        <IndianRupee className="h-3.5 w-3.5 text-emerald-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold leading-none">Spare Cost</p>
                        <p className="text-base font-bold text-gray-900 leading-snug">
                          {isLoadingLifecycle ? '…' : `₹${Number(lifecycleStats?.summary?.total_spare_cost ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="px-3 py-2">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Event Timeline</p>
                    {isLoadingLifecycle ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        <span className="ml-2 text-xs text-muted-foreground">Loading timeline…</span>
                      </div>
                    ) : !lifecycleStats || lifecycleStats.timeline?.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic py-2">No lifecycle events yet.</p>
                    ) : (
                      <>
                        <div className="relative border-l-2 border-gray-100 ml-2 space-y-0">
                          {lifecycleStats.timeline.map((event: any, idx: number) => {
                            const typeMeta: Record<string, { color: string; bg: string; icon: any; label: string }> = {
                              BM:      { color: 'text-red-600',    bg: 'bg-red-500',    icon: Wrench,       label: 'BM' },
                              REFILL:  { color: 'text-blue-600',   bg: 'bg-blue-500',   icon: Droplets,     label: 'Refill' },
                              INSTALL: { color: 'text-purple-600', bg: 'bg-purple-500', icon: Package,      label: 'Install' },
                              SPARE:   { color: 'text-amber-600',  bg: 'bg-amber-400',  icon: Boxes,        label: 'Spare' },
                              TICKET:  { color: 'text-gray-600',   bg: 'bg-gray-400',   icon: CheckCircle2, label: 'Ticket' },
                            };
                            const meta = typeMeta[event.type] || typeMeta.TICKET;
                            const IconComponent = meta.icon;

                            const statusColors: Record<string, string> = {
                              'Completed':           'bg-green-50 text-green-700 border-green-100',
                              'In Progress':         'bg-blue-50 text-blue-700 border-blue-100',
                              'Pending':             'bg-yellow-50 text-yellow-700 border-yellow-100',
                              'Waiting for spare':   'bg-orange-50 text-orange-700 border-orange-100',
                              'Consumed':            'bg-emerald-50 text-emerald-700 border-emerald-100',
                              'Rejected':            'bg-red-50 text-red-700 border-red-100',
                            };

                            return (
                              <div key={event.id || idx} className="relative flex items-start gap-2.5 pl-5 pb-2.5">
                                {/* Dot on the timeline line */}
                                <span className={`absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full ${meta.bg} border-2 border-white shadow-sm shrink-0`} />
                                {/* Icon bubble */}
                                <span className={`flex items-center justify-center h-5 w-5 rounded-md bg-gray-50 border shrink-0 mt-0.5`}>
                                  <IconComponent className={`h-3 w-3 ${meta.color}`} />
                                </span>
                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <p className="text-xs font-medium text-gray-800 truncate">{event.label}</p>
                                    <div className="flex items-center gap-1 shrink-0">
                                      {event.status && (
                                        <span className={`text-[9px] font-bold px-1 py-0.5 rounded border uppercase ${statusColors[event.status] || 'bg-gray-50 text-gray-600 border-gray-100'}`}>
                                          {event.status}
                                        </span>
                                      )}
                                      {event.cost && (
                                        <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-100">
                                          ₹{Number(event.cost).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                        </span>
                                      )}
                                      {event.total_spare_cost > 0 && (
                                        <span className="text-[9px] font-semibold text-amber-700 bg-amber-50 px-1 py-0.5 rounded border border-amber-100">
                                          ₹{Number(event.total_spare_cost).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className={`text-[9px] font-bold ${meta.color} uppercase`}>{meta.label}</span>
                                    {event.ticket_code && <span className="text-[9px] text-muted-foreground font-mono">{event.ticket_code}</span>}
                                    <span className="text-[9px] text-muted-foreground ml-auto">
                                      {event.date ? new Date(event.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : ''}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {((lifecycleStats?.summary?.total_tickets || 0) + (lifecycleStats?.summary?.total_spare_events || 0)) > 5 && (
                          <button
                            onClick={() => setIsTimelineSheetOpen(true)}
                            className="flex items-center gap-1 text-[10px] font-medium text-orange-600 hover:text-orange-700 mt-2 ml-5 transition-colors"
                          >
                            <ChevronDown className="h-3 w-3" /> View All {((lifecycleStats?.summary?.total_tickets || 0) + (lifecycleStats?.summary?.total_spare_events || 0))} Events
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Documents & History Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Documents (Half Width) */}
                <Card className="shadow-sm">
                  <CardContent className="p-3">
                    <h2 className="text-sm font-semibold mb-3 pb-1 border-b text-gray-800">Documents</h2>
                    {asset.documents && asset.documents.length > 0 ? (
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {asset.documents.map((doc: any, index: number) => {
                          const docUrl = doc.documentUrl || doc.document_url;
                          const isImage = docUrl?.startsWith('data:image') ||
                            docUrl?.includes('.png') ||
                            docUrl?.includes('.jpg') ||
                            docUrl?.includes('.jpeg') ||
                            docUrl?.includes('.gif');
                          return (
                            <div key={doc.id || index} className="flex items-center justify-between p-2 rounded border bg-gray-50 hover:bg-white transition-colors">
                              <div className="flex items-center gap-2 min-w-0">
                                <FileText className="h-4 w-4 text-primary/70 shrink-0" />
                                <p className="text-xs font-medium truncate" title={doc.description}>{doc.description || `Doc ${index + 1}`}</p>
                              </div>
                              <div className="flex gap-1 shrink-0">
                                {docUrl && (
                                  <button onClick={() => handleViewDocument(docUrl)} className="p-1 hover:bg-gray-200 rounded text-blue-600" title="View">
                                    <Eye className="h-3 w-3" />
                                  </button>
                                )}
                                <button onClick={() => handleDownloadDocument(doc, index)} className="p-1 hover:bg-gray-200 rounded text-blue-600" title="Download">
                                  <Download className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">No documents attached.</p>
                    )}
                  </CardContent>
                </Card>

                {/* Service History (Half Width) */}
                <Card className="shadow-sm">
                  <CardContent className="p-0">
                    <div className="px-3 py-2 border-b">
                      <h2 className="text-sm font-semibold text-gray-800">Recent Service</h2>
                    </div>
                    <div className="rounded-none border-0">
                      <div className="divide-y max-h-48 overflow-y-auto">
                        {(() => {
                          // Use recentServices from asset response, fallback to serviceHistory state
                          const services = asset?.recentServices || serviceHistory || [];

                          if (services.length === 0) {
                            return <p className="p-4 text-center text-xs text-gray-500">No service history.</p>;
                          }

                          return services.slice(0, showAllServices ? undefined : 5).map((service: any) => {
                            const serviceDate = service.scheduledDate || service.scheduled_date;
                            const serviceType = service.inspectionType || service.inspection_type || '-';
                            const serviceStatus = service.status || 'PENDING';
                            const technicianName = service.technicianName || service.technician_name || service.technician?.user?.name || 'Unassigned';

                            return (
                              <div key={service.id} className="p-2 text-xs hover:bg-gray-50 flex items-center justify-between">
                                <div>
                                  <p className="font-medium text-gray-900">{serviceDate ? new Date(serviceDate).toLocaleDateString() : '-'}</p>
                                  <p className="text-[10px] text-gray-500 capitalize">{serviceType}</p>
                                </div>
                                <div className="text-right">
                                  <span className={`inline-flex px-1.5 py-0.5 rounded-[3px] text-[10px] font-bold uppercase ${serviceStatus === 'COMPLETED' || serviceStatus === 'APPROVED'
                                    ? 'bg-green-50 text-green-700 border border-green-100'
                                    : serviceStatus === 'SUBMITTED' || serviceStatus === 'PENDING'
                                      ? 'bg-yellow-50 text-yellow-700 border border-yellow-100'
                                      : 'bg-gray-50 text-gray-700 border border-gray-100'
                                    }`}>
                                    {serviceStatus}
                                  </span>
                                  <p className="text-[10px] text-gray-400 mt-0.5">{technicianName}</p>
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                    {((asset?.recentServices?.length || serviceHistory.length) > 5) && (
                      <div className="p-1 text-center border-t">
                        <button
                          onClick={() => setShowAllServices(!showAllServices)}
                          className="text-[10px] text-blue-600 font-medium hover:underline"
                        >
                          {showAllServices ? 'Collapse' : 'View All'}
                        </button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

            </div>
          </div>
        </div>
      </div>

      <Dialog open={showSpareLog} onOpenChange={setShowSpareLog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Spare Parts Consumption Log</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {spareHistory.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No spares have been consumed for this asset via Breakdown Maintenance.</p>
            ) : (
              <div className="relative border-l border-slate-200 ml-4 pl-6 space-y-6">
                {spareHistory.map((spare: any, idx: number) => (
                  <div key={idx} className="relative">
                    <div className="absolute -left-[31px] top-1 h-4 w-4 rounded-full bg-orange-500 border-4 border-white shadow-sm" />
                    <div className="bg-slate-50 border rounded-lg p-4 shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold text-slate-800">{spare.inventory?.item_name || 'Unknown Item'}</h4>
                          <p className="text-xs text-muted-foreground mt-0.5">Consumed on: {new Date(spare.consumed_at).toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                            Qty: {spare.quantity}
                          </span>
                        </div>
                      </div>
                      <div className="text-sm text-slate-600 mt-2 border-t pt-2 border-slate-100">
                        <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                          <div>
                            <span className="font-semibold block text-slate-500">Ticket</span>
                            <a href={`/manager/tickets/${spare.ticket_id}`} target="_blank" className="text-blue-600 hover:underline">{spare.ticket?.ticketId || spare.ticket_id}</a>
                          </div>
                          <div>
                            <span className="font-semibold block text-slate-500">Technician</span>
                            <span>{spare.consumedBy?.name || 'Technician'}</span>
                          </div>
                        </div>
                        {spare.remarks && (
                          <div className="mt-3 bg-white p-2 rounded border border-slate-100 italic text-xs">
                            "{spare.remarks}"
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Sheet open={isTimelineSheetOpen} onOpenChange={setIsTimelineSheetOpen}>
        <SheetContent side="right" className="sm:max-w-md w-full overflow-y-auto bg-white p-0 flex flex-col h-full shadow-xl">
          <SheetHeader className="p-6 pb-5 border-b sticky top-0 bg-white z-10 shrink-0 shadow-sm">
            <div className="flex justify-between flex-row items-center mb-1.5 mt-2">
              <SheetTitle className="text-xl font-extrabold text-slate-800">Lifecycle Timeline</SheetTitle>
              <Select value={timelineFilter} onValueChange={(val) => setTimelineFilter(val)}>
                <SelectTrigger className="w-[145px] h-8 text-xs font-semibold bg-slate-50 border-slate-200">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Events</SelectItem>
                  <SelectItem value="TICKET">All Tickets</SelectItem>
                  <SelectItem value="BM">Breakdown Maint.</SelectItem>
                  <SelectItem value="REFILL">Refill Tickets</SelectItem>
                  <SelectItem value="SPARE">Spares Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-slate-500 font-medium">Complete history for <span className="font-mono text-slate-700 bg-slate-100 px-1 py-0.5 rounded">{asset.assetId || asset.asset_code}</span></p>
          </SheetHeader>

          <div className="flex-1 p-6 relative bg-slate-50/50">
            {isLoadingMoreTimeline && timelineEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                 <Loader2 className="h-6 w-6 text-slate-400 animate-spin mb-3" />
                 <p className="text-sm text-slate-500 font-medium tracking-wide">Loading historical records...</p>
              </div>
            ) : timelineEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                 <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                   <Clock className="w-5 h-5 text-slate-400" />
                 </div>
                 <h3 className="text-sm font-semibold text-slate-700">No events found</h3>
                 <p className="text-xs text-slate-500 mt-1 max-w-[200px] leading-relaxed">There are no records matching the selected filter category.</p>
              </div>
            ) : (
              <div className="relative border-l-[3px] border-slate-200 ml-4 space-y-7 pb-10">
                {timelineEvents.map((event: any, idx: number) => {
                  const typeMeta: Record<string, { color: string; bg: string; icon: any; label: string }> = {
                    BM:      { color: 'text-white',    bg: 'bg-rose-500 border-rose-200',    icon: Wrench,       label: 'BM Ticket' },
                    REFILL:  { color: 'text-white',   bg: 'bg-blue-500 border-blue-200',   icon: Droplets,     label: 'Refill Ticket' },
                    INSTALL: { color: 'text-white', bg: 'bg-purple-500 border-purple-200', icon: Package,      label: 'Installation' },
                    SPARE:   { color: 'text-slate-700',  bg: 'bg-amber-400 border-amber-200',  icon: Boxes,        label: 'Spare Consumed' },
                    TICKET:  { color: 'text-white',   bg: 'bg-slate-600 border-slate-300',   icon: CheckCircle2, label: 'Ticket' },
                  };
                  const meta = typeMeta[event.type] || typeMeta.TICKET;
                  const IconComponent = meta.icon;

                  const statusColors: Record<string, string> = {
                    'Completed':           'bg-emerald-50 text-emerald-700 border-emerald-200',
                    'In Progress':         'bg-blue-50 text-blue-700 border-blue-200',
                    'Pending':             'bg-amber-50 text-amber-700 border-amber-200',
                    'Waiting for spare':   'bg-orange-50 text-orange-700 border-orange-200',
                    'Consumed':            'bg-emerald-50 text-emerald-700 border-emerald-200',
                    'Rejected':            'bg-red-50 text-red-700 border-red-200',
                  };

                  return (
                    <div key={`${event.id}-${idx}`} className="relative pl-6">
                      {/* Timeline Dot with Icon */}
                      <span className={`absolute -left-[14px] top-0 flex items-center justify-center h-7 w-7 rounded-full shadow-sm border-2 ${meta.bg}`}>
                        <IconComponent className={`h-3.5 w-3.5 ${meta.color}`} />
                      </span>
                      
                      {/* Event Card */}
                      <div className="bg-white rounded-lg border border-slate-200/60 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 p-4 group">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <h4 className="text-sm font-semibold text-slate-800 leading-snug flex-1">{event.label}</h4>
                          <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded flex-shrink-0 uppercase tracking-widest border ${statusColors[event.status] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                            {event.status || 'Done'}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
                           <div>
                             <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-1 block">Date</span>
                             <span className="font-semibold text-slate-700 flex items-center gap-1.5"><Clock className="w-3 h-3 text-slate-400"/> {event.date ? new Date(event.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric'}) : '-'}</span>
                           </div>
                           <div>
                             <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-1 block">Type</span>
                             <span className="font-semibold text-slate-700">{meta.label}</span>
                           </div>
                           
                           {event.cost && event.cost > 0 && (
                             <div>
                               <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-1 block">Cost</span>
                               <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 flex items-center w-fit">
                                 ₹{Number(event.cost).toLocaleString()}
                               </span>
                             </div>
                           )}
                           
                           {event.total_spare_cost && event.total_spare_cost > 0 && (
                             <div>
                               <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-1 block">Spares Cost</span>
                               <span className="font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 flex items-center w-fit">
                                 ₹{Number(event.total_spare_cost).toLocaleString()}
                               </span>
                             </div>
                           )}

                           {event.ticket_code && (
                             <div className="col-span-2 pt-2 border-t border-slate-100 mt-1 flex justify-between items-center">
                               <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Reference ID</span>
                               <a href={`/admin/tickets/${event.ticket_code}`} target="_blank" className="font-mono text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline bg-blue-50/50 px-2 py-0.5 rounded transition-colors">{event.ticket_code}</a>
                             </div>
                           )}
                           {event.remarks && (
                             <div className="col-span-2 pt-2 border-t border-slate-100 mt-1">
                               <p className="text-slate-600 italic text-[11px] leading-relaxed">"{event.remarks}"</p>
                             </div>
                           )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            {/* Load More Button */}
            {timelinePage < timelineTotalPages && (
              <div className="pt-2 pb-6 flex justify-center sticky bottom-4">
                <Button 
                  onClick={() => fetchTimeline(timelinePage + 1)} 
                  disabled={isLoadingMoreTimeline}
                  variant="outline"
                  className="rounded-full shadow bg-white border-slate-200 hover:bg-slate-50 font-semibold px-6 min-w-[160px]"
                  size="sm"
                >
                  {isLoadingMoreTimeline ? <Loader2 className="h-4 w-4 mr-2 animate-spin text-orange-500" /> : <ChevronDown className="h-4 w-4 mr-1 text-slate-400 group-hover:text-slate-600" />}
                  {isLoadingMoreTimeline ? 'Loading...' : 'Load Older Events'}
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
