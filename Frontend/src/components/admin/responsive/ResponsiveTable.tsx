import React from 'react';
import { useResponsiveTable, useTouchFriendly } from '../../../hooks/useResponsive';
import { Button } from '../../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Grid, List } from 'lucide-react';

interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  className?: string;
  render?: (value: any, row: any) => React.ReactNode;
}

interface ResponsiveTableProps {
  data: any[];
  columns: Column[];
  onRowClick?: (row: any) => void;
  className?: string;
  emptyMessage?: string;
}

export const ResponsiveTable: React.FC<ResponsiveTableProps> = ({
  data,
  columns,
  onRowClick,
  className = '',
  emptyMessage = 'No data available',
}) => {
  const { viewMode, toggleViewMode, shouldUseCards } = useResponsiveTable();
  const { isTouchDevice, touchTargetSize } = useTouchFriendly();

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500" role="status" aria-live="polite">
        {emptyMessage}
      </div>
    );
  }

  const TableView = () => (
    <div className="overflow-x-auto">
      <Table className={className}>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead
                key={column.key}
                className={column.className}
                scope="col"
              >
                {column.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, index) => (
            <TableRow
              key={row.id || index}
              onClick={() => onRowClick?.(row)}
              className={`${onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''} ${
                isTouchDevice ? touchTargetSize : ''
              }`}
              tabIndex={onRowClick ? 0 : undefined}
              role={onRowClick ? 'button' : undefined}
              onKeyDown={(e) => {
                if (onRowClick && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  onRowClick(row);
                }
              }}
              aria-label={onRowClick ? `View details for ${row.name || 'item'}` : undefined}
            >
              {columns.map((column) => (
                <TableCell key={column.key} className={column.className}>
                  {column.render
                    ? column.render(row[column.key], row)
                    : row[column.key]}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  const CardView = () => (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {data.map((row, index) => (
        <Card
          key={row.id || index}
          className={`${onRowClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''} ${
            isTouchDevice ? touchTargetSize : ''
          }`}
          onClick={() => onRowClick?.(row)}
          tabIndex={onRowClick ? 0 : undefined}
          role={onRowClick ? 'button' : undefined}
          onKeyDown={(e) => {
            if (onRowClick && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              onRowClick(row);
            }
          }}
          aria-label={onRowClick ? `View details for ${row.name || 'item'}` : undefined}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {row.name || row.title || `Item ${index + 1}`}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {columns.slice(1).map((column) => (
              <div key={column.key} className="flex justify-between text-sm">
                <span className="text-gray-600">{column.label}:</span>
                <span className="font-medium">
                  {column.render
                    ? column.render(row[column.key], row)
                    : row[column.key]}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600" role="status" aria-live="polite">
          Showing {data.length} items
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={toggleViewMode}
          className="flex items-center space-x-2"
          aria-label={`Switch to ${viewMode === 'table' ? 'card' : 'table'} view`}
        >
          {viewMode === 'table' ? (
            <>
              <Grid className="h-4 w-4" />
              <span className="hidden sm:inline">Cards</span>
            </>
          ) : (
            <>
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">Table</span>
            </>
          )}
        </Button>
      </div>

      {shouldUseCards ? <CardView /> : <TableView />}
    </div>
  );
};

export default ResponsiveTable;