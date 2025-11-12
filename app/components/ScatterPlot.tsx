import { useEffect, useRef, useState } from 'react';
import { DataPoint, ClusterInfo } from '@shared/schema';
import { User, MapPin, ShoppingBag } from 'lucide-react';

interface ScatterPlotProps {
  dataPoints: DataPoint[];
  clusters: ClusterInfo[];
  connections: Array<[number, number]>;
  datasetType: 'medical' | 'crime' | 'customer';
  xLabel: string;
  yLabel: string;
  xRange?: [number, number];
  yRange?: [number, number];
  onAddPoint?: (x: number, y: number) => void;
  onPointHover?: (point: DataPoint | null) => void;
  onClusterHover?: (cluster: ClusterInfo | null) => void;
  addMode: boolean;
  storyText?: string;
  currentStep?: number;
  clusteringSteps?: any[];
}

export function ScatterPlot({
  dataPoints,
  clusters,
  connections,
  datasetType,
  xLabel,
  yLabel,
  xRange,
  yRange,
  onAddPoint,
  onPointHover,
  onClusterHover,
  addMode,
  storyText,
  currentStep,
  clusteringSteps,
}: ScatterPlotProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  const [hoveredCluster, setHoveredCluster] = useState<number | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const padding = { top: 40, right: 40, bottom: 60, left: 70 };

  // Generate a unique color for each data point index
  const getPointColor = (pointIdx: number, totalPoints: number): string => {
    // Distribute colors evenly across the HSL hue spectrum (0-360)
    const hue = (pointIdx * 360) / Math.max(totalPoints, 1);
    // Use moderate saturation and lightness for visibility
    const saturation = 65 + (pointIdx % 3) * 5; // Vary between 65-75
    const lightness = 50 + (pointIdx % 2) * 5; // Vary between 50-55
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        // Use full width of container (now side by side, so it's half the screen)
        const containerWidth = containerRef.current.getBoundingClientRect().width || window.innerWidth * 0.48;
        // Calculate height based on viewport to ensure graph fits in single screen
        // Use viewport height minus header/controls (approximately 300px for other content)
        const availableHeight = window.innerHeight - 300;
        // Use more of the available height for better alignment (increased from 0.9 to 0.95)
        // Ensure minimum height for visibility
        const calculatedHeight = Math.max(550, Math.min(availableHeight, containerWidth * 0.95));
        setDimensions({ width: containerWidth, height: calculatedHeight });
      }
    };

    updateDimensions();
    const timer = setTimeout(updateDimensions, 100);
    const timer2 = setTimeout(updateDimensions, 300);
    window.addEventListener('resize', updateDimensions);
    return () => {
      window.removeEventListener('resize', updateDimensions);
      clearTimeout(timer);
      clearTimeout(timer2);
    };
  }, []);

  const getScales = () => {
    if (xRange && yRange) {
      // Use provided ranges
      return {
        xMin: xRange[0],
        xMax: xRange[1],
        yMin: yRange[0],
        yMax: yRange[1],
      };
    }

    // Fallback to data-based scaling
    const xValues = dataPoints.map(p => p.x);
    const yValues = dataPoints.map(p => p.y);

    const xMin = Math.min(...xValues);
    const xMax = Math.max(...xValues);
    const yMin = Math.min(...yValues);
    const yMax = Math.max(...yValues);

    const xRangeSize = xMax - xMin || 1;
    const yRangeSize = yMax - yMin || 1;

    return {
      xMin: xMin - xRangeSize * 0.1,
      xMax: xMax + xRangeSize * 0.1,
      yMin: yMin - yRangeSize * 0.1,
      yMax: yMax + yRangeSize * 0.1,
    };
  };

  const scaleX = (x: number) => {
    const scales = getScales();
    return padding.left + ((x - scales.xMin) / (scales.xMax - scales.xMin)) * (dimensions.width - padding.left - padding.right);
  };

  const scaleY = (y: number) => {
    const scales = getScales();
    // Invert Y-axis: higher Y values should be at the top (lower pixel values)
    return padding.top + ((scales.yMax - y) / (scales.yMax - scales.yMin)) * (dimensions.height - padding.top - padding.bottom);
  };

  const inverseScaleX = (px: number) => {
    const scales = getScales();
    return scales.xMin + ((px - padding.left) / (dimensions.width - padding.left - padding.right)) * (scales.xMax - scales.xMin);
  };

  const inverseScaleY = (px: number) => {
    const scales = getScales();
    // Invert Y-axis: higher pixel values should map to lower Y values
    return scales.yMax - ((px - padding.top) / (dimensions.height - padding.top - padding.bottom)) * (scales.yMax - scales.yMin);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    canvas.style.width = `${dimensions.width}px`;
    canvas.style.height = `${dimensions.height}px`;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, dimensions.width, dimensions.height);

    // Draw grid
    ctx.strokeStyle = 'hsl(var(--border))';
    ctx.lineWidth = 0.5;
    ctx.globalAlpha = 0.3;

    for (let i = 0; i <= 10; i++) {
      const x = padding.left + (i / 10) * (dimensions.width - padding.left - padding.right);
      const y = padding.top + (i / 10) * (dimensions.height - padding.top - padding.bottom);

      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, dimensions.height - padding.bottom);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(dimensions.width - padding.right, y);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;

    // Draw clusters whenever clusters are available (supports cut-line mode too)
    if (clusters.length > 0) {
      // Calculate initial radii for all clusters
      const clusterData = clusters.map((cluster, idx) => {
        if (cluster.pointIndices.length === 0) return null;

        const points = cluster.pointIndices.map(i => dataPoints[i]).filter(Boolean);
        if (points.length === 0) return null;

        const xs = points.map(p => scaleX(p.x));
        const ys = points.map(p => scaleY(p.y));

        const centerX = xs.reduce((a, b) => a + b, 0) / xs.length;
        const centerY = ys.reduce((a, b) => a + b, 0) / ys.length;

        const maxDist = Math.max(
          ...xs.map((x, i) => Math.sqrt((x - centerX) ** 2 + (ys[i] - centerY) ** 2))
        );

        // Calculate minimum required radius to contain all points with generous buffer
        const minRequiredRadius = maxDist + 30; // Increased buffer from 20 to 30
        // Add extra space for single points and small clusters
        const sizeBonus = points.length === 1 ? 15 : points.length === 2 ? 10 : 5;
        const initialRadius = minRequiredRadius + sizeBonus;

        return {
          idx,
          centerX,
          centerY,
          radius: initialRadius,
          minRequiredRadius, // Store this to prevent shrinking below it
          cluster
        };
      }).filter(Boolean) as Array<{
        idx: number;
        centerX: number;
        centerY: number;
        radius: number;
        minRequiredRadius: number;
        cluster: ClusterInfo;
      }>;

      // Prevent overlaps by adjusting radii, but never shrink below minimum required
      for (let i = 0; i < clusterData.length; i++) {
        for (let j = i + 1; j < clusterData.length; j++) {
          const c1 = clusterData[i];
          const c2 = clusterData[j];
          
          const dist = Math.sqrt(
            (c1.centerX - c2.centerX) ** 2 + (c1.centerY - c2.centerY) ** 2
          );
          
          const minSeparation = 15; // Minimum gap between cluster circles
          const overlap = (c1.radius + c2.radius + minSeparation) - dist;
          
          if (overlap > 0) {
            // Shrink both radii proportionally to eliminate overlap
            const shrinkFactor = 0.88; // Reduce by 12% (less aggressive than before)
            // Ensure we never go below the minimum required radius to contain all points
            c1.radius = Math.max(c1.radius * shrinkFactor, c1.minRequiredRadius, 30);
            c2.radius = Math.max(c2.radius * shrinkFactor, c2.minRequiredRadius, 30);
          }
        }
      }

      // Draw all clusters with adjusted radii
      clusterData.forEach(({ idx, centerX, centerY, radius, cluster }) => {
        ctx.fillStyle = cluster.color.replace('hsl', 'hsla').replace(')', ', 0.08)');
        ctx.strokeStyle = cluster.color;
        ctx.lineWidth = 3;

        if (hoveredCluster === idx) {
          ctx.fillStyle = cluster.color.replace('hsl', 'hsla').replace(')', ', 0.15)');
          ctx.shadowColor = cluster.color;
          ctx.shadowBlur = 15;
        }

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.shadowBlur = 0;
      });
    }

    // Draw connections
    ctx.strokeStyle = 'hsl(var(--primary))';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.6;
    ctx.setLineDash([4, 4]);

    connections.forEach(([i, j]) => {
      const p1 = dataPoints[i];
      const p2 = dataPoints[j];
      if (!p1 || !p2) return;

      ctx.beginPath();
      ctx.moveTo(scaleX(p1.x), scaleY(p1.y));
      ctx.lineTo(scaleX(p2.x), scaleY(p2.y));
      ctx.stroke();
    });

    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    // Draw axes
    ctx.strokeStyle = 'hsl(var(--foreground))';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, dimensions.height - padding.bottom);
    ctx.lineTo(dimensions.width - padding.right, dimensions.height - padding.bottom);
    ctx.stroke();

    // Draw axis tick marks and labels
    const scales = getScales();
    ctx.fillStyle = 'hsl(var(--foreground))';
    ctx.font = '12px Inter';
    ctx.textAlign = 'center';
    
    // X-axis ticks
    for (let i = 0; i <= 5; i++) {
      const x = padding.left + (i / 5) * (dimensions.width - padding.left - padding.right);
      const value = scales.xMin + (i / 5) * (scales.xMax - scales.xMin);
      
      // Draw tick mark
      ctx.strokeStyle = 'hsl(var(--foreground))';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, dimensions.height - padding.bottom);
      ctx.lineTo(x, dimensions.height - padding.bottom + 5);
      ctx.stroke();
      
      // Draw tick label
      ctx.fillText(value.toFixed(1), x, dimensions.height - padding.bottom + 18);
    }
    
    // Y-axis ticks
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (i / 5) * (dimensions.height - padding.top - padding.bottom);
      // Since we inverted the Y scaling, we need to invert the value calculation too
      const value = scales.yMax - (i / 5) * (scales.yMax - scales.yMin);
      
      // Draw tick mark
      ctx.strokeStyle = 'hsl(var(--foreground))';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left - 5, y);
      ctx.stroke();
      
      // Draw tick label
      ctx.fillText(value.toFixed(1), padding.left - 10, y + 4);
    }

    // Draw axis labels
    ctx.fillStyle = 'hsl(var(--foreground))';
    ctx.font = '14px Inter';
    ctx.textAlign = 'center';
    ctx.fillText(xLabel, dimensions.width / 2, dimensions.height - 5);

    ctx.save();
    ctx.translate(20, dimensions.height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(yLabel, 0, 0);
    ctx.restore();

  }, [dataPoints, clusters, connections, dimensions, xLabel, yLabel, hoveredCluster]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setMousePos({ x, y });

    // Check for hovered points
    let foundPoint = false;
    for (let i = 0; i < dataPoints.length; i++) {
      const px = scaleX(dataPoints[i].x);
      const py = scaleY(dataPoints[i].y);
      const dist = Math.sqrt((px - x) ** 2 + (py - y) ** 2);

      if (dist < 15) {
        setHoveredPoint(i);
        onPointHover?.(dataPoints[i]);
        foundPoint = true;
        break;
      }
    }

    if (!foundPoint) {
      setHoveredPoint(null);
      onPointHover?.(null);
    }

    // Check for hovered clusters - use same radius calculation logic
    let foundCluster = false;
    
    // Calculate cluster data with same logic as drawing
    const clusterData = clusters.map((cluster, idx) => {
      if (cluster.pointIndices.length === 0) return null;

      const points = cluster.pointIndices.map(i => dataPoints[i]).filter(Boolean);
      if (points.length === 0) return null;

      const xs = points.map(p => scaleX(p.x));
      const ys = points.map(p => scaleY(p.y));

      const centerX = xs.reduce((a, b) => a + b, 0) / xs.length;
      const centerY = ys.reduce((a, b) => a + b, 0) / ys.length;

      const maxDist = Math.max(
        ...xs.map((x, i) => Math.sqrt((x - centerX) ** 2 + (ys[i] - centerY) ** 2))
      );

      // Match the drawing logic exactly
      const minRequiredRadius = maxDist + 30;
      const sizeBonus = points.length === 1 ? 15 : points.length === 2 ? 10 : 5;
      const initialRadius = minRequiredRadius + sizeBonus;

      return {
        idx,
        centerX,
        centerY,
        radius: initialRadius,
        minRequiredRadius,
        cluster
      };
    }).filter(Boolean) as Array<{
      idx: number;
      centerX: number;
      centerY: number;
      radius: number;
      minRequiredRadius: number;
      cluster: ClusterInfo;
    }>;

    // Apply same overlap prevention as in drawing
    for (let i = 0; i < clusterData.length; i++) {
      for (let j = i + 1; j < clusterData.length; j++) {
        const c1 = clusterData[i];
        const c2 = clusterData[j];
        
        const dist = Math.sqrt(
          (c1.centerX - c2.centerX) ** 2 + (c1.centerY - c2.centerY) ** 2
        );
        
        const minSeparation = 15;
        const overlap = (c1.radius + c2.radius + minSeparation) - dist;
        
        if (overlap > 0) {
          const shrinkFactor = 0.88;
          c1.radius = Math.max(c1.radius * shrinkFactor, c1.minRequiredRadius, 30);
          c2.radius = Math.max(c2.radius * shrinkFactor, c2.minRequiredRadius, 30);
        }
      }
    }

    // Check for hover with adjusted radii
    clusterData.forEach(({ idx, centerX, centerY, radius, cluster }) => {
      const dist = Math.sqrt((centerX - x) ** 2 + (centerY - y) ** 2);

      if (dist < radius && !foundPoint && !foundCluster) {
        setHoveredCluster(idx);
        onClusterHover?.(cluster);
        foundCluster = true;
      }
    });

    if (!foundCluster) {
      setHoveredCluster(null);
      if (!foundPoint) onClusterHover?.(null);
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!addMode || !onAddPoint) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Check if clicked within plot area
    if (
      clickX >= padding.left &&
      clickX <= dimensions.width - padding.right &&
      clickY >= padding.top &&
      clickY <= dimensions.height - padding.bottom
    ) {
      const dataX = inverseScaleX(clickX);
      const dataY = inverseScaleY(clickY);
      onAddPoint(dataX, dataY);
    }
  };

  const IconComponent = datasetType === 'medical' ? User : datasetType === 'crime' ? MapPin : ShoppingBag;

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-card rounded-xl border border-border/50 shadow-md overflow-visible transition-all hover:shadow-lg backdrop-blur-sm"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        setHoveredPoint(null);
        setHoveredCluster(null);
        onPointHover?.(null);
        onClusterHover?.(null);
      }}
      onClick={handleClick}
      style={{ cursor: addMode ? 'crosshair' : 'default' }}
    >
      <canvas ref={canvasRef} className="w-full" />

      {/* SVG overlay for icons */}
      <svg
        className="absolute top-0 left-0 pointer-events-none"
        width={dimensions.width}
        height={dimensions.height}
        style={{ overflow: 'visible' }}
      >
        {dataPoints.map((point, idx) => {
          const x = scaleX(point.x);
          const y = scaleY(point.y);
          const isHovered = hoveredPoint === idx;
          const cluster = clusters.find(c => c.pointIndices.includes(idx));

          return (
            <g key={point.id} transform={`translate(${x}, ${y})`}>
              {isHovered && (
                <circle
                  r={18}
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  opacity={0.5}
                  className="animate-pulse"
                />
              )}
              {point.isNew && (
                <circle
                  r={20}
                  fill="none"
                  stroke="hsl(var(--chart-5))"
                  strokeWidth={3}
                  opacity={0.7}
                  className="animate-pulse"
                />
              )}
              <foreignObject x={-12} y={-12} width={24} height={24}>
                <IconComponent
                  className={`w-6 h-6 transition-all ${isHovered ? 'scale-125' : ''}`}
                  style={{
                    color: cluster ? cluster.color : getPointColor(idx, dataPoints.length), // Use cluster color if clustered, otherwise unique color
                    filter: isHovered ? 'drop-shadow(0 0 4px currentColor)' : 'none',
                  }}
                />
              </foreignObject>
            </g>
          );
        })}

        {/* Ghost icon for add mode */}
        {addMode && mousePos.x > padding.left && mousePos.x < dimensions.width - padding.right &&
          mousePos.y > padding.top && mousePos.y < dimensions.height - padding.bottom && (
          <g transform={`translate(${mousePos.x}, ${mousePos.y})`} opacity={0.5}>
            <foreignObject x={-12} y={-12} width={24} height={24}>
              <IconComponent className="w-6 h-6" style={{ color: 'hsl(var(--primary))' }} />
            </foreignObject>
          </g>
        )}

        {/* Story text at changing data points */}
        {storyText && currentStep !== undefined && currentStep > 0 && clusteringSteps && clusteringSteps.length > 0 && (
          (() => {
            // Find the latest step that shows a connection/merge
            const latestStep = clusteringSteps[Math.min(currentStep - 1, clusteringSteps.length - 1)];
            if (!latestStep || !latestStep.cluster1 || !latestStep.cluster2) return null;
            
            // Get the first point from each cluster being connected
            const point1Idx = latestStep.cluster1[0];
            const point2Idx = latestStep.cluster2[0];
            
            if (point1Idx === undefined || point2Idx === undefined || !dataPoints[point1Idx] || !dataPoints[point2Idx]) {
              return null;
            }
            
            const p1 = dataPoints[point1Idx];
            const p2 = dataPoints[point2Idx];
            
            // Calculate midpoint
            const midX = (scaleX(p1.x) + scaleX(p2.x)) / 2;
            const midY = (scaleY(p1.y) + scaleY(p2.y)) / 2;
            
            // Calculate offset to position text above the midpoint, not covering the points
            // Use a vector from midpoint to one of the points, then offset perpendicularly
            const dx = scaleX(p2.x) - scaleX(p1.x);
            const dy = scaleY(p2.y) - scaleY(p1.y);
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            // Offset perpendicular to the line connecting the points
            // Normalize the vector and rotate 90 degrees
            const offsetX = dist > 0 ? (-dy / dist) * 80 : 0;
            const offsetY = dist > 0 ? (dx / dist) * 80 : -80;
            
            // Position text offset from midpoint
            const textX = midX + offsetX;
            const textY = midY + offsetY;
            
            return (
              <g key="story-text" transform={`translate(${textX}, ${textY})`}>
                {/* Plain story text without background */}
                <foreignObject x="-250" y="-15" width="500" height="40">
                  <div 
                    className="text-center"
                    style={{
                      fontSize: '13px',
                      fontWeight: '500',
                      lineHeight: '1.5',
                      color: 'hsl(var(--foreground))',
                      fontFamily: 'Inter, system-ui, sans-serif',
                      wordWrap: 'break-word',
                      overflowWrap: 'break-word',
                      whiteSpace: 'normal',
                    }}
                  >
                    {storyText}
                  </div>
                </foreignObject>
              </g>
            );
          })()
        )}
      </svg>
    </div>
  );
}
