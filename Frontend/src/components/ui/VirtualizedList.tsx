import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import LoadingSpinner from './LoadingSpinner';

export interface VirtualizedListProps<T> {
  items: T[];
  itemHeight: number;
  height: number;
  width?: string | number;
  renderItem: (item: T, index: number, style: React.CSSProperties) => React.ReactNode;
  loading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  loadMoreThreshold?: number;
  className?: string;
  emptyMessage?: React.ReactNode;
}

export function VirtualizedList<T>({
  items,
  itemHeight,
  height,
  width = '100%',
  renderItem,
  loading = false,
  hasMore = false,
  onLoadMore,
  loadMoreThreshold = 5,
  className = '',
  emptyMessage = 'No items to display',
}: VirtualizedListProps<T>) {
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Memoize the item count to include loading indicator
  const itemCount = useMemo(() => {
    let count = items.length;
    if (loading && items.length === 0) {
      count = 10; // Show skeleton items
    } else if (hasMore || loading) {
      count += 1; // Add loading indicator at the end
    }
    return count;
  }, [items.length, loading, hasMore]);

  // Handle loading more items when scrolling near the end
  const handleItemsRendered = useCallback(
    ({ visibleStopIndex }: { visibleStopIndex: number }) => {
      if (
        hasMore &&
        !loading &&
        !isLoadingMore &&
        onLoadMore &&
        visibleStopIndex >= items.length - loadMoreThreshold
      ) {
        setIsLoadingMore(true);
        onLoadMore();
      }
    },
    [hasMore, loading, isLoadingMore, onLoadMore, items.length, loadMoreThreshold]
  );

  // Reset loading state when new items are loaded
  useEffect(() => {
    if (!loading) {
      setIsLoadingMore(false);
    }
  }, [loading]);

  // Item renderer that handles different states
  const ItemRenderer = useCallback(
    ({ index, style }: ListChildComponentProps) => {
      // Show loading indicator at the end
      if (index >= items.length) {
        return (
          <div style={style} className="flex items-center justify-center p-4">
            <LoadingSpinner size="sm" />
            <span className="ml-2 text-sm text-gray-500">Loading more...</span>
          </div>
        );
      }

      // Show skeleton for initial loading
      if (loading && items.length === 0) {
        return (
          <div style={style} className="p-4 border-b border-border">
            <div className="animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </div>
          </div>
        );
      }

      // Render actual item
      const item = items[index];
      return <div style={style}>{renderItem(item, index, style)}</div>;
    },
    [items, loading, renderItem]
  );

  // Show empty state if no items and not loading
  if (items.length === 0 && !loading) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height }}>
        <div className="text-center text-gray-500">
          {emptyMessage}
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <List
        height={height}
        width={width}
        itemCount={itemCount}
        itemSize={itemHeight}
        onItemsRendered={handleItemsRendered}
      >
        {ItemRenderer}
      </List>
    </div>
  );
}

export default VirtualizedList;