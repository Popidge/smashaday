import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { distance } from "fastest-levenshtein"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Normalize answer for comparison
export function normalizeAnswer(answer: string): string {
  return answer.toLowerCase().trim().replace(/[^\w]/g, '');
}

// Title case for categories (remove underscores and capitalize)
export function titleCase(str: string): string {
  return str.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// Validate answer with fuzzy logic
export function validateAnswer(userAnswer: string, correctAnswer: string): boolean {
  const normalizedUser = normalizeAnswer(userAnswer);
  const normalizedCorrect = normalizeAnswer(correctAnswer);

  if (normalizedUser === normalizedCorrect) return true;

  // Fuzzy threshold: allow up to 20% of the length as errors
  const ld = distance(normalizedUser, normalizedCorrect);
  const threshold = Math.max(1, Math.floor(normalizedCorrect.length * 0.2));
  return ld <= threshold;
}

// Highlight portmanteau in feedback
export function highlightPortmanteau(word1: string, word2: string, smash: string): { before: string; match: string | null; after: string } {
  const smashLower = smash.toLowerCase();
  const word1Lower = word1.toLowerCase();
  const word2Lower = word2.toLowerCase();

  // Find overlap
  let overlap = '';
  for (let i = 1; i <= Math.min(word1Lower.length, word2Lower.length); i++) {
    if (word1Lower.slice(-i) === word2Lower.slice(0, i)) {
      overlap = word1Lower.slice(-i);
    }
  }

  if (overlap) {
    const beforeIndex = smashLower.indexOf(overlap);
    const afterIndex = beforeIndex + overlap.length;
    return {
      before: smash.slice(0, beforeIndex),
      match: smash.slice(beforeIndex, afterIndex),
      after: smash.slice(afterIndex),
    };
  }

  return { before: smash, match: null, after: '' };
}

