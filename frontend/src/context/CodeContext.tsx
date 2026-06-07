import { useState, createContext, useContext, type ReactNode } from 'react';

interface CodeContextType {
  code: string;
  setCode: (code: string) => void;
  hexData: string;
  setHexData: (hex: string) => void;
  language: string;
  setLanguage: (lang: string) => void;
}

const CodeContext = createContext<CodeContextType | undefined>(undefined);

export const CodeProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState('c');
  const [code, setCode] = useState(`int main() {
    int a = 10;
    int b = 20;
    if (a > b) {
        return 1;
    }
    return 0;
}`);
  const [hexData, setHexData] = useState('4D5A90000300000004000000FFFF0000B8000000000000004000000000000000');

  return (
    <CodeContext.Provider value={{ code, setCode, hexData, setHexData, language, setLanguage }}>
      {children}
    </CodeContext.Provider>
  );
};

export const useCode = () => {
  const context = useContext(CodeContext);
  if (!context) throw new Error('useCode must be used within a CodeProvider');
  return context;
};
