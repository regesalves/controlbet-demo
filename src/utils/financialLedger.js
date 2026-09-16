const MONEY_TOLERANCE = 0.009;

function normalizeDate(value) {
  return String(value || "").slice(0, 10);
}

function addDays(dateISO, amount) {
  const date = new Date(`${dateISO}T12:00:00`);
  date.setDate(date.getDate() + amount);
  return date.toISOString().slice(0, 10);
}

function getHouseEvents({ house, movements = [], tickets = [] } = {}) {
  const houseId = Number(house?.id);

  return {
    movements: movements.filter((movement) => Number(movement.casaId ?? movement.casa_id) === houseId),
    tickets: tickets.filter((ticket) => Number(ticket.casaId ?? ticket.casa_id) === houseId),
  };
}

export function movementImpact(movement) {
  const value = Number(movement?.valor || 0);
  return movement?.tipo === "Saque" ? -Math.abs(value) : value;
}

export function getRealStake(ticket) {
  return Number(ticket?.stakeReal ?? ticket?.stakeSaldo ?? 0) || 0;
}

export function getRealTicketImpact(ticket) {
  return (Number(ticket?.lucroReal || 0) || 0) - (Number(ticket?.perdaReal || 0) || 0);
}

export function isPendingTicket(ticket) {
  return ticket?.resultado === "Pendente";
}

export function calculateFinancialPosition({ initialBalance = 0, movements = [], tickets = [] } = {}) {
  const movementBalance = movements.reduce((sum, movement) => sum + movementImpact(movement), 0);
  const realizedResult = tickets
    .filter((ticket) => !isPendingTicket(ticket))
    .reduce((sum, ticket) => sum + getRealTicketImpact(ticket), 0);
  const committedBalance = tickets
    .filter(isPendingTicket)
    .reduce((sum, ticket) => sum + getRealStake(ticket), 0);
  const totalBalance = Number(initialBalance || 0) + movementBalance + realizedResult;

  return {
    initialBalance: Number(initialBalance || 0),
    movementBalance,
    realizedResult,
    committedBalance,
    totalBalance,
    availableBalance: totalBalance - committedBalance,
  };
}

export function calculateHouseFinancialPosition({ house, movements = [], tickets = [] } = {}) {
  const houseEvents = getHouseEvents({ house, movements, tickets });

  return calculateFinancialPosition({
    initialBalance: Number(house?.bancaInicial ?? house?.banca_inicial ?? 0),
    movements: houseEvents.movements,
    tickets: houseEvents.tickets,
  });
}

export function calculateHistoricalPosition({ house, movements = [], tickets = [], date } = {}) {
  const referenceDate = normalizeDate(date);
  const houseEvents = getHouseEvents({ house, movements, tickets });

  if (!referenceDate) {
    return calculateFinancialPosition({
      initialBalance: Number(house?.bancaInicial ?? house?.banca_inicial ?? 0),
      movements: houseEvents.movements,
      tickets: houseEvents.tickets,
    });
  }

  return calculateFinancialPosition({
    initialBalance: Number(house?.bancaInicial ?? house?.banca_inicial ?? 0),
    movements: houseEvents.movements.filter((movement) => normalizeDate(movement.data) <= referenceDate),
    tickets: houseEvents.tickets.filter((ticket) => normalizeDate(ticket.data) <= referenceDate),
  });
}

export const calculateHistoricalHousePosition = calculateHistoricalPosition;

export function simulateHistoricalMovement({
  house,
  movements = [],
  tickets = [],
  movement,
  excludeMovementId = null,
} = {}) {
  const movementDate = normalizeDate(movement?.data);
  const movementValue = Math.abs(Number(movement?.valor || 0));
  const movementsWithoutEdited = movements.filter((item) => (
    excludeMovementId === null || Number(item.id) !== Number(excludeMovementId)
  ));
  const position = calculateHistoricalPosition({
    house,
    movements: movementsWithoutEdited,
    tickets,
    date: movementDate,
  });
  const isWithdrawal = movement?.tipo === "Saque";
  const valid = !isWithdrawal || movementValue <= position.availableBalance + MONEY_TOLERANCE;

  return {
    valid,
    date: movementDate,
    movementImpact: isWithdrawal ? -movementValue : movementValue,
    availableBalance: position.availableBalance,
    position,
  };
}

export function reconstructDailyEvolution({
  house,
  movements = [],
  tickets = [],
  startDate = "",
  endDate = "",
} = {}) {
  const houseEvents = getHouseEvents({ house, movements, tickets });
  const eventDates = [
    ...houseEvents.movements.map((movement) => normalizeDate(movement.data)),
    ...houseEvents.tickets.map((ticket) => normalizeDate(ticket.data)),
  ].filter(Boolean).sort();
  const firstDate = normalizeDate(startDate) || eventDates[0];
  const lastDate = normalizeDate(endDate) || eventDates[eventDates.length - 1];

  if (!firstDate || !lastDate || firstDate > lastDate) return [];

  const evolution = [];
  for (let date = firstDate; date <= lastDate; date = addDays(date, 1)) {
    const position = calculateHistoricalPosition({ house, movements, tickets, date });
    evolution.push({
      data: date,
      date,
      ...position,
    });
  }

  return evolution;
}

export function validateHouseLedger(
  { houses = [], movements = [], tickets = [] },
  houseId,
  removedItemLabel = "esse registro",
  { formatDate = (date) => date } = {},
) {
  const house = houses.find((item) => Number(item.id) === Number(houseId));
  if (!house) return { valid: true };

  let availableBalance = Number(house.bancaInicial ?? house.banca_inicial ?? 0);
  const events = [
    ...movements
      .filter((movement) => Number(movement.casaId ?? movement.casa_id) === Number(houseId))
      .map((movement) => ({ id: movement.id, date: movement.data, order: 1, type: "movement", movement })),
    ...tickets
      .filter((ticket) => Number(ticket.casaId ?? ticket.casa_id) === Number(houseId))
      .map((ticket) => ({ id: ticket.id, date: ticket.data, order: 2, type: "ticket", ticket })),
  ].sort((a, b) =>
    String(a.date || "").localeCompare(String(b.date || "")) ||
    a.order - b.order ||
    Number(a.id || 0) - Number(b.id || 0),
  );

  for (const event of events) {
    if (event.type === "movement") {
      availableBalance += movementImpact(event.movement);
    } else {
      const realStake = getRealStake(event.ticket);
      if (realStake > availableBalance + MONEY_TOLERANCE) {
        return {
          valid: false,
          message: `Não é possível excluir. Sem ${removedItemLabel}, a banca de ${house.nome} ficaria insuficiente para o ${event.ticket.nomeBilhete || "bilhete"} de ${formatDate(event.ticket.data)}.`,
        };
      }
      availableBalance += isPendingTicket(event.ticket) ? -realStake : getRealTicketImpact(event.ticket);
    }

    if (availableBalance < -MONEY_TOLERANCE) {
      return {
        valid: false,
        message: `Não é possível excluir. Sem ${removedItemLabel}, a banca de ${house.nome} ficaria negativa em ${formatDate(event.date)}.`,
      };
    }
  }

  return { valid: true };
}
