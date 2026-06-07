import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { ReactFlow, Background, Controls, type Node, type Edge, Position, MarkerType } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useCode } from '../context/CodeContext';

const ASTView = () => {
  const { code, language } = useCode();
  const [isSimplifying, setIsSimplifying] = useState(false);
  const [astData, setAstData] = useState<any>(null);
  const [rawAST, setRawAST] = useState('{}');
  const [viewMode, setViewMode] = useState<'before' | 'after'>('before');

  // Automatically update AST when global code changes
  useEffect(() => {
    const syncCode = async () => {
      try {
        const res = await axios.post('http://localhost:8000/api/analyze/all', { code, language });
        setRawAST(JSON.stringify(res.data.ast_tree, null, 2));
        setAstData(null);
        setViewMode('before');
      } catch (e) { console.error(e); }
    };
    syncCode();
  }, [code, language]);

  const handleSimplify = async () => {
    setIsSimplifying(true);
    try {
      const ast = JSON.parse(rawAST);
      const response = await axios.post('http://localhost:8000/api/ast/simplify', ast);
      setAstData(response.data);
      setViewMode('after');
    } catch (error) {
      console.error("Simplification failed", error);
    } finally {
      setIsSimplifying(false);
    }
  };

  const getTreeData = (root: any) => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    let idCounter = 0;

    const traverse = (node: any, x: number, y: number, parentId: string | null = null, level: number = 0) => {
      if (!node) return;
      const id = `node-${idCounter++}`;
      
      const label = node.type === 'Literal' ? (
        <div className="text-center">
          <div className="text-[9px] text-on-surface-variant opacity-50 uppercase tracking-tighter">Literal</div>
          <div className="font-bold text-warning-amber text-lg">{node.value}</div>
        </div>
      ) : (
        <div className="text-center">
          <div className="text-[9px] text-secondary font-bold uppercase tracking-tighter">{node.type}</div>
          <div className="text-on-surface font-code-sm border-t border-subtle mt-1 pt-1">
             Op: <span className="text-tertiary font-bold">{node.operator}</span>
          </div>
        </div>
      );

      nodes.push({
        id,
        data: { label },
        position: { x, y },
        style: { 
          background: node.type === 'Literal' ? '#122131' : '#0F172A', 
          border: `1px solid ${node.type === 'Literal' ? '#F59E0B' : '#1E293B'}`,
          borderRadius: '8px',
          padding: '10px',
          width: 150,
          boxShadow: node.type === 'Literal' ? '0 0 10px rgba(245,158,11,0.1)' : 'none'
        },
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
      });

      if (parentId) {
        edges.push({
          id: `e-${parentId}-${id}`,
          source: parentId,
          target: id,
          style: { stroke: '#45464d', strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#45464d' },
        });
      }

      // Recursive offset-based layout
      const offset = 250 / (level + 1);
      if (node.left) traverse(node.left, x - offset, y + 120, id, level + 1);
      if (node.right) traverse(node.right, x + offset, y + 120, id, level + 1);
    };

    traverse(root, 0, 0);
    return { nodes, edges };
  };

  const currentTree = useMemo(() => {
    const data = viewMode === 'after' && astData ? astData : JSON.parse(rawAST || '{}');
    return getTreeData(data);
  }, [astData, rawAST, viewMode]);

  return (
    <div className="flex flex-col gap-6 h-full min-h-[750px]">
      <header className="border-b border-subtle pb-6 flex justify-between items-end">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-secondary">code</span>
            <h1 className="font-headline-lg text-headline-lg text-on-surface">AST Simplifier</h1>
          </div>
          <p className="font-body-md text-on-surface-variant max-w-2xl">
            Analyzing expression trees. Automated constant folding reduces algorithmic depth in <span className="text-tertiary">O(V)</span>.
          </p>
        </div>
        <div className="flex bg-surface-container border border-subtle rounded p-1">
           <button 
             onClick={() => setViewMode('before')}
             className={`px-4 py-1.5 rounded font-label-caps text-label-caps transition-all ${viewMode === 'before' ? 'bg-secondary text-on-secondary shadow-lg' : 'text-on-surface-variant hover:text-on-surface'}`}
           >
             Original AST
           </button>
           <button 
             onClick={() => { if(astData) setViewMode('after'); else handleSimplify(); }}
             className={`px-4 py-1.5 rounded font-label-caps text-label-caps transition-all ${viewMode === 'after' ? 'bg-tertiary text-on-tertiary shadow-lg' : 'text-on-surface-variant hover:text-on-surface'}`}
           >
             Simplified
           </button>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 flex-1">
        {/* Definition Area */}
        <div className="xl:col-span-4 flex flex-col gap-6">
           <div className="bg-primary-container border border-subtle rounded-xl flex flex-col overflow-hidden shadow-xl">
              <div className="bg-surface-container border-b border-subtle px-4 py-2 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-sm">account_tree</span>
                  <span className="font-code-md text-code-md font-bold text-on-surface">Parsed AST JSON</span>
                </div>
              </div>
              <div className="p-4 bg-[#020617]">
                <textarea 
                  value={rawAST}
                  onChange={(e) => setRawAST(e.target.value)}
                  className="w-full h-[350px] bg-bg-deep border border-subtle rounded p-3 font-code-md text-[11px] text-primary focus:border-secondary outline-none resize-none custom-scrollbar"
                />
              </div>
           </div>

           <div className="bg-surface-container border border-subtle rounded-lg p-6 flex-1 shadow-xl">
            <h3 className="font-label-caps text-label-caps text-on-surface-variant mb-4 border-b border-subtle pb-2">Analysis Engine</h3>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Target Class</span>
                <span className="text-secondary">{language.toUpperCase()} Core</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Complexity</span>
                <span className="text-tertiary">O(V) Linear</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-on-surface-variant">Optimization</span>
                <span className={`px-2 py-0.5 rounded text-[10px] ${astData?.simplified ? 'bg-tertiary/20 text-tertiary' : 'bg-surface-variant text-on-surface-variant'}`}>
                  {astData?.simplified ? 'ACTIVE' : 'IDLE'}
                </span>
              </div>
            </div>
            <button 
              onClick={handleSimplify}
              disabled={isSimplifying}
              className="w-full mt-8 bg-secondary text-on-secondary font-label-caps text-label-caps py-4 rounded-lg font-bold hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex justify-center items-center gap-2 shadow-lg shadow-secondary/20"
            >
              <span className="material-symbols-outlined">auto_fix_high</span>
              {isSimplifying ? 'Pruning Tree...' : 'Simplify AST'}
            </button>
          </div>
        </div>

        {/* Visualization Area */}
        <div className="xl:col-span-8 bg-bg-deep border border-subtle rounded-xl overflow-hidden relative shadow-2xl min-h-[500px]">
           <ReactFlow 
             nodes={currentTree.nodes} 
             edges={currentTree.edges}
             fitView
             colorMode="dark"
           >
             <Background color="#1E293B" gap={24} />
             <Controls />
           </ReactFlow>
           
           <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
              <div className="bg-primary-container/90 backdrop-blur px-4 py-2 rounded-lg border border-subtle flex flex-col gap-1">
                 <div className="text-[10px] font-label-caps text-on-surface-variant opacity-60">Visualizing</div>
                 <div className="text-xs font-bold text-on-surface capitalize">{viewMode} Optimization</div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default ASTView;
