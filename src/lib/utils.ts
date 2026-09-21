import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// shadcn className helper.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
