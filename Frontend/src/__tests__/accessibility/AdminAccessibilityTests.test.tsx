import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { axe, toHaveNoViolations } from 'jest-axe';
import { AdminContext } from '../../contexts/AdminContext';
import { AdminPanel } from '../../components/admin/AdminPanel';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { AdminSidebar } from '../../components/admin/AdminSidebar';
import { UserManagement } from '../../components/admin/UserManagement/UserManagement';
import { AgentManagement } from '../../components/admin/AgentManagement/AgentManagement';
import { SystemAnalytics } from '../../components/admin/SystemAnalytics';

// Extend Jest m