import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { apiService } from '../apiService';

// Mock localStorage
const mockLocalStorage = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
});

// Mock fetch
global.fetch = vi.fn();

describe('ApiService User Context Validation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Clear the agents cache before each test
        (apiService as any).clearAgentsCache();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('User Authentication Validation', () => {
        it('should throw UNAUTHORIZED error when no auth token exists for getAgents', async () => {
            mockLocalStorage.getItem.mockReturnValue(null);

            await expect(apiService.getAgents()).rejects.toMatchObject({
                code: 'UNAUTHORIZED',
                message: 'User must be authenticated to access agents',
            });
        });

        it('should throw UNAUTHORIZED error when no auth token exists for getCalls', async () => {
            mockLocalStorage.getItem.mockReturnValue(null);

            await expect(apiService.getCalls()).rejects.toMatchObject({
                code: 'UNAUTHORIZED',
                message: 'User must be authenticated to access call data',
            });
        });

        it('should throw UNAUTHORIZED error when no auth token exists for getVoices', async () => {
            mockLocalStorage.getItem.mockReturnValue(null);

            await expect(apiService.getVoices()).rejects.toMatchObject({
                code: 'UNAUTHORIZED',
                message: 'User must be authenticated to access voices',
            });
        });
    });

    describe('Agent Ownership Validation', () => {
        const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTEyMyIsInN1YiI6InVzZXItMTIzIiwiaWF0IjoxNjAwMDAwMDAwLCJleHAiOjk5OTk5OTk5OTl9.test';
        const mockAgents = [
            { id: '550e8400-e29b-41d4-a716-446655440001', name: 'Agent 1', userId: 'user-123' },
            { id: '550e8400-e29b-41d4-a716-446655440002', name: 'Agent 2', userId: 'user-123' },
        ];

        beforeEach(() => {
            mockLocalStorage.getItem.mockReturnValue(mockToken);
        });

        it('should validate agent ownership successfully for owned agent', async () => {
            // Mock the agents list request
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ data: mockAgents }),
                headers: new Headers({ 'content-type': 'application/json' }),
            });

            // Mock the actual getAgent request
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ data: mockAgents[0] }),
                headers: new Headers({ 'content-type': 'application/json' }),
            });

            const result = await apiService.getAgent('550e8400-e29b-41d4-a716-446655440001');
            expect(result.data).toEqual(mockAgents[0]);
        });

        it('should throw AGENT_ACCESS_DENIED for non-owned agent', async () => {
            // Mock the agents list request
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ data: mockAgents }),
                headers: new Headers({ 'content-type': 'application/json' }),
            });

            await expect(apiService.getAgent('550e8400-e29b-41d4-a716-446655440999')).rejects.toMatchObject({
                code: 'AGENT_ACCESS_DENIED',
                message: expect.stringContaining('Unable to verify agent ownership'),
            });
        });

        it('should throw VALIDATION_ERROR for invalid agent ID format', async () => {
            await expect(apiService.getAgent('invalid-id')).rejects.toMatchObject({
                code: 'VALIDATION_ERROR',
                message: 'Invalid agent ID format',
            });
        });

        it('should validate agent ownership for analytics methods', async () => {
            // Mock the agents list request
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ data: mockAgents }),
                headers: new Headers({ 'content-type': 'application/json' }),
            });

            // Mock the analytics request
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ data: { overview: 'test' } }),
                headers: new Headers({ 'content-type': 'application/json' }),
            });

            const result = await apiService.getAgentOverview('550e8400-e29b-41d4-a716-446655440001');
            expect(result.data).toEqual({ overview: 'test' });
        });

        it('should validate agent ownership for update operations', async () => {
            // Mock the agents list request
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ data: mockAgents }),
                headers: new Headers({ 'content-type': 'application/json' }),
            });

            // Mock the update request
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ data: { ...mockAgents[0], name: 'Updated Agent' } }),
                headers: new Headers({ 'content-type': 'application/json' }),
            });

            const result = await apiService.updateAgent('550e8400-e29b-41d4-a716-446655440001', { name: 'Updated Agent' });
            expect(result.data.name).toBe('Updated Agent');
        });
    });

    describe('Call Analytics Agent Filtering', () => {
        const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTEyMyIsInN1YiI6InVzZXItMTIzIiwiaWF0IjoxNjAwMDAwMDAwLCJleHAiOjk5OTk5OTk5OTl9.test';
        const mockAgents = [
            { id: '550e8400-e29b-41d4-a716-446655440001', name: 'Agent 1', userId: 'user-123' },
        ];

        beforeEach(() => {
            mockLocalStorage.getItem.mockReturnValue(mockToken);
        });

        it('should validate agent ownership when filtering call analytics by agent', async () => {
            // Mock the agents list request
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ data: mockAgents }),
                headers: new Headers({ 'content-type': 'application/json' }),
            });

            // Mock the analytics request
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ data: { kpis: 'test' } }),
                headers: new Headers({ 'content-type': 'application/json' }),
            });

            const result = await apiService.getCallAnalyticsKPIs({ agentId: '550e8400-e29b-41d4-a716-446655440001' });
            expect(result.data).toEqual({ kpis: 'test' });
        });

        it('should throw AGENT_ACCESS_DENIED when filtering by non-owned agent', async () => {
            // Mock the agents list request
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ data: mockAgents }),
                headers: new Headers({ 'content-type': 'application/json' }),
            });

            await expect(apiService.getCallAnalyticsKPIs({ agentId: '550e8400-e29b-41d4-a716-446655440999' })).rejects.toMatchObject({
                code: 'AGENT_ACCESS_DENIED',
                message: expect.stringContaining('Unable to verify agent ownership'),
            });
        });
    });

    describe('Agent Cache Management', () => {
        const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTEyMyIsInN1YiI6InVzZXItMTIzIiwiaWF0IjoxNjAwMDAwMDAwLCJleHAiOjk5OTk5OTk5OTl9.test';
        const mockAgents = [
            { id: '550e8400-e29b-41d4-a716-446655440001', name: 'Agent 1', userId: 'user-123' },
        ];

        beforeEach(() => {
            mockLocalStorage.getItem.mockReturnValue(mockToken);
        });

        it('should cache agents list to avoid repeated API calls', async () => {
            // Mock the agents list request
            (global.fetch as any).mockResolvedValue({
                ok: true,
                json: async () => ({ data: mockAgents }),
                headers: new Headers({ 'content-type': 'application/json' }),
            });

            // First call should fetch agents
            await (apiService as any).getUserAgents();

            // Second call should use cache
            await (apiService as any).getUserAgents();

            // Should only make one request for agents list
            expect(global.fetch).toHaveBeenCalledTimes(1);
        });

        it('should clear cache after creating an agent', async () => {
            // Mock the agents list request
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ data: [] }),
                headers: new Headers({ 'content-type': 'application/json' }),
            });

            // Mock the create agent request
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ data: { id: 'new-agent', name: 'New Agent' } }),
                headers: new Headers({ 'content-type': 'application/json' }),
            });

            await apiService.createAgent({ name: 'New Agent', agentType: 'call' });

            // Cache should be cleared
            expect((apiService as any).userAgentsCache).toBeNull();
        });
    });
});