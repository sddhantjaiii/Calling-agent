import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';

interface Column<T> {
  key: keyof T;
  header: string;
  width?: number;
  render?: (value: any, item: T) => React.ReactNode;
}

interface VirtualizedTableProps<T> {
  data: T[];
  columns: Column<T>[];
  itemHeight?: number;
  height?: number;
  searchable?: boolean;
  searchPlaceholder?: string;
  onRowClick?: (item: T) => void;
  loading?: boolean;
  className?: string;
}

interface RowProps<T> {
  index: number;
  style: React.CSSProperties;
  data: {
    items: T[];
    columns: Column<T>[];
    onRowClick?: (item: T) => void;
  };
}

const Row = <T,>({ index, style, data }: RowProps<T>) => {
  const { items, columns, onRowClick } = data;
  const item = items[index];

  return (
    <div
      style={style}
      className={`flex border-b hover:bg-muted/50 cursor-pointer ${
        index % 2 === 0 ? 'bg-background' : 'bg-muted/20'
      }`}
      onClick={() => onRowClick?.(item)}
    >
      {columns.map((column) => (
        <div
          key={String(column.key)}
          className="flex items-center px-4 py-2 text-sm"
          style={{ width: column.width || 150, minWidth: column.width || 150 }}
        >
          {column.render ? column.render(item[column.key], item) : String(item[column.key] || '')}
        </div>
      ))}
    </div>
  );
};

export function VirtualizedTable<T>({
  data,
  columns,
  itemHeight = 50,
  height = 400,
  searchable = true,
  searchPlaceholder = "Search...",
  onRowClick,
  loading = false,
  className = ""
}: VirtualizedTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = Math.floor(height / itemHeight);

  // Filter data based on search query
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;
    
    return data.filter(item =>
      columns.some(column => {
        const value = item[column.key];
        return String(value || '').toLowerCase().includes(searchQuery.toLowerCase());
      })
    );
  }, [data, searchQuery, columns]);

  // Paginate filtered data for better performance
  const paginatedData = useMemo(() => {
    const startIndex = currentPage * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(0);
  }, [searchQuery]);

  const handleSearch = useCallback((value: string) => {
    setSearchQuery(value);
  }, []);

  const handlePrevPage = useCallback(() => {
    setCurrentPage(prev => Math.max(0, prev - 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setCurrentPage(prev => Math.min(totalPages - 1, prev + 1));
  }, [totalPages]);

  const itemData = useMemo(() => ({
    items: paginatedData,
    columns,
    onRowClick
  }), [paginatedData, columns, onRowClick]);

  if (loading) {
    return (
      <div className={`border rounded-lg ${className}`}>
        <div className="p-4">
          <div className="animate-pulse space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`border rounded-lg ${className}`}>
      {searchable && (
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      )}

      {/* Table Header */}
      <div className="flex border-b bg-muted/50">
        {columns.map((column) => (
          <div
            key={String(column.key)}
            className="flex items-center px-4 py-3 font-medium text-sm"
            style={{ width: column.width || 150, minWidth: column.width || 150 }}
          >
            {column.header}
          </div>
        ))}
      </div>

      {/* Virtualized Table Body */}
      {paginatedData.length > 0 ? (
        <List
          height={Math.min(height, paginatedData.length * itemHeight)}
          itemCount={paginatedData.length}
          itemSize={itemHeight}
          itemData={itemData}
        >
          {Row}
        </List>
      ) : (
        <div className="p-8 text-center text-muted-foreground">
          {searchQuery ? 'No results found' : 'No data available'}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between p-4 border-t">
          <div className="text-sm text-muted-foreground">
            Showing {currentPage * itemsPerPage + 1} to{' '}
            {Math.min((currentPage + 1) * itemsPerPage, filteredData.length)} of{' '}
            {filteredData.length} results
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevPage}
              disabled={currentPage === 0}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm">
              Page {currentPage + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={currentPage >= totalPages - 1}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}