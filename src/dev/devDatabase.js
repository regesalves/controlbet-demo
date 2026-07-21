import { supabase } from "../supabase";
import { invalidateBankingDataCache } from "../utils/bankingDataCache";
import {
  DEFAULT_DEV_SEED,
  DEV_DATA_ID_MAX,
  DEV_DATA_ID_MIN,
  createCompleteDevDataset,
  createDevHouses,
  createDevMovements,
  createRandomDevSeed,
  createDevTickets,
} from "./dataGenerator";

const INSERT_BATCH_SIZE = 100;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isLocalHostname() {
  if (typeof window === "undefined") return false;
  return ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
}

function assertDevelopmentEnvironment() {
  if (!import.meta.env.DEV || !isLocalHostname()) {
    throw new Error("As ferramentas de desenvolvimento só podem ser usadas localmente.");
  }
}

function assertAuthenticatedUser(userId) {
  if (!userId) {
    throw new Error("Entre em uma conta para gerar dados de teste.");
  }

  if (!UUID_PATTERN.test(String(userId))) {
    throw new Error("A sessão de desenvolvimento visual não grava no banco. Use uma conta autenticada do Supabase.");
  }
}

async function insertInBatches(table, rows) {
  for (let index = 0; index < rows.length; index += INSERT_BATCH_SIZE) {
    const batch = rows.slice(index, index + INSERT_BATCH_SIZE);
    const { error } = await supabase.from(table).insert(batch);

    if (error) {
      throw new Error(`Falha ao inserir ${table}: ${error.message || "erro desconhecido"}`);
    }
  }
}

async function loadUserHouses(userId) {
  const { data, error } = await supabase
    .from("houses")
    .select("id,nome,banca_inicial")
    .eq("user_id", userId)
    .order("id", { ascending: true });

  if (error) {
    throw new Error(`Falha ao carregar casas: ${error.message || "erro desconhecido"}`);
  }

  return data || [];
}

async function ensureUserHouses(userId) {
  const currentHouses = await loadUserHouses(userId);
  if (currentHouses.length > 0) return currentHouses;

  const houses = createDevHouses({ count: 7, userId, seed: "automatic-houses" });
  await insertInBatches("houses", houses);
  return houses;
}

async function deleteDevRows(table, userId) {
  const { error } = await supabase
    .from(table)
    .delete()
    .eq("user_id", userId)
    .gte("id", DEV_DATA_ID_MIN)
    .lte("id", DEV_DATA_ID_MAX);

  if (error) {
    throw new Error(`Falha ao limpar ${table}: ${error.message || "erro desconhecido"}`);
  }
}

function prepareOperation(userId) {
  assertDevelopmentEnvironment();
  assertAuthenticatedUser(userId);
}

function finishOperation(userId) {
  invalidateBankingDataCache(userId);
}

export async function clearDevDatabase(userId) {
  prepareOperation(userId);

  await deleteDevRows("tickets", userId);
  await deleteDevRows("movements", userId);
  await deleteDevRows("houses", userId);
  finishOperation(userId);

  return { houses: 0, tickets: 0, movements: 0 };
}

export async function populateCompleteDevDatabase(userId, { seed = DEFAULT_DEV_SEED } = {}) {
  prepareOperation(userId);
  await clearDevDatabase(userId);

  const dataset = createCompleteDevDataset({ userId, seed });
  await insertInBatches("houses", dataset.houses);
  await insertInBatches("tickets", dataset.tickets);
  await insertInBatches("movements", dataset.movements);
  finishOperation(userId);

  return {
    houses: dataset.houses.length,
    tickets: dataset.tickets.length,
    movements: dataset.movements.length,
    seed,
  };
}

export async function populateRandomDevDatabase(userId) {
  return populateCompleteDevDatabase(userId, { seed: createRandomDevSeed() });
}

export async function generateDevHouses(userId, count) {
  prepareOperation(userId);
  const houses = createDevHouses({ count, userId, seed: createRandomDevSeed("quick-houses") });
  await insertInBatches("houses", houses);
  finishOperation(userId);
  return { houses: houses.length, tickets: 0, movements: 0 };
}

export async function generateDevTickets(userId, count) {
  prepareOperation(userId);
  const houses = await ensureUserHouses(userId);
  const tickets = createDevTickets({ count, houses, userId, seed: createRandomDevSeed("quick-tickets") });
  await insertInBatches("tickets", tickets);
  finishOperation(userId);
  return { houses: 0, tickets: tickets.length, movements: 0 };
}

export async function generateDevMovements(userId, count) {
  prepareOperation(userId);
  const houses = await ensureUserHouses(userId);
  const movements = createDevMovements({ count, houses, userId, seed: createRandomDevSeed("quick-movements") });
  await insertInBatches("movements", movements);
  finishOperation(userId);
  return { houses: 0, tickets: 0, movements: movements.length };
}

export async function resetDevDatabase(userId) {
  return populateCompleteDevDatabase(userId, { seed: DEFAULT_DEV_SEED });
}
