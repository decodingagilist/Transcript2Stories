import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function confidenceLabel(c: number): 'High' | 'Review' | 'Low' {
  if (c >= 0.85) return 'High';
  if (c >= 0.60) return 'Review';
  return 'Low';
}

export function confidenceColor(c: number): string {
  if (c >= 0.85) return 'bg-green-100 text-green-800 border-green-200';
  if (c >= 0.60) return 'bg-amber-100 text-amber-800 border-amber-200';
  return 'bg-red-100 text-red-800 border-red-200';
}

export const SIZE_POINTS: Record<string, number> = {
  XS: 1, S: 2, M: 3, L: 5, XL: 8,
};

export const VELOCITY = 40;
