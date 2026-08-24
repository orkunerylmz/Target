import { invoke } from "@tauri-apps/api/core";
import { Goal } from "../types/goal";
import { CurrencyCode, DEFAULT_RATES_IN_TRY } from "../utils/currency";

type AiListener = (loading: boolean, text: string) => void;

class AiService {
  private inFlightRequests: Set<string> = new Set();
  private listeners: Map<string, Set<AiListener>> = new Map();

  public subscribe(key: string, listener: AiListener): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(listener);

    // Return cleanup unsubscribe function
    return () => {
      const set = this.listeners.get(key);
      if (set) {
        set.delete(listener);
        if (set.size === 0) {
          this.listeners.delete(key);
        }
      }
    };
  }

  private notify(key: string, loading: boolean, text: string) {
    const set = this.listeners.get(key);
    if (set) {
      set.forEach((listener) => {
        try {
          listener(loading, text);
        } catch (err) {
          console.error("AI listener error:", err);
        }
      });
    }
  }

  public isLoading(key: string): boolean {
    return this.inFlightRequests.has(key);
  }

  public clearMainAiAdvice(currency?: string) {
    if (currency) {
      localStorage.removeItem(`target_ai_message_${currency}`);
    }
    localStorage.removeItem("target_ai_message");
    this.notify("main", false, "");
  }

  public async requestMainAiAdvice(
    currency: CurrencyCode = "TRY",
    ratesInTry: Record<CurrencyCode, number> = DEFAULT_RATES_IN_TRY
  ): Promise<string> {
    const key = "main";
    if (this.inFlightRequests.has(key)) return "";

    this.inFlightRequests.add(key);
    const cached =
      localStorage.getItem(`target_ai_message_${currency}`) ||
      localStorage.getItem("target_ai_message") ||
      "";
    this.notify(key, true, cached);

    try {
      const response = await invoke<string>("get_ai_motivation", {
        currency,
        usdRate: ratesInTry.USD,
        eurRate: ratesInTry.EUR,
      });
      localStorage.setItem(`target_ai_message_${currency}`, response);
      localStorage.setItem("target_ai_message", response);
      this.inFlightRequests.delete(key);
      this.notify(key, false, response);
      return response;
    } catch (err: any) {
      const errText = err?.toString() || "AI yanıt veremedi.";
      this.inFlightRequests.delete(key);
      this.notify(key, false, errText);
      return errText;
    }
  }

  public async requestGoalAiAdvice(
    goal: Goal,
    currency: CurrencyCode,
    targetAmount?: number,
    savedAmount?: number
  ): Promise<string> {
    const key = `goal_${goal.id}`;
    if (this.inFlightRequests.has(key)) return "";

    this.inFlightRequests.add(key);
    const cached =
      localStorage.getItem(`target_ai_goal_${goal.id}_${currency}`) ||
      localStorage.getItem(`target_ai_goal_${goal.id}`) ||
      "";
    this.notify(key, true, cached);

    const effTarget = targetAmount !== undefined ? targetAmount : goal.targetAmount;
    const effSaved = savedAmount !== undefined ? savedAmount : goal.savedAmount;

    try {
      const response = await invoke<string>("get_goal_ai_advice", {
        goalName: goal.name,
        targetAmount: effTarget,
        savedAmount: effSaved,
        targetDate: goal.targetDate || null,
        currency,
      });

      localStorage.setItem(`target_ai_goal_${goal.id}_${currency}`, response);
      localStorage.setItem(`target_ai_goal_${goal.id}`, response);
      this.inFlightRequests.delete(key);
      this.notify(key, false, response);
      return response;
    } catch (err: any) {
      const errText = err?.toString() || "AI tavsiyesi alınamadı.";
      localStorage.setItem(`target_ai_goal_${goal.id}_${currency}`, errText);
      this.inFlightRequests.delete(key);
      this.notify(key, false, errText);
      return errText;
    }
  }
}

export const aiService = new AiService();
