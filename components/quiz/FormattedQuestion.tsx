'use client';

import React from 'react';

export interface ParsedQuestion {
  prompt: string;
  codeBlock?: string;
  footerPrompt?: string;
}

/**
 * Parses raw question text to remove literal `\n` characters,
 * separates question prompts from code snippets/arrays,
 * and formats code lines with proper indentation.
 */
export function parseQuestionText(text: string): ParsedQuestion {
  if (!text) return { prompt: '' };

  // 1. Unescape literal '\n' and '\t' strings
  let cleanText = text
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '  ')
    .trim();

  // 2. Check for single line with inline array e.g., "Consider the sorted array: [2, 4, 6...]. Using..."
  if (!cleanText.includes('\n')) {
    const inlineArrayMatch = cleanText.match(/^(Consider [^:]+:)\s*(\[[0-9,\s]+\])[\.\s]*(.*)$/i);
    if (inlineArrayMatch) {
      return {
        prompt: inlineArrayMatch[1].trim(),
        codeBlock: inlineArrayMatch[2].trim(),
        footerPrompt: inlineArrayMatch[3].trim() || undefined,
      };
    }
    return { prompt: cleanText };
  }

  const lines = cleanText.split('\n').map((l) => l.trimRight());

  const headerLines: string[] = [];
  const codeLines: string[] = [];
  const footerLines: string[] = [];

  let stage: 'header' | 'code' | 'footer' = 'header';

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      if (stage === 'code' && codeLines.length > 0) {
        codeLines.push('');
      }
      continue;
    }

    const isQuestionPrompt = isPromptQuestionText(trimmed);

    if (stage === 'header') {
      if (i === 0 || isQuestionPrompt) {
        headerLines.push(trimmed);
      } else {
        stage = 'code';
        codeLines.push(rawLine);
      }
    } else if (stage === 'code') {
      if (isQuestionPrompt && i > 0 && !isCodeSyntaxLine(trimmed)) {
        stage = 'footer';
        footerLines.push(trimmed);
      } else {
        codeLines.push(rawLine);
      }
    } else if (stage === 'footer') {
      footerLines.push(trimmed);
    }
  }

  let formattedCode: string | undefined = undefined;
  if (codeLines.length > 0) {
    formattedCode = autoFormatJavaCode(codeLines);
  }

  return {
    prompt: headerLines.join(' ') || lines[0] || '',
    codeBlock: formattedCode,
    footerPrompt: footerLines.length > 0 ? footerLines.join(' ') : undefined,
  };
}

function isPromptQuestionText(str: string): boolean {
  if (isCodeSyntaxLine(str)) return false;

  const lower = str.toLowerCase();
  const startsWithQWord = /^(what|which|why|how|consider|approximately|a system|a stack|using)\b/.test(lower);
  const endsWithPunctuation = str.endsWith('?') || str.endsWith(':');

  return startsWithQWord || endsWithPunctuation;
}

function isCodeSyntaxLine(str: string): boolean {
  if (/^(int|float|double|String|boolean|char|void|class|Stack|Queue|List|ArrayList|HashSet|StringBuilder)\b/.test(str)) return true;
  if (/^(for|while|if|else|switch|return|PUSH|POP)\b/.test(str)) return true;
  if (/^(System\.out|stack\.|list\.|arr\[|\[|\{|\})/.test(str)) return true;
  if (/[;{}=+*\/<>]/.test(str) && !str.endsWith('?')) return true;
  if (/^\[[0-9,\s]+\]$/.test(str)) return true;
  return false;
}

function autoFormatJavaCode(lines: string[]): string {
  let indent = 0;
  const result: string[] = [];

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      result.push('');
      continue;
    }

    if (trimmed.startsWith('}')) {
      indent = Math.max(0, indent - 1);
    }

    result.push('    '.repeat(indent) + trimmed);

    const opens = (trimmed.match(/\{/g) || []).length;
    const closes = (trimmed.match(/\}/g) || []).length;

    if (opens > closes) {
      indent += opens - closes;
    } else if (closes > opens && !trimmed.startsWith('}')) {
      indent = Math.max(0, indent - (closes - opens));
    }
  }

  return result.join('\n');
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
    <div className={`space-y-3 ${className}`}>
      {/* Main Question Prompt */}
      <h1 className={titleClassName}>
        {prefix && <span className="mr-2 text-round-1-blue font-bold">{prefix}</span>}
        {parsed.prompt}
      </h1>

      {/* Styled Code Snippet / Data Block */}
      {parsed.codeBlock && (
        <div className={`my-3 overflow-hidden rounded-xl border-2 border-slate-800 bg-slate-950 shadow-lg ${compact ? 'my-2' : ''}`}>
          <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/90 px-3.5 py-1.5 text-xs font-mono text-slate-400">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                {parsed.codeBlock.includes('PUSH') || parsed.codeBlock.startsWith('[') ? 'DATA / OPERATIONS' : 'JAVA CODE'}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">CODE_SNIPPET</span>
          </div>
          <pre className={`p-4 font-mono text-emerald-400 overflow-x-auto leading-relaxed whitespace-pre font-medium bg-slate-950 ${compact ? 'text-xs p-3 leading-normal' : 'text-sm sm:text-base'}`}>
            <code>{parsed.codeBlock}</code>
          </pre>
        </div>
      )}

      {/* Sub-prompt / Footer Question */}
      {parsed.footerPrompt && (
        <p className={`font-bold text-slate-900 leading-snug ${compact ? 'text-xs' : 'text-base sm:text-lg'}`}>
          {parsed.footerPrompt}
        </p>
      )}
    </div>
  );
}
