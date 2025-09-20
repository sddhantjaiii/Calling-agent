import React, { useEffect, useRef, useState } from 'react';

export interface LazyLoaderProps {
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
  threshold?: number;
  children?: React.ReactNode;
  loadingComponent?: React.ReactNode;
  endMessage?: React.ReactNode;
}

export const LazyLoader: React.FC<LazyLoaderProps> = ({
  hasMore,
  loading,
  onLoadMore,
  threshold = 100,
  children,
  loadingComponent,
  endMessage,
}) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      {
        rootMargin: `${threshold}px`,
      }
    );

    const currentRef = loaderRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [threshold]);

  useEffect(() => {
    if (isIntersecting && hasMore && !loading) {
      onLoadMore();
    }
  }, [isIntersecting, hasMore, loading, onLoadMore]);

  const defaultLoadingComponent = (
    <div className="flex items-center justify-center p-4">
      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
      <span className="ml-2 text-sm text-gray-500">Loading more...</span>
    </div>
  );

  const defaultEndMessage = (
    <div className="text-center p-4 text-sm text-gray-500">
      No more items to load
    </div>
  );

  return (
    <>
      {children}
      <div ref={loaderRef}>
        {loading && (loadingComponent || defaultLoadingComponent)}
        {!hasMore && !loading && (endMessage || defaultEndMessage)}
      </div>
    </>
  );
};

export default LazyLoader;