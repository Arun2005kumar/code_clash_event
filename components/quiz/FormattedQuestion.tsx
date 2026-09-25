'use client';

import React from 'react';

export interface ParsedQuestion {
  title: string;
  subtitle?: string;
  legends: string[];
  codeLines: string[];
  footerPrompt?: string;
  rawText: string;
}

/**
 * Parses raw question text to extract:
 * 1. Title (e.g., "Q4 — Data Type + Numerical Calculation 📦")
 * 2. Subtitle / description lines
 * 3. Legend / key bullet points (e.g., "- 🔵 = Integer")
 * 4. Code snippet or math expression lines
 * 5. Footer question prompt (e.g., "If all 🔵 values are integers, what is the final result?")
 */
export function parseQuestionText(text: string): ParsedQuestion {
  if (!text) {
    return { title: '', legends: [], codeLines: [], rawText: '' };
  }

  // 1. Unescape literal '\n' and '\t'
  const cleanText = text
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '  ')
    .trim();

  const lines = cleanText.split('\n').map((l) => l.trimRight());
  if (lines.length === 0) {
    return { title: cleanText, legends: [], codeLines: [], rawText: cleanText };
  }

  let title = lines[0].trim();
  let subtitle: string | undefined = undefined;
  const legends: string[] = [];
  const codeLines: string[] = [];
  const footerLines: string[] = [];

  let isLegendSection = false;
  let isCodeSection = false;
  let isFooterSection = false;

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) continue;

    // Check if line is a legend heading or bullet
    if (/^legend:/i.test(trimmed)) {
      isLegendSection = true;
      isCodeSection = false;
      isFooterSection = false;
      continue;
    }

    if (isLegendSection && (trimmed.startsWith('-') || trimmed.startsWith('•') || trimmed.startsWith('*'))) {
      legends.push(trimmed);
      continue;
    }

    // Bullet points outside explicit Legend: heading
    if (trimmed.startsWith('-') || trimmed.startsWith('•')) {
      legends.push(trimmed);
      continue;
    }

    // Expression / Sequence heading
    if (/^(expression|sequence):/i.test(trimmed)) {
      isLegendSection = false;
      isCodeSection = true;
      isFooterSection = false;
      continue;
    }

    // Question prompt detection (ends with ? or starts with What/Which/If/How)
    const isQuestionPrompt = /^(what|which|why|how|if|assume|consider|print)\b/i.test(trimmed) || trimmed.endsWith('?');

    if (isQuestionPrompt && (codeLines.length > 0 || legends.length > 0 || isCodeSection || isFooterSection)) {
      isLegendSection = false;
      isCodeSection = false;
      isFooterSection = true;
      footerLines.push(trimmed);
    } else if (isCodeSection || isCodeLine(trimmed) || (i > 0 && codeLines.length > 0 && !isQuestionPrompt)) {
      isLegendSection = false;
      isCodeSection = true;
      codeLines.push(rawLine);
    } else if (!subtitle && i === 1 && !isQuestionPrompt && !trimmed.startsWith('-')) {
      subtitle = trimmed;
    } else if (isQuestionPrompt) {
      footerLines.push(trimmed);
    } else {
      codeLines.push(rawLine);
    }
  }

  // Fallback if everything was put into codeLines or title
  if (codeLines.length === 0 && footerLines.length === 0 && lines.length > 1 && !subtitle && legends.length === 0) {
    codeLines.push(...lines.slice(1));
  }

  return {
    title,
    subtitle,
    legends,
    codeLines: cleanCodeLines(codeLines),
    footerPrompt: footerLines.join(' '),
    rawText: cleanText,
  };
}

function isCodeLine(str: string): boolean {
  if (/^(x|y|z|i|for|while|if|else|switch|return|print|PUSH|POP)\b/i.test(str)) return true;
  if (/^(int|float|double|String|boolean|char|void|class)\b/.test(str)) return true;
  if (/[=+\/*<>&|→÷]/.test(str) && !str.endsWith('?')) return true;
  if (/[\u{1F300}-\u{1F9FF}]/u.test(str) && str.includes('+')) return true; // Emoji expressions
  return false;
}

function cleanCodeLines(lines: string[]): string[] {
  // Trim leading/trailing blank lines from code block
  let start = 0;
  while (start < lines.length && !lines[start].trim()) start++;
  let end = lines.length - 1;
  while (end >= 0 && !lines[end].trim()) end--;
  if (start > end) return [];
  return lines.slice(start, end + 1);
}

interface FormattedQuestionProps {
  text: string;
  prefix?: string;
  className?: string;
  titleClassName?: string;
  compact?: boolean;
}

export default function FormattedQuestion({
  text,
  prefix,
  className = '',
  titleClassName = 'font-headline-lg text-headline-lg font-black text-ink-primary leading-tight',
  compact = false,
}: FormattedQuestionProps) {
  const parsed = parseQuestionText(text);

  return (
    <div className={`space-y-space-md ${className}`}>
      {/* Title */}
      <h1 className={titleClassName}>
        {prefix && <span className="mr-2 text-round-1-blue font-bold">{prefix}</span>}
        {parsed.title}
      </h1>

      {/* Subtitle / Sub-prompt */}
      {parsed.subtitle && (
        <p className="font-headline-sm text-headline-sm text-ink-primary font-bold bg-surface-muted p-space-xs px-space-sm rounded-lg border border-ink-primary inline-block">
          {parsed.subtitle}
        </p>
      )}

      {/* Legend / Key Items (Rendered line by line) */}
      {parsed.legends.length > 0 && (
        <div className="bg-surface-muted/80 p-space-md rounded-xl border-2 border-ink-primary flex flex-col gap-1.5 shadow-sm">
          <span className="font-label-ticker text-label-ticker text-ink-secondary uppercase font-bold tracking-wider">
            LEGEND &amp; DEFINITIONS
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
            {parsed.legends.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-surface-card p-space-xs px-space-sm rounded-lg border border-ink-primary font-label-code text-body-md font-bold text-ink-primary shadow-xs">
                {item}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Code Snippet / Operation Matrix (Line by Line) */}
      {parsed.codeLines.length > 0 && (
        <div className={`my-space-md overflow-hidden rounded-xl border-2 border-ink-primary bg-slate-950 shadow-md ${compact ? 'my-2' : ''}`}>
          <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-space-md py-1.5 text-xs font-mono text-slate-400">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                {parsed.codeLines.some(l => l.includes('for') || l.includes('if')) ? 'CODE ALGORITHM TRACE' : 'EXPRESSION / SEQUENCE'}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">ROUND_2_LOT</span>
          </div>
          <div className="p-space-md font-mono text-emerald-400 overflow-x-auto leading-relaxed bg-slate-950 flex flex-col gap-1">
            {parsed.codeLines.map((line, idx) => (
              <div key={idx} className="whitespace-pre font-medium text-sm sm:text-base tracking-wide">
                {line || '\u00A0'}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Question Prompt / Footer Statement */}
      {parsed.footerPrompt && (
        <div className="p-space-sm px-space-md bg-round-2-orange/10 border-2 border-round-2-orange rounded-xl text-ink-primary font-black text-headline-sm sm:text-headline-md leading-snug">
          {parsed.footerPrompt}
        </div>
      )}
    </div>
  );
}
