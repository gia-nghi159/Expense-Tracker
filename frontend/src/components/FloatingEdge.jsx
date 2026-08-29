import React, { useCallback } from 'react';
import { useStore, getBezierPath, BaseEdge } from '@xyflow/react';

// Returns intersection point of the line between center of node and target node, and the node's bounding box
function getNodeIntersection(intersectionNode, targetNode) {
  const pos = intersectionNode.positionAbsolute || intersectionNode.position || { x: 0, y: 0 };
  const targetPosition = targetNode.positionAbsolute || targetNode.position || { x: 0, y: 0 };
  
  const width = intersectionNode.measured?.width || intersectionNode.width || 80;
  const height = intersectionNode.measured?.height || intersectionNode.height || 80;
  
  const tWidth = targetNode.measured?.width || targetNode.width || 80;
  const tHeight = targetNode.measured?.height || targetNode.height || 80;

  const w = width / 2;
  const h = height / 2;
  
  const x2 = targetPosition.x + tWidth / 2;
  const y2 = targetPosition.y + tHeight / 2;
  const x1 = pos.x + w;
  const y1 = pos.y + h;
  
  const dx = x2 - x1;
  const dy = y2 - y1;
  
  // Calculate intersection with the rectangle
  let x = 0, y = 0;
  
  if (dx === 0) {
    x = x1;
    y = dy > 0 ? y1 + h : y1 - h;
  } else if (dy === 0) {
    y = y1;
    x = dx > 0 ? x1 + w : x1 - w;
  } else {
    // slope
    const m = dy / dx;
    
    // intersect with left/right
    const xi = dx > 0 ? w : -w;
    const yi = m * xi;
    
    if (Math.abs(yi) <= h) {
      x = x1 + xi;
      y = y1 + yi;
    } else {
      const yi2 = dy > 0 ? h : -h;
      const xi2 = yi2 / m;
      x = x1 + xi2;
      y = y1 + yi2;
    }
  }
  
  return { x, y };
}

function getEdgeParams(source, target) {
  const sourceIntersectionPoint = getNodeIntersection(source, target);
  const targetIntersectionPoint = getNodeIntersection(target, source);
  
  return {
    sx: sourceIntersectionPoint.x,
    sy: sourceIntersectionPoint.y,
    tx: targetIntersectionPoint.x,
    ty: targetIntersectionPoint.y,
  };
}

const FloatingEdge = ({
  source,
  target,
  markerEnd,
  style,
  label,
  labelStyle,
  labelBgStyle
}) => {
  const sourceNode = useStore(useCallback((store) => store.nodeLookup.get(source), [source]));
  const targetNode = useStore(useCallback((store) => store.nodeLookup.get(target), [target]));

  if (!sourceNode || !targetNode) {
    return null;
  }

  const { sx, sy, tx, ty } = getEdgeParams(sourceNode, targetNode);

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX: sx,
    sourceY: sy,
    targetX: tx,
    targetY: ty,
  });

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      {label && (
        <g transform={`translate(${labelX},${labelY})`}>
          <rect
            x={-(label.length * 4)}
            y={-12}
            width={label.length * 8}
            height={24}
            fill={labelBgStyle?.fill || 'white'}
            stroke={labelBgStyle?.stroke || '#ccc'}
            strokeWidth={labelBgStyle?.strokeWidth || 1}
            rx={labelBgStyle?.rx || 4}
            ry={labelBgStyle?.ry || 4}
          />
          <text
            x={0}
            y={4}
            fill={labelStyle?.fill || 'black'}
            fontSize={labelStyle?.fontSize || 12}
            fontWeight={labelStyle?.fontWeight || 500}
            textAnchor="middle"
          >
            {label}
          </text>
        </g>
      )}
    </>
  );
};

export default FloatingEdge;
