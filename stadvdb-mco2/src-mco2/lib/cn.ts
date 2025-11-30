import { ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * cn is a utility function which can merge multiple class names into a single class name string without messy string concatentation.
 * It uses the `clsx` function from the `clsx` library and the `twMerge` function from the `tailwind-merge` library.
 *
 * @param inputs - The class names to merge.
 * @returns The merged class name string.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}