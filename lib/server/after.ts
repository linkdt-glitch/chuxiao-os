import { after } from "next/server";

export function runAfter(label: string, task: () => Promise<unknown> | unknown) {
  after(async () => {
    try {
      await task();
    } catch (error) {
      console.error(`[after:${label}]`, error);
    }
  });
}
