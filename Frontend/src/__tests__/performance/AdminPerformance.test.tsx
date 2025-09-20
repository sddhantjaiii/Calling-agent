import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { performance } from 'perf_hooks';
import AdminPanel from '../../components/admin/AdminPanel';
import { AuthContext } from '../../contexts/AuthContext';
import { AdminContext } from '../../contexts/AdminContext';
import { adminApiService } from '../../services/adminApiService';

// Mock services
vi.mock('../../services/adminApiService');

// Generate large datasets for testing
const generateLargeUserDataset = (count: number) => {
  return Array.from({ length: count }, (_, index) => ({
    id: `user-${index + 1}`,
    name: `User ${index + 1}`,
    email: `user${index + 1}@test.com`,
    role: index % 10 === 0 ? 'admin' : 'user',
    status: index % 5 === 0 ? 'inactive' : 'active',
    registrationDate: new Date(2024, 0, (index % 30) + 1),
    lastLogin: new Date(2024, 0, (index % 30) + 1),
    agentCount: Math.floor(Math.random() * 10),
    callCount: Math.floor(Math.random() * 1000),
    creditsUsed: Math.floor(Math.