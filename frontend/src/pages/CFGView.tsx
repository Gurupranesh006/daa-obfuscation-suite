import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { ReactFlow, Background, Controls, type Edge, type Node, Position, MarkerType } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useCode } from '../context/CodeContext';

const CFGView = () => {
  const { code, language } = useCode();
  const [isFlattening, setIsFlattening] = useState(false);
  const [cfgNodes, setCfgNodes] = useState<any[]>([]);
  const [flattenedData, setFlattenedData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'original' | 'flattened'>('original');

  useEffect(() => {
    const syncCode = async () => {
      try {
        const res = await axios.post('http://localhost:8000/api/analyze/all', { code, language });
        setCfgNodes(res.data.cfg_nodes);
        setFlattenedData(null);
        setActiveTab('original');
      } catch (e) { console.error(e); }
    };
    syncCode();
  }, [code, language]);

  const handleFlatten = async () => {
    setIsFlattening(true);
    try {
      const res = await axios.post('http://localhost:8000/api/cfg/flatten', { nodes: cfgNodes });
      setFlattenedData(res.data);
      setActiveTab('flattened');
    } catch (e) { console.error(e); }
    finally { setIsFlattening(false); }
  };

  const getFlowData = (nodesData: any[]) => {
    const initialNodes: Node[] = [];
    const initialEdges: Edge[] = [];

    nodesData.forEach((n, i) => {
      initialNodes.push({
        id: n.id,
        data: { label: (
          <div className="text-left font-code-sm text-[10px]">
            <div className="font-bold text-secondary mb-1 border-b border-secondary/20">{n.label}</div>
            {n.code.map((line: string, j: number) => <div key={j} className="opacity-80 truncate">{line}</div>)}
          </div>
        )},
        position: { x: 50 + (i % 2) * 250, y: 50 + Math.floor(i / 2) * 150 },
        style: { background: '#0F172A', color: '#bec6e0', border: '1px solid #1E293B', borderRadius: '4px', width: 200 },
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
      });

      n.next.forEach((nxt: string) => {
        initialEdges.push({
          id: `e-${n.id}-${nxt}`,
          source: n.id,
          target: nxt,
          animated: true,
          style: { stroke: '#7BD0FF' },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#7BD0FF' },
        });
      });
    });

    return { nodes: initialNodes, edges: initialEdges };
  };

  const originalFlow = useMemo(() => getFlowData(cfgNodes), [cfgNodes]);
  const flattenedFlow = useMemo(() => {
    if (!flattenedData) return { nodes: [], edges: [] };
    const all = [flattenedData.dispatcher, ...flattenedData.blocks];
    return getFlowData(all);
  }, [flattenedData]);

  return (
    <div className="flex flex-col gap-6 h-full min-h-[700px]">
      <header className="border-b border-subtle pb-6 flex justify-between items-end">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-secondary">account_tree</span>
            <h1 className="font-headline-lg text-headline-lg text-on-surface">CFG Visualizer</h1>
          </div>
          <p className="font-body-md text-on-surface-variant max-w-2xl">
            Interactive node-based representation of control flow. Analyzing <span className="text-secondary">{language.toUpperCase()}</span> code.
          </p>
        </div>
        <div className="flex bg-surface-container border border-subtle rounded p-1">
           <button 
             onClick={() => setActiveTab('original')}
             className={`px-4 py-1.5 rounded font-label-caps text-label-caps transition-all ${activeTab === 'original' ? 'bg-secondary text-on-secondary shadow-lg' : 'text-on-surface-variant hover:text-on-surface'}`}
           >
             Original CFG
           </button>
           <button 
             onClick={() => { if(flattenedData) setActiveTab('flattened'); else handleFlatten(); }}
             className={`px-4 py-1.5 rounded font-label-caps text-label-caps transition-all ${activeTab === 'flattened' ? 'bg-alert-red text-white shadow-lg' : 'text-on-surface-variant hover:text-on-surface'}`}
           >
             Flattened View
           </button>
        </div>
      </header>

      <div className="flex-1 bg-bg-deep border border-subtle rounded-xl overflow-hidden relative min-h-[500px]">
         <ReactFlow 
           nodes={activeTab === 'original' ? originalFlow.nodes : flattenedFlow.nodes} 
           edges={activeTab === 'original' ? originalFlow.edges : flattenedFlow.edges}
           fitView
           colorMode="dark"
         >
           <Background color="#1E293B" gap={20} />
           <Controls />
         </ReactFlow>
         
         <div className="absolute top-4 right-4 z-10 flex gap-2">
            <div className="bg-primary-container/80 backdrop-blur px-3 py-1 rounded border border-subtle text-[10px] font-code-sm">
               Nodes: {activeTab === 'original' ? cfgNodes.length : (flattenedData?.blocks.length + 1 || 0)}
            </div>
            <div className={`px-3 py-1 rounded border border-subtle text-[10px] font-code-sm ${activeTab === 'original' ? 'bg-tertiary/20 text-tertiary border-tertiary/30' : 'bg-alert-red/20 text-alert-red border-alert-red/30'}`}>
               Complexity: {activeTab === 'original' ? 'O(V+E)' : 'O(V*E)'}
            </div>
         </div>
      </div>

      <div className="bg-primary-container border border-subtle rounded-xl p-6 flex justify-between items-center">
        <div className="flex gap-12">
          <div>
            <div className="font-label-caps text-label-caps text-on-surface-variant mb-1">State Analysis</div>
            <div className="font-code-md text-secondary">Awaiting Trigger</div>
          </div>
          <div className="hidden md:block">
            <div className="font-label-caps text-label-caps text-on-surface-variant mb-1">Instruction Set</div>
            <div className="font-code-md text-on-surface">{language.toUpperCase()} Core</div>
          </div>
        </div>
        <button 
          onClick={handleFlatten}
          disabled={isFlattening}
          className="bg-secondary text-on-secondary px-8 py-3 rounded font-label-caps text-label-caps font-bold hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">rebase_edit</span>
          {isFlattening ? 'Generating Obfuscation...' : 'Flatten Control Flow'}
        </button>
      </div>
    </div>
  );
};

export default CFGView;
