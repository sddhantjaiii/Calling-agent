import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, MoreHorizontal, Eye, Edit, Trash2, Users, Activity, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Checkbox } from '../../ui/checkbox';
import { LoadingSpinner } from '../../ui/LoadingSpinner';
import { EmptyState } from '../../ui/EmptyStateComponents';
import { adminApiService } from '../../../services/adminApiService';
import { AgentDetailsModal } from './AgentDetailsModal';
import { BulkAgentActions } from './BulkAgentActions';
import type { AdminAgentListItem } from '../../../types/admin';

interface AgentListProps {
    onAgentSelect?: (agent: AdminAgentListItem) => void;
    onRefresh?: () => void;
}

interface AgentFilters {
    search: string;
    status: 'all' | 'active' | 'inactive';
    type: 'all' | 'call' | 'chat';
    healthStatus: 'all' | 'healthy' | 'warning' | 'error';
    userId?: string;
}

export const AgentList: React.FC<AgentListProps> = ({ onAgentSelect, onRefresh }) => {
    const [agents, setAgents] = useState<AdminAgentListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
    const [selectedAgent, setSelectedAgent] = useState<AdminAgentListItem | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showBulkActions, setShowBulkActions] = useState(false);

    const [filters, setFilters] = useState<AgentFilters>({
        search: '',
        status: 'all',
        type: 'all',
        healthStatus: 'all',
    });

    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
    });

    // Load agents
    const loadAgents = async () => {
        try {
            setLoading(true);
            setError(null);

            const queryParams = {
                page: pagination.page,
                limit: pagination.limit,
                search: filters.search || undefined,
                isActive: filters.status === 'all' ? undefined : filters.status === 'active',
                agentType: filters.type === 'all' ? undefined : filters.type,
                userId: filters.userId,
            };

            const response = await adminApiService.getAgents(queryParams);

            if (response.success && response.data) {
                // Handle nested data structure: response.data.agents or response.data directly
                let agentsData: AdminAgentListItem[] = [];
                
                if (Array.isArray(response.data)) {
                    // Direct array format
                    agentsData = response.data;
                } else if (response.data.agents && Array.isArray(response.data.agents)) {
                    // Nested format: { data: { agents: [...] } }
                    agentsData = response.data.agents;
                } else {
                    // Fallback to empty array
                    agentsData = [];
                }
                
                setAgents(agentsData);
                setPagination(prev => ({
                    ...prev,
                    total: response.pagination?.total || agentsData.length,
                }));
            } else {
                throw new Error(response.error?.message || 'Failed to load agents');
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load agents';
            setError(errorMessage);
            console.error('Failed to load agents:', err);
        } finally {
            setLoading(false);
        }
    };

    // Filter agents based on current filters
    const filteredAgents = useMemo(() => {
        // Ensure agents is an array before filtering
        const agentsArray = Array.isArray(agents) ? agents : [];
        return agentsArray.filter(agent => {
            // Search filter
            if (filters.search) {
                const searchLower = filters.search.toLowerCase();
                const matchesSearch =
                    agent.name.toLowerCase().includes(searchLower) ||
                    agent.userEmail.toLowerCase().includes(searchLower) ||
                    agent.userName.toLowerCase().includes(searchLower);
                if (!matchesSearch) return false;
            }

            // Status filter
            if (filters.status !== 'all') {
                const isActive = agent.status === 'active';
                if (filters.status === 'active' && !isActive) return false;
                if (filters.status === 'inactive' && isActive) return false;
            }

            // Type filter
            if (filters.type !== 'all') {
                if (agent.type !== filters.type) return false;
            }

            // Health status filter
            if (filters.healthStatus !== 'all') {
                if (agent.healthStatus !== filters.healthStatus) return false;
            }

            return true;
        });
    }, [agents, filters]);

    // Handle agent selection
    const handleAgentSelect = (agentId: string, selected: boolean) => {
        setSelectedAgents(prev =>
            selected
                ? [...prev, agentId]
                : prev.filter(id => id !== agentId)
        );
    };

    // Handle select all
    const handleSelectAll = (selected: boolean) => {
        setSelectedAgents(selected ? filteredAgents.map(agent => agent.id) : []);
    };

    // Handle agent details
    const handleViewDetails = (agent: AdminAgentListItem) => {
        setSelectedAgent(agent);
        setShowDetailsModal(true);
        onAgentSelect?.(agent);
    };

    // Handle bulk actions
    const handleBulkAction = () => {
        if (selectedAgents.length > 0) {
            setShowBulkActions(true);
        }
    };

    // Handle bulk action complete
    const handleBulkActionComplete = () => {
        setSelectedAgents([]);
        setShowBulkActions(false);
        loadAgents();
        onRefresh?.();
    };

    // Get health status badge
    const getHealthStatusBadge = (status: string) => {
        switch (status) {
            case 'healthy':
                return <Badge variant="success" className="flex items-center gap-1"><CheckCircle className="w-3 h-3" />Healthy</Badge>;
            case 'warning':
                return <Badge variant="warning" className="flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Warning</Badge>;
            case 'error':
                return <Badge variant="destructive" className="flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Error</Badge>;
            default:
                return <Badge variant="secondary">Unknown</Badge>;
        }
    };

    // Get ElevenLabs status badge
    const getElevenLabsStatusBadge = (status?: string) => {
        switch (status) {
            case 'active':
                return <Badge variant="success">Active</Badge>;
            case 'inactive':
                return <Badge variant="secondary">Inactive</Badge>;
            case 'error':
                return <Badge variant="destructive">Error</Badge>;
            default:
                return <Badge variant="outline">Unknown</Badge>;
        }
    };

    // Load agents on mount and filter changes
    useEffect(() => {
        loadAgents();
    }, [pagination.page, pagination.limit]);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (pagination.page === 1) {
                loadAgents();
            } else {
                setPagination(prev => ({ ...prev, page: 1 }));
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [filters.search]);

    // Reload on filter changes (except search)
    useEffect(() => {
        if (pagination.page === 1) {
            loadAgents();
        } else {
            setPagination(prev => ({ ...prev, page: 1 }));
        }
    }, [filters.status, filters.type, filters.healthStatus, filters.userId]);

    if (loading && (!Array.isArray(agents) || agents.length === 0)) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center py-8">
                    <LoadingSpinner size="lg" />
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Agent Management</h2>
                    <p className="text-muted-foreground">
                        Manage all agents across all users ({filteredAgents.length} agents)
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {selectedAgents.length > 0 && (
                        <Button onClick={handleBulkAction} variant="outline">
                            <Users className="w-4 h-4 mr-2" />
                            Bulk Actions ({selectedAgents.length})
                        </Button>
                    )}
                    <Button onClick={loadAgents} variant="outline">
                        <Activity className="w-4 h-4 mr-2" />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Filters</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Search</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                                <Input
                                    placeholder="Search agents, users..."
                                    value={filters.search}
                                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                                    className="pl-10"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Status</label>
                            <Select
                                value={filters.status}
                                onValueChange={(value) => setFilters(prev => ({ ...prev, status: value as any }))}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="inactive">Inactive</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Type</label>
                            <Select
                                value={filters.type}
                                onValueChange={(value) => setFilters(prev => ({ ...prev, type: value as any }))}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Types</SelectItem>
                                    <SelectItem value="call">Call Agent</SelectItem>
                                    <SelectItem value="chat">Chat Agent</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Health</label>
                            <Select
                                value={filters.healthStatus}
                                onValueChange={(value) => setFilters(prev => ({ ...prev, healthStatus: value as any }))}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Health</SelectItem>
                                    <SelectItem value="healthy">Healthy</SelectItem>
                                    <SelectItem value="warning">Warning</SelectItem>
                                    <SelectItem value="error">Error</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Error State */}
            {error && (
                <Card>
                    <CardContent className="py-8">
                        <div className="text-center text-red-600">
                            <AlertTriangle className="w-12 h-12 mx-auto mb-4" />
                            <p className="text-lg font-semibold mb-2">Error Loading Agents</p>
                            <p className="text-sm mb-4">{error}</p>
                            <Button onClick={loadAgents} variant="outline">
                                Try Again
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Agents Table */}
            {!error && (
                <Card>
                    <CardContent className="p-0">
                        {filteredAgents.length === 0 ? (
                            <EmptyState
                                icon={Users}
                                title="No agents found"
                                description="No agents match your current filters."
                                action={
                                    <Button onClick={() => setFilters({
                                        search: '',
                                        status: 'all',
                                        type: 'all',
                                        healthStatus: 'all',
                                    })}>
                                        Clear Filters
                                    </Button>
                                }
                            />
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-12">
                                                <Checkbox
                                                    checked={selectedAgents.length === filteredAgents.length}
                                                    onCheckedChange={handleSelectAll}
                                                />
                                            </TableHead>
                                            <TableHead>Agent</TableHead>
                                            <TableHead>Owner</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Health</TableHead>
                                            <TableHead>ElevenLabs</TableHead>
                                            <TableHead>Calls</TableHead>
                                            <TableHead>Last Call</TableHead>
                                            <TableHead className="w-12"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredAgents.map((agent) => (
                                            <TableRow key={agent.id}>
                                                <TableCell>
                                                    <Checkbox
                                                        checked={selectedAgents.includes(agent.id)}
                                                        onCheckedChange={(checked) => handleAgentSelect(agent.id, checked as boolean)}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <div>
                                                        <div className="font-medium">{agent.name}</div>
                                                        <div className="text-sm text-muted-foreground">
                                                            ID: {agent.id}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div>
                                                        <div className="font-medium">{agent.userName}</div>
                                                        <div className="text-sm text-muted-foreground">{agent.userEmail}</div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={agent.type === 'call' ? 'default' : 'secondary'}>
                                                        {agent.type === 'call' ? 'Call Agent' : 'Chat Agent'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={agent.status === 'active' ? 'success' : 'secondary'}>
                                                        {agent.status === 'active' ? 'Active' : 'Inactive'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {getHealthStatusBadge(agent.healthStatus)}
                                                </TableCell>
                                                <TableCell>
                                                    {getElevenLabsStatusBadge(agent.elevenlabsStatus)}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-sm">
                                                        <div>{agent.callCount || 0}</div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-sm text-muted-foreground">
                                                        {agent.lastCallAt
                                                            ? new Date(agent.lastCallAt).toLocaleDateString()
                                                            : 'Never'
                                                        }
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="sm">
                                                                <MoreHorizontal className="w-4 h-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => handleViewDetails(agent)}>
                                                                <Eye className="w-4 h-4 mr-2" />
                                                                View Details
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleViewDetails(agent)}>
                                                                <Edit className="w-4 h-4 mr-2" />
                                                                Edit Agent
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => {/* Handle delete */ }}
                                                                className="text-red-600"
                                                            >
                                                                <Trash2 className="w-4 h-4 mr-2" />
                                                                Delete Agent
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Pagination */}
            {filteredAgents.length > 0 && pagination.total > pagination.limit && (
                <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                        Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                        {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                        {pagination.total} agents
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                            disabled={pagination.page === 1}
                        >
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                            disabled={pagination.page * pagination.limit >= pagination.total}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}

            {/* Modals */}
            {showDetailsModal && selectedAgent && (
                <AgentDetailsModal
                    agent={selectedAgent}
                    open={showDetailsModal}
                    onClose={() => {
                        setShowDetailsModal(false);
                        setSelectedAgent(null);
                    }}
                    onUpdate={() => {
                        loadAgents();
                        onRefresh?.();
                    }}
                />
            )}

            {showBulkActions && (
                <BulkAgentActions
                    agentIds={selectedAgents}
                    open={showBulkActions}
                    onClose={() => setShowBulkActions(false)}
                    onComplete={handleBulkActionComplete}
                />
            )}
        </div>
    );
};