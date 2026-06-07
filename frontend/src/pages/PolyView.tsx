import { useState } from 'react';
import axios from 'axios';

const PolyView = () => {
  const [seq1, setSeq1] = useState('MOV EAX, 1; ADD EAX, EBX; RET');
  const [seq2, setSeq2] = useState('MOV ECX, 1; ADD ECX, EBX; NOP; RET');
  const [match, setMatch] = useState(1);
  const [mismatch, setMismatch] = useState(-1);
  const [gap, setGap] = useState(-2);
  const [result, setResult] = useState<{ 
    score: number; 
    similarity: number; 
    tokens1: string[]; 
    tokens2: string[]; 
    matrix: number[][] | null 
  } | null>(null);
  const [isAligning, setIsAligning] = useState(false);

  const handleAlign = async () => {
    setIsAligning(true);
    try {
      const response = await axios.post('http://localhost:8000/api/poly/align', {
        seq1,
        seq2,
        match,
        mismatch,
        gap
      });
      setResult(response.data);
    } catch (error) {
      console.error("Alignment failed", error);
    } finally {
      setIsAligning(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="border-b border-subtle pb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="material-symbols-outlined text-secondary">security</span>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Polymorphic Detection</h1>
        </div>
        <p className="font-body-md text-on-surface-variant max-w-2xl">
          Identify mutated code sequences using global sequence alignment (Needleman-Wunsch). 
          Matches instruction tokens across variations in <span className="text-warning-amber">O(M*N)</span> time.
        </p>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-primary-container border border-subtle rounded-lg p-6">
          <h3 className="font-label-caps text-label-caps text-on-surface mb-4">Sequence A (Signature)</h3>
          <textarea 
            value={seq1}
            onChange={(e) => setSeq1(e.target.value)}
            className="w-full h-32 bg-bg-deep border border-subtle rounded p-3 font-code-md text-code-md text-primary focus:border-secondary outline-none resize-none"
          />
        </div>
        <div className="bg-primary-container border border-subtle rounded-lg p-6">
          <h3 className="font-label-caps text-label-caps text-on-surface mb-4">Sequence B (Mutated)</h3>
          <textarea 
            value={seq2}
            onChange={(e) => setSeq2(e.target.value)}
            className="w-full h-32 bg-bg-deep border border-subtle rounded p-3 font-code-md text-code-md text-warning-amber focus:border-secondary outline-none resize-none"
          />
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <section className="xl:col-span-8 bg-surface-container border border-subtle rounded-lg flex flex-col overflow-hidden">
          <div className="px-6 py-4 border-b border-subtle bg-surface-container-highest flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">grid_on</span>
              <h2 className="font-headline-sm text-headline-sm text-on-surface">DP Alignment Matrix</h2>
            </div>
            <div className="flex gap-4 font-code-sm text-code-sm">
              <div className="flex items-center gap-2">
                <label className="text-on-surface-variant">Match:</label>
                <input type="number" value={match} onChange={(e) => setMatch(parseInt(e.target.value))} className="w-12 bg-bg-deep border border-subtle rounded px-1 py-0.5 text-center" />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-on-surface-variant">Mismatch:</label>
                <input type="number" value={mismatch} onChange={(e) => setMismatch(parseInt(e.target.value))} className="w-12 bg-bg-deep border border-subtle rounded px-1 py-0.5 text-center" />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-on-surface-variant">Gap:</label>
                <input type="number" value={gap} onChange={(e) => setGap(parseInt(e.target.value))} className="w-12 bg-bg-deep border border-subtle rounded px-1 py-0.5 text-center" />
              </div>
            </div>
          </div>
          <div className="p-6 flex-1 overflow-auto min-h-[400px] flex items-center justify-center bg-[#020617]">
            {result?.matrix ? (
              <table className="border-collapse font-code-sm text-center text-on-surface-variant">
                <thead>
                  <tr>
                    <th className="p-2 border border-subtle bg-surface-container-lowest"></th>
                    <th className="p-2 border border-subtle bg-surface-container-lowest text-surface-variant">ε</th>
                    {result.tokens2.map((token, i) => (
                      <th key={i} className="p-2 border border-subtle text-warning-amber min-w-[80px] text-[10px] truncate">{token}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.matrix.map((row, i) => (
                    <tr key={i}>
                      <th className="p-2 border border-subtle text-primary bg-surface-container-lowest min-w-[80px] text-[10px] text-left truncate">
                        {i === 0 ? 'ε' : result.tokens1[i-1]}
                      </th>
                      {row.map((cell, j) => (
                        <td key={j} className="p-2 border border-subtle text-[11px]">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-on-surface-variant italic">
                {isAligning ? 'Computing instruction-wise alignment...' : 'Press "Run Detection" to generate matrix'}
              </div>
            )}
          </div>
        </section>

        <aside className="xl:col-span-4 flex flex-col gap-6">
          <div className="bg-surface-container border border-subtle rounded-lg p-8 flex flex-col items-center justify-center text-center">
            <div className="font-label-caps text-label-caps text-on-surface-variant mb-4 uppercase tracking-widest text-xs">Similarity Score</div>
            <div className={`text-[64px] font-headline-lg font-bold ${result && result.similarity > 70 ? 'text-tertiary' : 'text-warning-amber'} leading-none tracking-tighter`}>
              {result ? `${result.similarity.toFixed(1)}%` : '--%'}
            </div>
            {result && (
              <div className={`font-body-md text-body-md mt-4 flex items-center gap-1 ${result.similarity > 70 ? 'text-tertiary' : 'text-warning-amber'}`}>
                <span className="material-symbols-outlined text-[20px]">
                  {result.similarity > 70 ? 'check_circle' : 'warning'}
                </span>
                {result.similarity > 70 ? 'High Confidence Match' : 'Low Similarity'}
              </div>
            )}
          </div>

          <button 
            onClick={handleAlign}
            disabled={isAligning}
            className="w-full bg-secondary/10 hover:bg-secondary/20 text-secondary border border-secondary/30 font-label-caps text-label-caps py-4 rounded transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
          >
            <span className="material-symbols-outlined">analytics</span>
            {isAligning ? 'Running...' : 'Run Detection'}
          </button>

          <div className="bg-primary-container border border-subtle rounded-lg p-6">
             <h4 className="font-label-caps text-label-caps text-on-surface-variant mb-2 text-xs">Analysis Log</h4>
             <div className="font-code-sm text-[10px] text-on-surface-variant space-y-1">
                <div>{'>'} Tokenizing input strings...</div>
                <div>{'>'} Splitting on [; \n] delimiter</div>
                {result && <div>{'>'} Sequence A: {result.tokens1.length} instructions</div>}
                {result && <div>{'>'} Sequence B: {result.tokens2.length} instructions</div>}
                {result && <div>{'>'} Matrix dimensions: {result.tokens1.length + 1}x{result.tokens2.length + 1}</div>}
             </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default PolyView;
