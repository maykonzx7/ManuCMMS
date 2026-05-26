import { Injectable } from '@nestjs/common';

type CircuitState = {
  failures: number;
  openUntil: number;
};

@Injectable()
export class IntegracaoCircuitBreakerService {
  private readonly states = new Map<string, CircuitState>();
  private readonly failureThreshold = 3;
  private readonly openMs = 60_000;

  isOpen(key: string): boolean {
    const state = this.states.get(key);
    if (!state) return false;
    if (state.openUntil <= Date.now()) {
      if (state.failures >= this.failureThreshold) {
        this.states.set(key, { failures: 0, openUntil: 0 });
      }
      return false;
    }
    return state.failures >= this.failureThreshold;
  }

  recordSuccess(key: string): void {
    this.states.delete(key);
  }

  recordFailure(key: string): void {
    const current = this.states.get(key) ?? { failures: 0, openUntil: 0 };
    const failures = current.failures + 1;
    const openUntil =
      failures >= this.failureThreshold ? Date.now() + this.openMs : current.openUntil;
    this.states.set(key, { failures, openUntil });
  }
}
