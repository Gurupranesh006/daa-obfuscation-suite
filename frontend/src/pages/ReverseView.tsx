import { useState, useEffect } from 'react';
import axios from 'axios';
import { useCode } from '../context/CodeContext';

const ReverseView = () => {
  const { code, language, setHexData } = useCode();
  const [pattern, setPattern] = useState('0xAA');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedHex, setGeneratedHex] = useState('');
  const [displayCode, setDisplayCode] = useState('');
  const [result, setResult] = useState<{ 
    matches: number[]; 
    count: number; 
    algorithm: string; 
    complexity: string; 
  } | null>(null);

  const handleREAnalyze = async () => {
    if (!code) return;
    setIsAnalyzing(true);
    try {
      const response = await axios.post('http://localhost:8000/api/re/analyze', {
        code: code,
        pattern: pattern,
        language: language
      });
      setResult(response.data);
      
      // Also get the display version (lifted ASM if hex)
      const resAll = await axios.post('http://localhost:8000/api/analyze/all', { code, language });
      setDisplayCode(resAll.data.disassembled);
    } catch (error) {
      console.error("RE analysis failed", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerateHex = async () => {
    if (!code) return;
    setIsGenerating(true);
    try {
      const response = await axios.post('http://localhost:8000/api/re/generate-hex', { code });
      setGeneratedHex(response.data.hex);
    } catch (error) {
      console.error("Hex generation failed", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const syncToGlobalHex = () => {
    setHexData(generatedHex.replace(/\s/g, ''));
    alert("Hex payload synchronized to Global Context.");
  };

  useEffect(() => {
    if (code) handleREAnalyze();
  }, [code, language]);

  return (
    <div className="flex flex-col gap-6 h-full">
      <header className="border-b border-subtle pb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="material-symbols-outlined text-secondary">settings_backup_restore</span>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Reverse Engineering</h1>
        </div>
        <p className="font-body-md text-on-surface-variant max-w-2xl">
          {language === 'hex' ? 'Binary Lifting: ' : 'Deobfuscation Suite: '} 
          Pattern matching with <span className="text-tertiary">KMP</span> in <span className="text-tertiary">O(N+M)</span>.
        </p>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-4 flex flex-col gap-6">
           <div className="bg-primary-container border border-subtle rounded-xl flex flex-col overflow-hidden shadow-lg">
              <div className="bg-surface-container border-b border-subtle px-4 py-2 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-sm">find_in_page</span>
                  <span className="font-code-md text-code-md font-bold text-on-surface">Signature Pattern</span>
                </div>
              </div>
              <div className="p-6 bg-[#020617]">
                <input 
                  type="text"
                  value={pattern}
                  onChange={(e) => setPattern(e.target.value)}
                  className="w-full bg-bg-deep border border-subtle rounded px-4 py-2 font-code-md text-primary focus:border-secondary outline-none transition-all mb-4"
                  placeholder="e.g. mov eax"
                />
                <button 
                  onClick={handleREAnalyze}
                  disabled={isAnalyzing}
                  className="w-full bg-secondary text-on-secondary font-label-caps text-label-caps py-2.5 rounded font-bold hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                >
                  Search Signature
                </button>
              </div>
           </div>

           <div className="bg-surface-container border border-subtle rounded-lg p-6 flex-1 shadow-lg">
            <h3 className="font-label-caps text-label-caps text-on-surface-variant mb-4 border-b border-subtle pb-2 uppercase tracking-widest text-xs font-bold">Pattern Metrics</h3>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Matches Found</span>
                <span className={`font-bold ${result && result.count > 0 ? 'text-tertiary' : 'text-on-surface'}`}>
                  {result ? result.count : '--'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Data Mode</span>
                <span className="text-secondary">{language === 'hex' ? 'Lifted Binary' : language.toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Search Algo</span>
                <span className="text-secondary">KMP (DAA)</span>
              </div>
            </div>
          </div>

           <div className="bg-primary-container border border-subtle rounded-xl flex flex-col overflow-hidden shadow-lg">
              <div className="bg-surface-container border-b border-subtle px-4 py-2 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-warning-amber text-sm">memory</span>
                  <span className="font-code-md text-code-md font-bold text-on-surface">Binary Generator</span>
                </div>
              </div>
              <div className="p-6 bg-[#020617] flex flex-col gap-4">
                 <button 
                    onClick={handleGenerateHex}
                    disabled={isGenerating}
                    className="w-full bg-surface-container border border-warning-amber/30 text-warning-amber font-label-caps text-label-caps py-2.5 rounded hover:bg-warning-amber/10 transition-all flex items-center justify-center gap-2"
                 >
                    <span className="material-symbols-outlined text-sm">terminal</span>
                    {isGenerating ? 'Compiling...' : 'LIFT TO HEX'}
                 </button>
                 
                 {generatedHex && (
                   <div className="animate-in slide-in-from-top-2 duration-300">
                      <div className="bg-bg-deep border border-subtle rounded p-3 font-code-sm text-[10px] text-warning-amber/80 max-h-32 overflow-y-auto break-all custom-scrollbar mb-4">
                        {generatedHex}
                      </div>
                      <button 
                        onClick={syncToGlobalHex}
                        className="w-full bg-tertiary/10 text-tertiary border border-tertiary/30 font-label-caps text-[11px] py-2 rounded hover:bg-tertiary/20 transition-all"
                      >
                        Push to Global Scanner
                      </button>
                   </div>
                 )}
              </div>
           </div>
        </div>

        <div className="xl:col-span-8 flex flex-col gap-6">
          <div className="bg-primary-container border border-subtle rounded-xl flex flex-col overflow-hidden min-h-[500px] shadow-2xl">
            <div className="bg-surface-container border-b border-subtle px-4 py-3 flex justify-between items-center">
              <h3 className="font-headline-sm text-headline-sm text-on-surface">
                {language === 'hex' ? 'Lifted Binary View (ASM)' : 'Source Analysis'}
              </h3>
              <div className="flex items-center gap-2">
                 <span className="text-[10px] text-on-surface-variant font-code-sm bg-surface-variant px-2 py-0.5 rounded border border-subtle">
                   KMP Matches: {result ? result.count : 0}
                 </span>
                 <span className="text-[10px] text-on-surface-variant italic font-code-sm uppercase">{language} CONTEXT</span>
              </div>
            </div>
            <div className="flex-1 p-6 bg-bg-deep overflow-auto custom-scrollbar">
               <pre className="font-code-md text-code-md leading-loose text-on-surface whitespace-pre-wrap">
                  {(displayCode || code).split(new RegExp(`(${pattern})`, 'gi')).map((part, i) => (
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
