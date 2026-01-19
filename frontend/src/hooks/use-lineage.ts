'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api';
import type {
  LineageNode,
  LineageEdge,
  LineageRun,
  ImpactNode,
  LineageGraphData,
  LineageSearchResult,
  TriggerExtractionRequest,
  TriggerExtractionResponse,
} from '@/lib/lineage-types';

// ============================================================================
// Query Keys
// ============================================================================

const LINEAGE_QUERY_KEY = ['lineage'];

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Fetch full lineage graph (nodes and edges)
 * Optionally filter by namespace prefix
 */
export function useLineageGraph(namespace?: string) {
  return useQuery({
    queryKey: namespace
      ? [...LINEAGE_QUERY_KEY, 'graph', namespace]
      : [...LINEAGE_QUERY_KEY, 'graph'],
    queryFn: async (): Promise<LineageGraphData> => {
      // Fetch nodes
      let nodesQuery = supabase
        .from('lineage_nodes')
        .select('*')
        .order('created_at', { ascending: false });

      if (namespace) {
        nodesQuery = nodesQuery.ilike('namespace', `${namespace}%`);
      }

      const { data: nodes, error: nodesError } = await nodesQuery;
      if (nodesError) throw nodesError;

      // Fetch edges
      const { data: edges, error: edgesError } = await supabase
        .from('lineage_edges')
        .select('*')
        .order('created_at', { ascending: false });

      if (edgesError) throw edgesError;

      // Filter edges to only those connecting nodes in our result set
      const nodeIds = new Set((nodes as LineageNode[]).map((n) => n.id));
      const filteredEdges = (edges as LineageEdge[]).filter(
        (e) => nodeIds.has(e.source_id) && nodeIds.has(e.target_id)
      );

      return {
        nodes: nodes as LineageNode[],
        edges: filteredEdges,
      };
    },
  });
}

/**
 * Fetch single lineage node with its edges and related nodes
 */
export function useLineageNode(nodeId: string) {
  return useQuery({
    queryKey: [...LINEAGE_QUERY_KEY, 'node', nodeId],
    queryFn: async () => {
      // Fetch the node
      const { data: node, error: nodeError } = await supabase
        .from('lineage_nodes')
        .select('*')
        .eq('id', nodeId)
        .single();

      if (nodeError) throw nodeError;

      const lineageNode = node as LineageNode;

      // If it's a column, fetch its parent dataset
      let parentDataset: LineageNode | null = null;
      if (lineageNode.node_type === 'column' && lineageNode.parent_id) {
        const { data: parent } = await supabase
          .from('lineage_nodes')
          .select('*')
          .eq('id', lineageNode.parent_id)
          .single();
        parentDataset = parent as LineageNode | null;
      }

      // If it's a dataset, fetch its columns
      let columns: LineageNode[] = [];
      if (lineageNode.node_type === 'dataset') {
        const { data: childColumns } = await supabase
          .from('lineage_nodes')
          .select('*')
          .eq('parent_id', nodeId)
          .eq('node_type', 'column');
        columns = (childColumns as LineageNode[]) || [];
      }

      // Fetch edges connected to this node
      const { data: incomingEdges } = await supabase
        .from('lineage_edges')
        .select('*')
        .eq('target_id', nodeId);

      const { data: outgoingEdges } = await supabase
        .from('lineage_edges')
        .select('*')
        .eq('source_id', nodeId);

      return {
        node: lineageNode,
        parentDataset,
        columns,
        incomingEdges: (incomingEdges as LineageEdge[]) || [],
        outgoingEdges: (outgoingEdges as LineageEdge[]) || [],
      };
    },
    enabled: !!nodeId,
  });
}

/**
 * Get downstream impact of a column using recursive CTE
 */
export function useDownstreamImpact(
  columnId: string,
  options?: { maxDepth?: number }
) {
  const maxDepth = options?.maxDepth ?? 10;

  return useQuery({
    queryKey: [...LINEAGE_QUERY_KEY, 'downstream', columnId, maxDepth],
    queryFn: async (): Promise<ImpactNode[]> => {
      const { data, error } = await supabase.rpc('get_downstream_nodes', {
        start_node_id: columnId,
        max_depth: maxDepth,
      });

      if (error) throw error;
      return data as ImpactNode[];
    },
    enabled: !!columnId,
  });
}

/**
 * Get upstream sources of a column for root cause analysis
 */
export function useUpstreamSources(
  columnId: string,
  options?: { maxDepth?: number }
) {
  const maxDepth = options?.maxDepth ?? 10;

  return useQuery({
    queryKey: [...LINEAGE_QUERY_KEY, 'upstream', columnId, maxDepth],
    queryFn: async (): Promise<ImpactNode[]> => {
      const { data, error } = await supabase.rpc('get_upstream_nodes', {
        start_node_id: columnId,
        max_depth: maxDepth,
      });

      if (error) throw error;
      return data as ImpactNode[];
    },
    enabled: !!columnId,
  });
}

/**
 * Search lineage nodes by name with debouncing
 */
export function useSearchLineageNodes(query: string, debounceMs = 300) {
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, debounceMs]);

  return useQuery({
    queryKey: [...LINEAGE_QUERY_KEY, 'search', debouncedQuery],
    queryFn: async (): Promise<LineageSearchResult[]> => {
      if (!debouncedQuery || debouncedQuery.length < 2) {
        return [];
      }

      const { data, error } = await supabase
        .from('lineage_nodes')
        .select('id, node_type, namespace, name, parent_id')
        .ilike('name', `%${debouncedQuery}%`)
        .limit(20);

      if (error) throw error;

      // Fetch parent names for columns
      const nodes = data as Array<{
        id: string;
        node_type: string;
        namespace: string;
        name: string;
        parent_id: string | null;
      }>;

      const parentIds = nodes
        .filter((n) => n.parent_id)
        .map((n) => n.parent_id!);

      let parentMap: Record<string, string> = {};
      if (parentIds.length > 0) {
        const { data: parents } = await supabase
          .from('lineage_nodes')
          .select('id, name')
          .in('id', parentIds);

        parentMap = (parents || []).reduce(
          (acc, p) => ({ ...acc, [p.id]: p.name }),
          {} as Record<string, string>
        );
      }

      return nodes.map((n) => ({
        id: n.id,
        node_type: n.node_type as 'dataset' | 'column' | 'job',
        namespace: n.namespace,
        name: n.name,
        parent_name: n.parent_id ? parentMap[n.parent_id] : undefined,
      }));
    },
    enabled: debouncedQuery.length >= 2,
  });
}

/**
 * List recent lineage extraction runs
 */
export function useLineageRuns() {
  return useQuery({
    queryKey: [...LINEAGE_QUERY_KEY, 'runs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lineage_runs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as LineageRun[];
    },
  });
}

/**
 * Get the most recent completed lineage run
 */
export function useLastLineageRun() {
  return useQuery({
    queryKey: [...LINEAGE_QUERY_KEY, 'lastRun'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lineage_runs')
        .select('*')
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
      return data as LineageRun | null;
    },
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Trigger manual lineage extraction
 */
export function useTriggerExtraction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input?: TriggerExtractionRequest
    ): Promise<TriggerExtractionResponse> => {
      const response = await api.post<{
        data?: TriggerExtractionResponse;
        error?: string;
      }>('/api/lineage/extract', input || {});

      if (response.error) {
        throw new Error(response.error);
      }

      return response.data!;
    },
    onSuccess: () => {
      // Invalidate all lineage queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: LINEAGE_QUERY_KEY });
    },
  });
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Transform lineage graph data into React Flow format
 * Groups columns under their parent dataset nodes
 */
export function useLineageToReactFlow(graphData: LineageGraphData | undefined) {
  return useMemo(() => {
    if (!graphData) {
      return { nodes: [], edges: [] };
    }

    const { nodes: lineageNodes, edges: lineageEdges } = graphData;

    // Separate datasets and columns
    const datasets = lineageNodes.filter((n) => n.node_type === 'dataset');
    const columns = lineageNodes.filter((n) => n.node_type === 'column');

    // Group columns by parent
    const columnsByParent = columns.reduce(
      (acc, col) => {
        if (col.parent_id) {
          if (!acc[col.parent_id]) acc[col.parent_id] = [];
          acc[col.parent_id].push(col);
        }
        return acc;
      },
      {} as Record<string, LineageNode[]>
    );

    // Build column connection maps for visual indicators
    const columnHasUpstream = new Set<string>();
    const columnHasDownstream = new Set<string>();

    lineageEdges.forEach((edge) => {
      columnHasDownstream.add(edge.source_id);
      columnHasUpstream.add(edge.target_id);
    });

    // Create React Flow nodes for datasets (with columns as data)
    const reactFlowNodes = datasets.map((dataset) => {
      const datasetColumns = columnsByParent[dataset.id] || [];

      return {
        id: dataset.id,
        type: 'table' as const,
        position: { x: 0, y: 0 }, // Will be set by elkjs layout
        data: {
          label: dataset.name,
          namespace: dataset.namespace,
          columns: datasetColumns.map((col) => ({
            id: col.id,
            name: col.name,
            type: col.data_type,
            hasUpstream: columnHasUpstream.has(col.id),
            hasDownstream: columnHasDownstream.has(col.id),
          })),
        },
      };
    });

    // Create React Flow edges for column-to-column connections
    // Map column edges to their parent dataset nodes with handle IDs
    const columnToDataset = columns.reduce(
      (acc, col) => {
        if (col.parent_id) acc[col.id] = col.parent_id;
        return acc;
      },
      {} as Record<string, string>
    );

    const columnIdToName = columns.reduce(
      (acc, col) => {
        acc[col.id] = col.name;
        return acc;
      },
      {} as Record<string, string>
    );

    const reactFlowEdges = lineageEdges
      .filter((edge) => columnToDataset[edge.source_id] && columnToDataset[edge.target_id])
      .map((edge) => ({
        id: edge.id,
        source: columnToDataset[edge.source_id],
        target: columnToDataset[edge.target_id],
        sourceHandle: `${columnIdToName[edge.source_id]}-source`,
        targetHandle: `${columnIdToName[edge.target_id]}-target`,
        type: 'column' as const,
        data: {
          transformationType: edge.transformation_type,
          transformationSubtype: edge.transformation_subtype,
          transformationDescription: edge.transformation_description,
        },
      }));

    return {
      nodes: reactFlowNodes,
      edges: reactFlowEdges,
    };
  }, [graphData]);
}
