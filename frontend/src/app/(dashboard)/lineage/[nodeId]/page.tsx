'use client';

import { use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLineageNode, useDownstreamImpact, useUpstreamSources } from '@/hooks/use-lineage';
import { cn } from '@/lib/utils';

interface NodeDetailPageProps {
  params: Promise<{ nodeId: string }>;
}

function NodeTypeIcon({ type }: { type: string }) {
  if (type === 'dataset') {
    return (
      <div className="p-2 rounded-lg bg-blue-100">
        <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7c-2 0-3 1-3 3z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 11h16" />
        </svg>
      </div>
    );
  }

  if (type === 'column') {
    return (
      <div className="p-2 rounded-lg bg-gray-100">
        <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7"
          />
        </svg>
      </div>
    );
  }

  return (
    <div className="p-2 rounded-lg bg-green-100">
      <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      </svg>
    </div>
  );
}

export default function NodeDetailPage({ params }: NodeDetailPageProps) {
  const router = useRouter();
  const { nodeId } = use(params);

  const { data, isLoading, error } = useLineageNode(nodeId);
  const { data: downstream } = useDownstreamImpact(
    data?.node.node_type === 'column' ? nodeId : '',
    { maxDepth: 5 }
  );
  const { data: upstream } = useUpstreamSources(
    data?.node.node_type === 'column' ? nodeId : '',
    { maxDepth: 5 }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-destructive">Failed to load node details</p>
            <Button variant="outline" className="mt-4" onClick={() => router.back()}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { node, parentDataset, columns, incomingEdges, outgoingEdges } = data;

  const downstreamCount = downstream?.filter((n) => n.depth > 0).length || 0;
  const upstreamCount = upstream?.filter((n) => n.depth > 0).length || 0;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Button>
          <NodeTypeIcon type={node.node_type} />
          <div>
            <h1 className="text-2xl font-bold">{node.name}</h1>
            <p className="text-sm text-muted-foreground">{node.namespace}</p>
          </div>
        </div>
        <Link href={`/lineage?selected=${nodeId}`}>
          <Button variant="outline">View in Graph</Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Type</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold capitalize">{node.node_type}</p>
          </CardContent>
        </Card>

        {node.node_type === 'column' && node.data_type && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Data Type</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold font-mono">{node.data_type}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Upstream Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-orange-600">{upstreamCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Downstream Dependencies</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-blue-600">{downstreamCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Parent Dataset (for columns) */}
      {parentDataset && (
        <Card>
          <CardHeader>
            <CardTitle>Parent Dataset</CardTitle>
            <CardDescription>The dataset this column belongs to</CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href={`/lineage/${parentDataset.id}`}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 border"
            >
              <NodeTypeIcon type="dataset" />
              <div>
                <p className="font-medium">{parentDataset.name}</p>
                <p className="text-sm text-muted-foreground">{parentDataset.namespace}</p>
              </div>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Columns (for datasets) */}
      {node.node_type === 'dataset' && columns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Columns</CardTitle>
            <CardDescription>{columns.length} columns in this dataset</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {columns.map((col) => (
                <Link
                  key={col.id}
                  href={`/lineage/${col.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 border"
                >
                  <div className="flex items-center gap-3">
                    <NodeTypeIcon type="column" />
                    <span className="font-mono">{col.name}</span>
                  </div>
                  <span className="text-sm text-muted-foreground font-mono">
                    {col.data_type || 'unknown'}
                  </span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connections */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Incoming edges */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
              </svg>
              Incoming ({incomingEdges.length})
            </CardTitle>
            <CardDescription>Data flows into this node from</CardDescription>
          </CardHeader>
          <CardContent>
            {incomingEdges.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No incoming connections - this is a source node
              </p>
            ) : (
              <div className="space-y-2">
                {incomingEdges.slice(0, 10).map((edge) => (
                  <div
                    key={edge.id}
                    className="flex items-center justify-between p-2 rounded border text-sm"
                  >
                    <span className="font-mono truncate">{edge.source_id}</span>
                    {edge.transformation_subtype && (
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded text-xs font-medium',
                          edge.transformation_type === 'DIRECT' && 'bg-blue-100 text-blue-800',
                          edge.transformation_type === 'INDIRECT' && 'bg-purple-100 text-purple-800'
                        )}
                      >
                        {edge.transformation_subtype}
                      </span>
                    )}
                  </div>
                ))}
                {incomingEdges.length > 10 && (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    +{incomingEdges.length - 10} more
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Outgoing edges */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              Outgoing ({outgoingEdges.length})
            </CardTitle>
            <CardDescription>Data flows from this node to</CardDescription>
          </CardHeader>
          <CardContent>
            {outgoingEdges.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No outgoing connections - this is a leaf node
              </p>
            ) : (
              <div className="space-y-2">
                {outgoingEdges.slice(0, 10).map((edge) => (
                  <div
                    key={edge.id}
                    className="flex items-center justify-between p-2 rounded border text-sm"
                  >
                    <span className="font-mono truncate">{edge.target_id}</span>
                    {edge.transformation_subtype && (
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded text-xs font-medium',
                          edge.transformation_type === 'DIRECT' && 'bg-blue-100 text-blue-800',
                          edge.transformation_type === 'INDIRECT' && 'bg-purple-100 text-purple-800'
                        )}
                      >
                        {edge.transformation_subtype}
                      </span>
                    )}
                  </div>
                ))}
                {outgoingEdges.length > 10 && (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    +{outgoingEdges.length - 10} more
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Metadata */}
      {node.metadata && Object.keys(node.metadata).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Metadata</CardTitle>
            <CardDescription>Additional information about this node</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="p-4 bg-gray-50 rounded-lg overflow-x-auto text-sm">
              {JSON.stringify(node.metadata, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          {node.node_type === 'column' && (
            <>
              <Link href={`/lineage?selected=${nodeId}&panel=impact`}>
                <Button variant="outline">
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  Impact Analysis
                </Button>
              </Link>
              <Link href={`/lineage?selected=${nodeId}&panel=rootcause`}>
                <Button variant="outline">
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                  Root Cause Analysis
                </Button>
              </Link>
            </>
          )}
          <Link href={`/rules?column=${encodeURIComponent(node.name)}`}>
            <Button variant="outline">
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              View Quality Rules
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
