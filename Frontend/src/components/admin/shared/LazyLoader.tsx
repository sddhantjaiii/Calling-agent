import React, { Suspense, lazy, ComponentType, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface LazyLoaderProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  delay?: number;
  minLoadTime?: number;
}

interface LazyComponentProps {
  loader: () => Promise<{ default: ComponentType<any> }>;
  fallback?: React.ReactNode;
  delay?: number;
  minLoadTime?: number;
  preload?: boolean;
}

// Default loading component
const DefaultFallback = () => (
  <div className="flex items-center justify-center p-8">
    <Loader2 className="h-6 w-6 animate-spin" />
    <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
  </div>
);

// Enhanced lazy loader with delay and minimum load time
export const LazyLoader: React.FC<LazyLoaderProps> = ({
  children,
  fallback = <DefaultFallback />,
  delay = 200,
  minLoadTime = 500
}) => {
  const [showFallback, setShowFallback] = useState(false);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowFallback(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  const handleLoadComplete = () => {
    const loadTime = Date.now() - startTime;
    if (loadTime < minLoadTime) {
      setTimeout(() => {
        setShowFallback(false);
      }, minLoadTime - loadTime);
    } else {
      setShowFallback(false);
    }
  };

  return (
    <Suspense
      fallback={
        <div className="relative">
          {showFallback && fallback}
        </div>
      }
    >
      {children}
    </Suspense>
  );
};

// Enhanced lazy component creator
export const createLazyComponent = ({
  loader,
  fallback = <DefaultFallback />,
  delay = 200,
  minLoadTime = 500,
  preload = false
}: LazyComponentProps) => {
  const LazyComponent = lazy(loader);

  // Preload component if requested
  if (preload) {
    loader().catch(() => {
      // Ignore preload errors
    });
  }

  const WrappedComponent = (props: any) => (
    <LazyLoader fallback={fallback} delay={delay} minLoadTime={minLoadTime}>
      <LazyComponent {...props} />
    </LazyLoader>
  );

  // Add preload method to component
  (WrappedComponent as any).preload = loader;

  return WrappedComponent;
};

// Intersection Observer based lazy loading for components
interface IntersectionLazyLoaderProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  rootMargin?: string;
  threshold?: number;
  triggerOnce?: boolean;
}

export const IntersectionLazyLoader: React.FC<IntersectionLazyLoaderProps> = ({
  children,
  fallback = <DefaultFallback />,
  rootMargin = '50px',
  threshold = 0.1,
  triggerOnce = true
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && (!triggerOnce || !hasTriggered)) {
          setIsVisible(true);
          if (triggerOnce) {
            setHasTriggered(true);
          }
        } else if (!triggerOnce && !entry.isIntersecting) {
          setIsVisible(false);
        }
      },
      {
        rootMargin,
        threshold
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [rootMargin, threshold, triggerOnce, hasTriggered]);

  return (
    <div ref={ref}>
      {isVisible ? children : fallback}
    </div>
  );
};

// Preloader for admin components
class AdminComponentPreloader {
  private preloadedComponents = new Set<string>();
  private preloadPromises = new Map<string, Promise<any>>();

  preload(componentName: string, loader: () => Promise<any>): Promise<any> {
    if (this.preloadedComponents.has(componentName)) {
      return Promise.resolve();
    }

    if (this.preloadPromises.has(componentName)) {
      return this.preloadPromises.get(componentName)!;
    }

    const promise = loader()
      .then(() => {
        this.preloadedComponents.add(componentName);
        this.preloadPromises.delete(componentName);
      })
      .catch((error) => {
        console.warn(`Failed to preload component: ${componentName}`, error);
        this.preloadPromises.delete(componentName);
        throw error;
      });

    this.preloadPromises.set(componentName, promise);
    return promise;
  }

  preloadMultiple(components: Array<{ name: string; loader: () => Promise<any> }>): Promise<void> {
    const promises = components.map(({ name, loader }) => 
      this.preload(name, loader).catch(() => {
        // Ignore individual failures in batch preload
      })
    );

    return Promise.all(promises).then(() => {});
  }

  isPreloaded(componentName: string): boolean {
    return this.preloadedComponents.has(componentName);
  }

  clear(): void {
    this.preloadedComponents.clear();
    this.preloadPromises.clear();
  }
}

export const adminComponentPreloader = new AdminComponentPreloader();

// Hook for preloading components based on user interaction
export const useComponentPreloader = () => {
  const preloadOnHover = (componentName: string, loader: () => Promise<any>) => {
    return {
      onMouseEnter: () => {
        adminComponentPreloader.preload(componentName, loader);
      }
    };
  };

  const preloadOnFocus = (componentName: string, loader: () => Promise<any>) => {
    return {
      onFocus: () => {
        adminComponentPreloader.preload(componentName, loader);
      }
    };
  };

  return {
    preloadOnHover,
    preloadOnFocus,
    preload: adminComponentPreloader.preload.bind(adminComponentPreloader),
    isPreloaded: adminComponentPreloader.isPreloaded.bind(adminComponentPreloader)
  };
};