import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useCode } from '../context/CodeContext';

const modules = [
  { title: 'CFG Visualizer', path: '/cfg', complexity: 'O(V+E)', color: 'text-secondary', icon: 'account_tree' },
  { title: 'Poly Alignment', path: '/poly', complexity: 'O(M*N)', color: 'text-warning-amber', icon: 'security' },
  { title: 'AST Simplifier', path: '/ast', complexity: 'O(V)', color: 'text-alert-red', icon: 'code' },
  { title: 'Entropy Scanner', path: '/entropy', complexity: 'O(N)', color: 'text-tertiary', icon: 'analytics' },
  { title: 'Reverse Engineering', path: '/re', complexity: 'O(N+M)', color: 'text-secondary', icon: 'settings_backup_restore' }
];

const Dashboard = () => {
  const navigate = useNavigate();
  const { code, setCode, hexData, setHexData, language, setLanguage } = useCode();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const codeFileRef = useRef<HTMLInputElement>(null);
  const hexFileRef = useRef<HTMLInputElement>(null);

  const samples: Record<string, string> = {
    c: `int main() {
    int a = 10;
    int b = 20;
    if (a > b) {
        return 1;
    }
    return 0;
}`,
    asm: `_start:
    mov eax, 10
    cmp eax, 20
    jl  label_low
    mov ebx, 1
    jmp label_end
label_low:
    mov ebx, 0
label_end:
    ret`,
    python: `def main():
    a = 10
    b = 20
    if a > b:
        return 1
    return 0`,
    hex: `55 48 89 E5 B8 0A 00 00 00 39 D0 74 02 EB 02 90 C3`
  };

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    setCode(samples[lang] || '');
  };

  const handleGlobalAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const response = await axios.post('http://localhost:8000/api/analyze/all', { code, language });
      if (language === 'hex' && response.data.disassembled) {
          console.log("Lifted Assembly:", response.data.disassembled);
      }
      alert(`Global analysis complete! All modules synchronized via ${language.toUpperCase()} processing.`);
    } catch (error) {
      console.error("Global analysis failed", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCodeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCode(content);
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'asm' || ext === 's') setLanguage('asm');
      else if (ext === 'py') setLanguage('python');
      else if (ext === 'bin' || ext === 'hex') setLanguage('hex');
      else setLanguage('c');
    };
    reader.readAsText(file);
  };

  const handleHexUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const buffer = event.target?.result as ArrayBuffer;
      const bytes = new Uint8Array(buffer);
      let hex = '';
      for (let i = 0; i < bytes.length; i++) {
        hex += bytes[i].toString(16).padStart(2, '0').toUpperCase() + ' ';
      }
      setHexData(hex.trim());
      // If user uploads binary here, offer to set as main source
      if (window.confirm("Do you want to use this binary payload as the primary source for all analysis modules?")) {
          setCode(hex.trim());
          setLanguage('hex');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="flex flex-col gap-12">
      <header className="flex flex-col gap-4">
        <h1 className="font-headline-lg text-headline-lg text-on-surface">Algorithmic Project Hub</h1>
        <p className="font-body-lg text-on-surface-variant max-w-3xl">Analyze any artifact—Source or Binary—to synchronize deobfuscation routines across all DAA modules.</p>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-primary-container border border-subtle rounded-xl flex flex-col overflow-hidden shadow-lg group">
           <div className="bg-surface-container px-6 py-3 border-b border-subtle flex justify-between items-center">
              <div className="flex items-center gap-4">
                 <span className="font-label-caps text-label-caps text-on-surface font-bold">Primary Source</span>
                 <select 
                   value={language}
                   onChange={(e) => handleLanguageChange(e.target.value)}
                   className="bg-bg-deep border border-subtle rounded px-2 py-1 text-[10px] font-code-sm text-secondary outline-none focus:border-secondary transition-colors"
                 >
                   <option value="c">C / C++</option>
                   <option value="asm">x86 Assembly</option>
                   <option value="python">Python</option>
                   <option value="hex">Raw Hex / Binary</option>
                 </select>
              </div>
              <button 
                onClick={() => codeFileRef.current?.click()}
                className="flex items-center gap-1 text-[10px] text-secondary hover:text-secondary-fixed transition-colors font-label-caps"
              >
                <span className="material-symbols-outlined text-sm">upload_file</span>
                Load Data
              </button>
              <input type="file" ref={codeFileRef} onChange={handleCodeUpload} className="hidden" />
           </div>
           <textarea 
             value={code}
             onChange={(e) => setCode(e.target.value)}
             className="w-full h-64 bg-bg-deep p-6 font-code-md text-code-md text-primary outline-none resize-none custom-scrollbar"
             placeholder={language === 'hex' ? "Paste hex string (e.g. 55 48 89...)" : "Paste code..."}
           />
        </div>

        <div className="bg-primary-container border border-subtle rounded-xl flex flex-col overflow-hidden shadow-lg group">
           <div className="bg-surface-container px-6 py-3 border-b border-subtle flex justify-between items-center">
              <span className="font-label-caps text-label-caps text-on-surface font-bold">Auxiliary Payload</span>
              <button 
                onClick={() => hexFileRef.current?.click()}
                className="flex items-center gap-1 text-[10px] text-warning-amber hover:text-warning-amber/80 transition-colors font-label-caps"
              >
                <span className="material-symbols-outlined text-sm">upload_file</span>
                Extract Binary
              </button>
           </div>
           <textarea 
             value={hexData}
             onChange={(e) => {
               const val = e.target.value;
               // Detect and handle C-style escapes like \x4d\x5a or 0x4d, 0x5a
               if (val.includes('\\x') || val.includes('0x')) {
                 const cleaned = val.match(/[0-9a-fA-F]{2}/g)?.join('') || '';
                 setHexData(cleaned.toUpperCase());
               } else {
                 setHexData(val.replace(/[^0-9a-fA-F\s]/g, ''));
               }
             }}
             className="w-full h-64 bg-bg-deep p-6 font-code-md text-code-md text-warning-amber outline-none resize-none custom-scrollbar"
             placeholder="Extracted binary data (supports \x4D\x5A or raw hex)..."
           />
        </div>
      </section>

      <div className="flex justify-center">
        <button 
          onClick={handleGlobalAnalyze}
          disabled={isAnalyzing}
          className="bg-secondary text-on-secondary px-12 py-4 rounded-full font-label-caps text-label-caps font-bold text-lg hover:scale-105 active:scale-95 transition-all shadow-xl shadow-secondary/20 flex items-center gap-3 disabled:opacity-50"
        >
          <span className="material-symbols-outlined">{isAnalyzing ? 'sync' : 'auto_fix_high'}</span>
          {isAnalyzing ? 'Lifting Payload...' : 'Synchronize Universal Analysis'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {modules.map(mod => (
          <div key={mod.title} onClick={() => navigate(mod.path)} className="bg-surface-container border border-subtle p-5 rounded-lg cursor-pointer hover:border-secondary transition-all group flex flex-col items-center text-center">
            <span className={`material-symbols-outlined text-3xl mb-3 group-hover:scale-110 transition-transform ${mod.color}`}>{mod.icon}</span>
            <h3 className="font-label-caps text-xs font-bold text-on-surface mb-1 truncate w-full">{mod.title}</h3>
            <div className={`font-code-sm text-[9px] ${mod.color}`}>{mod.complexity}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
