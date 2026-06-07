import { useState } from 'react';
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

  const samples: Record<string, string> = {
    c: `int main() {
    int a = 10;
    int b = 20;
    if (a > b) {
        return 1;
    }
    return 0;
}`,
    asm: `section .text
global _start
_start:
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
    return 0`
  };

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    setCode(samples[lang] || '');
  };

  const handleGlobalAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      await axios.post('http://localhost:8000/api/analyze/all', { code, language });
      alert(`Analysis complete for ${language.toUpperCase()} code!`);
    } catch (error) {
      console.error("Global analysis failed", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex flex-col gap-12">
      <header className="flex flex-col gap-4">
        <h1 className="font-headline-lg text-headline-lg text-on-surface">Algorithmic Project Hub</h1>
        <p className="font-body-lg text-on-surface-variant max-w-3xl">Provide your source code once to synchronize analysis across all DAA modules.</p>
      </header>

      {/* Unified Input Section */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-primary-container border border-subtle rounded-xl flex flex-col overflow-hidden shadow-lg">
           <div className="bg-surface-container px-6 py-3 border-b border-subtle flex justify-between items-center">
              <div className="flex items-center gap-4">
                 <span className="font-label-caps text-label-caps text-on-surface font-bold">Source Code</span>
                 <select 
                   value={language}
                   onChange={(e) => handleLanguageChange(e.target.value)}
                   className="bg-bg-deep border border-subtle rounded px-2 py-1 text-[10px] font-code-sm text-secondary outline-none focus:border-secondary transition-colors"
                 >
                   <option value="c">C / C++</option>
                   <option value="asm">x86 Assembly</option>
                   <option value="python">Python</option>
                 </select>
              </div>
              <span className="text-[10px] text-on-surface-variant italic">{language.toUpperCase()} detected</span>
           </div>
           <textarea 
             value={code}
             onChange={(e) => setCode(e.target.value)}
             className="w-full h-64 bg-bg-deep p-6 font-code-md text-code-md text-primary outline-none resize-none custom-scrollbar"
           />
        </div>

        <div className="bg-primary-container border border-subtle rounded-xl flex flex-col overflow-hidden shadow-lg">
           <div className="bg-surface-container px-6 py-3 border-b border-subtle flex justify-between items-center">
              <span className="font-label-caps text-label-caps text-on-surface font-bold">Binary Hex Stream</span>
              <span className="text-[10px] text-on-surface-variant italic">Hexadecimal only</span>
           </div>
           <textarea 
             value={hexData}
             onChange={(e) => setHexData(e.target.value.replace(/[^0-9a-fA-F]/g, ''))}
             className="w-full h-64 bg-bg-deep p-6 font-code-md text-code-md text-warning-amber outline-none resize-none custom-scrollbar"
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
          {isAnalyzing ? 'Analyzing...' : 'Synchronize Analysis'}
        </button>
      </div>

      {/* Module Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {modules.map(mod => (
          <div key={mod.title} onClick={() => navigate(mod.path)} className="bg-surface-container border border-subtle p-6 rounded-lg cursor-pointer hover:border-secondary transition-all group">
            <span className={`material-symbols-outlined text-4xl mb-4 group-hover:scale-110 transition-transform ${mod.color}`}>{mod.icon}</span>
            <h3 className="font-headline-sm text-on-surface mb-1">{mod.title}</h3>
            <div className={`font-code-sm text-xs ${mod.color}`}>{mod.complexity}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
