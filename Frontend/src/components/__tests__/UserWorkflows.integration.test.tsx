import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../App';
import {
    renderWithProviders,
    setupIntegrationTest,
    cleanupIntegrationTest,
    mockApiService,
    mockApiSuccess,
    mockApiError,
    mockAgents,
    mockContacts,
    mockCalls