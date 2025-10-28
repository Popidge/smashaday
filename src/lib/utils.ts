import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

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

// Basic fuzzy matching using Levenshtein distance
export function levenshteinDistance(a: string, b: string): number {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

// Validate answer with fuzzy logic
export function validateAnswer(userAnswer: string, correctAnswer: string): boolean {
  const normalizedUser = normalizeAnswer(userAnswer);
  const normalizedCorrect = normalizeAnswer(correctAnswer);

  if (normalizedUser === normalizedCorrect) return true;

  // Fuzzy threshold: allow up to 20% of the length as errors
  const distance = levenshteinDistance(normalizedUser, normalizedCorrect);
  const threshold = Math.max(1, Math.floor(normalizedCorrect.length * 0.2));
  return distance <= threshold;
}

// Highlight portmanteau in feedback
export function highlightPortmanteau(word1: string, word2: string, smash: string): string {
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
    const before = smashLower.indexOf(overlap);
    const after = before + overlap.length;
    return `${smash.slice(0, before)}<mark>${smash.slice(before, after)}</mark>${smash.slice(after)}`;
  }

  return smash;
}
