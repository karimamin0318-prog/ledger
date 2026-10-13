import { useState } from 'react';
import BottomNav from './components/BottomNav';
import LogTab from './components/LogTab';
import AnalyticsTab from './components/AnalyticsTab';
import CalculatorTab from './components/CalculatorTab';
import ImportTab from './components/ImportTab';

export default function App() {
  const [tab, setTab] = useState('log');

  return (
    <div className="flex flex-col h-[100svh] bg-black text-zinc-100">
      {tab === 'log' && <LogTab />}
      {tab === 'analytics' && <AnalyticsTab />}
      {tab === 'goal' && <CalculatorTab />}
      {tab === 'import' && <ImportTab />}
      <BottomNav active={tab} onChange={setTab} />
    </div>
  );
}
