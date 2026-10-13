import { exportData, saveSetting, todayStr } from './db';

/**
 * Saves a full backup: the share sheet on phones (pick OneDrive, Drive, ...), a download elsewhere. Returns true when saved.
 * The file is .txt (JSON inside) because Android's share sheet refuses .json files.
 */
export async function saveBackup() {
  const file = new File([JSON.stringify(await exportData())], `ledger-backup-${todayStr()}.txt`, { type: 'text/plain' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: file.name });
    } catch (err) {
      if (err.name === 'AbortError') return false; // user closed the share sheet
      download(file); // sharing blocked (e.g. lost tap permission): fall back to a download
    }
  } else {
    download(file);
  }
  await saveSetting('lastBackup', todayStr());
  return true;
}

function download(file) {
  const url = URL.createObjectURL(file);
  Object.assign(document.createElement('a'), { href: url, download: file.name }).click();
  setTimeout(() => URL.revokeObjectURL(url), 60000); // revoking right away cancels the download on Android
}
