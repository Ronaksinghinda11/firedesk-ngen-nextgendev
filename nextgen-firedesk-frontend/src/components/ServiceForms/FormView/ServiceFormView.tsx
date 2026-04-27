import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Trash2, Calendar, Tag, Search, Check, X, Camera, Download, FileText, ChevronDown, Eye } from 'lucide-react';
import { serviceFormApi, ServiceForm, FormQuestion } from '../../../services/api/serviceFormApi';
import { getFrequencyByCode, INSPECTION_FREQUENCIES } from '../../../constants/serviceFormConstants';
import FrequencyBadge from '../common/FrequencyBadge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ServiceFormViewProps {
  formId: string;
  onError?: (error: any) => void;
}

// Helper function to get the minimum frequency order for a question
const getMinFrequencyOrder = (applicableFrequencies: string[]): number => {
  const frequencyOrder = {
    'WEEKLY': 1,
    'MONTHLY': 2,
    'QUARTERLY': 3,
    'HALF_YEARLY': 4,
    'YEARLY': 5
  };

  if (!applicableFrequencies || applicableFrequencies.length === 0) {
    return 999; // Questions without frequency go last
  }

  // Return the minimum order (most frequent)
  return Math.min(...applicableFrequencies.map(freq => frequencyOrder[freq as keyof typeof frequencyOrder] || 999));
};

const ServiceFormView: React.FC<ServiceFormViewProps> = ({ formId, onError }) => {
  const navigate = useNavigate();
  const [form, setForm] = useState<ServiceForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFrequencies, setSelectedFrequencies] = useState<string[]>([]);
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [mandatoryFilter, setMandatoryFilter] = useState<'all' | 'mandatory' | 'optional'>('all');
  const [photoFilter, setPhotoFilter] = useState<'all' | 'required' | 'not-required'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<string>('section');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [pdfLoading, setPdfLoading] = useState<string | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [pdfFilename, setPdfFilename] = useState<string>('');
  const [showPdfPreview, setShowPdfPreview] = useState(false);

  useEffect(() => {
    const loadFormData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await serviceFormApi.getById(formId);
        setForm(data);
      } catch (err: unknown) {
        const error = err as { response?: { data?: { message?: string }, status?: number } };
        setError(error.response?.data?.message || 'Failed to load service form');
        if (onError) {
          onError(err);
        }
      } finally {
        setLoading(false);
      }
    };

    loadFormData();
  }, [formId]);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this service form?')) return;

    try {
      await serviceFormApi.delete(formId);
      navigate('/admin/service-forms');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      alert(error.response?.data?.message || 'Failed to delete service form');
    }
  };

  // Flatten questions with section info for table display
  const flattenedQuestions = useMemo(() => {
    if (!form?.sections) return [];

    return form.sections
      .sort((a, b) => a.sectionOrder - b.sectionOrder)
      .flatMap(section =>
        (section.questions || []).map((question, idx) => ({
          ...question,
          sectionName: section.sectionName,
          sectionOrder: section.sectionOrder,
          sectionDescription: section.description,
          questionNumber: idx + 1,
        }))
      );
  }, [form]);

  // Filter and sort questions
  const processedQuestions = useMemo(() => {
    let filtered = flattenedQuestions;

    // Apply frequency filter (multiple selection)
    if (selectedFrequencies.length > 0) {
      filtered = filtered.filter(q =>
        selectedFrequencies.some(freq => q.applicableFrequencies?.includes(freq))
      );
    }

    // Apply condition filter
    if (selectedConditions.length > 0) {
      filtered = filtered.filter(q =>
        q.conditions?.some(c => {
          const severity = c.conditionSource === 'MASTER'
            ? c.masterCondition?.severity_level
            : c.customSeverityLevel;
          return selectedConditions.includes(severity || '');
        })
      );
    }

    // Apply mandatory filter
    if (mandatoryFilter !== 'all') {
      filtered = filtered.filter(q =>
        mandatoryFilter === 'mandatory' ? q.isMandatory : !q.isMandatory
      );
    }

    // Apply photo filter
    if (photoFilter !== 'all') {
      filtered = filtered.filter(q =>
        photoFilter === 'required' ? q.requiresPhoto : !q.requiresPhoto
      );
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(q =>
        q.questionText.toLowerCase().includes(query) ||
        q.questionCode?.toLowerCase().includes(query) ||
        q.sectionName.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let compareA: any;
      let compareB: any;

      switch (sortColumn) {
        case 'section':
          compareA = a.sectionOrder;
          compareB = b.sectionOrder;
          break;
        case 'question':
          compareA = a.questionText;
          compareB = b.questionText;
          break;
        case 'mandatory':
          compareA = a.isMandatory ? 1 : 0;
          compareB = b.isMandatory ? 1 : 0;
          break;
        case 'frequency':
          compareA = getMinFrequencyOrder(a.applicableFrequencies || []);
          compareB = getMinFrequencyOrder(b.applicableFrequencies || []);
          break;
        default:
          compareA = a.sectionOrder;
          compareB = b.sectionOrder;
      }

      if (compareA < compareB) return sortDirection === 'asc' ? -1 : 1;
      if (compareA > compareB) return sortDirection === 'asc' ? 1 : -1;

      // Secondary sort by section order and question order
      if (a.sectionOrder !== b.sectionOrder) {
        return a.sectionOrder - b.sectionOrder;
      }
      return a.questionOrder - b.questionOrder;
    });

    return sorted;
  }, [flattenedQuestions, selectedFrequencies, selectedConditions, mandatoryFilter, photoFilter, searchQuery, sortColumn, sortDirection]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleExport = () => {
    if (!form) return;

    // Create CSV data (Answer Type removed since all questions are Yes/No)
    const headers = ['Section', 'Question #', 'Question Text', 'Question Code', 'Frequencies', 'Mandatory', 'Photo Required', 'Notes Required', 'Help Text', 'Conditions'];
    const rows = processedQuestions.map(q => [
      q.sectionName,
      q.questionNumber,
      q.questionText,
      q.questionCode || '',
      (q.applicableFrequencies || []).join(', '),
      q.isMandatory ? 'Yes' : 'No',
      q.requiresPhoto ? 'Yes' : 'No',
      q.requiresNotes ? 'Yes' : 'No',
      q.helpText || '',
      (q.conditions || []).map(c => c.conditionSource === 'MASTER' ? c.masterCondition?.condition_name : c.customConditionName).join('; ')
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${form.serviceName.replace(/[^a-z0-9]/gi, '_')}_questions.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePDFDownload = async (frequency: string) => {
    if (!form) return;

    // Check if any questions exist for this frequency
    const questionsForFrequency = form.sections?.reduce((acc, section) => {
      return acc + (section.questions?.filter(q =>
        q.applicableFrequencies?.includes(frequency)
      ).length || 0);
    }, 0) || 0;

    if (questionsForFrequency === 0) {
      alert(`No questions found for ${INSPECTION_FREQUENCIES[frequency]?.name || frequency} frequency`);
      return;
    }

    try {
      setPdfLoading(frequency);
      const { blobUrl, filename } = await serviceFormApi.getPDFPreview(formId, frequency);
      setPdfPreviewUrl(blobUrl);
      setPdfFilename(filename);
      setShowPdfPreview(true);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      alert(error.response?.data?.message || 'Failed to generate PDF');
    } finally {
      setPdfLoading(null);
    }
  };

  const handleActualDownload = () => {
    if (pdfPreviewUrl && pdfFilename) {
      serviceFormApi.downloadFromUrl(pdfPreviewUrl, pdfFilename);
    }
  };

  const handleClosePdfPreview = () => {
    setShowPdfPreview(false);
    if (pdfPreviewUrl) {
      URL.revokeObjectURL(pdfPreviewUrl);
      setPdfPreviewUrl(null);
      setPdfFilename('');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading service form...</p>
        </div>
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Form not found'}</p>
          <button
            onClick={() => navigate('/admin/service-forms')}
            className="text-orange-600 hover:text-orange-800 underline"
          >
            Back to Service Forms
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate('/admin/service-forms')}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="h-5 w-5 text-gray-600" />
                </button>
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-lg font-semibold text-gray-900">{form.serviceName}</h1>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${form.status === 'Active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                        }`}
                    >
                      {form.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-0.5 text-xs text-gray-500">
                    {form.formCode && (
                      <span className="flex items-center gap-1">
                        <Tag className="h-3 w-3" />
                        {form.formCode}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(form.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Inline Form Summary */}
              <div className="flex items-center gap-4 text-sm ml-8 border-l pl-8 border-gray-200">
                <div className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-orange-500" />
                  <span className="text-gray-500">Sections:</span>
                  <span className="font-semibold text-gray-900">{form.sections?.length || 0}</span>
                </div>
                <div className="w-px h-4 bg-gray-200"></div>
                <div className="flex items-center gap-1.5">
                  <Search className="h-3.5 w-3.5 text-orange-500" />
                  <span className="text-gray-500">Filtered:</span>
                  <span className="font-semibold text-gray-900">{processedQuestions.length}</span>
                </div>
                <div className="w-px h-4 bg-gray-200"></div>
                <div className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-orange-500" />
                  <span className="text-gray-500">Mandatory:</span>
                  <span className="font-semibold text-gray-900">{processedQuestions.filter(q => q.isMandatory).length}</span>
                </div>
                <div className="w-px h-4 bg-gray-200"></div>
                <div className="flex items-center gap-1.5">
                  <Download className="h-3.5 w-3.5 text-orange-500" />
                  <span className="text-gray-500">Conditions:</span>
                  <span className="font-semibold text-orange-600">{processedQuestions.reduce((acc, q) => acc + (q.conditions?.length || 0), 0)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleDelete}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-colors text-xs font-medium border border-red-200"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Form Details */}
        {form.description && (
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Description</h2>
            <p className="text-gray-600">{form.description}</p>
          </div>
        )}

        {/* Advanced Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Advanced Filters</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Frequency Filter */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">Frequency</label>
              <div className="space-y-2">
                {Object.values(INSPECTION_FREQUENCIES).map((freq) => {
                  const questionCount = form.sections?.reduce((acc, section) => {
                    return acc + (section.questions?.filter(q =>
                      q.applicableFrequencies?.includes(freq.code)
                    ).length || 0);
                  }, 0) || 0;

                  return (
                    <label
                      key={freq.code}
                      className="flex items-center gap-2 cursor-pointer group"
                    >
                      <input
                        type="checkbox"
                        checked={selectedFrequencies.includes(freq.code)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedFrequencies([...selectedFrequencies, freq.code]);
                          } else {
                            setSelectedFrequencies(selectedFrequencies.filter(f => f !== freq.code));
                          }
                        }}
                        className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
                      />
                      <span className="text-sm text-gray-700 group-hover:text-gray-900">
                        {freq.name}
                      </span>
                      <span className="text-xs text-gray-500">({questionCount})</span>
                    </label>
                  );
                })}
              </div>
              {selectedFrequencies.length > 0 && (
                <button
                  onClick={() => setSelectedFrequencies([])}
                  className="text-xs text-gray-600 hover:text-gray-900 underline"
                >
                  Clear all
                </button>
              )}
            </div>

            {/* Condition Severity Filter */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">Condition Severity</label>
              <div className="space-y-2">
                {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((severity) => (
                  <label
                    key={severity}
                    className="flex items-center gap-2 cursor-pointer group"
                  >
                    <input
                      type="checkbox"
                      checked={selectedConditions.includes(severity)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedConditions([...selectedConditions, severity]);
                        } else {
                          setSelectedConditions(selectedConditions.filter(c => c !== severity));
                        }
                      }}
                      className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
                    />
                    <span className="text-sm text-gray-700 group-hover:text-gray-900">
                      {severity}
                    </span>
                  </label>
                ))}
              </div>
              {selectedConditions.length > 0 && (
                <button
                  onClick={() => setSelectedConditions([])}
                  className="text-xs text-gray-600 hover:text-gray-900 underline"
                >
                  Clear all
                </button>
              )}
            </div>

            {/* Mandatory Filter */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">Required Status</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="radio"
                    name="mandatory"
                    checked={mandatoryFilter === 'all'}
                    onChange={() => setMandatoryFilter('all')}
                    className="w-4 h-4 text-gray-900 border-gray-300 focus:ring-gray-900"
                  />
                  <span className="text-sm text-gray-700 group-hover:text-gray-900">
                    All Questions
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="radio"
                    name="mandatory"
                    checked={mandatoryFilter === 'mandatory'}
                    onChange={() => setMandatoryFilter('mandatory')}
                    className="w-4 h-4 text-gray-900 border-gray-300 focus:ring-gray-900"
                  />
                  <span className="text-sm text-gray-700 group-hover:text-gray-900">
                    Required Only
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="radio"
                    name="mandatory"
                    checked={mandatoryFilter === 'optional'}
                    onChange={() => setMandatoryFilter('optional')}
                    className="w-4 h-4 text-gray-900 border-gray-300 focus:ring-gray-900"
                  />
                  <span className="text-sm text-gray-700 group-hover:text-gray-900">
                    Optional Only
                  </span>
                </label>
              </div>
            </div>

            {/* Photo Required Filter */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">Photo Requirement</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="radio"
                    name="photo"
                    checked={photoFilter === 'all'}
                    onChange={() => setPhotoFilter('all')}
                    className="w-4 h-4 text-gray-900 border-gray-300 focus:ring-gray-900"
                  />
                  <span className="text-sm text-gray-700 group-hover:text-gray-900">
                    All Questions
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="radio"
                    name="photo"
                    checked={photoFilter === 'required'}
                    onChange={() => setPhotoFilter('required')}
                    className="w-4 h-4 text-gray-900 border-gray-300 focus:ring-gray-900"
                  />
                  <span className="text-sm text-gray-700 group-hover:text-gray-900">
                    Photo Required
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="radio"
                    name="photo"
                    checked={photoFilter === 'not-required'}
                    onChange={() => setPhotoFilter('not-required')}
                    className="w-4 h-4 text-gray-900 border-gray-300 focus:ring-gray-900"
                  />
                  <span className="text-sm text-gray-700 group-hover:text-gray-900">
                    Photo Not Required
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Active Filters Summary */}
          {(selectedFrequencies.length > 0 || selectedConditions.length > 0 || mandatoryFilter !== 'all' || photoFilter !== 'all') && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">Active Filters:</span>
                  {selectedFrequencies.map(freq => (
                    <Badge key={freq} variant="secondary" className="bg-gray-100 text-gray-700 border-gray-300">
                      {INSPECTION_FREQUENCIES[freq]?.name}
                    </Badge>
                  ))}
                  {selectedConditions.map(cond => (
                    <Badge key={cond} variant="secondary" className="bg-gray-100 text-gray-700 border-gray-300">
                      {cond}
                    </Badge>
                  ))}
                  {mandatoryFilter !== 'all' && (
                    <Badge variant="secondary" className="bg-gray-100 text-gray-700 border-gray-300">
                      {mandatoryFilter === 'mandatory' ? 'Required Only' : 'Optional Only'}
                    </Badge>
                  )}
                  {photoFilter !== 'all' && (
                    <Badge variant="secondary" className="bg-gray-100 text-gray-700 border-gray-300">
                      {photoFilter === 'required' ? 'Photo Required' : 'Photo Not Required'}
                    </Badge>
                  )}
                </div>
                <button
                  onClick={() => {
                    setSelectedFrequencies([]);
                    setSelectedConditions([]);
                    setMandatoryFilter('all');
                    setPhotoFilter('all');
                  }}
                  className="text-sm text-gray-600 hover:text-gray-900 underline"
                >
                  Clear all filters
                </button>
              </div>
            </div>
          )}
        </div>



        {/* Search and Controls */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search questions, codes, or sections..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 border-0"
                    disabled={pdfLoading !== null}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    {pdfLoading ? 'Generating...' : 'View as PDF'}
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {Object.values(INSPECTION_FREQUENCIES).map((freq) => {
                    const questionCount = form?.sections?.reduce((acc, section) => {
                      return acc + (section.questions?.filter(q =>
                        q.applicableFrequencies?.includes(freq.code)
                      ).length || 0);
                    }, 0) || 0;

                    return (
                      <DropdownMenuItem
                        key={freq.code}
                        onClick={() => handlePDFDownload(freq.code)}
                        disabled={questionCount === 0 || pdfLoading !== null}
                        className="flex justify-between"
                      >
                        <span>{freq.name}</span>
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {questionCount}
                        </Badge>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                className="bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 border-0"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
          {searchQuery && (
            <div className="mt-3 text-sm text-gray-600">
              Found {processedQuestions.length} question{processedQuestions.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Questions Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-orange-50 to-orange-100 border-b border-gray-200 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider w-16">
                    #
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-orange-200 transition-colors"
                    onClick={() => handleSort('question')}
                  >
                    <div className="flex items-center gap-1">
                      Question Text
                      {sortColumn === 'question' && (
                        <span className="text-orange-600">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-orange-200 transition-colors"
                    onClick={() => handleSort('frequency')}
                  >
                    <div className="flex items-center gap-1">
                      Frequencies
                      {sortColumn === 'frequency' && (
                        <span className="text-orange-600">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Conditions
                  </th>
                  <th
                    className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-orange-200 transition-colors w-24"
                    onClick={() => handleSort('mandatory')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      Required
                      {sortColumn === 'mandatory' && (
                        <span className="text-orange-600">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider w-20">
                    Photo
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {processedQuestions.length > 0 ? (
                  (() => {
                    let currentSection = '';
                    return processedQuestions.map((question, idx) => {
                      const isNewSection = question.sectionName !== currentSection;
                      if (isNewSection) currentSection = question.sectionName;

                      return (
                        <React.Fragment key={question.id}>
                          {/* Section Header Row */}
                          {isNewSection && (
                            <tr className="bg-gray-50">
                              <td
                                colSpan={6}
                                className="px-4 py-3 text-sm font-semibold text-gray-900"
                              >
                                <div className="flex items-center gap-2">
                                  <span>{question.sectionName}</span>
                                  {question.sectionDescription && (
                                    <span className="text-gray-600 font-normal text-xs">
                                      — {question.sectionDescription}
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}

                          {/* Question Row */}
                          <tr className={`hover:bg-orange-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                            <td className="px-4 py-3 text-center">
                              <div className="inline-flex items-center justify-center w-6 h-6 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold">
                                {question.questionNumber}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm text-gray-900">
                                {question.questionText}
                                {question.isMandatory && (
                                  <span className="ml-1 text-red-600 font-bold">*</span>
                                )}
                              </div>
                              {question.helpText && (
                                <div className="mt-1 text-xs text-gray-600 italic flex items-start gap-1">
                                  <span className="text-orange-500"></span>
                                  {/* {question.helpText} */}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-1">
                                {question.applicableFrequencies && question.applicableFrequencies.length > 0 ? (
                                  question.applicableFrequencies.map((freqCode) => {
                                    const freq = getFrequencyByCode(freqCode);
                                    return freq ? (
                                      <FrequencyBadge
                                        key={freqCode}
                                        frequency={freq}
                                        size="xs"
                                      />
                                    ) : null;
                                  })
                                ) : (
                                  <span className="text-gray-400 text-xs">—</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {question.conditions && question.conditions.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                  {question.conditions
                                    .sort((a, b) => a.displayOrder - b.displayOrder)
                                    .map((condition) => {
                                      const severity = condition.conditionSource === 'MASTER'
                                        ? condition.masterCondition?.severity_level
                                        : condition.customSeverityLevel;
                                      const priorityScore = condition.conditionSource === 'MASTER'
                                        ? condition.masterCondition?.priority_score
                                        : condition.customPriorityScore;

                                      return (
                                        <div
                                          key={condition.id}
                                          className="inline-flex items-center gap-2 px-2 py-1 bg-gray-50 rounded border border-gray-200 text-xs"
                                        >
                                          <span className="text-gray-900 font-medium">
                                            {condition.conditionSource === 'MASTER'
                                              ? condition.masterCondition?.condition_name
                                              : condition.customConditionName}
                                          </span>
                                          {severity && (
                                            <Badge
                                              variant="outline"
                                              className={`text-xs ${severity === 'CRITICAL' ? 'bg-red-100 text-red-700 border-red-300' :
                                                severity === 'HIGH' ? 'bg-orange-100 text-orange-700 border-orange-300' :
                                                  severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700 border-yellow-300' :
                                                    severity === 'LOW' ? 'bg-blue-100 text-blue-700 border-blue-300' :
                                                      'bg-gray-100 text-gray-700 border-gray-300'
                                                }`}
                                            >
                                              {severity}
                                            </Badge>
                                          )}
                                          {priorityScore !== undefined && (
                                            <span className="text-xs text-gray-600">
                                              P: {priorityScore}
                                            </span>
                                          )}
                                        </div>
                                      );
                                    })}
                                </div>
                              ) : (
                                <span className="text-gray-400 text-xs">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {question.isMandatory ? (
                                <Check className="h-4 w-4 text-green-600 mx-auto" />
                              ) : (
                                <X className="h-4 w-4 text-gray-300 mx-auto" />
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {question.requiresPhoto ? (
                                <Camera className="h-4 w-4 text-purple-600 mx-auto" />
                              ) : (
                                <span className="text-gray-300 text-xs">—</span>
                              )}
                            </td>
                          </tr>
                        </React.Fragment>
                      );
                    });
                  })()
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-12 text-center text-gray-500"
                    >
                      {searchQuery || selectedFrequencies.length > 0 || selectedConditions.length > 0 || mandatoryFilter !== 'all' || photoFilter !== 'all'
                        ? 'No questions match your filters'
                        : 'No questions found in this form'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          {processedQuestions.length > 0 && (
            <div className="border-t border-gray-200 px-4 py-3 bg-gray-50">
              <div className="text-sm text-gray-600">
                Showing <span className="font-semibold text-gray-900">{processedQuestions.length}</span> question{processedQuestions.length !== 1 ? 's' : ''}
                {searchQuery && (
                  <span> matching "<span className="font-semibold text-gray-900">{searchQuery}</span>"</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PDF Preview Dialog */}
      <Dialog open={showPdfPreview} onOpenChange={handleClosePdfPreview}>
        <DialogContent className="max-w-5xl h-[90vh] flex flex-col">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              PDF Preview
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={handleActualDownload}
              >
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </DialogHeader>
          <div className="flex-1 min-h-0">
            {pdfPreviewUrl && (
              <iframe
                src={pdfPreviewUrl}
                className="w-full h-full border rounded-lg"
                title="PDF Preview"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ServiceFormView;
