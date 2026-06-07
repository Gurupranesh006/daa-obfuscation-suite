import { useState, useEffect } from 'react';
import axios from 'axios';
import { useCode } from '../context/CodeContext';

const ReverseView = () => {
  const { code, language } = useCode();
  const [pattern, setPattern] = useState('0xAA');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<{ 
    matches: number[]; 
    count: number; 
    algorithm: string; 
    complexity: string; 
  } | null>(null);

  const handleREAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const response = await axios.post('http://localhost:8000/api/re/analyze', {
        code: code,
        pattern: pattern
      });
      setResult(response.data);
    } catch (error) {
      console.error("RE analysis failed", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    if (code) handleREAnalyze();
  }, [code]);

  return (
    <div className="flex flex-col gap-6 h-full">
      <header className="border-b border-subtle pb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="material-symbols-outlined text-secondary">settings_backup_restore</span>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Reverse Engineering</h1>
        </div>
        <p className="font-body-md text-on-surface-variant max-w-2xl">
          Perform pattern-based deobfuscation and signature matching using the Knuth-Morris-Pratt (KMP) algorithm in <span className="text-tertiary">O(N+M)</span> time.
        </p>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Pattern Input */}
        <div className="xl:col-span-4 flex flex-col gap-6">
           <div className="bg-primary-container border border-subtle rounded-xl flex flex-col overflow-hidden">
              <div className="bg-surface-container border-b border-subtle px-4 py-2 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-sm">find_in_page</span>
                  <span className="font-code-md text-code-md font-bold text-on-surface">Signature Pattern</span>
                </div>
              </div>
              <div className="p-6 bg-[#020617]">
                <label className="font-label-caps text-label-caps text-on-surface-variant mb-2 block">Instruction / Hex Signature</label>
                <input 
                  type="text"
                  value={pattern}
                  onChange={(e) => setPattern(e.target.value)}
                  className="w-full bg-bg-deep border border-subtle rounded px-4 py-2 font-code-md text-primary focus:border-secondary outline-none transition-all"
                  placeholder="e.g. 0xAA or mov eax"
                />
                <button 
                  onClick={handleREAnalyze}
                  disabled={isAnalyzing}
                  className="w-full mt-4 bg-secondary text-on-secondary font-label-caps text-label-caps py-3 rounded font-bold hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                >
                  Search Signature
                </button>
              </div>
           </div>

           <div className="bg-surface-container border border-subtle rounded-lg p-6 flex-1">
            <h3 className="font-label-caps text-label-caps text-on-surface-variant mb-4 border-b border-subtle pb-2">Pattern Metrics</h3>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Matches Found</span>
                <span className={`font-bold ${result && result.count > 0 ? 'text-tertiary' : 'text-on-surface'}`}>
                  {result ? result.count : '--'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Search Algorithm</span>
                <span className="text-secondary">{result ? result.algorithm : 'KMP'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Worst Case</span>
                <span className="text-tertiary">O(N + M)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Highlighted Code Area */}
        <div className="xl:col-span-8 flex flex-col gap-6">
          <div className="bg-primary-container border border-subtle rounded-xl flex flex-col overflow-hidden min-h-[500px]">
            <div className="bg-surface-container border-b border-subtle px-4 py-3 flex justify-between items-center">
              <h3 className="font-headline-sm text-headline-sm text-on-surface">Source Code Analysis</h3>
              <span className="text-[10px] text-on-surface-variant italic font-code-sm">{language.toUpperCase()} Context</span>
            </div>
            <div className="flex-1 p-6 bg-bg-deep overflow-auto custom-scrollbar">
               <pre className="font-code-md text-code-md leading-loose text-on-surface whitespace-pre-wrap">
                  {code.split(new RegExp(`(${pattern})`, 'gi')).map((part, i) => (
                    pattern && part.toLowerCase() === pattern.toLowerCase() ? (
                      <span key={i} className="bg-secondary/30 text-secondary border border-secondary/50 px-1 rounded shadow-[0_0_5px_rgba(123,208,255,0.3)] font-bold">
                        {part}
                      </span>
                    ) : <span key={i}>{part}</span>
                  ))}
               </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReverseView;
