'use client';

import { ChangeEvent, useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { useAuth } from '@/lib/auth-client';
import { readStored, writeStored } from '@/lib/clientStorage';

type LocalGoal = { id: string; title: string; note: string; completed: boolean };

export default function BackupControls() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<'export' | 'import' | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const exportData = async () => {
    setBusy('export');
    setMessage('');
    setError('');
    try {
      const response = await fetch('/api/backup', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Export failed.');
      const payload = { ...data, goals: readStored<LocalGoal[]>('goals', [], user.id) };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `habitly-backup-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setMessage('Backup downloaded.');
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'Export failed.');
    } finally {
      setBusy(null);
    }
  };

  const importData = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy('import');
    setMessage('');
    setError('');
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error('Backup files must be smaller than 10 MB.');
      const payload = JSON.parse(await file.text());
      const response = await fetch('/api/backup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Import failed.');
      if (Array.isArray(payload.goals)) writeStored('goals', payload.goals, user.id);
      setMessage(`Restored ${data.habitsImported} habits, ${data.logsImported} check-ins, and ${data.timerLogsImported} focus sessions.`);
      window.setTimeout(() => window.location.reload(), 900);
    } catch (importError) {
      setError(importError instanceof SyntaxError ? 'That file is not valid JSON.' : importError instanceof Error ? importError.message : 'Import failed.');
    } finally {
      setBusy(null);
    }
  };

  return <div className="relative flex items-center gap-1"><button type="button" onClick={() => void exportData()} disabled={busy !== null} className="hidden items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-xs font-semibold text-ink transition hover:border-accent/40 sm:flex"><Download size={14} />{busy === 'export' ? 'Exporting…' : 'Export'}</button><button type="button" onClick={() => fileInputRef.current?.click()} disabled={busy !== null} className="grid h-9 w-9 place-items-center rounded-xl border border-line bg-surface text-muted transition hover:border-accent/40 hover:text-ink" aria-label="Import backup"><Upload size={15} /></button><input ref={fileInputRef} type="file" accept="application/json,.json" onChange={importData} className="hidden" />{(message || error) && <span role="status" className={`absolute right-0 top-11 z-20 w-64 rounded-xl border px-3 py-2 text-xs shadow-lg ${error ? 'border-[#e4c9c5] bg-[#fff8f7] text-danger' : 'border-line bg-surface text-muted'}`}>{error || message}</span>}</div>;
}
