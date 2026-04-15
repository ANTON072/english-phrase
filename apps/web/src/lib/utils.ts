import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parsePartOfSpeech(value: string | null | undefined): string[] {
  if (!value) return [];
  return JSON.parse(value) as string[];
}
