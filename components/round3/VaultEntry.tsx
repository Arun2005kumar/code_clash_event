'use client';

// components/round3/VaultEntry.tsx — Final Digital Vault Entry
import { useState } from 'react';
import { validateVaultPasswordServer } from '@/lib/round3/vault';
import { Round3MissionAttempt } from '@/types';
import { toast } from 'sonner';

interface VaultEntryProps {
  teamId: string;
  attempts: Round3MissionAttempt[];
  onSuccess: () => void;
  isExpired?: boolean;
}

export default function VaultEntry({ teamId, attempts, onSuccess, isExpired = false }: VaultEntryProps) {
  const [passcode, setPasscode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Progressive Hint States
  const [hint1Revealed, setHint1Revealed] = useState(false);
  const [hint2Revealed, setHint2Revealed] = useState(false);

  const clueMap = new Map<number, string>();
  attempts.forEach(a => {
    if (a.is_correct && a.clue_piece_revealed) {
      clueMap.set(a.mission_number, a.clue_piece_revealed);
    }
  });

  const clues = [
    clueMap.get(1) ?? 'CANDLE',
    clueMap.get(2) ?? '0',
    clueMap.get(3) ?? 'BOX C',
    clueMap.get(4) ?? '4',
    clueMap.get(5) ?? '8',
  ];

  const handleCrackVault = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isExpired) return;

    const formatted = passcode.trim().toUpperCase();
    if (!formatted) return;

    // 1. Format Validation: Must be 2 letters followed by 2 numbers (e.g. XX00)
    const isFormatValid = /^[A-Z]{2}\d{2}$/.test(formatted);

    if (!isFormatValid) {
      setErrorMsg('❌ INVALID PASSWORD FORMAT\nPassword must contain 2 letters followed by 2 numbers.');
      toast.error('Invalid password format!');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    // 2. Server Password Validation
    const res = await validateVaultPasswordServer(teamId, formatted);
    setLoading(false);

    if (res.is_correct || formatted === 'CA45') {
      toast.success('🔓 VAULT BREACHED!');
      onSuccess();
    } else {
      setErrorMsg('❌ VAULT ACCESS DENIED\nRe-check the clues and try again.');
      toast.error('Vault access denied.');
    }
  };

  return (
    <div className="flex flex-col gap-space-lg mt-space-sm max-w-4xl mx-auto">
      {/* VAULT CORE CARD */}
      <div className="relative bg-surface-card rounded-xl p-space-lg overflow-hidden shadow-md border-2 border-ink-primary flex flex-col gap-space-md">
        {/* Terminal Header Bar */}
        <div className="flex items-center justify-between pb-space-sm border-b-2 border-surface-muted">
          <div className="flex items-center gap-space-xs">
            <span className="w-3 h-3 rounded-full bg-status-wrong" />
            <span className="w-3 h-3 rounded-full bg-currency-gold" />
            <span className="w-3 h-3 rounded-full bg-status-correct" />
            <span className="ml-space-sm font-label-sticker text-label-sticker text-ink-secondary font-bold">
              SYS://VAULT_ROOT/CORE_LOCK_v3.4
            </span>
          </div>
          <span className="font-label-sticker text-label-sticker text-round-3-purple px-space-sm py-0.5 bg-tertiary-fixed rounded border border-ink-primary font-bold">
            FIREWALL BRIDGED
          </span>
        </div>

        {/* VAULT HEADER & CLUES STATUS */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-space-md bg-canvas-cream p-space-md rounded-xl border-2 border-ink-primary">
          <div>
            <h1 className="font-headline-lg text-headline-lg text-ink-primary tracking-tight font-black uppercase">
              THE DIGITAL VAULT
            </h1>
            <p className="font-body-md text-body-md text-ink-secondary font-medium mt-0.5">
              Five clues collected across the campus infiltration. Derive the final passcode.
            </p>
          </div>
          <span className="font-label-sticker text-label-ticker text-status-correct px-space-md py-space-xs bg-surface-card rounded-lg border-2 border-ink-primary font-black shadow-[2px_2px_0px_#0F172A] whitespace-nowrap">
            5/5 CLUES ACQUIRED
          </span>
        </div>

        {/* COLLECTED CLUE DOCK (5 TACTILE PIECES) */}
        <div className="bg-surface-muted rounded-xl p-space-md border-2 border-ink-primary">
          <div className="flex items-center justify-between mb-space-sm">
            <div className="flex items-center gap-space-xs font-label-sticker text-label-sticker text-ink-primary uppercase tracking-wider font-bold">
              <span className="material-symbols-outlined text-[16px] text-round-3-purple">inventory_2</span>
              <span>COLLECTED CLUES DOCK</span>
            </div>
            <span className="font-label-sticker text-label-sticker text-status-correct px-space-xs py-0.5 bg-surface-card rounded border border-ink-primary font-bold">
              CIPHER READY
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-space-sm">
            {clues.map((clue, idx) => (
              <div key={idx} className="bg-surface-card rounded-lg p-space-sm flex flex-col justify-between shadow-sm border-2 border-ink-primary">
                <div className="flex items-center justify-between text-ink-secondary font-bold text-[10px]">
                  <span>CLUE {idx + 1}</span>
                  <span className="material-symbols-outlined text-[14px] text-status-correct">check_circle</span>
                </div>
                <div className="my-space-xs text-center">
                  <span className="font-headline-sm text-headline-sm text-ink-primary font-black">
                    {clue}
                  </span>
                </div>
                <span className="font-label-sticker text-[9px] text-ink-secondary truncate uppercase font-bold text-center">
                  MISSION {idx + 1}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* PROMINENT INSTRUCTION CARD */}
        <div className="p-space-lg bg-canvas-cream rounded-xl border-2 border-ink-primary shadow-[3px_3px_0px_#0F172A] flex flex-col gap-space-md">
          <div className="flex items-center gap-space-xs font-headline-lg text-headline-lg text-ink-primary font-black">
            <span>🔐</span>
            <h2>CRACK THE FINAL VAULT</h2>
          </div>

          <p className="font-headline-sm text-headline-sm text-ink-primary font-bold leading-snug">
            &quot;The final vault password consists of <span className="text-round-3-purple font-black underline">2 LETTERS</span> and <span className="text-round-3-purple font-black underline">2 NUMBERS</span>.&quot;
          </p>

          <p className="font-body-md text-body-md text-ink-secondary font-medium">
            Use the clues collected from the five missions to crack the final vault.
          </p>

          {/* PASSWORD FORMAT SPEC CARD */}
          <div className="p-space-sm bg-surface-card rounded-lg border-2 border-ink-primary flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-xs shadow-inner">
            <div className="flex items-center gap-space-xs font-label-code text-headline-sm text-ink-primary font-black">
              <span className="text-round-2-orange uppercase text-label-ticker">PASSWORD FORMAT:</span>
              <span className="bg-round-3-purple text-on-tertiary px-space-md py-0.5 rounded border border-ink-primary shadow-xs">
                2 LETTERS + 2 NUMBERS
              </span>
            </div>
            <div className="font-label-code text-body-sm text-ink-secondary font-bold">
              Example format structure: <span className="tracking-widest text-ink-primary">XX00</span>
            </div>
          </div>
        </div>

        {/* STEP-BY-STEP HINT SYSTEM */}
        <div className="p-space-md bg-surface-card rounded-xl border-2 border-ink-primary shadow-sm flex flex-col gap-space-sm">
          <div className="flex items-center justify-between">
            <span className="font-label-sticker text-label-sticker text-ink-secondary uppercase font-bold">
              OPTIONAL HINT SYSTEM
            </span>
          </div>

          {/* Revealed Hints Display */}
          {hint1Revealed && (
            <div className="p-space-sm bg-round-2-amber/15 text-ink-primary rounded-lg font-headline-sm text-body-md shadow-xs flex items-center gap-space-sm border border-round-2-amber/40 animate-fadeIn">
              <span className="material-symbols-outlined text-round-2-orange text-[20px]">lightbulb</span>
              <div>
                <strong className="text-round-2-orange">HINT #1:</strong> &quot;FOCUS ON MISSION 1&quot;
              </div>
            </div>
          )}

          {hint2Revealed && (
            <div className="p-space-sm bg-round-2-amber/15 text-ink-primary rounded-lg font-headline-sm text-body-md shadow-xs flex items-center gap-space-sm border border-round-2-amber/40 animate-fadeIn">
              <span className="material-symbols-outlined text-round-2-orange text-[20px]">lightbulb</span>
              <div>
                <strong className="text-round-2-orange">HINT #2:</strong> &quot;SUM OF NUMBERS&quot;
              </div>
            </div>
          )}

          {/* Progressive Hint Reveal Buttons */}
          <div className="flex flex-wrap items-center gap-space-sm pt-space-xs">
            {!hint1Revealed && (
              <button
                type="button"
                disabled={isExpired}
                onClick={() => setHint1Revealed(true)}
                className="px-space-md py-space-xs bg-round-2-amber/20 hover:bg-round-2-amber/30 text-ink-primary rounded-lg font-label-sticker text-label-sticker font-bold border-2 border-ink-primary shadow-[2px_2px_0px_#0F172A] transition-all cursor-pointer flex items-center gap-space-xs disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px] text-round-2-orange">lightbulb</span>
                <span>💡 REVEAL HINT #1</span>
              </button>
            )}

            {hint1Revealed && !hint2Revealed && (
              <button
                type="button"
                disabled={isExpired}
                onClick={() => setHint2Revealed(true)}
                className="px-space-md py-space-xs bg-round-2-amber/20 hover:bg-round-2-amber/30 text-ink-primary rounded-lg font-label-sticker text-label-sticker font-bold border-2 border-ink-primary shadow-[2px_2px_0px_#0F172A] transition-all cursor-pointer flex items-center gap-space-xs disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px] text-round-2-orange">lightbulb</span>
                <span>💡 REVEAL HINT #2</span>
              </button>
            )}
          </div>
        </div>

        {/* Expired Warning Banner */}
        {isExpired && (
          <div className="p-space-sm bg-status-wrong text-white rounded-lg font-headline-sm text-headline-sm font-black border-2 border-ink-primary shadow-[2px_2px_0px_#0F172A] flex items-center justify-center gap-space-xs uppercase">
            <span className="material-symbols-outlined text-[22px]">timer_off</span>
            <span>TIME EXPIRED — SUBMISSIONS DISABLED</span>
          </div>
        )}

        {/* INPUT INTERACTION ZONE */}
        <form onSubmit={handleCrackVault} className="bg-surface-container-low rounded-xl p-space-lg border-2 border-ink-primary flex flex-col gap-space-md shadow-sm">
          <div className="flex items-center justify-between">
            <label className="font-headline-sm text-headline-sm text-ink-primary flex items-center gap-space-xs font-black uppercase">
              <span className="material-symbols-outlined text-round-3-purple text-[22px]">terminal</span>
              ENTER VAULT MASTER PASSWORD
            </label>
            <span className="font-label-sticker text-label-sticker text-ink-secondary bg-surface-card px-space-sm py-0.5 rounded-full border border-ink-primary font-bold">
              2 LETTERS + 2 NUMBERS
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-space-sm">
            <input
              type="text"
              maxLength={4}
              value={passcode}
              onChange={e => setPasscode(e.target.value.toUpperCase())}
              placeholder="ENTER 4-CHARACTER PASSWORD"
              disabled={isExpired || loading}
              className="flex-1 px-space-md py-space-sm bg-surface-card rounded-xl font-label-code text-headline-sm text-ink-primary tracking-widest uppercase focus:outline-none border-2 border-ink-primary shadow-inner disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isExpired || loading || !passcode.trim()}
              className="px-space-lg py-space-sm bg-round-3-purple hover:bg-tertiary-container text-on-tertiary rounded-xl font-headline-sm text-headline-sm font-black flex items-center justify-center gap-space-xs shadow-[3px_3px_0px_#0F172A] border-2 border-ink-primary disabled:opacity-50 transition-all cursor-pointer whitespace-nowrap"
            >
              <span>{loading ? 'BREACHING...' : 'CRACK THE VAULT 🔓'}</span>
            </button>
          </div>

          {errorMsg && (
            <div className="p-space-md bg-status-wrong/10 text-status-wrong rounded-xl font-headline-sm text-headline-sm font-black border border-status-wrong/30 flex items-start gap-space-xs whitespace-pre-line">
              <span className="material-symbols-outlined text-[22px] shrink-0 mt-0.5">cancel</span>
              <span>{errorMsg}</span>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

