"use client";

import { useState, useEffect, useRef } from 'react';
import { ScatterPlot } from '@/components/ScatterPlot';
import { Dendrogram } from '@/components/Dendrogram';
import { DataPointTooltip } from '@/components/DataPointTooltip';
import { ClusterTooltip } from '@/components/ClusterTooltip';
import { ControlPanel } from '@/components/ControlPanel';
import { Button } from '@/components/ui/button';
import { convertToDataPoints, convertToDataPointsWithAxes, DATASET_CONFIGS, getClusterName } from '@/lib/datasets';
import { DataPoint, ClusterInfo } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Loader2, Layers, MousePointer2, ArrowLeft, Home } from 'lucide-react';
import Link from 'next/link';

export default function ClusteringPage() {
  const [dataset, setDataset] = useState<'medical' | 'crime' | 'customer'>('crime');
  const [algorithm, setAlgorithm] = useState<'agglomerative' | 'divisive'>('agglomerative');
  const [xAxis, setXAxis] = useState<string>('');
  const [yAxis, setYAxis] = useState<string>('');
  const [dataPoints, setDataPoints] = useState<DataPoint[]>([]);
  const [clusters, setClusters] = useState<ClusterInfo[]>([]);
  const [connections, setConnections] = useState<Array<[number, number]>>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [addMode, setAddMode] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<DataPoint | null>(null);
  const [hoveredCluster, setHoveredCluster] = useState<ClusterInfo | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [dendrogramTree, setDendrogramTree] = useState<any>(null);
  const [currentHeight, setCurrentHeight] = useState(0);
  const [clusteringSteps, setClusteringSteps] = useState<any[]>([]);
  const [finalClusters, setFinalClusters] = useState<number[][]>([]);
  const [cutLine, setCutLine] = useState<number | undefined>(undefined);
  const [dendrogramHeight, setDendrogramHeight] = useState(400);
  const [layout, setLayout] = useState<'side-by-side' | 'top-bottom'>('side-by-side');

  const playIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const config = DATASET_CONFIGS[dataset];

  // Update dendrogram height based on number of data points - ensure enough space for all labels
  // Also match scatter plot height for side-by-side layout
  useEffect(() => {
    const updateDendrogramHeight = () => {
      // Calculate required height: 50px spacing per label + padding
      // Add extra space to ensure no overlap
      const minSpacing = 50;
      const headerHeight = 80; // Header section height
      const requiredHeight = dataPoints.length > 0 
        ? (dataPoints.length - 1) * minSpacing + headerHeight + 100 // 100px for padding and margins
        : 400;
      
      // Calculate available height based on layout
      let availableHeight: number;
      if (layout === 'side-by-side') {
        // Side-by-side: viewport minus header/controls (approximately 300px)
        availableHeight = window.innerHeight - 300;
      } else {
        // Top-bottom: viewport minus header/controls and scatter plot space
        // Scatter plot typically takes about 40-50% of viewport in top-bottom layout
        availableHeight = (window.innerHeight - 300) * 0.5; // Reserve 50% for scatter plot, 50% for dendrogram
      }
      
      if (layout === 'side-by-side') {
        // Match scatter plot height for side-by-side alignment
        // Scatter plot uses: Math.max(550, Math.min(availableHeight, containerWidth * 0.95))
        const containerWidth = window.innerWidth * 0.48;
        const scatterPlotHeight = Math.max(550, Math.min(availableHeight, containerWidth * 0.95));
        
        // Reduce dendrogram height by removing extra padding - use tighter spacing
        // Reduce required height calculation by using less padding
        const reducedRequiredHeight = dataPoints.length > 0 
          ? (dataPoints.length - 1) * 45 + 60 // Reduced spacing (45px instead of 50px) and less padding (60px instead of 100px)
          : 400;
        
        // Use the scatter plot height but ensure minimum required height for labels
        const calculatedHeight = Math.max(
          Math.max(400, reducedRequiredHeight),
          scatterPlotHeight
        );
        setDendrogramHeight(calculatedHeight);
      } else {
        // Top-bottom layout: prioritize showing all data points without overlap
        // Always use required height to ensure all data points are visible
        // Calculate based on full viewport minus header/controls for more accurate sizing
        const fullAvailableHeight = window.innerHeight - 300;
        const scatterPlotEstimatedHeight = Math.min(600, fullAvailableHeight * 0.45); // Estimate scatter plot height
        const dendrogramAvailableHeight = fullAvailableHeight - scatterPlotEstimatedHeight;
        
        // Always use required height - this ensures all data points fit without overlap
        // Use required height directly, ensuring minimum of 400px
        const finalHeight = Math.max(requiredHeight, 400);
        
        setDendrogramHeight(finalHeight);
      }
    };

    updateDendrogramHeight();
    const timer = setTimeout(updateDendrogramHeight, 100);
    const timer2 = setTimeout(updateDendrogramHeight, 300);
    window.addEventListener('resize', updateDendrogramHeight);
    return () => {
      window.removeEventListener('resize', updateDendrogramHeight);
      clearTimeout(timer);
      clearTimeout(timer2);
    };
  }, [dataPoints.length, layout]);

  // Initialize axes when dataset changes
  useEffect(() => {
    if (config.availableAxes && config.availableAxes.length > 0) {
      // Always reset to default axes when dataset changes
      setXAxis(config.xAxis.key);
      setYAxis(config.yAxis.key);
      
      // Reset all state
      setDataPoints([]);
      setClusters([]);
      setConnections([]);
      setCurrentStep(0);
      setDendrogramTree(null);
      setCurrentHeight(0);
      setIsPlaying(false);
      setCutLine(undefined);
      setClusteringSteps([]);
      setFinalClusters([]);
    }
  }, [dataset, config]);

  // Clustering mutation
  const clusterMutation = useMutation({
    mutationFn: async (data: { dataset: string; algorithm: string; dataPoints: any[] }) => {
      const response = await apiRequest('POST', '/api/cluster', data);
      return await response.json();
    },
    onSuccess: (data: any) => {
      setClusteringSteps(data.steps || []);
      setFinalClusters(data.finalClusters || []);
      setDendrogramTree(data.dendrogram);
      // Exclude the final "complete" step from total steps for animation
      const animationSteps = Math.max(0, (data.steps?.length || 1) - 1);
      setTotalSteps(animationSteps);
      setCurrentStep(0);
    },
    onError: (error: any) => {
      toast({
        title: 'Clustering Error',
        description: error.message || 'Failed to perform clustering',
        variant: 'destructive',
      });
    },
  });

  // Initialize data and run clustering when dataset, algorithm, or axes change
  useEffect(() => {
    if (!xAxis || !yAxis) return;
    
    const points = convertToDataPointsWithAxes(dataset, xAxis, yAxis);
    setDataPoints(points);
    setCurrentStep(0);
    setClusters([]);
    setConnections([]);
    setDendrogramTree(null);
    setCurrentHeight(0);
    setIsPlaying(false);
    setCutLine(undefined);
    setClusteringSteps([]);
    setFinalClusters([]);

    // Run clustering
    clusterMutation.mutate({
      dataset,
      algorithm,
      dataPoints: points.map(p => ({ x: p.x, y: p.y, data: p.data })),
    });
  }, [dataset, algorithm, xAxis, yAxis]);

  // Update clusters based on cut line
  useEffect(() => {
    if (cutLine !== undefined && dendrogramTree && dataPoints.length > 0) {
      const clustersAtCut = getClustersAtCut(dendrogramTree, cutLine, dataPoints.length);
      
      if (clustersAtCut.length > 0) {
        const newClusters: ClusterInfo[] = clustersAtCut.map((indices, idx) => {
          const clusterPoints = indices.map(i => dataPoints[i]).filter(Boolean);
          const stats: Record<string, number> = {};

          // Calculate average stats
          config.tooltipFields.forEach((field) => {
            const values = clusterPoints.map(p => (p.data as any)[field.key]).filter(v => typeof v === 'number');
            if (values.length > 0) {
              stats[field.key] = values.reduce((a, b) => a + b, 0) / values.length;
            }
          });

          const diagnosis = config.getDiagnosis?.(stats);
          const name = getClusterName(dataset, idx, clustersAtCut.length, stats, dataPoints, indices);
          
          // Generate unique color for each cluster based on cluster index
          const generateClusterColor = (clusterIdx: number, totalClusters: number): string => {
            // First, try to use predefined colors
            if (clusterIdx < config.clusterColors.length) {
              return config.clusterColors[clusterIdx];
            }
            // Generate additional colors if needed - ensure each cluster has a unique color
            const hue = (clusterIdx * 360) / Math.max(totalClusters, 1);
            const saturation = 65 + (clusterIdx % 3) * 5;
            const lightness = 50 + (clusterIdx % 2) * 5;
            return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
          };
          
          const color = generateClusterColor(idx, clustersAtCut.length);

          return {
            id: idx,
            pointIndices: indices,
            color: color,
            stats,
            diagnosis,
            name,
          };
        });

        setClusters(newClusters);
        // Clear connections when using cut line
        setConnections([]);
      }
    } else if (cutLine === undefined) {
      // Reset to normal clustering when cut line is removed
      setClusters([]);
      setConnections([]);
    }
  }, [cutLine, dendrogramTree, dataPoints, config, dataset]);

  // Auto-play functionality (slow, clear steps for understanding)
  useEffect(() => {
    if (isPlaying && currentStep < totalSteps) {
      playIntervalRef.current = setInterval(() => {
        setCurrentStep(prev => {
          if (prev >= totalSteps) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 2500);
    } else {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
    }

    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    };
  }, [isPlaying, currentStep, totalSteps]);

  const handlePlayPause = () => {
    if (currentStep >= totalSteps) {
      setCurrentStep(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setIsPlaying(false); // Pause when manually stepping
    }
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
      setIsPlaying(false); // Pause when manually stepping
    }
  };

  const handleReset = () => {
    setCurrentStep(0);
    setIsPlaying(false);
    setClusters([]);
    setConnections([]);
    setCurrentHeight(0);
  };

  const handleAddPoint = (x: number, y: number) => {
    const newId = `NEW${dataPoints.length + 1}`;
    
    // Create a new data point based on dataset type
    let newData: any;
    if (dataset === 'medical') {
      newData = {
        Patient_ID: newId,
        Age: Math.round(Math.random() * 40 + 20),
        Temperature_F: y,
        Blood_Pressure_Sys: x,
        Blood_Pressure_Dia: Math.round(x * 0.6),
        Sugar_Level_mg_dL: Math.round(Math.random() * 100 + 80),
        Symptoms: 'Newly added patient',
      };
    } else if (dataset === 'crime') {
      newData = {
        Crime_ID: newId,
        Latitude: y,
        Longitude: x,
        Crime_Type: 'Unknown',
        Time_of_Day: 'Unknown',
        Severity_Level: Math.round(Math.random() * 5 + 1),
        Reported_By: 'System',
      };
    } else {
      newData = {
        Customer_ID: newId,
        Age: Math.round(Math.random() * 40 + 20),
        Annual_Income_kUSD: x,
        Spending_Score: y,
        Loyalty_Years: Math.round(Math.random() * 5 + 1),
        Preferred_Category: 'Unknown',
      };
    }

    const newPoint: DataPoint = {
      id: newId,
      x,
      y,
      data: newData,
      isNew: true,
    };

    const updatedPoints = [...dataPoints, newPoint];
    setDataPoints(updatedPoints);
    setAddMode(false);
    setCurrentStep(0);

    // Re-run clustering with new point
    clusterMutation.mutate({
      dataset,
      algorithm,
      dataPoints: updatedPoints.map(p => ({ x: p.x, y: p.y, data: p.data })),
    });

    toast({
      title: 'Data Point Added',
      description: `New ${dataset} data point has been added. Re-clustering...`,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  // Get clusters at a specific cut line height
  const getClustersAtCut = (tree: any, cutHeight: number, numPoints: number): number[][] => {
    if (!tree) return [];

    const clusters: number[][] = [];

    const collectClusters = (node: any) => {
      if (!node) return;

      // If this node's merge height is greater than cut, descend further
      if (node.height !== undefined && node.height > cutHeight) {
        collectClusters(node.left);
        collectClusters(node.right);
        return;
      }

      // Otherwise, take this subtree as a cluster
      if (Array.isArray(node.indices)) {
        clusters.push([...node.indices]);
      } else if (node.label && node.indices && node.indices.length === 1) {
        clusters.push([node.indices[0]]);
      }
    };

    collectClusters(tree);

    // Ensure coverage of all points and uniqueness
    const seen = new Set<number>();
    const uniqueClusters: number[][] = [];
    clusters.forEach(arr => {
      const uniq = Array.from(new Set(arr)).filter(i => i >= 0 && i < numPoints);
      uniq.forEach(i => seen.add(i));
      if (uniq.length > 0) uniqueClusters.push(uniq);
    });

    for (let i = 0; i < numPoints; i++) {
      if (!seen.has(i)) uniqueClusters.push([i]);
    }

    return uniqueClusters;
  };

  // Update visualization based on current step (only when cut line is not set)
  useEffect(() => {
    if (cutLine !== undefined) return; // Skip if cut line is active
    
    if (dataPoints.length === 0 || clusteringSteps.length === 0) return;

    const updateVisualization = () => {
      if (currentStep === 0) {
        setClusters([]);
        setConnections([]);
        setCurrentHeight(0);
        return;
      }

      // Show connections first, then clusters
      const newConnections: Array<[number, number]> = [];
      const newClusters: ClusterInfo[] = [];
      
      // Build connections and clusters step by step
      for (let i = 0; i < currentStep && i < clusteringSteps.length; i++) {
        const s = clusteringSteps[i];
        if (s.action === 'connect' || s.action === 'merge') {
          // Add connection between first points of each cluster
          if (s.cluster1.length > 0 && s.cluster2.length > 0) {
            newConnections.push([s.cluster1[0], s.cluster2[0]]);
          }
        }
      }
      
      setConnections(newConnections);

      // Only show clusters after we have some connections
      if (currentStep > 1 && finalClusters.length > 0) {
        // Calculate clusters based on current step
        const clustersAtStep = getClustersAtStep(currentStep, clusteringSteps, dataPoints.length);
        
        if (clustersAtStep.length > 0) {
          // Generate unique colors for each cluster
          // If we have more clusters than predefined colors, generate additional unique colors
          const generateClusterColor = (clusterIdx: number, totalClusters: number): string => {
            // First, try to use predefined colors
            if (clusterIdx < config.clusterColors.length) {
              return config.clusterColors[clusterIdx];
            }
            // If we need more colors, generate them evenly across the HSL spectrum
            // Start from where predefined colors end
            const predefinedCount = config.clusterColors.length;
            const additionalClusters = totalClusters - predefinedCount;
            const hueStart = 0; // Start from beginning of spectrum
            const hue = (clusterIdx * 360) / Math.max(totalClusters, 1);
            const saturation = 65 + (clusterIdx % 3) * 5; // Vary between 65-75
            const lightness = 50 + (clusterIdx % 2) * 5; // Vary between 50-55
            return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
          };
          
          const stepClusters: ClusterInfo[] = clustersAtStep.map((indices, idx) => {
            const clusterPoints = indices.map(i => dataPoints[i]).filter(Boolean);
            const stats: Record<string, number> = {};

            // Calculate average stats
            config.tooltipFields.forEach((field) => {
              const values = clusterPoints.map(p => (p.data as any)[field.key]).filter(v => typeof v === 'number');
              if (values.length > 0) {
                stats[field.key] = values.reduce((a, b) => a + b, 0) / values.length;
              }
            });

            const diagnosis = config.getDiagnosis?.(stats);
            const name = getClusterName(dataset, idx, clustersAtStep.length, stats, dataPoints, indices);
            
            // Assign unique color to each cluster based on cluster index
            const color = generateClusterColor(idx, clustersAtStep.length);

            return {
              id: idx,
              pointIndices: indices,
              color: color,
              stats,
              diagnosis,
              name,
            };
          });

          setClusters(stepClusters);
        }
      } else {
        // Clear clusters if no connections yet
        setClusters([]);
      }

      const step = clusteringSteps[Math.min(currentStep - 1, clusteringSteps.length - 1)];
      setCurrentHeight(step?.distance || 0);
    };

    updateVisualization();
  }, [currentStep, dataPoints, clusteringSteps, finalClusters, config, cutLine]);

  // Get clusters at a specific step
  const getClustersAtStep = (step: number, steps: any[], numPoints: number): number[][] => {
    if (step <= 1) return [];

    // Track which points belong to which cluster
    const pointToCluster = new Map<number, number>();
    const clusters = new Map<number, Set<number>>();

    // Initialize each point as its own cluster
    for (let i = 0; i < numPoints; i++) {
      pointToCluster.set(i, i);
      clusters.set(i, new Set([i]));
    }

    // Apply merges up to the current step
    for (let i = 1; i < Math.min(step, steps.length - 1); i++) {
      const stepData = steps[i];
      if (stepData.action === 'complete') continue;

      const cluster1Id = pointToCluster.get(stepData.cluster1[0]);
      const cluster2Id = pointToCluster.get(stepData.cluster2[0]);

      if (cluster1Id === undefined || cluster2Id === undefined) continue;

      const cluster1Points = clusters.get(cluster1Id);
      const cluster2Points = clusters.get(cluster2Id);

      if (!cluster1Points || !cluster2Points) continue;

      // Merge cluster2 into cluster1
      cluster2Points.forEach(point => {
        cluster1Points.add(point);
        pointToCluster.set(point, cluster1Id);
      });

      clusters.delete(cluster2Id);
    }

    // Convert to array format
    return Array.from(clusters.values()).map(cluster => Array.from(cluster));
  };

  return (
    <div className="min-h-screen bg-background" onMouseMove={handleMouseMove}>
      {/* Header - Full Width at Top */}
      <div className="w-full bg-gradient-to-br from-card via-card to-primary/5 border-b border-border/50 shadow-sm">
        <div className="container mx-auto max-w-screen-2xl px-6 py-8">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-5xl font-bold tracking-tight mb-3 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Interactive Hierarchical Clustering
              </h1>
              <p className="text-lg text-muted-foreground font-medium">
                Learn Hierarchical clustering algorithms through visualization
              </p>
            </div>
            <Link href="/">
              <Button variant="outline" className="gap-2 shadow-sm">
                <Home className="w-4 h-4" />
                <ArrowLeft className="w-4 h-4" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <ControlPanel
        dataset={dataset}
        algorithm={algorithm}
        xAxis={xAxis}
        yAxis={yAxis}
        isPlaying={isPlaying}
        currentStep={currentStep}
        totalSteps={totalSteps}
        addMode={addMode}
        onDatasetChange={setDataset}
        onAlgorithmChange={setAlgorithm}
        onXAxisChange={setXAxis}
        onYAxisChange={setYAxis}
        onPlayPause={handlePlayPause}
        onReset={handleReset}
        onAddModeToggle={() => setAddMode(!addMode)}
        onStepChange={setCurrentStep}
        onPrevious={handlePrevious}
        onNext={handleNext}
        layout={layout}
        onLayoutChange={setLayout}
      />

      <div className="container mx-auto max-w-screen-2xl px-6 py-4">

        {/* Loading State */}
        {clusterMutation.isPending && (
          <div className="flex items-center justify-center gap-3 p-6 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-lg border border-primary/20 shadow-sm mb-4 backdrop-blur-sm">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="text-lg font-semibold text-foreground">Computing clusters...</span>
          </div>
        )}

        {/* Main Visualization Area - Conditional Layout */}
        {layout === 'side-by-side' ? (
          /* Side by Side Layout */
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Scatter Plot - Left Side */}
            <div className="flex-1 min-w-0">
              <div className="relative">
                <div className="mb-3">
                  <h2 className="text-2xl font-bold mb-1 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">{config.name}</h2>
                  <p className="text-sm text-muted-foreground font-medium">
                    {addMode ? 'Click anywhere on the plot to add a new data point' : 'Watch clusters form step-by-step'}
                  </p>
                </div>

                {/* Add Mode Instructions */}
                {addMode && (
                  <div className="mb-4 p-4 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border border-primary/30 rounded-lg shadow-sm backdrop-blur-sm">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <MousePointer2 className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-bold text-primary mb-2 text-lg">Add Data Point Mode Active</h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Click anywhere on the scatter plot below to add a new {dataset} data point. 
                          The point will be automatically created with appropriate attributes and clustering will be recalculated.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <ScatterPlot
                  dataPoints={dataPoints}
                  clusters={clusters}
                  connections={connections}
                  datasetType={dataset}
                  xLabel={config.availableAxes?.find(axis => axis.key === xAxis)?.label || config.xAxis.label}
                  yLabel={config.availableAxes?.find(axis => axis.key === yAxis)?.label || config.yAxis.label}
                  xRange={config.availableAxes?.find(axis => axis.key === xAxis)?.range}
                  yRange={config.availableAxes?.find(axis => axis.key === yAxis)?.range}
                  onAddPoint={handleAddPoint}
                  onPointHover={setHoveredPoint}
                  onClusterHover={setHoveredCluster}
                  addMode={addMode}
                  storyText={config.getStoryStep ? config.getStoryStep(currentStep, algorithm) : undefined}
                  currentStep={currentStep}
                  clusteringSteps={clusteringSteps}
                />

                {/* Tooltips */}
                {hoveredPoint && (
                  <DataPointTooltip
                    point={hoveredPoint}
                    datasetType={dataset}
                    position={mousePos}
                  />
                )}

                {hoveredCluster && (
                  <ClusterTooltip
                    cluster={hoveredCluster}
                    datasetType={dataset}
                    position={mousePos}
                  />
                )}
              </div>
            </div>

            {/* Dendrogram - Right Side */}
            <div className="flex-1 min-w-0">
              <div className="space-y-4">
                <div>
                  <h2 className="text-2xl font-bold mb-1 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">Dendrogram</h2>
                  <p className="text-sm text-muted-foreground font-medium">
                    Hierarchical tree showing cluster relationships - Click and drag to adjust the cut line
                  </p>
                </div>

                {/* Dendrogram Tree Block */}
                <div 
                  className="w-full bg-card rounded-xl shadow-md border border-border/50 transition-all hover:shadow-lg relative"
                  style={{ 
                    height: dendrogramHeight + 'px',
                    minHeight: dendrogramHeight + 'px'
                  }}
                >
                  <Dendrogram
                    tree={dendrogramTree}
                    currentHeight={currentHeight}
                    labels={dataPoints.map(p => p.id)}
                    colors={dataPoints.map((_, idx) => {
                      const cluster = clusters.find(c => c.pointIndices.includes(idx));
                      if (cluster) return cluster.color;
                      // Generate unique color for each point when not in a cluster
                      const hue = (idx * 360) / Math.max(dataPoints.length, 1);
                      const saturation = 65 + (idx % 3) * 5;
                      const lightness = 50 + (idx % 2) * 5;
                      return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
                    })}
                    cutLine={cutLine}
                    onCutLineChange={setCutLine}
                    currentStep={currentStep}
                    totalSteps={totalSteps}
                    clusteringSteps={clusteringSteps}
                  />
                  
                  {/* Cut Line Control Info - Right Side Overlay (Side-by-side layout only) */}
                  <div className="absolute top-1/2 right-4 transform -translate-y-1/2 bg-background/95 backdrop-blur-sm rounded-lg shadow-lg border border-border/50 p-3 min-w-[200px] z-10">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-destructive/20 to-destructive/10 flex items-center justify-center border border-destructive/20">
                        <svg className="w-4 h-4 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
                        </svg>
                      </div>
                      <h3 className="text-sm font-bold text-foreground">Cut Line Control</h3>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                      Drag on dendrogram to adjust cut line position
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between bg-muted/50 rounded-md px-2.5 py-1.5 border border-border/50">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Distance:</span>
                        <span className="text-sm font-bold text-destructive">
                          {(cutLine !== undefined ? cutLine : (dendrogramTree?.height || 0) * 0.6).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between bg-muted/50 rounded-md px-2.5 py-1.5 border border-border/50">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Clusters:</span>
                        <span className="text-sm font-bold text-primary">
                          {clusters.length || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Top Bottom Layout */
          <div className="space-y-4">
            {/* Scatter Plot - Top */}
            <div className="relative">
              <div className="mb-3">
                <h2 className="text-2xl font-bold mb-1 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">{config.name}</h2>
                <p className="text-sm text-muted-foreground font-medium">
                  {addMode ? 'Click anywhere on the plot to add a new data point' : 'Watch clusters form step-by-step'}
                </p>
              </div>

              {/* Add Mode Instructions */}
              {addMode && (
                <div className="mb-4 p-4 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border border-primary/30 rounded-lg shadow-sm backdrop-blur-sm">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <MousePointer2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-bold text-primary mb-2 text-lg">Add Data Point Mode Active</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Click anywhere on the scatter plot below to add a new {dataset} data point. 
                        The point will be automatically created with appropriate attributes and clustering will be recalculated.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <ScatterPlot
                dataPoints={dataPoints}
                clusters={clusters}
                connections={connections}
                datasetType={dataset}
                xLabel={config.availableAxes?.find(axis => axis.key === xAxis)?.label || config.xAxis.label}
                yLabel={config.availableAxes?.find(axis => axis.key === yAxis)?.label || config.yAxis.label}
                xRange={config.availableAxes?.find(axis => axis.key === xAxis)?.range}
                yRange={config.availableAxes?.find(axis => axis.key === yAxis)?.range}
                onAddPoint={handleAddPoint}
                onPointHover={setHoveredPoint}
                onClusterHover={setHoveredCluster}
                addMode={addMode}
                storyText={config.getStoryStep ? config.getStoryStep(currentStep, algorithm) : undefined}
                currentStep={currentStep}
                clusteringSteps={clusteringSteps}
              />

              {/* Tooltips */}
              {hoveredPoint && (
                <DataPointTooltip
                  point={hoveredPoint}
                  datasetType={dataset}
                  position={mousePos}
                />
              )}

              {hoveredCluster && (
                <ClusterTooltip
                  cluster={hoveredCluster}
                  datasetType={dataset}
                  position={mousePos}
                />
              )}
            </div>

            {/* Dendrogram - Bottom */}
            <div className="w-full space-y-4">
              <div>
                <h2 className="text-2xl font-bold mb-1 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">Dendrogram</h2>
                <p className="text-sm text-muted-foreground font-medium">
                  Hierarchical tree showing cluster relationships - Click and drag to adjust the cut line
                </p>
              </div>

              {/* Dendrogram Tree Block */}
              <div 
                className="w-full bg-card rounded-xl shadow-md border border-border/50 transition-all hover:shadow-lg"
                style={{ 
                  height: dendrogramHeight + 'px',
                  minHeight: dendrogramHeight + 'px'
                }}
              >
                <Dendrogram
                  tree={dendrogramTree}
                  currentHeight={currentHeight}
                  labels={dataPoints.map(p => p.id)}
                  colors={dataPoints.map((_, idx) => {
                    const cluster = clusters.find(c => c.pointIndices.includes(idx));
                    if (cluster) return cluster.color;
                    // Generate unique color for each point when not in a cluster
                    const hue = (idx * 360) / Math.max(dataPoints.length, 1);
                    const saturation = 65 + (idx % 3) * 5;
                    const lightness = 50 + (idx % 2) * 5;
                    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
                  })}
                  cutLine={cutLine}
                  onCutLineChange={setCutLine}
                  currentStep={currentStep}
                  totalSteps={totalSteps}
                  clusteringSteps={clusteringSteps}
                />
              </div>
            </div>
          </div>
        )}

        {/* Separate Cut Line Information Block - Only show for top-bottom layout */}
        {layout === 'top-bottom' && (
        <div className="w-full bg-gradient-to-r from-card via-card to-primary/5 rounded-xl shadow-md border border-border/50 p-4 backdrop-blur-sm transition-all hover:shadow-lg">
              <div className="flex items-center gap-5">
                <div className="flex-shrink-0">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-destructive/20 to-destructive/10 flex items-center justify-center shadow-sm border border-destructive/20">
                    <svg className="w-7 h-7 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold mb-1 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">Cut Line Control</h3>
                  <p className="text-xs text-muted-foreground mb-3 leading-relaxed font-medium">
                    Click and drag on the dendrogram above to adjust the cut line position. The cut line determines how many clusters are formed.
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-background/50 rounded-lg px-3 py-1.5 border border-border/50 shadow-sm">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Distance:</span>
                      <span className="text-lg font-bold text-destructive">
                        {(cutLine !== undefined ? cutLine : (dendrogramTree?.height || 0) * 0.6).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 bg-background/50 rounded-lg px-3 py-1.5 border border-border/50 shadow-sm">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Clusters:</span>
                      <span className="text-lg font-bold text-primary">
                        {clusters.length || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
        )}
      </div>
    </div>
  );
}
