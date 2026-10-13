import { useState, useEffect, useSyncExternalStore } from 'react';
import BottomNav from './components/BottomNav';
import LogTab from './components/LogTab';
import AnalyticsTab from './components/AnalyticsTab';
import CalculatorTab from './components/CalculatorTab';
import SettingsTab from './components/SettingsTab';
import BackupReminder from './components/BackupReminder';
import { useSettings } from './hooks';

// Settings lives at #settings, so the phone's back button closes it.
const subscribeHash = (cb) => {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
};

// Status-bar colour per theme.
const BAR = { dark: '#09090b', light: '#fafafa', midnight: '#0a0a14' };
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', BAR[theme] ?? BAR.dark);
}

export default function App() {
  const [tab, setTab] = useState('log');
  const inSettings = useSyncExternalStore(subscribeHash, () => location.hash === '#settings');
  const { theme, lastBackup, loaded } = useSettings();
  useEffect(() => {
    if (!loaded) return;
    applyTheme(theme);
    localStorage.setItem('theme', theme); // read by index.html before React starts, so there's no flash
  }, [theme, loaded]);

  return (
    <div className="flex flex-col h-[100svh] bg-zinc-950 text-zinc-100">
      {loaded && <BackupReminder lastBackup={lastBackup} />}
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
