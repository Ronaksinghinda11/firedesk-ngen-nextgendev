// import { useState, useEffect } from "react";
// import { useNavigate, useParams } from "react-router-dom";
// import { Button } from "@/components/ui/button";
// import { Card, CardContent } from "@/components/ui/card";
// import { ArrowLeft, Edit, Trash2 } from "lucide-react";
// import { api } from "@/lib/api";
// import { useToast } from "@/hooks/use-toast";
// import { Badge } from "@/components/ui/badge";

// export default function PlantView() {
//   const navigate = useNavigate();
//   const { id } = useParams();
//   const { toast } = useToast();
//   const [plant, setPlant] = useState<any>(null);
//   const [isLoading, setIsLoading] = useState(true);

//   useEffect(() => {
//     if (id) {
//       fetchPlant();
//     }
//   }, [id]);

//   const fetchPlant = async () => {
//     try {
//       setIsLoading(true);
//       const response = await api.get(`/plant/${id}`) as any;
      
//       if (response.success) {
//         setPlant(response.plant);
//       } else {
//         throw new Error(response.message || "Failed to fetch plant");
//       }
//     } catch (error: any) {
//       console.error('Failed to fetch plant:', error);
//       toast({
//         title: "Error",
//         description: error.response?.data?.message || error.message || "Failed to load plant details.",
//         variant: "destructive",
//       });
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const handleDelete = async () => {
//     if (!confirm('Are you sure you want to delete this plant?')) return;
    
//     try {
//       const response = await api.delete(`/plant/${id}`) as any;
      
//       if (response.success) {
//         toast({
//           title: "Success",
//           description: response.message || "Plant deleted successfully!",
//         });
//         navigate('/admin/plants');
//       } else {
//         throw new Error(response.message || "Failed to delete plant");
//       }
//     } catch (error: any) {
//       toast({
//         title: "Error",
//         description: error.response?.data?.message || error.message || "Failed to delete plant",
//         variant: "destructive",
//       });
//     }
//   };

//   const getStatusBadge = (status: string) => {
//     const statusColors = {
//       Active: "bg-green-500/10 text-green-700 border-green-500/20",
//       Deactive: "bg-red-500/10 text-red-700 border-red-500/20",
//       Draft: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
//     };

//     return (
//       <Badge 
//         variant="outline" 
//         className={statusColors[status as keyof typeof statusColors] || ""}
//       >
//         {status}
//       </Badge>
//     );
//   };

//   if (isLoading) {
//     return (
//       <div className="flex items-center justify-center h-full">
//         <div className="flex items-center gap-2">
//           <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
//           <p className="text-muted-foreground">Loading plant details...</p>
//         </div>
//       </div>
//     );
//   }

//   if (!plant) {
//     return (
//       <div className="flex flex-col items-center justify-center h-full">
//         <p className="text-muted-foreground mb-4">Plant not found</p>
//         <Button onClick={() => navigate('/admin/plants')}>
//           Back to Plants
//         </Button>
//       </div>
//     );
//   }

//   return (
//     <div className="flex-1 flex flex-col bg-background">
//       {/* Breadcrumb */}
//       <div className="px-6 py-3 border-b border-border bg-card">
//         <p className="text-sm text-muted-foreground">Home / Plants / View Plant</p>
//       </div>

//       {/* Main Content */}
//       <div className="flex-1 overflow-auto">
//         <div className="max-w-7xl mx-auto p-6">
//           {/* Header */}
//           <div className="flex items-center justify-between mb-6">
//             <div className="flex items-center gap-4">
//               <Button
//                 variant="ghost"
//                 size="sm"
//                 onClick={() => navigate('/admin/plants')}
//               >
//                 <ArrowLeft className="h-4 w-4 mr-2" />
//                 Back
//               </Button>
//               <div>
//                 <h1 className="text-2xl font-semibold text-foreground">{plant.plantName}</h1>
//                 <p className="text-sm text-muted-foreground">Plant ID: {plant.id}</p>
//               </div>
//             </div>
//             <div className="flex items-center gap-2">
//               {getStatusBadge(plant.status)}
//               <Button
//                 variant="outline"
//                 size="sm"
//                 onClick={() => navigate(`/admin/plants/${id}/edit`)}
//               >
//                 <Edit className="h-4 w-4 mr-2" />
//                 Edit
//               </Button>
//               <Button
//                 variant="destructive"
//                 size="sm"
//                 onClick={handleDelete}
//               >
//                 <Trash2 className="h-4 w-4 mr-2" />
//                 Delete
//               </Button>
//             </div>
//           </div>

//           {/* Plant Details */}
//           <div className="grid gap-6">
//             {/* Basic Info */}
//             <Card>
//               <CardContent className="pt-6">
//                 <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
//                 <div className="grid grid-cols-2 gap-4">
//                   <div>
//                     <p className="text-sm text-muted-foreground">Plant Name</p>
//                     <p className="font-medium">{plant.plantName}</p>
//                   </div>
//                   <div>
//                     <p className="text-sm text-muted-foreground">Plant ID</p>
//                     <p className="font-medium">{plant.id}</p>
//                   </div>
//                   <div>
//                     <p className="text-sm text-muted-foreground">Address</p>
//                     <p className="font-medium">{plant.address}</p>
//                   </div>
//                   <div>
//                     <p className="text-sm text-muted-foreground">City</p>
//                     <p className="font-medium">{plant.city?.cityName || '-'}</p>
//                   </div>
//                   <div>
//                     <p className="text-sm text-muted-foreground">State</p>
//                     <p className="font-medium">{plant.state?.stateName || '-'}</p>
//                   </div>
//                   <div>
//                     <p className="text-sm text-muted-foreground">ZIP Code</p>
//                     <p className="font-medium">{plant.zipCode || '-'}</p>
//                   </div>
//                   <div>
//                     <p className="text-sm text-muted-foreground">Industry</p>
//                     <p className="font-medium">{plant.industry?.industryName || '-'}</p>
//                   </div>
//                   <div>
//                     <p className="text-sm text-muted-foreground">GST Number</p>
//                     <p className="font-medium">{plant.gstNo || '-'}</p>
//                   </div>
//                 </div>
//               </CardContent>
//             </Card>

//             {/* Premises Info */}
//             {(plant.mainBuildings || plant.totalPlantArea) && (
//               <Card>
//                 <CardContent className="pt-6">
//                   <h3 className="text-lg font-semibold mb-4">Premises Information</h3>
//                   <div className="grid grid-cols-2 gap-4">
//                     {plant.mainBuildings !== null && (
//                       <div>
//                         <p className="text-sm text-muted-foreground">Main Buildings</p>
//                         <p className="font-medium">{plant.mainBuildings}</p>
//                       </div>
//                     )}
//                     {plant.subBuildings !== null && (
//                       <div>
//                         <p className="text-sm text-muted-foreground">Sub Buildings</p>
//                         <p className="font-medium">{plant.subBuildings}</p>
//                       </div>
//                     )}
//                     {plant.totalPlantArea && (
//                       <div>
//                         <p className="text-sm text-muted-foreground">Total Plant Area</p>
//                         <p className="font-medium">{plant.totalPlantArea} sq ft</p>
//                       </div>
//                     )}
//                     {plant.totalBuildUpArea && (
//                       <div>
//                         <p className="text-sm text-muted-foreground">Total Build-up Area</p>
//                         <p className="font-medium">{plant.totalBuildUpArea} sq ft</p>
//                       </div>
//                     )}
//                   </div>
//                 </CardContent>
//               </Card>
//             )}

//             {/* Managers */}
//             {plant.managers && plant.managers.length > 0 && (
//               <Card>
//                 <CardContent className="pt-6">
//                   <h3 className="text-lg font-semibold mb-4">Assigned Managers</h3>
//                   <div className="space-y-2">
//                     {plant.managers.map((manager: any, index: number) => (
//                       <div key={manager.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
//                         <div>
//                           <p className="font-medium">{manager.user?.name || 'Unknown Manager'}</p>
//                           <p className="text-sm text-muted-foreground">{manager.user?.email || ''}</p>
//                         </div>
//                       </div>
//                     ))}
//                   </div>
//                 </CardContent>
//               </Card>
//             )}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }