import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import CFGView from './pages/CFGView';
import PolyView from './pages/PolyView';
import ASTView from './pages/ASTView';
import EntropyView from './pages/EntropyView';
import { CodeProvider } from './context/CodeContext';

function App() {
  return (
    <CodeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="cfg" element={<CFGView />} />
            <Route path="poly" element={<PolyView />} />
            <Route path="ast" element={<ASTView />} />
            <Route path="entropy" element={<EntropyView />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </CodeProvider>
  );
}

export default App;
