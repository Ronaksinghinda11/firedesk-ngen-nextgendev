import React from 'react';

interface ColumnDef {
    key: string;
    label: string;
    render?: (value: any, row: any) => React.ReactNode;
    align?: 'left' | 'center' | 'right';
}

interface ReportTableProps {
    columns: ColumnDef[];
    data: any[];
    loading?: boolean;
}

/**
 * ReportTable Component
 *
 * Displays report data in a styled table
 * Orange/Slate theme styling
 *
 * @example
 * <ReportTable
 *   columns={[{ key: 'id', label: 'ID' }, { key: 'status', label: 'Status' }]}
 *   data={data}
 * />
 */
export const ReportTable: React.FC<ReportTableProps> = ({
    columns,
    data,
    loading = false
}) => {
    if (loading) {
        return (
            <div className="w-full h-64 flex items-center justify-center bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-slate-500">Loading data...</div>
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="w-full h-64 flex items-center justify-center bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-slate-500 italic">No data found for the selected criteria</div>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm">
            <table className="w-full text-sm text-left text-slate-600">
                <thead className="text-xs text-slate-700 uppercase bg-orange-50 border-b border-orange-100">
                    <tr>
                        {columns.map((col) => (
                            <th
                                key={col.key}
                                scope="col"
                                className={`px-6 py-3 font-semibold ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'}`}
                            >
                                {col.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.map((row, rowIndex) => (
                        <tr
                            key={rowIndex}
                            className="bg-white border-b border-slate-100 hover:bg-slate-50 transition-colors"
                        >
                            {columns.map((col) => {
                                const value = row[col.key];
                                return (
                                    <td
                                        key={`${rowIndex}-${col.key}`}
                                        className={`px-6 py-4 ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'}`}
                                    >
                                        {col.render ? col.render(value, row) : value || '-'}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default ReportTable;
