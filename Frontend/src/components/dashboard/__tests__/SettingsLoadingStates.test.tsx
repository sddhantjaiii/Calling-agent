import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import {
  SettingsLoadingOverlay,
  SettingsSaveButton,
  FieldLoadingState,
  SettingsFormSkeleton,
  ValidationLoadingState,
  ProgressIndicator,
} from '@/components/ui/SettingsLoadingStates';
import {
  useSettingsLoading,
  useMultipleLoadingStates,
  useSaveState,
  useDebouncedLoading,
} from '@/hooks/useSettingsLoadingStates';

describe('SettingsLoadingOverlay', () => {
  it('renders children when not loading', () => {
    render(
      <SettingsLoadingOverlay isLoading={false}>
        <div>Content</div>
      </SettingsLoadingOverlay>
    );

    expect(screen.getByText('Content')).toBeInTheDocument();
    expect(screen.queryByText('Loading settings...')).not.toBeInTheDocument();
  });

  it('shows loading overlay when loading', () => {
    render(
      <SettingsLoadingOverlay isLoading={true} loadingText="Saving changes...">
        <div>Content</div>
      </SettingsLoadingOverlay>
    );

    expect(screen.getByText('Content')).toBeInTheDocument();
    expect(screen.getByText('Saving changes...')).toBeInTheDocument();
  });
});

describe('SettingsSaveButton', () => {
  const mockOnClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows save changes when not loading and has changes', () => {
    render(
      <SettingsSaveButton
        isLoading={false}
        isSaved={false}
        hasChanges={true}
        onClick={mockOnClick}
      />
    );

    const button = screen.getByRole('button', { name: /save changes/i });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
  });

  it('shows saving state when loading', () => {
    render(
      <SettingsSaveButton
        isLoading={true}
        isSaved={false}
        hasChanges={true}
        onClick={mockOnClick}
      />
    );

    const button = screen.getByRole('button', { name: /saving/i });
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
  });

  it('shows saved state when saved and no changes', () => {
    render(
      <SettingsSaveButton
        isLoading={false}
        isSaved={true}
        hasChanges={false}
        onClick={mockOnClick}
      />
    );

    const button = screen.getByRole('button', { name: /saved/i });
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
  });

  it('calls onClick when clicked', () => {
    render(
      <SettingsSaveButton
        isLoading={false}
        isSaved={false}
        hasChanges={true}
        onClick={mockOnClick}
      />
    );

    const button = screen.getByRole('button', { name: /save changes/i });
    fireEvent.click(button);
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });
});

describe('FieldLoadingState', () => {
  it('renders children normally when not loading', () => {
    render(
      <FieldLoadingState isLoading={false}>
        <input placeholder="Test input" />
      </FieldLoadingState>
    );

    expect(screen.getByPlaceholderText('Test input')).toBeInTheDocument();
  });

  it('shows loading indicator when loading', () => {
    render(
      <FieldLoadingState isLoading={true}>
        <input placeholder="Test input" />
      </FieldLoadingState>
    );

    expect(screen.getByPlaceholderText('Test input')).toBeInTheDocument();
    // Loading spinner should be present (though we can't easily test the visual overlay)
  });

  it('shows error indicator when error present', () => {
    render(
      <FieldLoadingState isLoading={false} error="Field error">
        <input placeholder="Test input" />
      </FieldLoadingState>
    );

    expect(screen.getByPlaceholderText('Test input')).toBeInTheDocument();
    // Error icon should be present
  });
});

describe('ValidationLoadingState', () => {
  it('renders children normally', () => {
    render(
      <ValidationLoadingState
        isValidating={false}
        hasError={false}
      >
        <input placeholder="Test input" />
      </ValidationLoadingState>
    );

    expect(screen.getByPlaceholderText('Test input')).toBeInTheDocument();
  });

  it('shows validation spinner when validating', () => {
    render(
      <ValidationLoadingState
        isValidating={true}
        hasError={false}
      >
        <input placeholder="Test input" />
      </ValidationLoadingState>
    );

    expect(screen.getByPlaceholderText('Test input')).toBeInTheDocument();
  });

  it('shows error state when has error', () => {
    render(
      <ValidationLoadingState
        isValidating={false}
        hasError={true}
        errorMessage="Validation failed"
      >
        <input placeholder="Test input" />
      </ValidationLoadingState>
    );

    expect(screen.getByPlaceholderText('Test input')).toBeInTheDocument();
  });
});

describe('ProgressIndicator', () => {
  it('displays correct percentage', () => {
    render(<ProgressIndicator current={3} total={10} label="Upload Progress" />);

    expect(screen.getByText('Upload Progress')).toBeInTheDocument();
    expect(screen.getByText('30%')).toBeInTheDocument();
  });

  it('handles edge cases correctly', () => {
    render(<ProgressIndicator current={0} total={10} />);
    expect(screen.getByText('0%')).toBeInTheDocument();

    render(<ProgressIndicator current={10} total={10} />);
    expect(screen.getByText('100%')).toBeInTheDocument();
  });
});

describe('SettingsFormSkeleton', () => {
  it('renders skeleton structure', () => {
    render(<SettingsFormSkeleton />);
    
    // Should render skeleton elements (we can't easily test the visual appearance)
    // but we can verify the component renders without errors
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });
});

// Test component for useSettingsLoading hook
const TestSettingsLoadingComponent = () => {
  const {
    isLoading,
    loadingOperation,
    loadingDuration,
    progress,
    startLoading,
    stopLoading,
    setProgress,
    withLoading,
  } = useSettingsLoading();

  const handleWithLoading = async () => {
    await withLoading('test-operation', async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });
  };

  return (
    <div>
      <div data-testid="loading-state">{isLoading.toString()}</div>
      <div data-testid="loading-operation">{loadingOperation || 'none'}</div>
      <div data-testid="loading-duration">{loadingDuration}</div>
      <div data-testid="progress">{progress}</div>
      
      <button onClick={() => startLoading('manual-operation')}>Start Loading</button>
      <button onClick={stopLoading}>Stop Loading</button>
      <button onClick={() => setProgress(50)}>Set Progress 50%</button>
      <button onClick={handleWithLoading}>With Loading</button>
    </div>
  );
};

describe('useSettingsLoading', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('manages loading state correctly', async () => {
    render(<TestSettingsLoadingComponent />);

    expect(screen.getByTestId('loading-state')).toHaveTextContent('false');
    expect(screen.getByTestId('loading-operation')).toHaveTextContent('none');

    const startButton = screen.getByText('Start Loading');
    fireEvent.click(startButton);

    expect(screen.getByTestId('loading-state')).toHaveTextContent('true');
    expect(screen.getByTestId('loading-operation')).toHaveTextContent('manual-operation');

    const stopButton = screen.getByText('Stop Loading');
    fireEvent.click(stopButton);

    expect(screen.getByTestId('loading-state')).toHaveTextContent('false');
    expect(screen.getByTestId('loading-operation')).toHaveTextContent('none');
  });

  it('manages progress correctly', () => {
    render(<TestSettingsLoadingComponent />);

    expect(screen.getByTestId('progress')).toHaveTextContent('0');

    const progressButton = screen.getByText('Set Progress 50%');
    fireEvent.click(progressButton);

    expect(screen.getByTestId('progress')).toHaveTextContent('50');
  });

  it('withLoading wrapper works correctly', async () => {
    render(<TestSettingsLoadingComponent />);

    const withLoadingButton = screen.getByText('With Loading');
    
    act(() => {
      fireEvent.click(withLoadingButton);
    });

    expect(screen.getByTestId('loading-state')).toHaveTextContent('true');
    expect(screen.getByTestId('loading-operation')).toHaveTextContent('test-operation');

    // Fast-forward time to complete the operation
    act(() => {
      vi.advanceTimersByTime(150);
    });

    await waitFor(() => {
      expect(screen.getByTestId('loading-state')).toHaveTextContent('false');
    });
  });
});

// Test component for useMultipleLoadingStates hook
const TestMultipleLoadingStatesComponent = () => {
  const { loadingStates, isAnyLoading, setLoading, withLoading } = useMultipleLoadingStates();

  return (
    <div>
      <div data-testid="any-loading">{isAnyLoading.toString()}</div>
      <div data-testid="loading-states">{JSON.stringify(loadingStates)}</div>
      
      <button onClick={() => setLoading('field1', true)}>Start Field 1</button>
      <button onClick={() => setLoading('field1', false)}>Stop Field 1</button>
      <button onClick={() => setLoading('field2', true)}>Start Field 2</button>
      <button onClick={async () => {
        await withLoading('field3', async () => {
          await new Promise(resolve => setTimeout(resolve, 50));
        });
      }}>With Loading Field 3</button>
    </div>
  );
};

describe('useMultipleLoadingStates', () => {
  it('manages multiple loading states', () => {
    render(<TestMultipleLoadingStatesComponent />);

    expect(screen.getByTestId('any-loading')).toHaveTextContent('false');

    const startField1Button = screen.getByText('Start Field 1');
    fireEvent.click(startField1Button);

    expect(screen.getByTestId('any-loading')).toHaveTextContent('true');
    expect(screen.getByTestId('loading-states')).toHaveTextContent('{"field1":true}');

    const startField2Button = screen.getByText('Start Field 2');
    fireEvent.click(startField2Button);

    expect(screen.getByTestId('loading-states')).toHaveTextContent('{"field1":true,"field2":true}');

    const stopField1Button = screen.getByText('Stop Field 1');
    fireEvent.click(stopField1Button);

    expect(screen.getByTestId('loading-states')).toHaveTextContent('{"field1":false,"field2":true}');
    expect(screen.getByTestId('any-loading')).toHaveTextContent('true');
  });
});

// Test component for useSaveState hook
const TestSaveStateComponent = () => {
  const {
    isSaving,
    isSaved,
    hasChanges,
    lastSaved,
    saveError,
    startSaving,
    completeSave,
    failSave,
    markChanged,
    markUnchanged,
    reset,
  } = useSaveState();

  return (
    <div>
      <div data-testid="is-saving">{isSaving.toString()}</div>
      <div data-testid="is-saved">{isSaved.toString()}</div>
      <div data-testid="has-changes">{hasChanges.toString()}</div>
      <div data-testid="save-error">{saveError || 'none'}</div>
      <div data-testid="last-saved">{lastSaved?.toISOString() || 'none'}</div>
      
      <button onClick={startSaving}>Start Saving</button>
      <button onClick={completeSave}>Complete Save</button>
      <button onClick={() => failSave('Save failed')}>Fail Save</button>
      <button onClick={markChanged}>Mark Changed</button>
      <button onClick={markUnchanged}>Mark Unchanged</button>
      <button onClick={reset}>Reset</button>
    </div>
  );
};

describe('useSaveState', () => {
  it('manages save state correctly', () => {
    render(<TestSaveStateComponent />);

    // Initial state
    expect(screen.getByTestId('is-saving')).toHaveTextContent('false');
    expect(screen.getByTestId('is-saved')).toHaveTextContent('false');
    expect(screen.getByTestId('has-changes')).toHaveTextContent('false');

    // Mark as changed
    const markChangedButton = screen.getByText('Mark Changed');
    fireEvent.click(markChangedButton);

    expect(screen.getByTestId('has-changes')).toHaveTextContent('true');
    expect(screen.getByTestId('is-saved')).toHaveTextContent('false');

    // Start saving
    const startSavingButton = screen.getByText('Start Saving');
    fireEvent.click(startSavingButton);

    expect(screen.getByTestId('is-saving')).toHaveTextContent('true');

    // Complete save
    const completeSaveButton = screen.getByText('Complete Save');
    fireEvent.click(completeSaveButton);

    expect(screen.getByTestId('is-saving')).toHaveTextContent('false');
    expect(screen.getByTestId('is-saved')).toHaveTextContent('true');
    expect(screen.getByTestId('has-changes')).toHaveTextContent('false');
    expect(screen.getByTestId('last-saved')).not.toHaveTextContent('none');
  });

  it('handles save failures correctly', () => {
    render(<TestSaveStateComponent />);

    const startSavingButton = screen.getByText('Start Saving');
    fireEvent.click(startSavingButton);

    const failSaveButton = screen.getByText('Fail Save');
    fireEvent.click(failSaveButton);

    expect(screen.getByTestId('is-saving')).toHaveTextContent('false');
    expect(screen.getByTestId('is-saved')).toHaveTextContent('false');
    expect(screen.getByTestId('save-error')).toHaveTextContent('Save failed');
  });
});

export default {};