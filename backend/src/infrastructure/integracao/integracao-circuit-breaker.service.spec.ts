import { IntegracaoCircuitBreakerService } from './integracao-circuit-breaker.service';

describe('IntegracaoCircuitBreakerService (NF-08)', () => {
  it('abre o circuito após 3 falhas consecutivas', () => {
    const breaker = new IntegracaoCircuitBreakerService();
    const key = 'webhook:empresa-teste';

    expect(breaker.isOpen(key)).toBe(false);
    breaker.recordFailure(key);
    breaker.recordFailure(key);
    expect(breaker.isOpen(key)).toBe(false);
    breaker.recordFailure(key);
    expect(breaker.isOpen(key)).toBe(true);
  });

  it('fecha o circuito após sucesso', () => {
    const breaker = new IntegracaoCircuitBreakerService();
    const key = 'webhook:empresa-reset';

    breaker.recordFailure(key);
    breaker.recordFailure(key);
    breaker.recordFailure(key);
    expect(breaker.isOpen(key)).toBe(true);

    breaker.recordSuccess(key);
    expect(breaker.isOpen(key)).toBe(false);
  });
});
