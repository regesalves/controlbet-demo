export const DEV_DATA_ID_MIN = 8_400_000_000_000_000;
export const DEV_DATA_ID_MAX = 8_899_999_999_999_999;
export const DEFAULT_DEV_SEED = "controlbet-dev";
export const QUICK_GENERATION_COUNTS = [10, 50, 100, 250, 500];

const DEV_ID_BUCKET_SIZE = 10_000;

const HOUSE_PROFILES = [
  { name: "Bet365", initialBank: 1000, skill: 1.18, stakeFactor: 1.08 },
  { name: "Betano", initialBank: 1250, skill: 1.28, stakeFactor: 1.12 },
  { name: "EstrelaBet", initialBank: 850, skill: 0.92, stakeFactor: 0.86 },
  { name: "Superbet", initialBank: 1100, skill: 1.08, stakeFactor: 1.02 },
  { name: "Sportingbet", initialBank: 900, skill: 0.86, stakeFactor: 0.92 },
  { name: "KTO", initialBank: 1050, skill: 1.2, stakeFactor: 1.04 },
  { name: "Novibet", initialBank: 780, skill: 0.98, stakeFactor: 0.8 },
  { name: "Betfair", initialBank: 1350, skill: 1.12, stakeFactor: 1.18 },
  { name: "Pixbet", initialBank: 820, skill: 0.9, stakeFactor: 0.84 },
  { name: "Betnacional", initialBank: 950, skill: 1.02, stakeFactor: 0.96 },
];

const CATEGORIES = [
  "Resultado final",
  "Mais de 2.5 gols",
  "Ambas marcam",
  "Dupla chance",
  "Handicap asiático",
  "Escanteios",
  "Menos de 3.5 gols",
  "Jogador marca",
  "Cartões",
  "Resultado do intervalo",
];

const TICKET_NOTES = [
  "Entrada pré-jogo com boa leitura de mercado.",
  "Aposta baseada no desempenho recente das equipes.",
  "Mercado acompanhado durante a semana.",
  "Entrada com gestão conservadora de stake.",
  "Oportunidade identificada pela variação da odd.",
  "Bilhete criado para acompanhar a estratégia mensal.",
  "Entrada ao vivo após confirmação do cenário esperado.",
  "Aposta de valor dentro do limite planejado.",
];

function roundMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function hashString(value) {
  let hash = 2166136261;
  const input = String(value || "controlbet");

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function createRandom(seed) {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function randomBetween(random, minimum, maximum) {
  return minimum + (maximum - minimum) * random();
}

function randomItem(random, values) {
  return values[Math.floor(random() * values.length) % values.length];
}

function createIdFactory(seed) {
  const availableBuckets = Math.floor(
    (DEV_DATA_ID_MAX - DEV_DATA_ID_MIN) / DEV_ID_BUCKET_SIZE
  );
  const bucket = hashString(seed) % availableBuckets;
  const base = DEV_DATA_ID_MIN + bucket * DEV_ID_BUCKET_SIZE;
  let sequence = 0;

  return () => {
    sequence += 1;
    const id = base + sequence;

    if (id > DEV_DATA_ID_MAX) {
      throw new Error("A faixa de IDs de desenvolvimento foi esgotada.");
    }

    return id;
  };
}

export function createRandomDevSeed(prefix = "controlbet-random") {
  const entropy = new Uint32Array(2);

  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(entropy);
  } else {
    entropy[0] = Math.floor(Math.random() * 0xffffffff);
    entropy[1] = Math.floor(Math.random() * 0xffffffff);
  }

  return `${prefix}:${Date.now().toString(36)}:${Array.from(entropy, (value) => value.toString(36)).join("")}`;
}

function dateDaysAgo(daysAgo) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - Math.max(0, Math.floor(daysAgo)));
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getHouseProfile(house, index) {
  const matchingProfile = HOUSE_PROFILES.find(
    (profile) => profile.name.toLowerCase() === String(house?.nome || "").toLowerCase()
  );

  return matchingProfile || HOUSE_PROFILES[index % HOUSE_PROFILES.length];
}

function getTicketFinancialFields(result, stake, odd, random) {
  let returnValue = 0;

  if (result === "Green") {
    returnValue = roundMoney(stake * odd);
  } else if (result === "Cash Out") {
    returnValue = roundMoney(stake * randomBetween(random, 0.58, 1.32));
  }

  if (result === "Pendente") {
    return {
      lucro: 0,
      lucro_real: 0,
      perda_real: 0,
      recovered_real: 0,
      retorno: 0,
    };
  }

  return {
    lucro: roundMoney(returnValue - stake),
    lucro_real: roundMoney(Math.max(0, returnValue - stake)),
    perda_real: roundMoney(Math.max(0, stake - returnValue)),
    recovered_real: roundMoney(Math.min(returnValue, stake)),
    retorno: returnValue,
  };
}

export function createDevHouses({ count = 7, userId, seed = "houses" }) {
  const nextId = createIdFactory(`${seed}:${userId}:houses`);
  const random = createRandom(hashString(`${seed}:${userId}:${count}`));

  return Array.from({ length: count }, (_, index) => {
    const profile = HOUSE_PROFILES[index % HOUSE_PROFILES.length];
    const cycle = Math.floor(index / HOUSE_PROFILES.length);
    const suffix = cycle === 0 ? "" : ` ${cycle + 1}`;
    const initialVariation = cycle === 0 ? 1 : randomBetween(random, 0.72, 1.38);

    return {
      id: nextId(),
      user_id: userId,
      nome: `${profile.name}${suffix}`,
      banca_inicial: roundMoney(profile.initialBank * initialVariation),
      logo_url: "",
    };
  });
}

export function createDevTickets({ count = 200, houses, userId, days = 90, seed = "tickets" }) {
  if (!Array.isArray(houses) || houses.length === 0) {
    throw new Error("É necessário ter ao menos uma casa para gerar bilhetes.");
  }

  const nextId = createIdFactory(`${seed}:${userId}:tickets`);
  const random = createRandom(hashString(`${seed}:${userId}:${count}:${houses.length}`));
  const ticketNumbersByDate = new Map();

  return Array.from({ length: count }, (_, index) => {
    const chronologicalPosition = count <= 1 ? 1 : index / (count - 1);
    const baseDaysAgo = Math.round((1 - chronologicalPosition) * (days - 1));
    const daysAgo = clamp(baseDaysAgo + Math.floor(randomBetween(random, -2, 3)), 0, days - 1);
    const date = dateDaysAgo(daysAgo);
    const houseIndex = Math.floor(random() * houses.length) % houses.length;
    const house = houses[houseIndex];
    const profile = getHouseProfile(house, houseIndex);
    const odd = Number((1.2 + Math.pow(random(), 2.25) * 6.8).toFixed(2));
    const rawStake = (10 + Math.pow(random(), 1.35) * 290) * profile.stakeFactor;
    const stake = roundMoney(clamp(Math.round(rawStake / 5) * 5, 10, 300));
    const recentPendingChance = daysAgo <= 4 ? 0.24 : 0.055;
    const cashOutChance = 0.045;
    const outcomeRoll = random();
    const streakWave = Math.sin((index + houseIndex * 3) / 7) * 0.07;
    const winChance = clamp((1 / odd) * profile.skill + streakWave, 0.12, 0.74);
    let result;

    if (outcomeRoll < recentPendingChance) {
      result = "Pendente";
    } else if (outcomeRoll < recentPendingChance + cashOutChance) {
      result = "Cash Out";
    } else {
      result = random() < winChance ? "Green" : "Red";
    }

    const financialFields = getTicketFinancialFields(result, stake, odd, random);
    const ticketNumber = (ticketNumbersByDate.get(date) || 0) + 1;
    ticketNumbersByDate.set(date, ticketNumber);

    return {
      id: nextId(),
      user_id: userId,
      casa_id: Number(house.id),
      data: date,
      categoria: randomItem(random, CATEGORIES),
      odd,
      stake,
      retorno: financialFields.retorno,
      origem_stake: "Saldo",
      stake_saldo: stake,
      stake_deposito: 0,
      stake_bonus: 0,
      resultado: result,
      observacoes: randomItem(random, TICKET_NOTES),
      lucro: financialFields.lucro,
      stake_real: stake,
      recovered_real: financialFields.recovered_real,
      recovered_bonus: 0,
      perda_real: financialFields.perda_real,
      perda_bonus: 0,
      lucro_real: financialFields.lucro_real,
      numero_bilhete: ticketNumber,
      nome_bilhete: `Bilhete ${ticketNumber}`,
    };
  });
}

export function createDevMovements({ count = 42, houses, userId, days = 90, seed = "movements" }) {
  if (!Array.isArray(houses) || houses.length === 0) {
    throw new Error("É necessário ter ao menos uma casa para gerar movimentações.");
  }

  const nextId = createIdFactory(`${seed}:${userId}:movements`);
  const random = createRandom(hashString(`${seed}:${userId}:${count}:${houses.length}`));

  return Array.from({ length: count }, (_, index) => {
    const chronologicalPosition = count <= 1 ? 1 : index / (count - 1);
    const daysAgo = clamp(
      Math.round((1 - chronologicalPosition) * (days - 1)) + Math.floor(randomBetween(random, -2, 3)),
      0,
      days - 1
    );
    const house = houses[Math.floor(random() * houses.length) % houses.length];
    const roll = random();
    const type = index < houses.length || roll < 0.62
      ? "Depósito"
      : roll < 0.88
        ? "Saque"
        : "Ajuste";
    const value = type === "Depósito"
      ? roundMoney(Math.round(randomBetween(random, 120, 850) / 10) * 10)
      : type === "Saque"
        ? roundMoney(Math.round(randomBetween(random, 80, 520) / 10) * 10)
        : roundMoney(Math.round(randomBetween(random, 20, 180) / 5) * 5);
    const descriptions = {
      "Depósito": ["Aporte mensal via PIX", "Reforço de banca", "Depósito programado", "Entrada para nova estratégia"],
      "Saque": ["Retirada parcial de lucro", "Saque para conta bancária", "Realização de resultado", "Retirada programada"],
      "Ajuste": ["Correção de saldo", "Crédito promocional", "Ajuste de conciliação", "Bônus convertido em saldo"],
    };

    return {
      id: nextId(),
      user_id: userId,
      casa_id: Number(house.id),
      data: dateDaysAgo(daysAgo),
      tipo: type,
      valor: value,
      observacoes: randomItem(random, descriptions[type]),
    };
  });
}

export function createCompleteDevDataset({
  userId,
  houseCount = 7,
  ticketCount = 200,
  movementCount = 42,
  seed = DEFAULT_DEV_SEED,
}) {
  const houses = createDevHouses({ count: houseCount, userId, seed });
  const tickets = createDevTickets({ count: ticketCount, houses, userId, seed });
  const movements = createDevMovements({ count: movementCount, houses, userId, seed });

  return { houses, tickets, movements };
}
