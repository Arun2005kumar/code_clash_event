'use client';

// components/round3/VaultEntry.tsx
import { useState } from 'react';
import { validateVaultPasswordServer } from '@/lib/round3/vault';
import { Round3MissionAttempt } from '@/types';
import { toast } from 'sonner';

interface VaultEntryProps {
  teamId: string;
  attempts: Round3MissionAttempt[];
  onSuccess: () => void;
}

export default function VaultEntry({ teamId, attempts, onSuccess }: VaultEntryProps) {
  const [passcode, setPasscode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const clueMap = new Map<number, string>();
  attempts.forEach(a => {
    if (a.is_correct && a.clue_piece_revealed) {
      clueMap.set(a.mission_number, a.clue_piece_revealed);
    }
  });

  const clues = [
    clueMap.get(1) ?? 'CANDLE',
    clueMap.get(2) ?? '30',
    clueMap.get(3) ?? '3',
    clueMap.get(4) ?? '4',
    clueMap.get(5) ?? '8',
  ];

  const handleCrackVault = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) return;
    setLoading(true);
    setErrorMsg('');

    const res = await validateVaultPasswordServer(teamId, passcode);
    setLoading(false);

    if (res.is_correct) {
      toast.success('>> ACCESS GRANTED << Vault Cracked!');
      onSuccess();
    } else {
      setErrorMsg('Wrong passcode! Passcode attempt recorded. Read clues carefully and try again.');
      toast.error('Wrong password! Access denied.');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg mt-space-sm">
      <div className="lg:col-span-12 flex flex-col gap-space-lg">
        {/* VAULT VISUAL CORE CARD */}
        <div className="relative bg-surface-card rounded-xl p-space-lg overflow-hidden shadow-md border-2 border-ink-primary">
          {/* Ambient circles */}
          <div className="absolute -right-16 -top-16 w-56 h-56 bg-tertiary-fixed-dim/40 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-primary-fixed-dim/40 rounded-full blur-2xl pointer-events-none" />

          {/* Terminal Bar */}
          <div className="flex items-center justify-between pb-space-sm border-b-2 border-surface-muted">
            <div className="flex items-center gap-space-xs">
              <span className="w-3 h-3 rounded-full bg-status-wrong" />
              <span className="w-3 h-3 rounded-full bg-currency-gold" />
              <span className="w-3 h-3 rounded-full bg-status-correct" />
              <span className="ml-space-sm font-label-sticker text-label-sticker text-ink-secondary">
                SYS://VAULT_ROOT/CORE_LOCK_v3.4
              </span>
            </div>
            <span className="font-label-sticker text-label-sticker text-round-3-purple px-space-sm py-0.5 bg-tertiary-fixed rounded border border-ink-primary font-bold">
              FIREWALL BRIDGED
            </span>
          </div>

          {/* VAULT ILLUSTRATION CENTERPIECE */}
          <div className="my-space-md py-space-lg flex flex-col items-center justify-center relative">
            <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-round-3-purple/10 animate-pulse" />
              <svg className="w-full h-full text-round-3-purple drop-shadow-md" fill="none" viewBox="0 0 320 320" xmlns="http://www.w3.org/2000/svg">
                <circle cx="160" cy="160" fill="#FAF8FF" r="145" stroke="currentColor" strokeWidth="8" />
                <circle cx="160" cy="25" fill="#8B5CF6" r="7" />
                <circle cx="255" cy="65" fill="#8B5CF6" r="7" />
                <circle cx="295" cy="160" fill="#8B5CF6" r="7" />
                <circle cx="255" cy="255" fill="#8B5CF6" r="7" />
                <circle cx="160" cy="295" fill="#8B5CF6" r="7" />
                <circle cx="65" cy="255" fill="#8B5CF6" r="7" />
                <circle cx="25" cy="160" fill="#8B5CF6" r="7" />
                <circle cx="65" cy="65" fill="#8B5CF6" r="7" />
                <circle cx="160" cy="160" fill="#EAEDFF" r="110" stroke="#004AC6" strokeDasharray="14 8" strokeWidth="4" />
                <circle cx="160" cy="160" fill="#F3EFEA" r="78" stroke="#0F172A" strokeWidth="5" />
                <path d="M160 86V100" stroke="#0F172A" strokeLinecap="round" strokeWidth="5" />
                <path d="M160 220V234" stroke="#0F172A" strokeLinecap="round" strokeWidth="5" />
                <path d="M86 160H100" stroke="#0F172A" strokeLinecap="round" strokeWidth="5" />
                <path d="M220 160H234" stroke="#0F172A" strokeLinecap="round" strokeWidth="5" />
                <circle cx="160" cy="160" fill="#8B5CF6" r="44" />
                <circle cx="160" cy="160" fill="#7D4CE7" r="26" stroke="#FAF8FF" strokeWidth="3" />
                <rect fill="#FAF8FF" height="96" rx="4" width="8" x="156" y="112" />
                <rect fill="#FAF8FF" height="8" rx="4" width="96" x="112" y="156" />
                <circle cx="160" cy="155" fill="#FAF8FF" r="7" />
                <path d="M156 157L154 171H166L164 157Z" fill="#FAF8FF" />
              </svg>

              <span className="absolute -top-3 right-6 bg-round-3-pink text-on-primary px-space-sm py-0.5 rounded-full font-label-sticker text-label-sticker rotate-6 shadow-sm border border-ink-primary font-bold">
                [SHA-256 VAULT]
              </span>
              <span className="absolute -bottom-2 left-6 bg-currency-gold text-on-secondary-fixed px-space-sm py-0.5 rounded-full font-label-sticker text-label-sticker -rotate-3 shadow-sm border border-ink-primary font-bold">
                🔑 MASTER CYLINDER
              </span>
            </div>

            <div className="text-center mt-space-lg">
              <h1 className="font-headline-lg text-headline-lg text-ink-primary tracking-tight font-black uppercase">
                THE DIGITAL VAULT
              </h1>
              <p className="font-body-md text-body-md text-ink-secondary mt-space-xs max-w-lg">
                Five clues collected across the campus infiltration. Combine your team intelligence to decrypt and breach the mainframe master lock.
              </p>
            </div>
          </div>

          {/* COLLECTED CLUE DOCK (5 TACTILE PIECES) */}
          <div className="mt-space-md pt-space-md bg-surface-muted rounded-xl p-space-md border-2 border-ink-primary">
            <div className="flex items-center justify-between mb-space-sm">
              <div className="flex items-center gap-space-xs font-label-sticker text-label-sticker text-ink-primary uppercase tracking-wider font-bold">
                <span className="material-symbols-outlined text-[16px] text-tertiary">inventory_2</span>
                <span>COLLECTED CLUE DOCK (5/5 ACQUIRED)</span>
              </div>
              <span className="font-label-sticker text-label-sticker text-status-correct px-space-xs py-0.5 bg-surface-card rounded border border-ink-primary font-bold">
                CIPHER READY
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-space-sm">
              {clues.map((clue, idx) => (
                <div key={idx} className="bg-surface-card rounded-lg p-space-sm flex flex-col justify-between shadow-sm border-2 border-ink-primary">
                  <div className="flex items-center justify-between text-ink-secondary font-bold text-[10px]">
                    <span>#0{idx + 1}</span>
                    <span className="material-symbols-outlined text-[14px] text-status-correct">check_circle</span>
                  </div>
                  <div className="my-space-xs text-center">
                    <span className="font-headline-sm text-headline-sm text-ink-primary font-black">
                      {clue}
                    </span>
                  </div>
                  <span className="font-label-sticker text-[9px] text-ink-secondary truncate uppercase font-bold text-center">
                    STAGE {idx + 1} CLUE
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* INPUT INTERACTION ZONE */}
          <form onSubmit={handleCrackVault} className="mt-space-lg bg-surface-container-low rounded-xl p-space-lg border-2 border-ink-primary flex flex-col gap-space-md">
            <div className="flex items-center justify-between">
              <label className="font-headline-sm text-headline-sm text-ink-primary flex items-center gap-space-xs font-black">
                <span className="material-symbols-outlined text-round-3-purple text-[22px]">terminal</span>
                ENTER VAULT MASTER PASSWORD
              </label>
              <span className="font-label-sticker text-label-sticker text-ink-secondary bg-surface-card px-space-sm py-0.5 rounded-full border border-ink-primary font-bold">
                UPPERCASE FORMAT
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-space-sm">
              <input
                type="text"
                value={passcode}
                onChange={e => setPasscode(e.target.value.toUpperCase())}
                placeholder="ENTER MASTER PASSWORD"
                className="flex-1 px-space-md py-space-sm bg-surface-card rounded-xl font-label-code text-headline-sm text-ink-primary tracking-widest uppercase focus:outline-none border-2 border-ink-primary shadow-inner"
              />
              <button
                type="submit"
                disabled={loading || !passcode.trim()}
                className="px-space-lg py-space-sm bg-round-3-purple hover:bg-tertiary-container text-on-tertiary rounded-xl font-headline-sm text-headline-sm font-black flex items-center justify-center gap-space-xs shadow-[3px_3px_0px_#0F172A] border-2 border-ink-primary disabled:opacity-50 transition-all cursor-pointer whitespace-nowrap"
              >
                <span>{loading ? 'BREACHING...' : 'CRACK THE VAULT'}</span>
                <span className="text-[20px]">🔓</span>
              </button>
            </div>

            {errorMsg && (
              <div className="p-space-sm bg-status-wrong/10 text-status-wrong rounded-lg font-label-sticker text-label-sticker font-bold border border-status-wrong/30">
                ⚠️ {errorMsg}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
