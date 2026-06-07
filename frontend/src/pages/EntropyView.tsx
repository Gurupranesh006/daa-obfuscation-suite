import { useState, useMemo } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

const EntropyView = () => {
  const [windowSize, setWindowSize] = useState(64);
  const [threshold, setThreshold] = useState(7.2);
  const [isScanning, setIsScanning] = useState(false);
  const [entropyData, setEntropyData] = useState<{ offset: number; value: number }[]>([]);
  const [hexData, setHexData] = useState('');

  // Generate some sample data if none exists
  const generateSampleData = () => {
    let data = "";
    // 512 bytes of low entropy (structured code-like)
    for (let i = 0; i < 512; i++) {
      data += Math.floor(Math.random() * 20 + 32).toString(16).padStart(2, '0');
    }
    // 256 bytes of high entropy (encrypted/packed)
    for (let i = 0; i < 256; i++) {
      data += Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
    }
    // 256 bytes of low entropy
    for (let i = 0; i < 256; i++) {
      data += Math.floor(Math.random() * 20 + 32).toString(16).padStart(2, '0');
    }
    setHexData(data.toUpperCase());
  };

  const handleScan = async () => {
    if (!hexData) generateSampleData();
    setIsScanning(true);
    try {
      const response = await axios.post('http://localhost:8000/api/entropy/scan', {
        data: hexData || "00".repeat(1024), // fallback
        window_size: windowSize
      });
      const processedData = response.data.entropy_values.map((v: number, i: number) => ({
        offset: i,
        value: v
      }));
      setEntropyData(processedData);
    } catch (error) {
      console.error("Scan failed", error);
    } finally {
      setIsScanning(false);
    }
  };

  const hexRows = useMemo(() => {
    const rows = [];
    const bytesPerRow = 16;
    const bytes = hexData.match(/.{1,2}/g) || [];
    for (let i = 0; i < Math.min(bytes.length, 128); i += bytesPerRow) {
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
  }, [hexData]);

  return (
    <div className="flex flex-col h-full gap-6">
      <header className="flex justify-between items-end border-b border-subtle pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-secondary">analytics</span>
            <h1 className="font-headline-lg text-headline-lg text-on-surface">Entropy Scanner</h1>
          </div>
          <p className="font-body-md text-on-surface-variant max-w-2xl">
            Locate packed or encrypted data segments using localized Shannon entropy analysis in <span className="text-tertiary">O(N)</span> time.
          </p>
        </div>
        <div className="flex gap-4">
           <div className="text-right">
             <div className="font-label-caps text-label-caps text-on-surface-variant">Complexity</div>
             <div className="font-code-sm text-tertiary">O(N) Optimized</div>
           </div>
        </div>
      </header>

      {/* Top Section: Visualization & Controls */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-9 bg-primary-container border border-subtle rounded-lg p-6 min-h-[400px] flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-headline-sm text-headline-sm text-on-surface">Entropy Profile</h2>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                 <div className="w-3 h-3 bg-secondary rounded-full"></div>
                 <span className="text-code-sm text-on-surface-variant">Entropy H(X)</span>
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
                <YAxis 
                  stroke="#94A3B8" 
                  fontSize={10} 
                  domain={[0, 8]}
                  ticks={[0, 2, 4, 6, 8]}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '4px' }}
                  itemStyle={{ color: '#7BD0FF' }}
                  labelFormatter={(val) => `Offset: 0x${val.toString(16)}`}
                />
                <ReferenceLine y={threshold} stroke="#EF4444" strokeDasharray="3 3" label={{ position: 'right', value: 'Threshold', fill: '#EF4444', fontSize: 10 }} />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#7BD0FF" 
                  strokeWidth={2} 
                  dot={false}
                  animationDuration={500}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sidebar Controls */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          <div className="bg-primary-container border border-subtle rounded-lg p-6 flex flex-col gap-6 h-full">
            <h3 className="font-label-caps text-label-caps text-on-surface border-b border-subtle pb-2">Scanner Settings</h3>
            
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="font-label-caps text-label-caps text-on-surface-variant flex justify-between">
                  <span>Window Size</span>
                  <span className="font-code-sm text-secondary">{windowSize} bytes</span>
                </label>
                <input 
                  type="range" 
                  min="32" max="512" step="32" 
                  value={windowSize} 
                  onChange={(e) => setWindowSize(parseInt(e.target.value))}
                  className="w-full accent-secondary h-1 bg-surface-variant rounded-full appearance-none cursor-pointer" 
                />
              </div>

              <div className="space-y-1">
                <label className="font-label-caps text-label-caps text-on-surface-variant flex justify-between">
                  <span>Threshold</span>
                  <span className="font-code-sm text-alert-red">{threshold.toFixed(2)}</span>
                </label>
                <input 
                  type="range" 
                  min="4" max="8" step="0.1" 
                  value={threshold} 
                  onChange={(e) => setThreshold(parseFloat(e.target.value))}
                  className="w-full accent-alert-red h-1 bg-surface-variant rounded-full appearance-none cursor-pointer" 
                />
              </div>
            </div>

            <div className="mt-auto flex flex-col gap-3">
              <button 
                onClick={handleScan}
                disabled={isScanning}
                className="w-full bg-secondary/10 hover:bg-secondary/20 text-secondary border border-secondary/30 font-label-caps text-label-caps py-3 rounded transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {isScanning ? 'sync' : 'play_arrow'}
                </span>
                {isScanning ? 'Scanning...' : 'Initiate Scan'}
              </button>
              <button 
                onClick={() => { setHexData(''); setEntropyData([]); }}
                className="w-full bg-surface-container hover:bg-surface-variant border border-subtle text-on-surface font-label-caps text-label-caps py-2 rounded transition-colors"
              >
                Clear Data
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Hex View Section */}
      <section className="bg-bg-deep border border-subtle rounded-lg flex flex-col overflow-hidden">
        <div className="px-6 py-3 border-b border-subtle bg-primary-container flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-on-surface-variant">data_object</span>
            <h2 className="font-headline-sm text-headline-sm text-on-surface">Binary Stream Input</h2>
          </div>
          <div className="flex gap-4">
             <button onClick={generateSampleData} className="text-secondary text-code-sm hover:underline">
               {hexData ? 'Regenerate Sample' : 'Load Sample Payload'}
             </button>
          </div>
        </div>
        <div className="p-6 bg-[#020617] border-b border-subtle">
           <label className="font-label-caps text-label-caps text-on-surface-variant mb-2 block">Raw Hex Data</label>
           <textarea 
             value={hexData}
             onChange={(e) => setHexData(e.target.value.replace(/[^0-9a-fA-F]/g, ''))}
             placeholder="Paste hex string here (e.g. 4D5A90...)"
             className="w-full h-24 bg-bg-deep border border-subtle rounded p-3 font-code-md text-code-md text-primary focus:border-secondary outline-none resize-none"
           />
        </div>
        <div className="p-6 font-code-md text-code-md bg-[#020617] max-h-[300px] overflow-y-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="text-on-surface-variant opacity-50 select-none border-b border-subtle">
              <tr>
                <th className="py-2 font-normal w-28">Offset</th>
                <th className="py-2 font-normal tracking-widest pl-4">00 01 02 03 04 05 06 07  08 09 0A 0B 0C 0D 0E 0F</th>
                <th className="py-2 font-normal pl-8">ASCII</th>
              </tr>
            </thead>
            <tbody className="text-on-surface font-code-md">
              {hexRows.map((row, i) => (
                <tr key={i} className="hover:bg-surface-container-low transition-colors">
                  <td className="text-on-surface-variant select-none py-1 align-top">{row.offset}</td>
                  <td className="pl-4 tracking-widest align-top whitespace-pre text-primary">{row.hexPart}</td>
                  <td className="pl-8 text-on-surface-variant opacity-70 whitespace-pre align-top">{row.asciiPart}</td>
                </tr>
              ))}
              {hexRows.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-on-surface-variant italic">
                    No data loaded. Click 'Initiate Scan' or 'Load Sample Payload'.
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
