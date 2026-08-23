import { describe, expect, it } from "vitest";
import {
  calculateFinancialPosition,
  calculateHouseFinancialPosition,
  getRealTicketImpact,
  validateHouseLedger,
} from "./financialLedger";

const house = { id: 1, bancaInicial: 1000 };
const pending = (overrides = {}) => ({
  id: 1,
  casaId: 1,
  resultado: "Pendente",
  stakeReal: 100,
  stakeBonus: 0,
  lucroReal: 0,
  perdaReal: 100,
  ...overrides,
});

describe("financial ledger", () => {
  it("cria um bilhete pendente e separa disponível, comprometido e patrimônio", () => {
    expect(calculateHouseFinancialPosition({ house, tickets: [pending()] })).toMatchObject({
      totalBalance: 1000,
      committedBalance: 100,
      availableBalance: 900,
    });
  });

  it("soma vários bilhetes pendentes", () => {
    expect(calculateHouseFinancialPosition({ house, tickets: [pending(), pending({ id: 2, stakeReal: 250 })] })).toMatchObject({
      committedBalance: 350,
      availableBalance: 650,
    });
  });

  it("finaliza pendente como perdido sem devolver a stake", () => {
    expect(calculateHouseFinancialPosition({ house, tickets: [pending({ resultado: "Red" })] })).toMatchObject({
      totalBalance: 900,
      committedBalance: 0,
      availableBalance: 900,
    });
  });

  it("finaliza pendente como ganho mantendo a lógica atual de impacto", () => {
    const ticket = pending({ resultado: "Green", lucroReal: 80, perdaReal: 0 });
    expect(getRealTicketImpact(ticket)).toBe(80);
    expect(calculateHouseFinancialPosition({ house, tickets: [ticket] }).availableBalance).toBe(1080);
  });

  it("finaliza pendente por Cash Out usando o valor efetivamente recuperado", () => {
    const ticket = pending({ resultado: "Cash Out", lucroReal: 0, perdaReal: 30 });
    expect(calculateHouseFinancialPosition({ house, tickets: [ticket] })).toMatchObject({
      totalBalance: 970,
      committedBalance: 0,
      availableBalance: 970,
    });
  });

  it("excluir um pendente devolve imediatamente o valor comprometido", () => {
    expect(calculateHouseFinancialPosition({ house, tickets: [] }).availableBalance).toBe(1000);
  });

  it("editar o valor pendente recalcula sem duplicar", () => {
    expect(calculateHouseFinancialPosition({ house, tickets: [pending({ stakeReal: 175 })] })).toMatchObject({
      committedBalance: 175,
      availableBalance: 825,
    });
  });

  it("mover pendente entre casas libera a origem e compromete o destino", () => {
    const houses = [house, { id: 2, bancaInicial: 500 }];
    const tickets = [pending({ casaId: 2 })];
    expect(calculateHouseFinancialPosition({ house: houses[0], tickets }).availableBalance).toBe(1000);
    expect(calculateHouseFinancialPosition({ house: houses[1], tickets })).toMatchObject({ committedBalance: 100, availableBalance: 400 });
  });

  it("não inclui comprometidos no saldo disponível", () => {
    expect(calculateFinancialPosition({ initialBalance: 1000, tickets: [pending({ stakeReal: 400 })] }).availableBalance).toBe(600);
  });

  it("expõe o mesmo disponível que deve limitar um saque", () => {
    const position = calculateFinancialPosition({ initialBalance: 1000, tickets: [pending({ stakeReal: 400 })] });
    expect(700 > position.availableBalance).toBe(true);
    expect(600 <= position.availableBalance).toBe(true);
    expect(validateHouseLedger({
      houses: [house],
      tickets: [pending({ data: "2026-08-01", stakeReal: 400 })],
      movements: [{ id: 2, casaId: 1, data: "2026-08-02", tipo: "Saque", valor: 700 }],
    }, 1).valid).toBe(false);
  });

  it("mantém resultados finalizados e movimentos com a regra anterior", () => {
    const position = calculateFinancialPosition({
      initialBalance: 1000,
      movements: [{ tipo: "Depósito", valor: 200 }, { tipo: "Saque", valor: 50 }],
      tickets: [
        pending({ id: 1, resultado: "Red", perdaReal: 100 }),
        pending({ id: 2, resultado: "Green", stakeReal: 50, lucroReal: 75, perdaReal: 0 }),
        pending({ id: 3, resultado: "Cash Out", stakeReal: 80, lucroReal: 0, perdaReal: 20 }),
      ],
    });
    expect(position).toMatchObject({ movementBalance: 150, realizedResult: -45, totalBalance: 1105, availableBalance: 1105 });
  });

  it("compromete apenas stake real e preserva a separação de bônus da DEMO", () => {
    expect(calculateFinancialPosition({
      initialBalance: 1000,
      tickets: [pending({ stakeReal: 120, stakeBonus: 80 })],
    })).toMatchObject({ committedBalance: 120, totalBalance: 1000, availableBalance: 880 });
  });
});
