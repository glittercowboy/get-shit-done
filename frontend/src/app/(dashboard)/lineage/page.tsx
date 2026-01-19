'use client';

import { useState, useCallback, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  useLineageGraph,
  useSearchLineageNodes,
  useLastLineageRun,
  useTriggerExtraction,
  useLineageToReactFlow,
} from '@/hooks/use-lineage';
import { LineageGraph } from '@/components/features/lineage/LineageGraph';
import { ImpactPanel } from '@/components/features/lineage/ImpactPanel';
import { RootCausePanel } from '@/components/features/lineage/RootCausePanel';
import type { LineageSearchResult } from '@/lib/lineage-types';
import { cn } from '@/lib/utils';

interface ContextMenuState {
  columnId: string;
  columnName: string;
  x: number;
  y: number;
}

function LineagePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL state
  const selectedNodeId = searchParams.get('selected') || null;
  const namespaceFilter = searchParams.get('namespace') || '';

  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [showImpactFor, setShowImpactFor] = useState<{ id: string; name: string } | null>(null);
  const [showRootCauseFor, setShowRootCauseFor] = useState<{ id: string; name: string } | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  // Data queries
  const { data: graphData, isLoading: isLoadingGraph, error: graphError } = useLineageGraph(
    namespaceFilter || undefined
  );
  const { data: searchResults } = useSearchLineageNodes(searchQuery);
  const { data: lastRun } = useLastLineageRun();
  const triggerExtraction = useTriggerExtraction();

  // Transform to React Flow format
  const { nodes: rfNodes, edges: rfEdges } = useLineageToReactFlow(graphData);

  // Update URL when selecting nodes
  const updateUrlParams = useCallback(
    (params: Record<string, string | null>) => {
      const newParams = new URLSearchParams(searchParams.toString());
      Object.entries(params).forEach(([key, value]) => {
        if (value === null) {
          newParams.delete(key);
        } else {
          newParams.set(key, value);
        }
      });
      router.push(`/lineage?${newParams.toString()}`, { scroll: false });
    },
    [searchParams, router]
  );

  // Handle node selection
  const handleNodeSelect = useCallback(
    (nodeId: string | null) => {
      updateUrlParams({ selected: nodeId });
    },
    [updateUrlParams]
  );

  // Handle column selection
  const handleColumnSelect = useCallback(
    (columnId: string | null) => {
      // Could show column details in a panel
      console.log('Column selected:', columnId);
    },
    []
  );

  // Handle column context menu
  const handleColumnContextMenu = useCallback(
    (columnId: string, x: number, y: number) => {
      // Find column name from graph data
      const column = graphData?.nodes.find((n) => n.id === columnId);
      if (column) {
        setContextMenu({
          columnId,
          columnName: column.name,
          x,
          y,
        });
      }
    },
    [graphData]
  );

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu]);

  // Handle search result selection
  const handleSearchResultClick = (result: LineageSearchResult) => {
    // Navigate to the node (or its parent if it's a column)
    if (result.node_type === 'column') {
      // We need to find the parent and highlight the column
      // For now, just scroll to show it
      updateUrlParams({ selected: result.id });
    } else {
      updateUrlParams({ selected: result.id });
    }
    setSearchQuery('');
  };

  // Handle trigger extraction
  const handleTriggerExtraction = async () => {
    try {
      await triggerExtraction.mutateAsync({
        namespace: namespaceFilter || undefined,
      });
    } catch (error) {
      console.error('Failed to trigger extraction:', error);
    }
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowImpactFor(null);
        setShowRootCauseFor(null);
        setContextMenu(null);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Namespace options from graph data
  const namespaces = Array.from(
    new Set(graphData?.nodes.map((n) => n.namespace.split('.')[0]) || [])
  );

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-white">
        <div>
          <h1 className="text-lg font-bold">Data Lineage</h1>
          <p className="text-sm text-muted-foreground">
            Explore column-level data flow and transformations
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Last extracted badge */}
          {lastRun && (
            <span className="text-xs text-gray-500">
              Last extracted:{' '}
              {lastRun.completed_at
                ? new Date(lastRun.completed_at).toLocaleString()
                : 'Never'}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleTriggerExtraction}
            disabled={triggerExtraction.isPending}
          >
            {triggerExtraction.isPending ? 'Extracting...' : 'Refresh Lineage'}
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-4 px-4 py-2 border-b bg-gray-50">
        {/* Search */}
        <div className="relative w-64">
          <Input
            type="text"
            placeholder="Search tables and columns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-8"
          />
          {searchQuery && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              onClick={() => setSearchQuery('')}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}

          {/* Search results dropdown */}
          {searchResults && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white rounded-md border shadow-lg max-h-64 overflow-y-auto">
              {searchResults.map((result) => (
                <button
                  key={result.id}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center gap-2"
                  onClick={() => handleSearchResultClick(result)}
                >
                  <span
                    className={cn(
                      'w-2 h-2 rounded-full',
                      result.node_type === 'dataset' && 'bg-blue-500',
                      result.node_type === 'column' && 'bg-gray-400',
                      result.node_type === 'job' && 'bg-green-500'
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{result.name}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {result.parent_name ? `${result.parent_name}.` : ''}
                      {result.namespace}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400">{result.node_type}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Namespace filter */}
        <Select
          label=""
          options={[
            { value: '', label: 'All Namespaces' },
            ...namespaces.map((ns) => ({ value: ns, label: ns })),
          ]}
          value={namespaceFilter}
          onChange={(e) => updateUrlParams({ namespace: e.target.value || null })}
          className="w-48"
        />

        {/* Stats */}
        <div className="flex-1" />
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span>{graphData?.nodes.filter((n) => n.node_type === 'dataset').length || 0} tables</span>
          <span>{graphData?.nodes.filter((n) => n.node_type === 'column').length || 0} columns</span>
          <span>{graphData?.edges.length || 0} connections</span>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Graph */}
        <div className="flex-1 relative">
          {isLoadingGraph ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : graphError ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-destructive">Failed to load lineage data</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => window.location.reload()}
                  >
                    Retry
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : rfNodes.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Card>
                <CardContent className="py-12 text-center max-w-md">
                  <svg
                    className="w-16 h-16 mx-auto mb-4 text-gray-300"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                    />
                  </svg>
                  <h3 className="text-lg font-medium">No Lineage Data</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Extract lineage from your data sources to visualize column-level data flow.
                  </p>
                  <Button
                    className="mt-4"
                    onClick={handleTriggerExtraction}
                    disabled={triggerExtraction.isPending}
                  >
                    {triggerExtraction.isPending ? 'Extracting...' : 'Extract Lineage'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : (
            <LineageGraph
              initialNodes={rfNodes}
              initialEdges={rfEdges}
              onNodeSelect={handleNodeSelect}
              onColumnSelect={handleColumnSelect}
              onColumnContextMenu={handleColumnContextMenu}
              selectedColumnId={selectedNodeId || undefined}
              className="w-full h-full"
            />
          )}
        </div>

        {/* Context menu */}
        {contextMenu && (
          <div
            className="fixed z-50 bg-white rounded-md border shadow-lg py-1 min-w-[160px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
              onClick={() => {
                setShowImpactFor({ id: contextMenu.columnId, name: contextMenu.columnName });
                setContextMenu(null);
              }}
            >
              <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              Impact Analysis
            </button>
            <button
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
              onClick={() => {
                setShowRootCauseFor({ id: contextMenu.columnId, name: contextMenu.columnName });
                setContextMenu(null);
              }}
            >
              <svg className="w-4 h-4 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              Root Cause Analysis
            </button>
            <div className="border-t my-1" />
            <button
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
              onClick={() => {
                router.push(`/lineage/${contextMenu.columnId}`);
                setContextMenu(null);
              }}
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              View Details
            </button>
          </div>
        )}

        {/* Side panels */}
        {showImpactFor && (
          <ImpactPanel
            columnId={showImpactFor.id}
            columnName={showImpactFor.name}
            onClose={() => setShowImpactFor(null)}
            onNodeClick={(nodeId) => {
              updateUrlParams({ selected: nodeId });
            }}
          />
        )}

        {showRootCauseFor && (
          <RootCausePanel
            columnId={showRootCauseFor.id}
            columnName={showRootCauseFor.name}
            onClose={() => setShowRootCauseFor(null)}
            onNodeClick={(nodeId) => {
              updateUrlParams({ selected: nodeId });
            }}
          />
        )}
      </div>
    </div>
  );
}

export default function LineagePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      }
    >
      <LineagePageContent />
    </Suspense>
  );
}
