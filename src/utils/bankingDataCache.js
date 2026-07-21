import { supabase } from "../supabase";

const CACHE_TTL_MS = 2 * 60 * 1000;
const bankingDataCache = new Map();
const pendingRequests = new Map();

function getCacheKey(userId) {
  return String(userId || "");
}

export function readCachedBankingData(userId) {
  const cacheKey = getCacheKey(userId);
  if (!cacheKey) return null;

  const entry = bankingDataCache.get(cacheKey);
  if (!entry) return null;

  if (Date.now() - entry.savedAt > CACHE_TTL_MS) {
    bankingDataCache.delete(cacheKey);
    return null;
  }

  return entry.data;
}

export function invalidateBankingDataCache(userId) {
  const cacheKey = getCacheKey(userId);

  if (cacheKey) {
    bankingDataCache.delete(cacheKey);
    return;
  }

  bankingDataCache.clear();
}

export async function loadBankingData(userId, { force = false } = {}) {
  const cacheKey = getCacheKey(userId);
  if (!cacheKey) {
    return { houses: [], tickets: [], movements: [] };
  }

  if (!force) {
    const cachedData = readCachedBankingData(cacheKey);
    if (cachedData) return cachedData;

    const pendingRequest = pendingRequests.get(cacheKey);
    if (pendingRequest) return pendingRequest;
  }

  const request = (async () => {
    const housesQuery = supabase
      .from("houses")
      .select("*")
      .eq("user_id", userId)
      .order("id", { ascending: true });
    const ticketsQuery = supabase
      .from("tickets")
      .select("*")
      .eq("user_id", userId)
      .order("id", { ascending: false });
    const movementsQuery = supabase
      .from("movements")
      .select("*")
      .eq("user_id", userId)
      .order("id", { ascending: false });

    const [housesResult, ticketsResult, movementsResult] = await Promise.all([
      housesQuery,
      ticketsQuery,
      movementsQuery,
    ]);

    const error = housesResult.error || ticketsResult.error || movementsResult.error;
    if (error) throw error;

    const data = {
      houses: housesResult.data || [],
      tickets: ticketsResult.data || [],
      movements: movementsResult.data || [],
    };

    bankingDataCache.set(cacheKey, {
      data,
      savedAt: Date.now(),
    });

    return data;
  })();

  pendingRequests.set(cacheKey, request);

  try {
    return await request;
  } finally {
    if (pendingRequests.get(cacheKey) === request) {
      pendingRequests.delete(cacheKey);
    }
  }
}
