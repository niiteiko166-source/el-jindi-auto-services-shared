import React from 'react';

type Props = {
  totalItems: number;
  pageSize: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  compact?: boolean;
};

export const Pagination: React.FC<Props> = ({ totalItems, pageSize, currentPage, onPageChange, compact }) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const prev = () => onPageChange(Math.max(1, currentPage - 1));
  const next = () => onPageChange(Math.min(totalPages, currentPage + 1));

  return (
    <div className={`flex items-center justify-between text-sm ${compact ? 'text-xs' : ''}`}>
      <button onClick={prev} disabled={currentPage <= 1} className="px-3 py-1 rounded-md text-slate-700 hover:bg-slate-100 disabled:opacity-50">
        ← Prev
      </button>

      <div className="text-slate-600">
        <span className="font-semibold text-slate-900">Page {currentPage}</span>
        <span className="mx-2 text-slate-400">of</span>
        <span className="text-slate-900">{totalPages}</span>
      </div>

      <button onClick={next} disabled={currentPage >= totalPages} className="px-3 py-1 rounded-md text-slate-700 hover:bg-slate-100 disabled:opacity-50">
        Next →
      </button>
    </div>
  );
};

export default Pagination;
