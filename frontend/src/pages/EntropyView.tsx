import { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useCode } from '../context/CodeContext';

const EntropyView = () => {
  const { hexData, code, language } = useCode();
  const [windowSize, setWindowSize] = useState(64);
  const [threshold, setThreshold] = useState(7.2);
  const [isScanning, setIsScanning] = useState(false);
  const [entropyData, setEntropyData] = useState<{ offset: number; value: number }[]>([]);
  const [localHex, setLocalHex] = useState('');

  // Use global hexData or global code if language is hex
  const activeHex = useMemo(() => {
    if (localHex) return localHex;
    if (language === 'hex') return code;
    return hexData;
  }, [localHex, hexData, code, language]);

  const handleScan = async () => {
    setIsScanning(true);
    try {
      const response = await axios.post('http://localhost:8000/api/entropy/scan', {
        data: activeHex.replace(/\s/g, ''),
        window_size: windowSize
      });
      
      const rawValues = response.data.entropy_values;
      // PERFORMANCE FIX: Decimate data if it's too large for Recharts (max 1000 points)
      const MAX_POINTS = 1000;
      let processedData = [];
      
      if (rawValues.length > MAX_POINTS) {
        const step = Math.ceil(rawValues.length / MAX_POINTS);
        for (let i = 0; i < rawValues.length; i += step) {
          processedData.push({
            offset: i,
            value: rawValues[i]
          });
        }
      } else {
        processedData = rawValues.map((v: number, i: number) => ({
          offset: i,
          value: v
        }));
      }
      
      setEntropyData(processedData);
    } catch (error) {
      console.error("Scan failed", error);
    } finally {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    if (activeHex) handleScan();
  }, [activeHex, windowSize]);

  const hexRows = useMemo(() => {
    const rows = [];
    const bytesPerRow = 16;
    const cleanHex = activeHex.replace(/\s/g, '');
    const bytes = cleanHex.match(/.{1,2}/g) || [];
    
    // PERFORMANCE FIX: Limit preview to first 1000 rows to prevent DOM bloat
    const displayLimit = 16 * 1000; 
    for (let i = 0; i < Math.min(bytes.length, displayLimit); i += bytesPerRow) {
      const rowBytes = bytes.slice(i, i + bytesPerRow);
      const offset = (i).toString(16).padStart(8, '0').toUpperCase();
      const hexPart = rowBytes.join(' ');
      const asciiPart = rowBytes.map(b => {
        const charCode = parseInt(b, 16);
        return (charCode >= 32 && charCode <= 126) ? String.fromCharCode(charCode) : '.';
      }).join('');
      rows.push({ offset, hexPart, asciiPart });
    }
    return rows;
  }, [activeHex]);

  return (
    <div className="flex flex-col h-full gap-6">
      <header className="flex justify-between items-end border-b border-subtle pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-secondary">analytics</span>
            <h1 className="font-headline-lg text-headline-lg text-on-surface">Entropy Scanner</h1>
          </div>
          <p className="font-body-md text-on-surface-variant max-w-2xl">
            Locate packed or encrypted data segments using localized Shannon entropy analysis. Analyzing <span className="text-warning-amber">Binary Payload</span>.
          </p>
        </div>
        <div className="flex gap-4">
           <div className="text-right">
             <div className="font-label-caps text-[10px] text-on-surface-variant">Scanning Algorithm</div>
             <div className="font-code-sm text-tertiary">O(N) Optimized</div>
           </div>
        </div>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-9 bg-primary-container border border-subtle rounded-xl p-6 min-h-[400px] flex flex-col shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-headline-sm text-headline-sm text-on-surface">Entropy Profile H(X)</h2>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                 <div className="w-3 h-3 bg-secondary rounded-full"></div>
                 <span className="text-[10px] font-label-caps text-on-surface-variant">Shannon Entropy</span>
              </div>
            </div>
          </div>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={entropyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                <XAxis 
                  dataKey="offset" 
                  stroke="#94A3B8" 
                  fontSize={10} 
                  tickFormatter={(val) => `0x${val.toString(16)}`}
                />
                <YAxis stroke="#94A3B8" fontSize={10} domain={[0, 8]} ticks={[0, 2, 4, 6, 8]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '8px' }}
                  itemStyle={{ color: '#7BD0FF' }}
                  labelFormatter={(val) => `Byte Offset: 0x${val.toString(16)}`}
                />
                <ReferenceLine y={threshold} stroke="#EF4444" strokeDasharray="3 3" label={{ position: 'right', value: 'Threshold', fill: '#EF4444', fontSize: 10 }} />
                <Line type="monotone" dataKey="value" stroke="#7BD0FF" strokeWidth={2} dot={false} animationDuration={500} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-3 flex flex-col gap-6">
          <div className="bg-surface-container border border-subtle rounded-xl p-6 flex flex-col gap-6 h-full shadow-lg">
            <h3 className="font-label-caps text-xs font-bold text-on-surface border-b border-subtle pb-2">Analysis Settings</h3>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="font-label-caps text-[10px] text-on-surface-variant flex justify-between uppercase">
                  <span>Window Size</span>
                  <span className="text-secondary">{windowSize} B</span>
                </label>
                <input type="range" min="32" max="512" step="32" value={windowSize} onChange={(e) => setWindowSize(parseInt(e.target.value))} className="w-full h-1 bg-bg-deep rounded-lg appearance-none cursor-pointer accent-secondary" />
              </div>

              <div className="space-y-2">
                <label className="font-label-caps text-[10px] text-on-surface-variant flex justify-between uppercase">
                  <span>Threshold</span>
                  <span className="text-alert-red">{threshold.toFixed(2)}</span>
                </label>
                <input type="range" min="4" max="8" step="0.1" value={threshold} onChange={(e) => setThreshold(parseFloat(e.target.value))} className="w-full h-1 bg-bg-deep rounded-lg appearance-none cursor-pointer accent-alert-red" />
              </div>
            </div>

            <div className="mt-auto flex flex-col gap-3">
              <button 
                onClick={handleScan}
                disabled={isScanning}
                className="w-full bg-secondary text-on-secondary font-label-caps text-xs py-3 rounded-lg font-bold hover:scale-105 active:scale-95 transition-all flex justify-center items-center gap-2 shadow-lg shadow-secondary/20 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-sm">{isScanning ? 'sync' : 'refresh'}</span>
                {isScanning ? 'Recalculating...' : 'Refresh Scan'}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-primary-container border border-subtle rounded-xl flex flex-col overflow-hidden shadow-2xl">
        <div className="px-6 py-3 border-b border-subtle bg-surface-container flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-on-surface-variant">data_object</span>
            <h2 className="font-headline-sm text-headline-sm text-on-surface uppercase tracking-tight text-xs font-bold">Data Stream Preview</h2>
          </div>
          <div className="text-[10px] text-on-surface-variant italic">
             {activeHex ? `Payload: ${(activeHex.replace(/\s/g, '').length / 2).toFixed(0)} bytes` : 'Waiting for payload...'}
          </div>
        </div>
        <div className="p-6 font-code-md text-code-md bg-[#020617] max-h-[350px] overflow-y-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="text-on-surface-variant opacity-40 select-none border-b border-subtle">
              <tr>
                <th className="py-2 font-normal w-28 text-[10px]">OFFSET</th>
                <th className="py-2 font-normal tracking-widest pl-4 text-[10px]">00 01 02 03 04 05 06 07  08 09 0A 0B 0C 0D 0E 0F</th>
                <th className="py-2 font-normal pl-8 text-[10px]">ASCII</th>
              </tr>
            </thead>
            <tbody className="text-on-surface font-code-md text-[11px]">
              {hexRows.map((row, i) => (
                <tr key={i} className="hover:bg-surface-container-low transition-colors group">
                  <td className="text-on-surface-variant/60 select-none py-1 align-top group-hover:text-secondary">{row.offset}</td>
                  <td className="pl-4 tracking-widest align-top whitespace-pre text-primary/80 group-hover:text-primary">{row.hexPart}</td>
                  <td className="pl-8 text-on-surface-variant/60 opacity-70 whitespace-pre align-top font-sans group-hover:text-on-surface">{row.asciiPart}</td>
                </tr>
              ))}
              {hexRows.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-12 text-center text-on-surface-variant italic">
                    No payload data active. Please synchronize from the Dashboard.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default EntropyView;
