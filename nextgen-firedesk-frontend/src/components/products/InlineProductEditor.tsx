// src/components/products/InlineProductEditor.tsx
// Excel-like inline table editor for bulk product creation/editing

import { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, X, Upload, Save, ChevronDown } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

interface Category {
    id: string;
    categoryName: string;
    testFrequencyRequired?: boolean;
}

interface ProductRow {
    id?: string;
    slNo: number;
    categoryId: string;
    productName: string;
    testFrequency: string;
    type: string;
    subTypes: string[];
    image: string;
    isNew: boolean;
}

interface InlineProductEditorProps {
    categories: Category[];
    editingProduct?: any;
    onCancel: () => void;
    onSaveComplete: () => void;
}

const testFrequencyOptions = [
    'One Year',
    'Two Years',
    'Three Years',
    'Five Years',
    'Ten Years'
];

// Combo Input with dropdown - shows all options on focus
const ComboInput = ({
    value,
    onChange,
    options,
    placeholder,
    className = "h-7 text-xs"
}: {
    value: string;
    onChange: (value: string) => void;
    options: string[];
    placeholder?: string;
    className?: string;
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);


    // Show all options when empty, filter when user types
    const displayOptions = useMemo(() => {
        if (!value || value.trim() === '') return options;
        return options.filter(opt =>
            opt.toLowerCase().includes(value.toLowerCase())
        );
    }, [value, options]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
                inputRef.current && !inputRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative">
            <div className="relative">
                <Input
                    ref={inputRef}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onFocus={() => {
                        setIsOpen(true);
                    }}
                    placeholder={placeholder}
                    className={`${className} pr-6`}
                    autoComplete="off"
                />
                <ChevronDown
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400 cursor-pointer"
                    onClick={() => {
                        setIsOpen(!isOpen);
                        inputRef.current?.focus();
                    }}
                />
            </div>
            {isOpen && displayOptions.length > 0 && inputRef.current && (
                <div
                    ref={dropdownRef}
                    style={{
                        position: 'fixed',
                        top: inputRef.current.getBoundingClientRect().bottom + 2,
                        left: inputRef.current.getBoundingClientRect().left,
                        width: inputRef.current.getBoundingClientRect().width,
                        zIndex: 99999,
                    }}
                    className="bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-auto"
                >
                    {displayOptions.slice(0, 10).map((opt, idx) => (
                        <div
                            key={idx}
                            className={`px-2 py-1.5 text-xs cursor-pointer hover:bg-blue-50 ${opt === value ? 'bg-blue-100 font-medium' : ''}`}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                onChange(opt);
                                setIsOpen(false);
                            }}
                        >
                            {opt}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// Tag Input for Sub Types with suggestions
const SubTypeInput = ({
    tags,
    onChange,
    suggestions
}: {
    tags: string[];
    onChange: (tags: string[]) => void;
    suggestions: string[];
}) => {
    const [inputValue, setInputValue] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);


    const filteredSuggestions = useMemo(() => {
        return !inputValue
            ? suggestions.filter(s => !tags.includes(s)).slice(0, 6)
            : suggestions.filter(s =>
                s.toLowerCase().includes(inputValue.toLowerCase()) && !tags.includes(s)
            ).slice(0, 6);
    }, [inputValue, suggestions, tags]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
                inputRef.current && !inputRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const addTag = (tag: string) => {
        const trimmed = tag.trim();
        if (trimmed && !tags.includes(trimmed)) {
            onChange([...tags, trimmed]);
            setInputValue('');
        }
    };

    const removeTag = (index: number) => {
        onChange(tags.filter((_, i) => i !== index));
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addTag(inputValue);
        } else if (e.key === 'Backspace' && inputValue === '' && tags.length > 0) {
            removeTag(tags.length - 1);
        }
    };

    return (
        <div className="relative">
            <div className="flex flex-wrap items-center gap-1 min-w-[100px] border rounded px-1 py-0.5 bg-white">
                {tags.map((tag, idx) => (
                    <span key={idx} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded text-[10px]">
                        {tag}
                        <button type="button" onClick={() => removeTag(idx)} className="hover:text-red-600">
                            <X className="h-2.5 w-2.5" />
                        </button>
                    </span>
                ))}
                <Input
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setIsOpen(true)}
                    placeholder={tags.length === 0 ? "Add..." : ""}
                    className="h-5 text-xs border-0 shadow-none focus-visible:ring-0 p-0 min-w-[40px] flex-1"
                />
            </div>
            {isOpen && filteredSuggestions.length > 0 && inputRef.current && (
                <div
                    ref={dropdownRef}
                    style={{
                        position: 'fixed',
                        top: inputRef.current.getBoundingClientRect().bottom + 2,
                        left: inputRef.current.getBoundingClientRect().left - 40,
                        width: inputRef.current.getBoundingClientRect().width + 80,
                        zIndex: 99999,
                    }}
                    className="bg-white border border-gray-300 rounded-md shadow-lg max-h-32 overflow-auto"
                >
                    {filteredSuggestions.map((s, idx) => (
                        <div
                            key={idx}
                            className="px-2 py-1.5 text-xs cursor-pointer hover:bg-blue-50"
                            onMouseDown={(e) => {
                                e.preventDefault();
                                addTag(s);
                                setIsOpen(false);
                            }}
                        >
                            {s}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default function InlineProductEditor({
    categories,
    editingProduct,
    onCancel,
    onSaveComplete
}: InlineProductEditorProps) {
    const [rows, setRows] = useState<ProductRow[]>([]);
    const [apiTypes, setApiTypes] = useState<string[]>([]);
    const [apiSubTypes, setApiSubTypes] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    // Check if any row's category requires test frequency
    const showTestFrequencyColumn = useMemo(() => {
        return rows.some(row => {
            const cat = categories.find(c => c.id === row.categoryId);
            return cat?.testFrequencyRequired === true;
        });
    }, [rows, categories]);

    // Compute dynamic options from current rows - these should include values from ALL rows
    const dynamicProductNames = useMemo(() => {
        const names = rows.map(r => r.productName.trim()).filter(Boolean);
        return [...new Set(names)];
    }, [rows]);

    const dynamicTypes = useMemo(() => {
        const types = rows.map(r => r.type.trim()).filter(Boolean);
        return [...new Set([...apiTypes, ...types])];
    }, [rows, apiTypes]);

    const dynamicSubTypes = useMemo(() => {
        const subs = rows.flatMap(r => r.subTypes);
        return [...new Set([...apiSubTypes, ...subs])];
    }, [rows, apiSubTypes]);

    // Initialize rows
    useEffect(() => {
        if (editingProduct) {
            const variants = editingProduct.variants || editingProduct.productVariants || [];
            if (variants.length > 0) {
                setRows(variants.map((v: any, idx: number) => ({
                    id: editingProduct.id,
                    slNo: idx + 1,
                    categoryId: editingProduct.categoryId || editingProduct.category_id,
                    productName: editingProduct.productName || editingProduct.product_name || editingProduct.name,
                    testFrequency: editingProduct.testFrequency || editingProduct.test_frequency || '',
                    type: v.type || '',
                    subTypes: Array.isArray(v.subType) ? v.subType : [],
                    image: editingProduct.image || '',
                    isNew: false
                })));
            } else {
                setRows([{
                    slNo: 1,
                    categoryId: editingProduct.categoryId || editingProduct.category_id,
                    productName: editingProduct.productName || editingProduct.product_name || editingProduct.name,
                    testFrequency: editingProduct.testFrequency || editingProduct.test_frequency || '',
                    type: '',
                    subTypes: [],
                    image: editingProduct.image || '',
                    isNew: false,
                    id: editingProduct.id
                }]);
            }
        } else {
            setRows([createEmptyRow(1)]);
        }
    }, [editingProduct]);

    // Fetch available types/subtypes from API
    useEffect(() => {
        const fetchTypesSubtypes = async () => {
            try {
                const response: any = await api.get('/master-data/products/types-subtypes');
                if (response.success) {
                    setApiTypes(response.types || []);
                    setApiSubTypes(response.subTypes || []);
                }
            } catch (error) {
                console.error('Failed to fetch types/subtypes:', error);
            }
        };
        fetchTypesSubtypes();
    }, []);

    const createEmptyRow = (slNo: number): ProductRow => ({
        slNo,
        categoryId: '',
        productName: '',
        testFrequency: '',
        type: '',
        subTypes: [],
        image: '',
        isNew: true
    });

    // Auto-save completed rows when clicking Add Row
    const handleAddRow = async () => {
        // Find rows that are complete (have category and product name) and not yet saved
        const completedUnsavedRows = rows.filter(r =>
            r.isNew && r.categoryId && r.productName.trim()
        );

        // Validate test frequency for rows that require it
        const missingTestFreq = completedUnsavedRows.filter(r => rowRequiresTestFrequency(r) && !r.testFrequency);
        if (missingTestFreq.length > 0) {
            toast({ title: 'Incomplete Data', description: 'Please fill Test Frequency for all rows before adding more.', variant: 'destructive' });
            return;
        }

        // If there are completed rows, save them first
        if (completedUnsavedRows.length > 0) {
            setIsSaving(true);
            try {
                // Group by category+productName
                const productMap = new Map<string, { categoryId: string; productName: string; testFrequency: string; image: string; variants: { type: string; subType: string[] }[] }>();

                completedUnsavedRows.forEach(row => {
                    const key = `${row.categoryId}|${row.productName}`;
                    if (!productMap.has(key)) {
                        productMap.set(key, {
                            categoryId: row.categoryId,
                            productName: row.productName,
                            testFrequency: row.testFrequency,
                            image: row.image,
                            variants: []
                        });
                    }
                    if (row.type.trim()) {
                        const product = productMap.get(key)!;
                        const typeName = row.type.trim();

                        // Find existing variant with the same type
                        const existingVariant = product.variants.find(v => v.type === typeName);

                        if (existingVariant) {
                            // Merge subtypes (avoid duplicates)
                            row.subTypes.forEach(st => {
                                if (!existingVariant.subType.includes(st)) {
                                    existingVariant.subType.push(st);
                                }
                            });
                        } else {
                            // Create new variant entry
                            product.variants.push({
                                type: typeName,
                                subType: [...row.subTypes]
                            });
                        }
                    }
                });

                const productsToCreate = Array.from(productMap.values()).map(p => ({
                    category_id: p.categoryId,
                    product_name: p.productName,
                    test_frequency: p.testFrequency || null,
                    variants: p.variants,
                    image: p.image || null,
                    status: 'Active'
                }));

                console.log('[InlineProductEditor] Auto-saving products:', JSON.stringify(productsToCreate, null, 2));

                const response: any = await api.post('/master-data/products/bulk', { products: productsToCreate });

                if (response.success) {
                    toast({ title: 'Auto-Saved', description: `${response.results?.success?.length || productsToCreate.length} product(s) saved` });

                    // Mark saved rows as not new (they're now in DB)
                    const updatedRows = rows.map(r => {
                        if (r.isNew && r.categoryId && r.productName.trim()) {
                            return { ...r, isNew: false };
                        }
                        return r;
                    });
                    setRows([...updatedRows, createEmptyRow(updatedRows.length + 1)]);
                } else {
                    toast({ title: 'Save Warning', description: response.message || 'Some products may not have been saved', variant: 'destructive' });
                    // Still add row even if save had issues
                    setRows([...rows, createEmptyRow(rows.length + 1)]);
                }
            } catch (error: any) {
                console.error('Auto-save error:', error);
                toast({ title: 'Auto-Save Failed', description: error.message || 'Failed to save. Data will be kept.', variant: 'destructive' });
                // Still add the new row
                setRows([...rows, createEmptyRow(rows.length + 1)]);
            } finally {
                setIsSaving(false);
            }
        } else {
            // No complete rows to save, just add new row
            setRows([...rows, createEmptyRow(rows.length + 1)]);
        }
    };

    const handleDeleteRow = (index: number) => {
        if (rows.length > 1) {
            const updated = rows.filter((_, i) => i !== index).map((r, i) => ({ ...r, slNo: i + 1 }));
            setRows(updated);
        }
    };

    const handleRowChange = (index: number, field: keyof ProductRow, value: any) => {
        const updated = [...rows];
        updated[index] = { ...updated[index], [field]: value };
        setRows(updated);
    };

    const handleImageUpload = (index: number, file: File) => {
        if (!file) return;
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml'];
        if (!validTypes.includes(file.type)) {
            toast({ title: 'Invalid file type', description: 'Upload JPG, PNG, or SVG', variant: 'destructive' });
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast({ title: 'File too large', description: 'Max 5MB', variant: 'destructive' });
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            handleRowChange(index, 'image', reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const rowRequiresTestFrequency = (row: ProductRow) => {
        const cat = categories.find(c => c.id === row.categoryId);
        return cat?.testFrequencyRequired === true;
    };

    const handleSaveAll = async () => {
        // Filter out completely empty rows (no category selected, no product name)
        const rowsWithData = rows.filter(r => r.categoryId || r.productName.trim());

        console.log('[InlineProductEditor] V2 - rowsWithData:', rowsWithData.length, 'of', rows.length, 'total rows');

        if (rowsWithData.length === 0) {
            toast({ title: 'Validation Error', description: 'Please add at least one product.', variant: 'destructive' });
            return;
        }

        // Validate rows that have data
        const invalidRows = rowsWithData.filter(r => !r.categoryId || !r.productName.trim());
        if (invalidRows.length > 0) {
            toast({ title: 'Validation Error', description: 'Each row must have a Category and Product Name.', variant: 'destructive' });
            return;
        }

        const missingTestFreq = rowsWithData.filter(r => rowRequiresTestFrequency(r) && !r.testFrequency);
        if (missingTestFreq.length > 0) {
            toast({ title: 'Validation Error', description: 'Test Frequency is required for the selected category.', variant: 'destructive' });
            return;
        }

        setIsSaving(true);

        try {
            if (editingProduct) {
                // Merge variants with same type (combine subtypes)
                const variantMap = new Map<string, string[]>();
                rowsWithData.forEach(r => {
                    const typeName = r.type.trim();
                    if (typeName) {
                        if (variantMap.has(typeName)) {
                            // Merge subtypes, avoiding duplicates
                            const existing = variantMap.get(typeName)!;
                            r.subTypes.forEach(st => {
                                if (!existing.includes(st)) {
                                    existing.push(st);
                                }
                            });
                        } else {
                            variantMap.set(typeName, [...r.subTypes]);
                        }
                    }
                });

                const variants = Array.from(variantMap.entries()).map(([type, subType]) => ({
                    type,
                    subType
                }));

                console.log('[InlineProductEditor] Edit mode - merged variants:', JSON.stringify(variants, null, 2));

                const payload = {
                    category_id: rowsWithData[0].categoryId,
                    product_name: rowsWithData[0].productName,
                    test_frequency: rowsWithData[0].testFrequency || null,
                    variants,
                    image: rowsWithData[0].image || null,
                    status: 'Active'
                };

                await api.put(`/master-data/products/${editingProduct.id}`, payload);
                toast({ title: 'Success', description: 'Product updated successfully' });
                onSaveComplete();
            } else {
                const productMap = new Map<string, { categoryId: string; productName: string; testFrequency: string; image: string; variants: { type: string; subType: string[] }[] }>();

                rowsWithData.forEach(row => {
                    const key = `${row.categoryId}|${row.productName}`;
                    if (!productMap.has(key)) {
                        productMap.set(key, {
                            categoryId: row.categoryId,
                            productName: row.productName,
                            testFrequency: row.testFrequency,
                            image: row.image,
                            variants: []
                        });
                    }
                    if (row.type.trim()) {
                        const product = productMap.get(key)!;
                        const typeName = row.type.trim();

                        // Find existing variant with the same type
                        const existingVariant = product.variants.find(v => v.type === typeName);

                        if (existingVariant) {
                            // Merge subtypes (avoid duplicates)
                            const newSubTypes = row.subTypes.filter(st => !existingVariant.subType.includes(st));
                            existingVariant.subType = [...existingVariant.subType, ...newSubTypes];
                        } else {
                            // Create new variant entry
                            product.variants.push({
                                type: typeName,
                                subType: [...row.subTypes]
                            });
                        }
                    }
                });

                const productsToCreate = Array.from(productMap.values()).map(p => ({
                    category_id: p.categoryId,
                    product_name: p.productName,
                    test_frequency: p.testFrequency || null,
                    variants: p.variants,
                    image: p.image || null,
                    status: 'Active'
                }));

                console.log('[InlineProductEditor] Products to create:', JSON.stringify(productsToCreate, null, 2));

                const response: any = await api.post('/master-data/products/bulk', { products: productsToCreate });

                if (response.success) {
                    toast({ title: 'Success', description: response.message });
                } else {
                    toast({ title: 'Partial Success', description: response.message, variant: 'destructive' });
                }
                onSaveComplete();
            }
        } catch (error: any) {
            console.error('Save error:', error);
            toast({ title: 'Error', description: error.message || 'Failed to save products', variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-3 p-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                    {editingProduct ? 'Edit Product' : 'Add Products'}
                </h2>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={onCancel} disabled={isSaving}>
                        Cancel
                    </Button>
                    <Button size="sm" onClick={handleSaveAll} disabled={isSaving}>
                        <Save className="h-4 w-4 mr-1" />
                        {isSaving ? 'Saving...' : 'Save All'}
                    </Button>
                </div>
            </div>

            {/* Instruction */}
            <p className="text-xs text-muted-foreground">
                Fill each row. Click dropdown arrow or focus on Product Name/Type to see suggestions from other rows.
            </p>



            {/* Table */}
            <div className="border rounded-lg overflow-visible relative z-20">
                <Table>
                    <TableHeader className="bg-gray-50">
                        <TableRow>
                            <TableHead className="w-[40px] text-xs">#</TableHead>
                            <TableHead className="min-w-[120px] text-xs">Category *</TableHead>
                            <TableHead className="min-w-[140px] text-xs">Product Name *</TableHead>
                            {showTestFrequencyColumn && (
                                <TableHead className="min-w-[120px] text-xs">Test Freq *</TableHead>
                            )}
                            <TableHead className="min-w-[100px] text-xs">Type</TableHead>
                            <TableHead className="min-w-[120px] text-xs">Sub Type</TableHead>
                            <TableHead className="w-[70px] text-xs">Image</TableHead>
                            <TableHead className="w-[40px] text-xs"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rows.map((row, index) => (
                            <TableRow key={index} className="hover:bg-gray-50">
                                <TableCell className="text-xs text-center font-medium">{row.slNo}</TableCell>

                                {/* Category */}
                                <TableCell className="p-1">
                                    <Select value={row.categoryId} onValueChange={(value) => handleRowChange(index, 'categoryId', value)}>
                                        <SelectTrigger className="h-7 text-xs">
                                            <SelectValue placeholder="Select..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categories.map((cat) => (
                                                <SelectItem key={cat.id} value={cat.id} className="text-xs">
                                                    {cat.categoryName}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </TableCell>

                                {/* Product Name */}
                                <TableCell className="p-1 overflow-visible">
                                    <ComboInput
                                        value={row.productName}
                                        onChange={(value) => handleRowChange(index, 'productName', value)}
                                        options={dynamicProductNames}
                                        placeholder="Product name"
                                    />
                                </TableCell>

                                {/* Test Frequency (conditional) */}
                                {showTestFrequencyColumn && (
                                    <TableCell className="p-1">
                                        {rowRequiresTestFrequency(row) ? (
                                            <Select value={row.testFrequency} onValueChange={(value) => handleRowChange(index, 'testFrequency', value)}>
                                                <SelectTrigger className="h-7 text-xs">
                                                    <SelectValue placeholder="Select..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {testFrequencyOptions.map((opt) => (
                                                        <SelectItem key={opt} value={opt} className="text-xs">
                                                            {opt}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <span className="text-xs text-gray-400 px-2">N/A</span>
                                        )}
                                    </TableCell>
                                )}

                                {/* Type */}
                                <TableCell className="p-1 overflow-visible">
                                    <ComboInput
                                        value={row.type}
                                        onChange={(value) => handleRowChange(index, 'type', value)}
                                        options={dynamicTypes}
                                        placeholder="Type"
                                    />
                                </TableCell>

                                {/* Sub Type */}
                                <TableCell className="p-1 overflow-visible">
                                    <SubTypeInput
                                        tags={row.subTypes}
                                        onChange={(tags) => handleRowChange(index, 'subTypes', tags)}
                                        suggestions={dynamicSubTypes}
                                    />
                                </TableCell>

                                {/* Image */}
                                <TableCell className="p-1">
                                    <div className="flex items-center gap-1">
                                        {row.image && (
                                            <img
                                                src={row.image}
                                                alt=""
                                                className="h-6 w-6 object-cover rounded cursor-pointer hover:opacity-80 hover:border-2 hover:border-blue-400"
                                                title="Click to view full image"
                                                onClick={() => setPreviewImage(row.image)}
                                            />
                                        )}
                                        <label className="cursor-pointer">
                                            <Upload className="h-4 w-4 text-gray-400 hover:text-blue-600" />
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) handleImageUpload(index, file);
                                                }}
                                            />
                                        </label>
                                        {row.image && (
                                            <button onClick={() => handleRowChange(index, 'image', '')} className="text-red-500">
                                                <X className="h-3 w-3" />
                                            </button>
                                        )}
                                    </div>
                                </TableCell>

                                {/* Delete */}
                                <TableCell className="p-1">
                                    {rows.length > 1 && (
                                        <button
                                            onClick={() => handleDeleteRow(index)}
                                            title="Delete row"
                                            className="p-1 hover:bg-gray-100 rounded text-red-500"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Add Row Button - mt-8 gives space for dropdowns to expand */}
            <Button variant="outline" size="sm" onClick={handleAddRow} className="w-full mt-8 relative z-0">
                <Plus className="h-4 w-4 mr-1" /> Add Row
            </Button>

            {/* Image Preview Modal */}
            <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Product Image Preview</DialogTitle>
                    </DialogHeader>
                    {previewImage && (
                        <div className="flex justify-center items-center p-4">
                            <img
                                src={previewImage}
                                alt="Product"
                                className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-lg"
                            />
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
