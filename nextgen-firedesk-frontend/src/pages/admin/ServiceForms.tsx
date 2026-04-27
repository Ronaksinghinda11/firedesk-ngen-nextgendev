import React, { useState, useMemo } from 'react';
import { 
  Check, 
  Search, 
  FileText,
  MoreVertical,
  ArrowLeft,
  Filter,
  Download,
  X,
  Table as TableIcon
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MultiSelect } from '@/components/MultiSelect';
import { questionApi } from '@/services/api/questionApi';
import { plantService } from '@/services/plant.service';
import { api } from '@/lib/api';

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'CRITICAL': return 'text-red-500';
    case 'HIGH': return 'text-orange-500';
    case 'MEDIUM': return 'text-amber-500';
    case 'LOW': return 'text-emerald-500';
    default: return 'text-gray-900';
  }
};

const mapSeverityToPriority = (severity: string) => {
  if (!severity) return 'LOW';
  switch (severity.toLowerCase()) {
    case 'critical': return 'CRITICAL';
    case 'high': return 'HIGH';
    case 'medium': return 'MEDIUM';
    case 'low': return 'LOW';
    default: return 'LOW';
  }
};

const ConditionBadge = ({ condition }: { condition: any }) => {
  if (!condition) return <span className="text-gray-400 font-bold ml-1">-</span>;
  return (
    <div className="flex items-center justify-between bg-gray-50 rounded-md px-2.5 py-1.5 text-[10px] border border-gray-200 w-full min-w-[140px] shadow-sm">
      <span className="font-bold text-gray-700 tracking-wide truncate mr-2">{condition.name.replace('_', ' ')}</span>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className={`font-bold uppercase ${getPriorityColor(condition.priority)}`}>{condition.priority}</span>
        <span className="text-gray-400 font-medium">P:{condition.points || 0}</span>
      </div>
    </div>
  )
};

export default function ServiceForms() {
  const [searchTerm, setSearchTerm] = useState("");
  
  // PDF Modal Filter States
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [pdfPlantFilter, setPdfPlantFilter] = useState<string[]>([]);
  const [pdfCategoryFilter, setPdfCategoryFilter] = useState<string[]>([]);
  const [pdfProductFilter, setPdfProductFilter] = useState<string[]>([]);
  const [pdfFrequencyFilter, setPdfFrequencyFilter] = useState<string[]>([]);
  const [pdfPriorityFilter, setPdfPriorityFilter] = useState<string[]>([]);
  const [pdfRequiredFilter, setPdfRequiredFilter] = useState<string[]>([]); 
  const [pdfPhotoFilter, setPdfPhotoFilter] = useState<string[]>([]);
  
  const [pdfPaperSize, setPdfPaperSize] = useState("A4");
  const [pdfOrientation, setPdfOrientation] = useState("Landscape");
  const [isExporting, setIsExporting] = useState(false);

  // Filter States
  const [plantFilter, setPlantFilter] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [productFilter, setProductFilter] = useState<string[]>([]);
  const [frequencyFilter, setFrequencyFilter] = useState<string[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<string[]>([]);
  const [requiredFilter, setRequiredFilter] = useState<string[]>([]); 
  const [photoFilter, setPhotoFilter] = useState<string[]>([]);

  // Column Drag/Resize States
  const [colWidths, setColWidths] = useState({
    text: 400,
    category: 160,
    products: 200,
    frequencies: 200,
    serviceType: 130,
    helpText: 350,
    condition: 220,
    required: 96,
    photo: 96,
    standard: 100,
  });

  const handleResize = (col: keyof typeof colWidths, e: React.MouseEvent, startWidth: number) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.pageX;
    const onMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(60, startWidth + moveEvent.pageX - startX);
      setColWidths(prev => ({ ...prev, [col]: newWidth }));
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  // Queries
  const { data: questionsResponse, isLoading: isQuestionsLoading } = useQuery({
    queryKey: ['questions', 'master-list'],
    queryFn: () => questionApi.getAll()
  });

  const { data: plantsResponse } = useQuery({
    queryKey: ['plants'],
    queryFn: () => plantService.getAllPlants()
  });

  const plants = useMemo(() => {
    if (Array.isArray(plantsResponse)) return plantsResponse;
    return plantsResponse?.plants || [];
  }, [plantsResponse]);

  const flatData = useMemo(() => {
    const rawQuestions = questionsResponse?.data || [];
    return rawQuestions.map(q => {
      // Find plant name
      const plantId = q.plant_id || (q as any).plantId || null;
      let plantName = 'All Plants'; // Global
      if (plantId) {
        const foundPlant = plants.find((p: any) => p.id === plantId || p._id === plantId || p.plantId === plantId);
        if (foundPlant) plantName = foundPlant.plantName || foundPlant.plant_name || foundPlant.name || 'Unknown Plant';
      }

      return {
        id: q.id,
        text: q.question_text,
        plant: plantName,
        category: q.categories?.[0]?.category_name || '-',
        products: (q.products || []).map((p: any) => p.product_name),
        frequencies: (q.frequencies || []).map((f: any) => f.frequency_name),
        serviceType: q.service_type || '-',
        helpText: q.help_text || '-',
        condition: q.conditions?.[0] ? { 
          name: q.conditions[0].condition_name, 
          priority: mapSeverityToPriority(q.conditions[0].severity_level), 
          points: q.conditions[0].priority_score 
        } : null,
        required: q.is_mandatory,
        photo: q.requires_photo,
        standard: q.standards || '-'
      };
    });
  }, [questionsResponse, plants]);

  // Derived filter options based on actual data (Main View)
  const {
    plantOptions, categoryOptions, productOptions, freqOptions
  } = useMemo(() => {
    const pSet = new Set<string>();
    const cSet = new Set<string>();
    const prSet = new Set<string>();
    const fSet = new Set<string>();

    flatData.forEach(row => {
      if (row.plant) pSet.add(row.plant);

      const plantMatch = plantFilter.length === 0 || plantFilter.includes(row.plant);
      if (plantMatch) {
         if (row.category && row.category !== '-') cSet.add(row.category);
      }

      const categoryMatch = categoryFilter.length === 0 || categoryFilter.includes(row.category);
      if (plantMatch && categoryMatch) {
         row.products.forEach((p: string) => prSet.add(p));
      }

      const productMatch = productFilter.length === 0 || row.products.some((p: string) => productFilter.includes(p));
      if (plantMatch && categoryMatch && productMatch) {
         row.frequencies.forEach((f: string) => fSet.add(f));
      }
    });

    return {
      plantOptions: Array.from(pSet).sort().map(p => ({ label: p, value: p })),
      categoryOptions: Array.from(cSet).sort().map(c => ({ label: c, value: c })),
      productOptions: Array.from(prSet).sort().map(p => ({ label: p, value: p })),
      freqOptions: Array.from(fSet).sort().map(f => ({ label: f, value: f }))
    };
  }, [flatData, plantFilter, categoryFilter, productFilter]);

  // Clear stale selections for Main View
  React.useEffect(() => {
    setCategoryFilter(prev => prev.filter(c => categoryOptions.some(o => o.value === c)));
    setProductFilter(prev => prev.filter(p => productOptions.some(o => o.value === p)));
    setFrequencyFilter(prev => prev.filter(f => freqOptions.some(o => o.value === f)));
  }, [categoryOptions, productOptions, freqOptions]);

  // Derived filter options based on actual data (PDF Modal)
  const {
    pdfPlantOptions, pdfCategoryOptions, pdfProductOptions, pdfFreqOptions
  } = useMemo(() => {
    const pSet = new Set<string>();
    const cSet = new Set<string>();
    const prSet = new Set<string>();
    const fSet = new Set<string>();

    flatData.forEach(row => {
      if (row.plant) pSet.add(row.plant);

      const plantMatch = pdfPlantFilter.length === 0 || pdfPlantFilter.includes(row.plant);
      if (plantMatch) {
         if (row.category && row.category !== '-') cSet.add(row.category);
      }

      const categoryMatch = pdfCategoryFilter.length === 0 || pdfCategoryFilter.includes(row.category);
      if (plantMatch && categoryMatch) {
         row.products.forEach((p: string) => prSet.add(p));
      }

      const productMatch = pdfProductFilter.length === 0 || row.products.some((p: string) => pdfProductFilter.includes(p));
      if (plantMatch && categoryMatch && productMatch) {
         row.frequencies.forEach((f: string) => fSet.add(f));
      }
    });

    return {
      pdfPlantOptions: Array.from(pSet).sort().map(p => ({ label: p, value: p })),
      pdfCategoryOptions: Array.from(cSet).sort().map(c => ({ label: c, value: c })),
      pdfProductOptions: Array.from(prSet).sort().map(p => ({ label: p, value: p })),
      pdfFreqOptions: Array.from(fSet).sort().map(f => ({ label: f, value: f }))
    };
  }, [flatData, pdfPlantFilter, pdfCategoryFilter, pdfProductFilter]);

  // Clear stale selections for PDF Modal
  React.useEffect(() => {
    setPdfCategoryFilter(prev => prev.filter(c => pdfCategoryOptions.some(o => o.value === c)));
    setPdfProductFilter(prev => prev.filter(p => pdfProductOptions.some(o => o.value === p)));
    setPdfFrequencyFilter(prev => prev.filter(f => pdfFreqOptions.some(o => o.value === f)));
  }, [pdfCategoryOptions, pdfProductOptions, pdfFreqOptions]);

  const priorityOptions = [
    { label: 'Critical Priority', value: 'CRITICAL' },
    { label: 'High Priority', value: 'HIGH' },
    { label: 'Medium Priority', value: 'MEDIUM' },
    { label: 'Low Priority', value: 'LOW' }
  ];
  const requiredOptions = [
    { label: 'Required', value: 'yes' },
    { label: 'Optional', value: 'no' }
  ];
  const photoOptions = [
    { label: 'Photo Needed', value: 'yes' },
    { label: 'No Photo Needed', value: 'no' }
  ];

  const getFilteredRows = (
    rows: any[],
    pltFilter: string[],
    catFilter: string[],
    prodFilter: string[],
    freqFilter: string[],
    prioFilter: string[],
    reqFilter: string[],
    phoFilter: string[],
    search: string
  ) => {
    return rows.filter(row => {
      if (search && !row.text.toLowerCase().includes(search.toLowerCase())) return false;
      if (pltFilter.length > 0 && !pltFilter.includes(row.plant)) return false;
      if (catFilter.length > 0 && !catFilter.includes(row.category)) return false;
      if (prodFilter.length > 0 && !row.products.some((p: string) => prodFilter.includes(p))) return false;
      if (freqFilter.length > 0 && !row.frequencies.some((f: string) => freqFilter.includes(f))) return false;
      if (prioFilter.length > 0 && !prioFilter.includes(row.condition?.priority)) return false;
      if (reqFilter.length > 0) {
        const qReq = row.required ? 'yes' : 'no';
        if (!reqFilter.includes(qReq)) return false;
      }
      if (phoFilter.length > 0) {
        const qPhoto = row.photo ? 'yes' : 'no';
        if (!phoFilter.includes(qPhoto)) return false;
      }
      return true;
    });
  };

  const filteredRows = useMemo(() => 
    getFilteredRows(flatData, plantFilter, categoryFilter, productFilter, frequencyFilter, priorityFilter, requiredFilter, photoFilter, searchTerm),
  [flatData, plantFilter, categoryFilter, productFilter, frequencyFilter, priorityFilter, requiredFilter, photoFilter, searchTerm]);

  const pdfFilteredRows = useMemo(() => 
    getFilteredRows(flatData, pdfPlantFilter, pdfCategoryFilter, pdfProductFilter, pdfFrequencyFilter, pdfPriorityFilter, pdfRequiredFilter, pdfPhotoFilter, searchTerm),
  [flatData, pdfPlantFilter, pdfCategoryFilter, pdfProductFilter, pdfFrequencyFilter, pdfPriorityFilter, pdfRequiredFilter, pdfPhotoFilter, searchTerm]);

  const groupedRows = useMemo(() => {
    const groups: Record<string, any[]> = {};
    filteredRows.forEach(row => {
      if (!groups[row.plant]) groups[row.plant] = [];
      groups[row.plant].push(row);
    });
    return groups;
  }, [filteredRows]);

  const openPdfModal = () => {
    setPdfPlantFilter([...plantFilter]);
    setPdfCategoryFilter([...categoryFilter]);
    setPdfProductFilter([...productFilter]);
    setPdfFrequencyFilter([...frequencyFilter]);
    setPdfPriorityFilter([...priorityFilter]);
    setPdfRequiredFilter([...requiredFilter]);
    setPdfPhotoFilter([...photoFilter]);
    setIsPdfModalOpen(true);
  };

  const handleExportPDF = async () => {
    try {
      setIsExporting(true);
      const questionIds = pdfFilteredRows.map(r => r.id);
      if (questionIds.length === 0) {
        alert("No questions selected to export");
        return;
      }
      const response = await questionApi.exportPdf({ 
        questionIds, 
        paperSize: pdfPaperSize, 
        orientation: pdfOrientation 
      });
      // Create download link for Blob
      const url = window.URL.createObjectURL(new Blob([response as unknown as Blob], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Master_Questions_List.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setIsPdfModalOpen(false);
    } catch (error) {
      console.error("Failed to export PDF:", error);
      alert("Failed to export PDF. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  if (isQuestionsLoading) {
    return <div className="p-8 flex items-center justify-center min-h-screen text-gray-500 font-medium">Loading Master Questions List...</div>;
  }

  return (
    <div className="h-screen bg-[#F8FAFC] p-4 md:p-6 font-sans flex flex-col">
      <div className="max-w-[1600px] mx-auto w-full flex flex-col flex-1 min-h-0 space-y-4">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <span className="font-medium text-gray-900">Service Forms</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <TableIcon className="w-6 h-6 text-orange-500" />
              Master Question Grid
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Search questions..." 
                className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent w-full md:w-64 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button 
              onClick={openPdfModal}
              className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-orange-600 px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm whitespace-nowrap"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export PDF</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col gap-2 bg-white p-3 rounded-xl border border-gray-200 shadow-sm shrink-0 relative z-30">
          <div className="flex items-center gap-2 text-gray-500 pb-2 border-b border-gray-100">
            <Filter className="w-4 h-4" />
            <span className="text-sm font-bold uppercase tracking-wider">Filters</span>
            {(plantFilter.length > 0 || categoryFilter.length > 0 || productFilter.length > 0 || frequencyFilter.length > 0 || priorityFilter.length > 0 || requiredFilter.length > 0 || photoFilter.length > 0 || searchTerm) && (
              <button 
                onClick={() => { setPlantFilter([]); setCategoryFilter([]); setProductFilter([]); setFrequencyFilter([]); setPriorityFilter([]); setRequiredFilter([]); setPhotoFilter([]); setSearchTerm(""); }}
                className="text-xs text-orange-600 hover:text-orange-700 font-bold ml-auto px-2 py-1 rounded hover:bg-orange-50 transition-colors"
              >
                Clear All Filters
              </button>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <MultiSelect options={plantOptions} selected={plantFilter} onChange={setPlantFilter} placeholder="All Plants" />
            <MultiSelect options={categoryOptions} selected={categoryFilter} onChange={setCategoryFilter} placeholder="All Categories" />
            <MultiSelect options={productOptions} selected={productFilter} onChange={setProductFilter} placeholder="All Products" />
            <MultiSelect options={freqOptions} selected={frequencyFilter} onChange={setFrequencyFilter} placeholder="All Frequencies" />
            <MultiSelect options={priorityOptions} selected={priorityFilter} onChange={setPriorityFilter} placeholder="All Conditions" />
            <MultiSelect options={requiredOptions} selected={requiredFilter} onChange={setRequiredFilter} placeholder="Required: All" />
            <MultiSelect options={photoOptions} selected={photoFilter} onChange={setPhotoFilter} placeholder="Photo: All" />
          </div>
        </div>

        {/* Excel-like Data Grid */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col flex-1 min-h-0 overflow-hidden relative z-10">
          <div className="overflow-auto flex-1 relative w-full h-full">
            {filteredRows.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500 w-full absolute inset-0">
                <Filter className="w-10 h-10 text-gray-300 mb-3" />
                <p className="font-medium text-gray-700">No questions found</p>
                <p className="text-sm mt-1">Try adjusting your filters or search term</p>
              </div>
            ) : (
              <table className="w-max min-w-full text-left text-sm border-collapse table-fixed">
                <thead className="sticky top-0 z-20 shadow-sm">
                  <tr className="bg-gray-100 text-[11px] font-bold text-gray-600 uppercase tracking-wider divide-x divide-gray-200 border-b border-gray-300">
                    <th className="px-4 py-3 sticky left-0 z-30 bg-gray-100 border-r border-gray-300 relative group" style={{ minWidth: colWidths.text, width: colWidths.text, maxWidth: colWidths.text }}>
                      Question Text
                      <div className="absolute -right-2 top-0 w-4 h-full cursor-col-resize hover:bg-orange-400 opacity-0 group-hover:opacity-100 transition-opacity z-50" onMouseDown={(e) => handleResize('text', e, colWidths.text)} />
                    </th>
                    <th className="px-4 py-3 relative group" style={{ width: colWidths.category }}>
                      Category
                      <div className="absolute right-0 top-0 w-1.5 h-full cursor-col-resize hover:bg-orange-400 opacity-0 group-hover:opacity-100 transition-opacity z-40" onMouseDown={(e) => handleResize('category', e, colWidths.category)} />
                    </th>
                    <th className="px-4 py-3 relative group" style={{ width: colWidths.products }}>
                      Products
                      <div className="absolute right-0 top-0 w-1.5 h-full cursor-col-resize hover:bg-orange-400 opacity-0 group-hover:opacity-100 transition-opacity z-40" onMouseDown={(e) => handleResize('products', e, colWidths.products)} />
                    </th>
                    <th className="px-4 py-3 relative group" style={{ width: colWidths.frequencies }}>
                      Frequencies
                      <div className="absolute right-0 top-0 w-1.5 h-full cursor-col-resize hover:bg-orange-400 opacity-0 group-hover:opacity-100 transition-opacity z-40" onMouseDown={(e) => handleResize('frequencies', e, colWidths.frequencies)} />
                    </th>
                    <th className="px-4 py-3 relative group" style={{ width: colWidths.serviceType }}>
                      Service Type
                      <div className="absolute right-0 top-0 w-1.5 h-full cursor-col-resize hover:bg-orange-400 opacity-0 group-hover:opacity-100 transition-opacity z-40" onMouseDown={(e) => handleResize('serviceType', e, colWidths.serviceType)} />
                    </th>
                    <th className="px-4 py-3 relative group" style={{ minWidth: 250, width: colWidths.helpText }}>
                      Help Text
                      <div className="absolute right-0 top-0 w-1.5 h-full cursor-col-resize hover:bg-orange-400 opacity-0 group-hover:opacity-100 transition-opacity z-40" onMouseDown={(e) => handleResize('helpText', e, colWidths.helpText)} />
                    </th>
                    <th className="px-4 py-3 relative group" style={{ width: colWidths.condition }}>
                      Condition
                      <div className="absolute right-0 top-0 w-1.5 h-full cursor-col-resize hover:bg-orange-400 opacity-0 group-hover:opacity-100 transition-opacity z-40" onMouseDown={(e) => handleResize('condition', e, colWidths.condition)} />
                    </th>
                    <th className="px-4 py-3 text-center relative group" style={{ width: colWidths.required }}>
                      Required
                      <div className="absolute right-0 top-0 w-1.5 h-full cursor-col-resize hover:bg-orange-400 opacity-0 group-hover:opacity-100 transition-opacity z-40" onMouseDown={(e) => handleResize('required', e, colWidths.required)} />
                    </th>
                    <th className="px-4 py-3 text-center relative group" style={{ width: colWidths.photo }}>
                      Photo
                      <div className="absolute right-0 top-0 w-1.5 h-full cursor-col-resize hover:bg-orange-400 opacity-0 group-hover:opacity-100 transition-opacity z-40" onMouseDown={(e) => handleResize('photo', e, colWidths.photo)} />
                    </th>
                    <th className="px-4 py-3 text-center relative group" style={{ width: colWidths.standard }}>
                      Standard
                      <div className="absolute right-0 top-0 w-1.5 h-full cursor-col-resize hover:bg-orange-400 opacity-0 group-hover:opacity-100 transition-opacity z-40" onMouseDown={(e) => handleResize('standard', e, colWidths.standard)} />
                    </th>
                    <th className="px-4 py-3 w-14 text-center sticky right-0 z-30 bg-gray-100 border-l border-gray-300"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {Object.entries(groupedRows).map(([plantName, rows]) => (
                    <React.Fragment key={plantName}>
                      <tr className="sticky top-[40px] z-20 bg-orange-100">
                        <th colSpan={11} className="p-0 border-y border-orange-200 text-left">
                          <div className="bg-orange-100/95 backdrop-blur-sm px-4 py-2 font-bold text-orange-900 text-sm w-max sticky left-0">
                            <div className="flex items-center gap-2">
                              <TableIcon className="w-4 h-4 text-orange-600" />
                              {plantName}
                              <span className="text-orange-600/70 text-xs font-medium ml-2 px-2 py-0.5 bg-orange-200/50 rounded-full">{rows.length} questions</span>
                            </div>
                          </div>
                        </th>
                      </tr>
                      {rows.map((row) => (
                        <tr key={`q-${row.id}`} className="hover:bg-orange-50/50 transition-colors group divide-x divide-gray-100">
                          <td className="px-4 py-3 align-top sticky left-0 z-10 bg-white group-hover:bg-orange-50/50 border-r border-gray-200 text-gray-900 font-semibold whitespace-normal" style={{ minWidth: colWidths.text, width: colWidths.text, maxWidth: colWidths.text }}>
                            {row.text} {row.required && <span className="text-red-500 ml-0.5">*</span>}
                          </td>
                          <td className="px-4 py-3 align-top text-gray-700 font-medium truncate">
                            {row.category}
                          </td>
                          <td className="px-4 py-3 align-top">
                            <div className="flex flex-wrap gap-1">
                              {row.products.map((p: string) => (
                                <span key={p} className="inline-block bg-orange-50 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded-md border border-orange-100 whitespace-nowrap">{p}</span>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <div className="flex flex-wrap gap-1">
                              {row.frequencies.map((f: string) => (
                                <span key={f} className="inline-block bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-md border border-blue-100 whitespace-nowrap">{f}</span>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3 align-top text-gray-600">
                            {row.serviceType}
                          </td>
                          <td className="px-4 py-3 align-top text-gray-500 text-xs italic whitespace-normal leading-relaxed">
                            {row.helpText}
                          </td>
                          <td className="px-4 py-3 align-top">
                            <ConditionBadge condition={row.condition} />
                          </td>
                          <td className="px-4 py-3 align-top text-center">
                            {row.required ? <Check className="w-4 h-4 text-emerald-500 mx-auto" strokeWidth={3} /> : <span className="text-gray-300 font-bold">—</span>}
                          </td>
                          <td className="px-4 py-3 align-top text-center">
                            {row.photo ? <Check className="w-4 h-4 text-emerald-500 mx-auto" strokeWidth={3} /> : <span className="text-gray-300 font-bold">—</span>}
                          </td>
                          <td className="px-4 py-3 align-top text-center">
                            <span className="inline-block bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-200">{row.standard}</span>
                          </td>
                          <td className="px-4 py-3 align-top text-center sticky right-0 z-10 bg-white group-hover:bg-orange-50/50 border-l border-gray-200">
                            <button className="text-gray-400 hover:text-orange-600 p-1 rounded-md hover:bg-orange-100 transition-colors">
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          
          {/* Footer Pagination / Info */}
          <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-between text-sm text-gray-500 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] relative z-10 shrink-0">
            <span>Showing <span className="font-bold text-gray-900">{filteredRows.length}</span> rows in grid</span>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1 border border-gray-200 rounded-md bg-white hover:bg-gray-50 text-gray-600 disabled:opacity-50" disabled>Previous</button>
              <button className="px-3 py-1 border border-gray-200 rounded-md bg-white hover:bg-gray-50 text-gray-600 disabled:opacity-50" disabled>Next</button>
            </div>
          </div>
        </div>
      </div>

      {/* PDF Export Modal */}
      {isPdfModalOpen && (
        <div className="fixed inset-0 bg-gray-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
              <div className="flex items-center gap-2">
                <div className="bg-orange-100 p-1.5 rounded-lg text-orange-600">
                  <FileText className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-lg text-gray-900">Export Grid as PDF</h3>
              </div>
              <button onClick={() => setIsPdfModalOpen(false)} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1 rounded-md transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-auto flex-1 bg-gray-50/30">
              <div className="space-y-6">
                
                {/* Filters to apply for PDF */}
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                      <Filter className="w-4 h-4 text-orange-500" />
                      Configure PDF Filters
                    </h4>
                    <span className="text-xs font-semibold bg-orange-100 text-orange-700 px-2.5 py-1 rounded-md">
                      {pdfFilteredRows.length} Questions Selected
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-600 uppercase tracking-wider ml-1">Plants</label>
                      <MultiSelect options={pdfPlantOptions} selected={pdfPlantFilter} onChange={setPdfPlantFilter} placeholder="All Plants" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-600 uppercase tracking-wider ml-1">Category</label>
                      <MultiSelect options={pdfCategoryOptions} selected={pdfCategoryFilter} onChange={setPdfCategoryFilter} placeholder="All Categories" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-600 uppercase tracking-wider ml-1">Product</label>
                      <MultiSelect options={pdfProductOptions} selected={pdfProductFilter} onChange={setPdfProductFilter} placeholder="All Products" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-600 uppercase tracking-wider ml-1">Frequency</label>
                      <MultiSelect options={pdfFreqOptions} selected={pdfFrequencyFilter} onChange={setPdfFrequencyFilter} placeholder="All Frequencies" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-600 uppercase tracking-wider ml-1">Condition Priority</label>
                      <MultiSelect options={priorityOptions} selected={pdfPriorityFilter} onChange={setPdfPriorityFilter} placeholder="All Conditions" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-600 uppercase tracking-wider ml-1">Required</label>
                      <MultiSelect options={requiredOptions} selected={pdfRequiredFilter} onChange={setPdfRequiredFilter} placeholder="Required: All" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-600 uppercase tracking-wider ml-1">Photo Needed</label>
                      <MultiSelect options={photoOptions} selected={pdfPhotoFilter} onChange={setPdfPhotoFilter} placeholder="Photo: All" />
                    </div>
                  </div>
                </div>

                {/* PDF Settings */}
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
                  <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2 border-b border-gray-100 pb-3">
                    <Download className="w-4 h-4 text-orange-500" />
                    Document Settings
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5 ml-1">Paper Size</label>
                      <select 
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none font-medium text-gray-700 bg-white"
                        value={pdfPaperSize}
                        onChange={(e) => setPdfPaperSize(e.target.value)}
                      >
                        <option value="A4">A4</option>
                        <option value="Letter">Letter</option>
                        <option value="Legal">Legal</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5 ml-1">Orientation</label>
                      <select 
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none font-medium text-gray-700 bg-white"
                        value={pdfOrientation}
                        onChange={(e) => setPdfOrientation(e.target.value)}
                      >
                        <option value="Landscape">Landscape</option>
                        <option value="Portrait">Portrait</option>
                      </select>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-white flex justify-end gap-3 shrink-0">
              <button 
                onClick={() => setIsPdfModalOpen(false)} 
                className="px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 bg-white border border-gray-200 rounded-lg transition-colors"
                disabled={isExporting}
              >
                Cancel
              </button>
              <button 
                onClick={handleExportPDF} 
                disabled={isExporting}
                className="px-4 py-2 text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors flex items-center gap-2 shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isExporting ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {isExporting ? 'Generating...' : 'Export Data'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
