import { exportData, saveSetting, todayStr } from './db';

/** Saves a full backup: the share sheet on phones (pick OneDrive, Drive, ...), a download elsewhere. Returns true when saved. */
export async function saveBackup() {
  const file = new File([JSON.stringify(await exportData())], `ledger-backup-${todayStr()}.json`, { type: 'application/json' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
    } catch {
      return false; // user closed the share sheet
    }
  } else {
    const url = URL.createObjectURL(file);
    Object.assign(document.createElement('a'), { href: url, download: file.name }).click();
    URL.revokeObjectURL(url);
  }
  await saveSetting('lastBackup', todayStr());
  return true;
}
