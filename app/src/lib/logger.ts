// Lightweight in-app error logger and crash tracking
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";

const LOGS_KEY = "bb.crash_logs";
const MAX_LOGS = 20;

export interface LogEntry {
  id: string;
  timestamp: string;
  level: "error" | "warn" | "info";
  message: string;
  stack?: string;
  extra?: Record<string, any>;
}

export async function logError(
  error: Error | string,
  extra?: Record<string, any>
): Promise<void> {
  const message = typeof error === "string" ? error : error.message;
  const stack = typeof error === "string" ? undefined : error.stack;

  const entry: LogEntry = {
    id: Math.random().toString(36).substring(2, 9),
    timestamp: new Date().toISOString(),
    level: "error",
    message,
    stack,
    extra,
  };

  console.error(`[GyanBlitz ERROR] ${entry.timestamp}:`, message, stack, extra);

  // 1. Store locally in AsyncStorage for offline crash recovery & support inspection
  try {
    const raw = await AsyncStorage.getItem(LOGS_KEY);
    const existing: LogEntry[] = raw ? JSON.parse(raw) : [];
    existing.unshift(entry);
    if (existing.length > MAX_LOGS) existing.pop();
    await AsyncStorage.setItem(LOGS_KEY, JSON.stringify(existing));
  } catch {}

  // 2. Best-effort telemetry log to Supabase (does not fail if table doesn't exist)
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;

    await supabase.from("app_logs").insert({
      user_id: userId || null,
      level: "error",
      message: message.substring(0, 500),
      stack: stack?.substring(0, 2000),
      extra: extra || null,
    });
  } catch {
    // Ignore network or table-absence failures
  }
}

export async function getCrashLogs(): Promise<LogEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(LOGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function clearCrashLogs(): Promise<void> {
  try {
    await AsyncStorage.removeItem(LOGS_KEY);
  } catch {}
}

/**
 * Lightweight privacy-safe event analytics (stored in app_logs with level='info').
 */
export async function logEvent(
  eventName: string,
  props?: Record<string, any>
): Promise<void> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const userId = session?.user?.id || null;

    await supabase.from("app_logs").insert({
      user_id: userId,
      level: "info",
      message: eventName.substring(0, 120),
      extra: props || null,
    });
  } catch {
    // Non-blocking telemetry
  }
}
