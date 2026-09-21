import type { FC } from 'react';

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (newPage: number) => void;
  isLoading?: boolean;
}

export const Pagination: FC<PaginationProps> = ({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  isLoading = false,
}) => {
  if (total === 0) {
    return null;
  }

  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  // Generate page numbers to show (e.g. up to 5 adjacent pages or all)
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      let start = Math.max(1, page - 2);
      let end = Math.min(totalPages, page + 2);

      if (page <= 3) {
        start = 1;
        end = 5;
      } else if (page >= totalPages - 2) {
        start = totalPages - 4;
        end = totalPages;
      }

      if (start > 1) {
        pages.push(1);
        if (start > 2) {
          pages.push('...');
        }
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < totalPages) {
        if (end < totalPages - 1) {
          pages.push('...');
        }
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const pages = getPageNumbers();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
      <div className="text-sm text-gray-700">
        Showing <span className="font-semibold text-gray-900">{startItem}</span> to{' '}
        <span className="font-semibold text-gray-900">{endItem}</span> of{' '}
        <span className="font-semibold text-gray-900">{total}</span> posts
      </div>

      <div className="flex items-center space-x-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1 || isLoading}
          className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Previous
        </button>

        <div className="flex items-center space-x-1 px-1">
          {pages.map((p, idx) => {
            if (typeof p === 'string') {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-2 py-1 text-sm text-gray-400 select-none"
                >
                  {p}
                </span>
              );
            }

            const isActive = p === page;
            return (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                disabled={isLoading}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  isActive ? 'bg-blue-600 text-white shadow-xs' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages || isLoading}
          className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
};
