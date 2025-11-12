import { useEffect, useRef, useState } from 'react';

interface DendrogramNode {
  left?: DendrogramNode;
  right?: DendrogramNode;
  height: number;
  label?: string;
  color?: string;
  indices?: number[];
}

interface DendrogramProps {
  tree: DendrogramNode | null;
  currentHeight: number;
  labels: string[];
  colors: string[];
  cutLine?: number;
  onCutLineChange?: (height: number) => void;
  currentStep: number;
  totalSteps: number;
  clusteringSteps: any[];
}

export function Dendrogram({ 
  tree, 
  currentHeight, 
  labels, 
  colors, 
  cutLine, 
  onCutLineChange,
  currentStep,
  totalSteps,
  clusteringSteps
}: DendrogramProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 400, height: 600 });
  const [isDragging, setIsDragging] = useState(false);

  const padding = { top: 35, right: 30, bottom: 45, left: 120 }; // Reduced top and bottom padding to save space

  useEffect(() => {
    const updateDimensions = () => {
      // Use the canvas container div to measure available space
      const container = canvasContainerRef.current;
      if (container) {
        const rect = container.getBoundingClientRect();
        // Get the actual available space in the container
        const computedStyle = window.getComputedStyle(container);
        const paddingLeft = parseFloat(computedStyle.paddingLeft) || 8;
        const paddingRight = parseFloat(computedStyle.paddingRight) || 8;
        const paddingTop = parseFloat(computedStyle.paddingTop) || 8;
        const paddingBottom = parseFloat(computedStyle.paddingBottom) || 8;
        
        // Use full container width and height
        const availableWidth = rect.width - paddingLeft - paddingRight;
        const availableHeight = rect.height - paddingTop - paddingBottom;
        
        // Calculate required height based on number of labels
        // Reduced spacing for side-by-side layout to save vertical space
        const minSpacing = 45; // Reduced from 50px to 45px
        const numLabels = labels.length;
        const requiredHeight = numLabels > 0 
          ? (numLabels - 1) * minSpacing + padding.top + padding.bottom + 30 // Reduced buffer from 40px to 30px
          : 400;
        
        // Use the actual container width - no forced minimum to prevent horizontal scrolling
        // Height: ensure we have at least the required height, but use available if it's larger
        const calculatedWidth = availableWidth > 0 ? availableWidth : 800;
        // Use the maximum of required height and available height to ensure all labels fit
        const calculatedHeight = Math.max(requiredHeight, availableHeight > 0 ? availableHeight : requiredHeight);
        
        setDimensions({ 
          width: calculatedWidth,
          height: calculatedHeight
        });
      }
    };

    updateDimensions();
    // Multiple delays to ensure container has fully rendered and layout is stable
    const timer = setTimeout(updateDimensions, 50);
    const timer2 = setTimeout(updateDimensions, 200);
    const timer3 = setTimeout(updateDimensions, 500);
    const timer4 = setTimeout(updateDimensions, 1000); // Final check
    window.addEventListener('resize', updateDimensions);
    return () => {
      window.removeEventListener('resize', updateDimensions);
      clearTimeout(timer);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [labels.length, labels]); // Re-calculate when number of labels changes

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

    // Get labels in dendrogram order (left-to-right traversal for better clustering visualization)
    const orderedLabels: string[] = [];
    
    const collectLabelsInOrder = (node: DendrogramNode) => {
      if (!node) return;
      
      // Leaf node - add its label
      if (node.label) {
        orderedLabels.push(node.label);
        return;
      }
      
      // Internal node - traverse left then right
      if (node.left) collectLabelsInOrder(node.left);
      if (node.right) collectLabelsInOrder(node.right);
    };
    
    if (tree) {
      collectLabelsInOrder(tree);
    }
    
    // Ensure all input labels are included (in case some are missing from tree)
    const labelsSet = new Set(orderedLabels);
    const missingLabels = labels.filter(label => !labelsSet.has(label)).sort();
    const sortedLabels = [...orderedLabels, ...missingLabels];
    
    // Calculate spacing for labels - ensure no overlap
    const availableHeight = dimensions.height - padding.top - padding.bottom;
    const numLabels = sortedLabels.length;
    
    // Minimum spacing between labels to prevent overlap (50px ensures clear visibility)
    const minSpacing = 50;
    
    // Calculate spacing: always use at least minimum spacing
    const requiredMinHeight = (numLabels - 1) * minSpacing;
    let leafSpacing: number;
    
    if (numLabels <= 1) {
      leafSpacing = availableHeight;
    } else if (requiredMinHeight <= availableHeight) {
      // We have enough space - distribute evenly but ensure minimum spacing
      const calculatedSpacing = availableHeight / (numLabels - 1);
      leafSpacing = Math.max(minSpacing, calculatedSpacing);
    } else {
      // Use minimum spacing - canvas should be tall enough but use it anyway
      leafSpacing = minSpacing;
    }

    // Create a map of label to y position - simple linear distribution
    const labelToY = new Map<string, number>();
    
    if (numLabels === 1) {
      // Single label - center it
      labelToY.set(sortedLabels[0], padding.top + availableHeight / 2);
    } else {
      // Multiple labels - distribute evenly from top
      const totalHeight = (numLabels - 1) * leafSpacing;
      const startY = padding.top + (availableHeight - totalHeight) / 2;
      
      sortedLabels.forEach((label, idx) => {
        const yPos = startY + idx * leafSpacing;
        // Ensure it's within bounds
        const clampedY = Math.max(padding.top + 10, Math.min(dimensions.height - padding.bottom - 10, yPos));
        labelToY.set(label, clampedY);
      });
    }

    const maxHeight = getMaxHeight(tree);
    const scaleX = (height: number) => {
      // Use available width for scaling
      const availableWidth = dimensions.width - padding.left - padding.right;
      if (maxHeight === 0 || availableWidth <= 0) return padding.left;
      
      // Compress the scaling to fit within available width
      // Use linear compression to reduce horizontal line length while maintaining proportions
      // For side-by-side layout: dendrogram uses 60% of space, cut control overlay uses 40%
      const compressionFactor = 0.85; // Increased to allow dendrogram lines to use most of the 60% space
      const normalizedHeight = height / maxHeight;
      // Reserve 40% of available width for cut control overlay, dendrogram uses 60%
      const dendrogramWidthRatio = 0.6;
      const effectiveWidth = availableWidth * dendrogramWidthRatio;
      // Apply linear compression - lines will use up to 85% of the effective width (60% of total)
      const compressedValue = normalizedHeight * effectiveWidth * compressionFactor;
      const xPos = padding.left + compressedValue;
      // Clamp to ensure it stays within bounds
      return Math.max(padding.left, Math.min(padding.left + effectiveWidth, xPos));
    };

    // Draw leaf nodes and their horizontal lines
    sortedLabels.forEach((label) => {
      const yPos = labelToY.get(label);
      if (yPos === undefined) return;
      
      // Draw label clearly
      ctx.fillStyle = 'hsl(var(--foreground))';
      ctx.font = '14px JetBrains Mono';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, padding.left - 10, yPos);

      // Draw horizontal line to axis
      ctx.strokeStyle = 'hsl(var(--border))';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padding.left, yPos);
      ctx.lineTo(scaleX(0), yPos);
      ctx.stroke();

      // Draw node circle
      ctx.fillStyle = 'hsl(var(--foreground))';
      ctx.beginPath();
      ctx.arc(padding.left, yPos, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw progressive dendrogram based on current step
    if (tree && clusteringSteps.length > 0) {
      drawProgressiveDendrogram(ctx, tree, labelToY, scaleX, currentStep, clusteringSteps);
    }

    // Draw axis
    ctx.strokeStyle = 'hsl(var(--foreground))';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, dimensions.height - padding.bottom);
    ctx.stroke();

    // Draw axis label
    ctx.fillStyle = 'hsl(var(--foreground))';
    ctx.font = '12px Inter';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('Merge Distance', dimensions.width / 2, dimensions.height - 5);

    // Draw cut line (ensure it stays within bounds)
    const effectiveCutLine = cutLine !== undefined ? cutLine : (tree?.height || 0) * 0.6;
    const cutX = scaleX(effectiveCutLine);
    // Clamp cut line to visible area
    const clampedCutX = Math.min(Math.max(padding.left, cutX), dimensions.width - padding.right);
    ctx.strokeStyle = 'hsl(var(--destructive))';
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(clampedCutX, padding.top);
    ctx.lineTo(clampedCutX, dimensions.height - padding.bottom);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Draw cut line label
    ctx.fillStyle = 'hsl(var(--destructive))';
    ctx.font = '11px Inter';
    ctx.textAlign = 'left';
    const labelX = Math.min(clampedCutX + 5, dimensions.width - padding.right - 60);
    ctx.fillText(`Cut: ${effectiveCutLine.toFixed(2)}`, labelX, padding.top + 15);

  }, [tree, currentHeight, dimensions, labels, colors, cutLine, currentStep, totalSteps, clusteringSteps]);

  const drawProgressiveDendrogram = (
    ctx: CanvasRenderingContext2D, 
    node: DendrogramNode, 
    labelToY: Map<string, number>, 
    scaleX: (height: number) => number,
    currentStep: number,
    clusteringSteps: any[]
  ) => {
    if (!node) return;

    // If this is a leaf node, we already drew it
    if (node.label) return;

    // Draw children first
    if (node.left) {
      drawProgressiveDendrogram(ctx, node.left, labelToY, scaleX, currentStep, clusteringSteps);
    }
    if (node.right) {
      drawProgressiveDendrogram(ctx, node.right, labelToY, scaleX, currentStep, clusteringSteps);
    }

    // Only draw this merge if it has occurred by the current step
    const stepIndex = findStepForMerge(node, clusteringSteps);
    if (stepIndex !== -1 && stepIndex < currentStep) {
      const leftY = getNodeY(node.left, labelToY);
      const rightY = getNodeY(node.right, labelToY);
      const x = scaleX(node.height);
      const midY = (leftY + rightY) / 2;

      ctx.strokeStyle = 'hsl(var(--primary))';
      ctx.lineWidth = 2;

      // Draw vertical line connecting children
      ctx.beginPath();
      ctx.moveTo(x, leftY);
      ctx.lineTo(x, rightY);
      ctx.stroke();

      // Draw horizontal lines to children
      const childX = node.left ? scaleX(node.left.height) : padding.left;
      ctx.beginPath();
      ctx.moveTo(childX, leftY);
      ctx.lineTo(x, leftY);
      ctx.stroke();

      const childX2 = node.right ? scaleX(node.right.height) : padding.left;
      ctx.beginPath();
      ctx.moveTo(childX2, rightY);
      ctx.lineTo(x, rightY);
      ctx.stroke();

      // Draw merge node
      ctx.fillStyle = 'hsl(var(--primary))';
      ctx.beginPath();
      ctx.arc(x, midY, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const findStepForMerge = (node: DendrogramNode, clusteringSteps: any[]): number => {
    // Find which step corresponds to this merge
    for (let i = 0; i < clusteringSteps.length; i++) {
      const step = clusteringSteps[i];
      if (step.action === 'connect' || step.action === 'merge') {
        // Check if this step's merged cluster matches this node's indices
        if (node.indices && step.mergedCluster && 
            node.indices.length === step.mergedCluster.length &&
            node.indices.every(idx => step.mergedCluster.includes(idx))) {
          return i;
        }
      }
    }
    return -1;
  };

  const getNodeY = (node: DendrogramNode | undefined, labelToY: Map<string, number>): number => {
    if (!node) return padding.top;
    
    if (node.label) {
      return labelToY.get(node.label) || padding.top;
    }
    
    // For internal nodes, calculate the midpoint of their children
    const leftY = getNodeY(node.left, labelToY);
    const rightY = getNodeY(node.right, labelToY);
    return (leftY + rightY) / 2;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onCutLineChange || !tree) return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    // Mouse coordinates are in CSS pixels, which match dimensions.width
    const x = e.clientX - rect.left;
    
    const maxHeight = getMaxHeight(tree);
    if (maxHeight === 0) return;
    
    // Use the same scaleX logic as drawing - with compression and reserved space
    const availableWidth = dimensions.width - padding.left - padding.right;
    const compressionFactor = 0.85;
    const dendrogramWidthRatio = 0.6;
    const effectiveWidth = availableWidth * dendrogramWidthRatio;
    
    // Inverse of scaleX: convert pixel X position back to height value
    // scaleX: xPos = padding.left + (normalizedHeight * effectiveWidth * compressionFactor)
    // So: normalizedHeight = (xPos - padding.left) / (effectiveWidth * compressionFactor)
    const relativeX = x - padding.left;
    if (relativeX < 0) {
      onCutLineChange(0);
    } else if (relativeX > effectiveWidth * compressionFactor) {
      onCutLineChange(maxHeight);
    } else {
      const normalizedHeight = relativeX / (effectiveWidth * compressionFactor);
      const height = normalizedHeight * maxHeight;
      onCutLineChange(Math.max(0, Math.min(maxHeight, height)));
    }
    
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !onCutLineChange || !tree) return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    // Mouse coordinates are in CSS pixels, which match dimensions.width
    const x = e.clientX - rect.left;
    
    const maxHeight = getMaxHeight(tree);
    if (maxHeight === 0) return;
    
    // Use the same scaleX logic as drawing - with compression and reserved space
    const availableWidth = dimensions.width - padding.left - padding.right;
    const compressionFactor = 0.85;
    const dendrogramWidthRatio = 0.6;
    const effectiveWidth = availableWidth * dendrogramWidthRatio;
    
    // Inverse of scaleX: convert pixel X position back to height value
    const relativeX = x - padding.left;
    if (relativeX < 0) {
      onCutLineChange(0);
    } else if (relativeX > effectiveWidth * compressionFactor) {
      onCutLineChange(maxHeight);
    } else {
      const normalizedHeight = relativeX / (effectiveWidth * compressionFactor);
      const height = normalizedHeight * maxHeight;
      onCutLineChange(Math.max(0, Math.min(maxHeight, height)));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const getMaxHeight = (node: DendrogramNode | null): number => {
    if (!node) return 0;
    if (!node.left && !node.right) return 0;
    const leftHeight = node.left ? getMaxHeight(node.left) : 0;
    const rightHeight = node.right ? getMaxHeight(node.right) : 0;
    return Math.max(node.height, leftHeight, rightHeight);
  };

  return (
    <div ref={containerRef} className="w-full h-full flex flex-col">
      <div className="px-6 py-1.5 border-b border-border flex-shrink-0 bg-muted/30">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              Step {currentStep} of {totalSteps} - Progressive clustering visualization
            </p>
          </div>
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">{labels.length}</span> data points
          </div>
        </div>
      </div>
      <div ref={canvasContainerRef} className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden bg-background" style={{ padding: '8px' }}>
        <canvas 
          ref={canvasRef} 
          className="cursor-crosshair block" 
          style={{ 
            width: `${dimensions.width}px`, 
            height: `${dimensions.height}px`,
            display: 'block'
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </div>
    </div>
  );
}
