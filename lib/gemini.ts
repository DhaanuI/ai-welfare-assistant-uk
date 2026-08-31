import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  // Don't throw at import time in dev tooling; the call sites surface it.
  console.warn("GEMINI_API_KEY is not set — model calls will fail.");
}

export const ai = new GoogleGenAI({ apiKey: apiKey ?? "" });

export const TRIAGE_MODEL = process.env.GEMINI_TRIAGE_MODEL || "gemini-2.5-flash-lite";
export const REPLY_MODEL = process.env.GEMINI_REPLY_MODEL || "gemini-2.5-flash-lite";

export class ModelUnavailableError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = "ModelUnavailableError";
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new ModelUnavailableError(`${label} timed out after ${ms}ms`)),
      ms,
    );
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

interface JsonCallOpts {
  model: string;
  system: string;
  user: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: any;
  timeoutMs?: number;
  retries?: number;
}

/** Structured JSON call. Throws ModelUnavailableError on timeout / error / empty. */
export async function generateJson<T>(opts: JsonCallOpts): Promise<T> {
  const { model, system, user, schema, timeoutMs = 12_000, retries = 1 } = opts;

  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await withTimeout(
        ai.models.generateContent({
          model,
          contents: user,
          config: {
            systemInstruction: system,
            responseMimeType: "application/json",
            responseSchema: schema,
            temperature: 0,
          },
        }),
        timeoutMs,
        `${model} (json)`,
      );
      const text = res.text?.trim();
      if (!text) throw new ModelUnavailableError("empty model response");
      return JSON.parse(text) as T;
    } catch (err) {
      lastErr = err;
      if (attempt < retries) await new Promise((r) => setTimeout(r, 400));
    }
  }
  throw lastErr instanceof ModelUnavailableError
    ? lastErr
    : new ModelUnavailableError("model call failed", lastErr);
}

interface TextCallOpts {
  model: string;
  system: string;
  user: string;
  timeoutMs?: number;
  retries?: number;
}

/** Free-text call for generating the student-facing reply. */
export async function generateText(opts: TextCallOpts): Promise<string> {
  const { model, system, user, timeoutMs = 15_000, retries = 1 } = opts;

  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await withTimeout(
        ai.models.generateContent({
          model,
          contents: user,
          config: { systemInstruction: system, temperature: 0.4 },
        }),
        timeoutMs,
        `${model} (text)`,
      );
      const text = res.text?.trim();
      if (!text) throw new ModelUnavailableError("empty model response");
      return text;
    } catch (err) {
      lastErr = err;
      if (attempt < retries) await new Promise((r) => setTimeout(r, 400));
    }
  }
  throw lastErr instanceof ModelUnavailableError
    ? lastErr
    : new ModelUnavailableError("model call failed", lastErr);
}
