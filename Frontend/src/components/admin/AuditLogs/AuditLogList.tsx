import React, { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { Search, Filter, Download, Eye, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Checkbox } from '../../ui/checkbox';
import { AdminTable } from '../shared/AdminTable';
import { AuditLogDetails } from './AuditLogDetails';
import { AuditLogFilter } from './AuditLogFilter';
import { adminApiService } from '../../../services/adminApiService';
import { useToast } from '../../../hooks/use-toast';
import type { AuditLogEntry, AuditLogFilters, AdminListOptions } from '../../../types/admin';

interface AuditLogListProps {
  className?: string;
}

export const AuditLogList: React.FC<AuditLogListProps> = ({ className }) => {
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLogs, setSelectedLogs] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  
  // Pagination and filtering state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize] = useState(20);
  
  // Filter state
  const [filters, setFilters] = useState<AuditLogFilters>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<string>('timestamp');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  
  const { toast } = useToast();

  // Load audit logs
  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const options: AdminListOptions & AuditLogFilters = {
        page: currentPage,
        limit: pageSize,
        search: searchQuery || undefined,
        sortBy,
        sortOrder,
        ...filters,
      };
      
      const response = await adminApiService.getAuditLogs(options);
      
      if (response.success && response.data) {
        setAuditLogs(response.data);
        setTotalPages(response.pagination?.totalPages || 1);
        setTotalCount(response.pagination?.total || 0);
      } else {
        throw new Error(response.error?.message || 'Failed to load audit logs');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load audit logs';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount and when dependencies change
  useEffect(() => {
    loadAuditLogs();
  }, [currentPage, searchQuery, filters, sortBy, sortOrder]);

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  // Handle filter changes
  const handleFilterChange = (newFilters: AuditLogFilters) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  // Handle sort changes
  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortBy(column);
      setSortOrder('DESC');
    }
    setCurrentPage(1);
  };

  // Handle log selection
  const handleLogSelection = (logId: string, selected: boolean) => {
    if (selected) {
      setSelectedLogs(prev => [...prev, logId]);
    } else {
      setSelectedLogs(prev => prev.filter(id => id !== logId));
    }
  };

  // Handle select all
  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedLogs(auditLogs.map(log => log.id));
    } else {
      setSelectedLogs([]);
    }
  };

  // Export selected logs
  const handleExport = async () => {
    try {
      setExporting(true);
      
      const exportConfig = {
        type: 'audit_logs',
        format: 'csv',
        filters: {
          ...filters,
          logIds: selectedLogs.length > 0 ? selectedLogs : undefined,
        },
      };
      
      const blob = await adminApiService.exportReport(exportConfig);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: 'Export Complete',
        description: 'Audit logs have been exported successfully.',
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export audit logs';
      toast({
        title: 'Export Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  // Get status badge
  const getStatusBadge = (success: boolean) => {
    if (success) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
          <CheckCircle className="w-3 h-3 mr-1" />
          Success
        </Badge>
      );
    } else {
      return (
        <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">
          <XCircle className="w-3 h-3 mr-1" />
          Failed
        </Badge>
      );
    }
  };

  // Get action badge color
  const getActionBadge = (action: string) => {
    const actionColors: Record<string, string> = {
      'user.create': 'bg-blue-100 text-blue-800 border-blue-200',
      'user.update': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'user.delete': 'bg-red-100 text-red-800 border-red-200',
      'agent.create': 'bg-green-100 text-green-800 border-green-200',
      'agent.update': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'agent.delete': 'bg-red-100 text-red-800 border-red-200',
      'system.config': 'bg-purple-100 text-purple-800 border-purple-200',
      'auth.login': 'bg-gray-100 text-gray-800 border-gray-200',
      'auth.logout': 'bg-gray-100 text-gray-800 border-gray-200',
    };
    
    const colorClass = actionColors[action] || 'bg-gray-100 text-gray-800 border-gray-200';
    
    return (
      <Badge variant="outline" className={colorClass}>
        {action}
      </Badge>
    );
  };

  // Table columns
  const columns = [
    {
      key: 'select',
      label: (
        <Checkbox
          checked={selectedLogs.length === auditLogs.length && auditLogs.length > 0}
          onCheckedChange={handleSelectAll}
          aria-label="Select all logs"
        />
      ),
      render: (log: AuditLogEntry) => (
        <Checkbox
          checked={selectedLogs.includes(log.id)}
          onCheckedChange={(checked) => handleLogSelection(log.id, checked as boolean)}
          aria-label={`Select log ${log.id}`}
        />
      ),
      width: '50px',
    },
    {
      key: 'timestamp',
      label: 'Timestamp',
      sortable: true,
      render: (log: AuditLogEntry) => (
        <div className="text-sm">
          <div className="font-medium">
            {format(new Date(log.timestamp), 'MMM dd, yyyy')}
          </div>
          <div className="text-gray-500">
            {format(new Date(log.timestamp), 'HH:mm:ss')}
          </div>
        </div>
      ),
      width: '140px',
    },
    {
      key: 'adminUserEmail',
      label: 'Admin User',
      sortable: true,
      render: (log: AuditLogEntry) => (
        <div className="text-sm">
          <div className="font-medium">{log.adminUserEmail}</div>
          <div className="text-gray-500 text-xs">{log.adminUserId}</div>
        </div>
      ),
      width: '180px',
    },
    {
      key: 'action',
      label: 'Action',
      sortable: true,
      render: (log: AuditLogEntry) => getActionBadge(log.action),
      width: '120px',
    },
    {
      key: 'resourceType',
      label: 'Resource',
      sortable: true,
      render: (log: AuditLogEntry) => (
        <div className="text-sm">
          <div className="font-medium">{log.resourceType}</div>
          {log.resourceId && (
            <div className="text-gray-500 text-xs truncate max-w-[100px]">
              {log.resourceId}
            </div>
          )}
        </div>
      ),
      width: '120px',
    },
    {
      key: 'targetUserEmail',
      label: 'Target User',
      render: (log: AuditLogEntry) => (
        log.targetUserEmail ? (
          <div className="text-sm">
            <div className="font-medium">{log.targetUserEmail}</div>
            <div className="text-gray-500 text-xs">{log.targetUserId}</div>
          </div>
        ) : (
          <span className="text-gray-400">-</span>
        )
      ),
      width: '180px',
    },
    {
      key: 'success',
      label: 'Status',
      sortable: true,
      render: (log: AuditLogEntry) => getStatusBadge(log.success),
      width: '100px',
    },
    {
      key: 'ipAddress',
      label: 'IP Address',
      render: (log: AuditLogEntry) => (
        <span className="text-sm font-mono">{log.ipAddress}</span>
      ),
      width: '120px',
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (log: AuditLogEntry) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedLog(log)}
          className="h-8 w-8 p-0"
        >
          <Eye className="h-4 w-4" />
        </Button>
      ),
      width: '80px',
    },
  ];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Audit Logs</h2>
          <p className="text-muted-foreground">
            Track all administrative actions and system events
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2"
          >
            <Filter className="h-4 w-4" />
            <span>Filters</span>
          </Button>
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>{exporting ? 'Exporting...' : 'Export'}</span>
          </Button>
        </div>
      </div>

      {/* Search and Stats */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search logs..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10 w-80"
                />
              </div>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="timestamp">Timestamp</SelectItem>
                  <SelectItem value="adminUserEmail">Admin User</SelectItem>
                  <SelectItem value="action">Action</SelectItem>
                  <SelectItem value="resourceType">Resource</SelectItem>
                  <SelectItem value="success">Status</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-gray-500">
              {selectedLogs.length > 0 && (
                <span className="mr-4">{selectedLogs.length} selected</span>
              )}
              Total: {totalCount} logs
            </div>
          </div>

          {/* Filters */}
          {showFilters && (
            <AuditLogFilter
              filters={filters}
              onFiltersChange={handleFilterChange}
              className="mb-4"
            />
          )}
        </CardContent>
      </Card>

      {/* Audit Logs Table */}
      <Card>
        <CardContent className="p-0">
          <AdminTable
            data={auditLogs}
            columns={columns}
            loading={loading}
            error={error}
            emptyMessage="No audit logs found"
            onSort={handleSort}
            sortBy={sortBy}
            sortOrder={sortOrder}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            className="border-0"
          />
        </CardContent>
      </Card>

      {/* Audit Log Details Modal */}
      {selectedLog && (
        <AuditLogDetails
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
        />
      )}
    </div>
  );
};

export default AuditLogList;