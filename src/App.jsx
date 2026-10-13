import { useState, useEffect, useSyncExternalStore } from 'react';
import BottomNav from './components/BottomNav';
import LogTab from './components/LogTab';
import AnalyticsTab from './components/AnalyticsTab';
import CalculatorTab from './components/CalculatorTab';
import SettingsTab from './components/SettingsTab';
import { useSettings } from './useSettings';

// Settings lives at #settings, so the phone's back button closes it.
const subscribeHash = (cb) => {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
};

export default function App() {
  const [tab, setTab] = useState('log');
  const inSettings = useSyncExternalStore(subscribeHash, () => location.hash === '#settings');
  const { theme } = useSettings();
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <div className="flex flex-col h-[100svh] bg-zinc-950 text-zinc-100">
      {inSettings ? (
        <SettingsTab />
      ) : (
        <>
          {tab === 'log' && <LogTab />}
          {tab === 'analytics' && <AnalyticsTab />}
          {tab === 'goal' && <CalculatorTab />}
          <BottomNav active={tab} onChange={setTab} />
        </>
      )}
    </div>
  );
}
