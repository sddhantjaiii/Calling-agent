import { useState, useCallback, useRef, useEffect } from 'react';

interface LoadingState {
  isLoading: boolean;
  operation: string | null;
  startTime: Date | null;
  progress?: number;
}

interface UseSettingsLoadingReturn {
  isLoading: boolean;
  loadingOperation: string | null;
  loadingDuration: number;
  progress: number;
  startLoading: (operation: string) => void;
  stopLoading: () => void;
  setProgress: (progress: number) => void;
  withLoading: <T>(operation: string, fn: () => Promise<T>) => Promise<T>;
}

export const useSettingsLoading = (): UseSettingsLoadingReturn => {
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: false,
    operation: null,
    startTime: null,
    progress: 0,
  });

  const [loadingDuration, setLoadingDuration] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startLoading = useCallback((operation: string) => {
    setLoadingState({
      isLoading: true,
      operation,
      startTime: new Date(),
      progress: 0,
    });
  }, []);

  const stopLoading = useCallback(() => {
    setLoadingState({
      isLoading: false,
      operation: null,
      startTime: null,
      progress: 0,
    });
    setLoadingDuration(0);
  }, []);

  const setProgress = useCallback((progress: number) => {
    setLoadingState(prev => ({
      ...prev,
      progress: Math.max(0, Math.min(100, progress)),
    }));
  }, []);

  const withLoading = useCallback(async <T>(
    operation: string,
    fn: () => Promise<T>
  ): Promise<T> => {
    startLoading(operation);
    try {
      const result = await fn();
      return result;
    } finally {
      stopLoading();
    }
  }, [startLoading, stopLoading]);

  // Update loading duration
  useEffect(() => {
    if (loadingState.isLoading && loadingState.startTime) {
      intervalRef.current = setInterval(() => {
        const duration = Date.now() - loadingState.startTime!.getTime();
        setLoadingDuration(duration);
      }, 100);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [loadingState.isLoading, loadingState.startTime]);

  return {
    isLoading: loadingState.isLoading,
    loadingOperation: loadingState.operation,
    loadingDuration,
    progress: loadingState.progress,
    startLoading,
    stopLoading,
    setProgress,
    withLoading,
  };
};

// Hook for managing multiple loading states
interface UseMultipleLoadingStatesReturn {
  loadingStates: Record<string, boolean>;
  isAnyLoading: boolean;
  setLoading: (key: string, isLoading: boolean) => void;
  withLoading: <T>(key: string, fn: () => Promise<T>) => Promise<T>;
  clearAll: () => void;
}

export const useMultipleLoadingStates = (): UseMultipleLoadingStatesReturn => {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

  const setLoading = useCallback((key: string, isLoading: boolean) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: isLoading,
    }));
  }, []);

  const withLoading = useCallback(async <T>(
    key: string,
    fn: () => Promise<T>
  ): Promise<T> => {
    setLoading(key, true);
    try {
      const result = await fn();
      return result;
    } finally {
      setLoading(key, false);
    }
  }, [setLoading]);

  const clearAll = useCallback(() => {
    setLoadingStates({});
  }, []);

  const isAnyLoading = Object.values(loadingStates).some(Boolean);

  return {
    loadingStates,
    isAnyLoading,
    setLoading,
    withLoading,
    clearAll,
  };
};

// Hook for save state management
interface SaveState {
  isSaving: boolean;
  isSaved: boolean;
  hasChanges: boolean;
  lastSaved: Date | null;
  saveError: string | null;
}

interface UseSaveStateReturn extends SaveState {
  startSaving: () => void;
  completeSave: () => void;
  failSave: (error: string) => void;
  markChanged: () => void;
  markUnchanged: () => void;
  reset: () => void;
}

export const useSaveState = (): UseSaveStateReturn => {
  const [saveState, setSaveState] = useState<SaveState>({
    isSaving: false,
    isSaved: false,
    hasChanges: false,
    lastSaved: null,
    saveError: null,
  });

  const startSaving = useCallback(() => {
    setSaveState(prev => ({
      ...prev,
      isSaving: true,
      saveError: null,
    }));
  }, []);

  const completeSave = useCallback(() => {
    setSaveState(prev => ({
      ...prev,
      isSaving: false,
      isSaved: true,
      hasChanges: false,
      lastSaved: new Date(),
      saveError: null,
    }));
  }, []);

  const failSave = useCallback((error: string) => {
    setSaveState(prev => ({
      ...prev,
      isSaving: false,
      isSaved: false,
      saveError: error,
    }));
  }, []);

  const markChanged = useCallback(() => {
    setSaveState(prev => ({
      ...prev,
      hasChanges: true,
      isSaved: false,
    }));
  }, []);

  const markUnchanged = useCallback(() => {
    setSaveState(prev => ({
      ...prev,
      hasChanges: false,
    }));
  }, []);

  const reset = useCallback(() => {
    setSaveState({
      isSaving: false,
      isSaved: false,
      hasChanges: false,
      lastSaved: null,
      saveError: null,
    });
  }, []);

  return {
    ...saveState,
    startSaving,
    completeSave,
    failSave,
    markChanged,
    markUnchanged,
    reset,
  };
};

// Hook for debounced loading states (useful for real-time validation)
export const useDebouncedLoading = (delay: number = 300) => {
  const [isLoading, setIsLoading] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startLoading = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsLoading(true);
  }, []);

  const stopLoading = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setIsLoading(false);
    }, delay);
  }, [delay]);

  const stopLoadingImmediate = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    isLoading,
    startLoading,
    stopLoading,
    stopLoadingImmediate,
  };
};

// Hook for timeout management
export const useTimeout = () => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const setTimeout = useCallback((callback: () => void, delay: number) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = globalThis.setTimeout(callback, delay);
  }, []);

  const clearTimeout = useCallback(() => {
    if (timeoutRef.current) {
      globalThis.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        globalThis.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { setTimeout, clearTimeout };
};

export default useSettingsLoading;