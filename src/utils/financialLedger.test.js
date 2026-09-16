import { describe, expect, it } from "vitest";
import {
  calculateFinancialPosition,
  calculateHistoricalPosition,
  calculateHouseFinancialPosition,
  getRealTicketImpact,
  reconstructDailyEvolution,
  simulateHistoricalMovement,
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

  it("calcula a posição financeira até a data informada", () => {
    const position = calculateHistoricalPosition({
      house,
      movements: [
        { id: 1, casaId: 1, data: "2026-09-02", tipo: "Depósito", valor: 200 },
        { id: 2, casaId: 1, data: "2026-09-10", tipo: "Depósito", valor: 500 },
      ],
      date: "2026-09-03",
    });

    expect(position).toMatchObject({ totalBalance: 1200, availableBalance: 1200 });
  });

  it("não deixa movimentações posteriores afetarem uma data anterior", () => {
    const position = calculateHistoricalPosition({
      house,
      movements: [{ casaId: 1, data: "2026-09-05", tipo: "Depósito", valor: 500 }],
      date: "2026-09-04",
    });

    expect(position.availableBalance).toBe(1000);
  });

  it("considera o bilhete pela data do evento, mesmo que tenha sido cadastrado depois", () => {
    const position = calculateHistoricalPosition({
      house,
      tickets: [pending({ data: "2026-09-03", stakeReal: 400, created_at: "2026-09-10" })],
      date: "2026-09-03",
    });

    expect(position).toMatchObject({ committedBalance: 400, availableBalance: 600 });
  });

  it("não compromete saldo histórico com bilhete pendente posterior", () => {
    const position = calculateHistoricalPosition({
      house,
      tickets: [pending({ data: "2026-09-05", stakeReal: 400 })],
      date: "2026-09-04",
    });

    expect(position).toMatchObject({ committedBalance: 0, availableBalance: 1000 });
  });

  it("permite saque quando havia saldo disponível suficiente na data", () => {
    const simulation = simulateHistoricalMovement({
      house,
      movements: [{ casaId: 1, data: "2026-09-02", tipo: "Depósito", valor: 200 }],
      tickets: [pending({ data: "2026-09-03", stakeReal: 400 })],
      movement: { casaId: 1, data: "2026-09-04", tipo: "Saque", valor: 800 },
    });

    expect(simulation).toMatchObject({ valid: true, availableBalance: 800 });
  });

  it("recusa saque por saldo insuficiente na data, mesmo com evento posterior", () => {
    const simulation = simulateHistoricalMovement({
      house,
      movements: [{ casaId: 1, data: "2026-09-10", tipo: "Depósito", valor: 500 }],
      tickets: [pending({ data: "2026-09-03", stakeReal: 400 })],
      movement: { casaId: 1, data: "2026-09-04", tipo: "Saque", valor: 700 },
    });

    expect(simulation).toMatchObject({ valid: false, availableBalance: 600 });
  });

  it("remove o saque original ao simular uma edição", () => {
    const originalWithdrawal = { id: 9, casaId: 1, data: "2026-09-03", tipo: "Saque", valor: 500 };
    const simulation = simulateHistoricalMovement({
      house,
      movements: [originalWithdrawal],
      movement: { id: 9, casaId: 1, data: "2026-09-03", tipo: "Saque", valor: 700 },
      excludeMovementId: 9,
    });

    expect(simulation).toMatchObject({ valid: true, availableBalance: 1000 });
  });

  it("reconstrói a evolução diária usando a posição de cada data", () => {
    const evolution = reconstructDailyEvolution({
      house,
      movements: [{ casaId: 1, data: "2026-09-02", tipo: "Depósito", valor: 200 }],
      tickets: [pending({ data: "2026-09-03", stakeReal: 300 })],
      startDate: "2026-09-01",
      endDate: "2026-09-03",
    });

    expect(evolution).toHaveLength(3);
    expect(evolution.map((item) => item.availableBalance)).toEqual([1000, 1200, 900]);
  });
});
