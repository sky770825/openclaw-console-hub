import React, { useState, useCallback, useRef } from 'react';

/**
 * OpenClaw Studio UI Cell Prototype
 * 
 * Features:
 * 1. Node Creation (Click on canvas)
 * 2. Node Dragging
 * 3. Connecting Nodes
 * 4. JSON Export
 */

const NODE_WIDTH = 120;
const NODE_HEIGHT = 40;

interface Node {
  id: string;
  type: string;
  x: number;
  y: number;
  label: string;
}

interface Connection {
  id: string;
  fromId: string;
  toId: string;
}

const UIPrototype: React.FC = () => {
  const [nodes, setNodes] = useState<Node[]>([
    { id: '1', type: 'trigger', x: 50, y: 50, label: 'Telegram In' },
    { id: '2', type: 'action', x: 250, y: 150, label: 'Analyze Image' },
  ]);
  const [connections, setConnections] = useState<Connection[]>([
    { id: 'c1', fromId: '1', toId: '2' }
  ]);
  
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [linkingFromId, setLinkingFromId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  
  const svgRef = useRef<SVGSVGElement>(null);

  const getMousePos = (e: React.MouseEvent | MouseEvent) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const CTM = svgRef.current.getScreenCTM();
    if (!CTM) return { x: 0, y: 0 };
    return {
      x: (e.clientX - CTM.e) / CTM.a,
      y: (e.clientY - CTM.f) / CTM.d
    };
  };

  const onMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (e.shiftKey) {
      setLinkingFromId(nodeId);
    } else {
      const pos = getMousePos(e);
      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        setDraggingNodeId(nodeId);
        setDragOffset({ x: pos.x - node.x, y: pos.y - node.y });
      }
    }
  };

  const onMouseMove = (e: React.MouseEvent) => {
    const pos = getMousePos(e);
    setMousePos(pos);

    if (draggingNodeId) {
      setNodes(prev => prev.map(n => 
        n.id === draggingNodeId 
          ? { ...n, x: pos.x - dragOffset.x, y: pos.y - dragOffset.y }
          : n
      ));
    }
  };

  const onMouseUp = (e: React.MouseEvent, nodeId?: string) => {
    if (linkingFromId && nodeId && linkingFromId !== nodeId) {
      const exists = connections.some(c => c.fromId === linkingFromId && c.toId === nodeId);
      if (!exists) {
        setConnections(prev => [...prev, {
          id: `c${Date.now()}`,
          fromId: linkingFromId,
          toId: nodeId
        }]);
      }
    }
    setDraggingNodeId(null);
    setLinkingFromId(null);
  };

  const addNode = (e: React.MouseEvent) => {
    if (e.target === svgRef.current) {
      const pos = getMousePos(e);
      const newNode: Node = {
        id: Date.now().toString(),
        type: 'generic',
        x: pos.x - NODE_WIDTH / 2,
        y: pos.y - NODE_HEIGHT / 2,
        label: 'New Node'
      };
      setNodes(prev => [...prev, newNode]);
    }
  };

  const exportJSON = () => {
    const data = { nodes, connections };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'workflow.json';
    a.click();
    console.log('Exported JSON:', data);
  };

  return (
    <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'sans-serif' }}>
      <div style={{ padding: '10px', background: '#333', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>OpenClaw Studio Prototype</strong>
        <div>
          <button onClick={exportJSON} style={{ padding: '5px 10px', cursor: 'pointer' }}>Export JSON</button>
          <span style={{ marginLeft: '10px', fontSize: '12px' }}>Shift+Drag to Connect | Click Canvas to Add Node</span>
        </div>
      </div>
      
      <svg 
        ref={svgRef}
        style={{ flex: 1, background: '#f0f0f0', cursor: draggingNodeId ? 'grabbing' : 'crosshair' }}
        onMouseMove={onMouseMove}
        onMouseUp={(e) => onMouseUp(e)}
        onMouseDown={addNode}
      >
        {/* Connections */}
        {connections.map(conn => {
          const from = nodes.find(n => n.id === conn.fromId);
          const to = nodes.find(n => n.id === conn.toId);
          if (!from || !to) return null;
          return (
            <line 
              key={conn.id}
              x1={from.x + NODE_WIDTH} y1={from.y + NODE_HEIGHT / 2}
              x2={to.x} y2={to.y + NODE_HEIGHT / 2}
              stroke="#666" strokeWidth="2"
            />
          );
        })}

        {/* Active Link */}
        {linkingFromId && (
          <line 
            x1={nodes.find(n => n.id === linkingFromId)!.x + NODE_WIDTH} 
            y1={nodes.find(n => n.id === linkingFromId)!.y + NODE_HEIGHT / 2}
            x2={mousePos.x} y2={mousePos.y}
            stroke="#aaa" strokeWidth="2" strokeDasharray="4"
          />
        )}

        {/* Nodes */}
        {nodes.map(node => (
          <g 
            key={node.id} 
            transform={`translate(${node.x}, ${node.y})`}
            onMouseDown={(e) => onMouseDown(e, node.id)}
            onMouseUp={(e) => onMouseUp(e, node.id)}
            style={{ cursor: draggingNodeId === node.id ? 'grabbing' : 'grab' }}
          >
            <rect 
              width={NODE_WIDTH} height={NODE_HEIGHT} rx="5" 
              fill={node.type === 'trigger' ? '#e1f5fe' : node.type === 'action' ? '#fff3e0' : '#fff'}
              stroke="#333" strokeWidth="1"
            />
            <text 
              x={NODE_WIDTH / 2} y={NODE_HEIGHT / 2} 
              textAnchor="middle" dominantBaseline="central"
              fontSize="12" pointerEvents="none"
            >
              {node.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
};

export default UIPrototype;
