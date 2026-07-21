import { createCompleteDevDataset } from "../dev/dataGenerator";

const TEST_MODE_FLAG = "true";
const STATE_STORAGE_KEY = "controlbet_test_supabase_state";
const TEST_USER_ID = "11111111-1111-4111-8111-111111111111";
const TEST_USER_EMAIL = "qa@controlbet.local";
const TEST_USER_PASSWORD = "ControlBet123!";

const TEST_USER = {
    id: TEST_USER_ID,
    email: TEST_USER_EMAIL,
    password: TEST_USER_PASSWORD,
    created_at: "2026-01-01T12:00:00.000Z",
    last_sign_in_at: null,
    user_metadata: {
        accepted_privacy_at: "2026-01-01T12:00:00.000Z",
        accepted_terms_at: "2026-01-01T12:00:00.000Z",
        first_name: "QA",
        full_name: "QA ControlBet",
        last_name: "ControlBet",
        name: "QA ControlBet",
        phone: "11999999999",
        plan: "free",
        username: "qa.controlbet",
    },
};

function isTestModeEnabled() {
    return String(import.meta.env?.VITE_TEST_MODE || "") === TEST_MODE_FLAG;
}

function safeWindow() {
    return typeof window !== "undefined" ? window : null;
}

function createUuid() {
    return safeWindow()?.crypto?.randomUUID?.() || `11111111-1111-4111-8111-${Math.random().toString(16).slice(2, 14).padEnd(12, "1")}`;
}

function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
}

function createPlaceholderImageDataUrl(seedText = "CB") {
    const safeLabel = String(seedText || "CB").slice(0, 3).toUpperCase();
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
            <defs>
                <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#0f1b2d"/>
                    <stop offset="100%" stop-color="#e11d2e"/>
                </linearGradient>
            </defs>
            <rect width="256" height="256" rx="48" fill="url(#bg)"/>
            <circle cx="128" cy="128" r="92" fill="rgba(255,255,255,0.08)"/>
            <text x="128" y="145" text-anchor="middle" font-family="Arial, sans-serif" font-size="72" font-weight="700" fill="#ffffff">${safeLabel}</text>
        </svg>
    `;

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function createInitialState() {
    const dataset = createCompleteDevDataset({ userId: TEST_USER.id, seed: "controlbet-test-suite" });

    return {
        currentSession: null,
        storage: {},
        tables: {
            houses: dataset.houses,
            movements: dataset.movements,
            tickets: dataset.tickets,
        },
        users: [TEST_USER],
        version: 1,
    };
}

function readState() {
    const currentWindow = safeWindow();
    if (!currentWindow) return createInitialState();

    try {
        const raw = currentWindow.localStorage.getItem(STATE_STORAGE_KEY);
        if (!raw) return createInitialState();

        const parsed = JSON.parse(raw);
        if (!parsed || parsed.version !== 1) return createInitialState();

        return {
            ...createInitialState(),
            ...parsed,
            tables: {
                houses: Array.isArray(parsed.tables?.houses) ? parsed.tables.houses : [],
                movements: Array.isArray(parsed.tables?.movements) ? parsed.tables.movements : [],
                tickets: Array.isArray(parsed.tables?.tickets) ? parsed.tables.tickets : [],
            },
            users: Array.isArray(parsed.users) && parsed.users.length > 0 ? parsed.users : [TEST_USER],
        };
    } catch {
        return createInitialState();
    }
}

function writeState(state) {
    const currentWindow = safeWindow();
    if (!currentWindow) return;

    currentWindow.localStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(state));
}

function createSessionFromUser(user) {
    return {
        access_token: `test-session-${user.id}`,
        expires_at: null,
        token_type: "bearer",
        user: publicUser(user),
    };
}

function publicUser(user) {
    if (!user) return null;

    return {
        created_at: user.created_at,
        email: user.email,
        id: user.id,
        last_sign_in_at: user.last_sign_in_at || null,
        user_metadata: clone(user.user_metadata || {}),
        identities: [{ provider: "email" }],
    };
}

function ensureUserDefaults(user) {
    return {
        created_at: user.created_at || new Date().toISOString(),
        email: String(user.email || "").toLowerCase(),
        id: user.id || createUuid(),
        last_sign_in_at: user.last_sign_in_at || null,
        password: user.password || TEST_USER_PASSWORD,
        user_metadata: {
            ...clone(TEST_USER.user_metadata),
            ...(clone(user.user_metadata || {})),
        },
    };
}

function normalizeTableRow(table, row, userId) {
    const copy = clone(row) || {};

    if (copy.user_id == null && userId) {
        copy.user_id = userId;
    }

    if (table === "houses") {
        copy.logo_url = copy.logo_url ?? null;
    }

    return copy;
}

function getStore(state, table) {
    if (!state.tables[table]) {
        state.tables[table] = [];
    }

    return state.tables[table];
}

function passesFilter(row, filter) {
    const value = row?.[filter.field];

    switch (filter.op) {
        case "eq":
            return value === filter.value;
        case "neq":
            return value !== filter.value;
        case "gt":
            return Number(value) > Number(filter.value);
        case "gte":
            return Number(value) >= Number(filter.value);
        case "lt":
            return Number(value) < Number(filter.value);
        case "lte":
            return Number(value) <= Number(filter.value);
        case "in":
            return Array.isArray(filter.value) && filter.value.includes(value);
        case "is":
            return filter.value === null ? value == null : value === filter.value;
        default:
            return true;
    }
}

function sortRows(rows, order) {
    if (!order?.field) return rows;

    const factor = order.ascending === false ? -1 : 1;

    return [...rows].sort((left, right) => {
        const leftValue = left?.[order.field];
        const rightValue = right?.[order.field];

        if (leftValue == null && rightValue == null) return 0;
        if (leftValue == null) return 1 * factor;
        if (rightValue == null) return -1 * factor;

        if (typeof leftValue === "number" && typeof rightValue === "number") {
            return (leftValue - rightValue) * factor;
        }

        return String(leftValue).localeCompare(String(rightValue), "pt-BR") * factor;
    });
}

function resolveFilters(rows, filters) {
    return rows.filter((row) => filters.every((filter) => passesFilter(row, filter)));
}

function buildQueryResult(data, singleMode) {
    if (singleMode) {
        return { data: data[0] ?? null, error: null };
    }

    return { data, error: null };
}

function createQuery(state, table) {
    const query = {
        _filters: [],
        _limit: null,
        _order: null,
        _operation: "select",
        _payload: null,
        _range: null,
        _single: false,
        _table: table,

        catch(onRejected) {
            return Promise.resolve(this.then()).catch(onRejected);
        },

        delete() {
            this._operation = "delete";
            return this;
        },

        eq(field, value) {
            this._filters.push({ field, op: "eq", value });
            return this;
        },

        filter(field, op, value) {
            this._filters.push({ field, op, value });
            return this;
        },

        gt(field, value) {
            this._filters.push({ field, op: "gt", value });
            return this;
        },

        gte(field, value) {
            this._filters.push({ field, op: "gte", value });
            return this;
        },

        in(field, value) {
            this._filters.push({ field, op: "in", value });
            return this;
        },

        insert(payload) {
            this._operation = "insert";
            this._payload = payload;
            return this;
        },

        is(field, value) {
            this._filters.push({ field, op: "is", value });
            return this;
        },

        limit(value) {
            this._limit = Number(value);
            return this;
        },

        lt(field, value) {
            this._filters.push({ field, op: "lt", value });
            return this;
        },

        lte(field, value) {
            this._filters.push({ field, op: "lte", value });
            return this;
        },

        match(criteria) {
            Object.entries(criteria || {}).forEach(([field, value]) => {
                this._filters.push({ field, op: "eq", value });
            });
            return this;
        },

        maybeSingle() {
            this._single = true;
            return this;
        },

        neq(field, value) {
            this._filters.push({ field, op: "neq", value });
            return this;
        },

        or() {
            return this;
        },

        order(field, options = {}) {
            this._order = { field, ascending: options.ascending !== false };
            return this;
        },

        range(from, to) {
            this._range = { from: Number(from), to: Number(to) };
            return this;
        },

        select() {
            this._operation = "select";
            return this;
        },

        single() {
            this._single = true;
            return this;
        },

        then(onFulfilled, onRejected) {
            return Promise.resolve(executeQuery(state, this)).then(onFulfilled, onRejected);
        },

        throwOnError() {
            return this;
        },

        update(payload) {
            this._operation = "update";
            this._payload = payload;
            return this;
        },
    };

    return query;
}

function executeQuery(state, query) {
    const store = getStore(state, query._table);
    const currentUserId = state.currentSession?.user?.id || TEST_USER.id;

    if (query._operation === "insert") {
        const rows = Array.isArray(query._payload) ? query._payload : [query._payload];
        const inserted = rows.map((row) => normalizeTableRow(query._table, row, currentUserId));
        store.push(...inserted);
        writeState(state);
        return { data: clone(inserted), error: null };
    }

    const filteredRows = resolveFilters(store, query._filters);
    const orderedRows = sortRows(filteredRows, query._order);
    const rangedRows = query._range
        ? orderedRows.slice(query._range.from, query._range.to + 1)
        : orderedRows;
    const limitedRows = typeof query._limit === "number"
        ? rangedRows.slice(0, query._limit)
        : rangedRows;

    if (query._operation === "update") {
        const updatedRows = [];

        store.forEach((row, index) => {
            if (!filteredRows.includes(row)) return;

            const nextRow = { ...row, ...clone(query._payload) };
            store[index] = nextRow;
            updatedRows.push(nextRow);
        });

        writeState(state);
        return { data: clone(updatedRows), error: null };
    }

    if (query._operation === "delete") {
        const removedRows = [];
        state.tables[query._table] = store.filter((row) => {
            const shouldRemove = filteredRows.includes(row);
            if (shouldRemove) removedRows.push(row);
            return !shouldRemove;
        });
        writeState(state);
        return { data: clone(removedRows), error: null };
    }

    return buildQueryResult(clone(limitedRows), query._single);
}

function createStorageBucket(state, bucketName) {
    if (!state.storage[bucketName]) {
        state.storage[bucketName] = {};
    }

    return {
        async upload(path, file) {
            let publicUrl = createPlaceholderImageDataUrl(path);

            try {
                if (file && typeof FileReader !== "undefined" && typeof Blob !== "undefined" && file instanceof Blob) {
                    publicUrl = await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(String(reader.result));
                        reader.onerror = () => reject(reader.error || new Error("Falha ao ler arquivo."));
                        reader.readAsDataURL(file);
                    });
                }
            } catch {
                publicUrl = createPlaceholderImageDataUrl(path);
            }

            state.storage[bucketName][path] = publicUrl;
            writeState(state);
            return { data: { path }, error: null };
        },

        getPublicUrl(path) {
            return {
                data: {
                    publicUrl: state.storage[bucketName][path] || createPlaceholderImageDataUrl(path),
                },
            };
        },
    };
}

function createRpcResult(state, name, params) {
    if (name !== "check_profile_availability") {
        return { data: null, error: null };
    }

    const username = String(params?.p_username || "").trim().toLowerCase();
    const phone = String(params?.p_phone || "").trim();
    const currentUserId = state.currentSession?.user?.id;

    const duplicates = state.users.filter((user) => user.id !== currentUserId);
    const usernameAvailable = !username || !duplicates.some((user) => String(user.user_metadata?.username || "").toLowerCase() === username);
    const phoneAvailable = !phone || !duplicates.some((user) => String(user.user_metadata?.phone || "") === phone);

    return {
        data: {
            phone_available: phoneAvailable,
            username_available: usernameAvailable,
        },
        error: null,
    };
}

export function getTestSupabaseAuthUser() {
    return publicUser(TEST_USER);
}

export function getTestSupabaseCredentials() {
    return {
        email: TEST_USER_EMAIL,
        password: TEST_USER_PASSWORD,
    };
}

export function resetTestSupabaseState() {
    const currentWindow = safeWindow();
    if (!currentWindow) return;

    currentWindow.localStorage.removeItem(STATE_STORAGE_KEY);
}

export function createTestSupabaseClient() {
    const state = readState();
    const listeners = new Set();

    function emitAuthStateChange(event) {
        const session = state.currentSession ? clone(state.currentSession) : null;
        listeners.forEach((listener) => {
            try {
                listener(event, session);
            } catch {
                // Ignore listener failures so test mode keeps moving.
            }
        });
    }

    function saveCurrentSession(session) {
        state.currentSession = session ? clone(session) : null;
        if (state.currentSession?.user) {
            const userIndex = state.users.findIndex((user) => user.id === state.currentSession.user.id);
            if (userIndex >= 0) {
                state.users[userIndex] = {
                    ...state.users[userIndex],
                    ...clone(state.currentSession.user),
                };
            }
        }
        writeState(state);
    }

    function findUserByEmail(email) {
        return state.users.find((user) => String(user.email || "").toLowerCase() === String(email || "").toLowerCase()) || null;
    }

    function createOrUpdateUserFromMetadata({ email, password, data = {}, existingUser = null }) {
        const baseUser = existingUser || {
            created_at: new Date().toISOString(),
            id: createUuid(),
            last_sign_in_at: null,
            password,
            user_metadata: {},
        };

        const mergedUser = ensureUserDefaults({
            ...baseUser,
            email,
            password,
            user_metadata: {
                ...baseUser.user_metadata,
                ...clone(data),
            },
        });

        const userIndex = state.users.findIndex((user) => user.id === mergedUser.id);
        if (userIndex >= 0) {
            state.users[userIndex] = mergedUser;
        } else {
            state.users.push(mergedUser);
        }

        const session = createSessionFromUser(mergedUser);
        saveCurrentSession(session);
        emitAuthStateChange("SIGNED_IN");
        return mergedUser;
    }

    return {
        auth: {
            async getSession() {
                return { data: { session: state.currentSession ? clone(state.currentSession) : null }, error: null };
            },

            async getUser() {
                return { data: { user: state.currentSession?.user ? clone(state.currentSession.user) : null }, error: null };
            },

            onAuthStateChange(callback) {
                listeners.add(callback);
                return {
                    data: {
                        subscription: {
                            unsubscribe() {
                                listeners.delete(callback);
                            },
                        },
                    },
                };
            },

            async refreshSession() {
                return { data: { session: state.currentSession ? clone(state.currentSession) : null }, error: null };
            },

            async resend() {
                return { data: null, error: null };
            },

            async resetPasswordForEmail(email) {
                const user = findUserByEmail(email);
                if (!user) {
                    return { data: null, error: new Error("User not found") };
                }

                return { data: { user: publicUser(user) }, error: null };
            },

            async signInWithPassword({ email, password }) {
                const user = findUserByEmail(email);

                if (!user || String(user.password || "") !== String(password || "")) {
                    return { data: null, error: new Error("Invalid login credentials") };
                }

                const signedInUser = ensureUserDefaults({
                    ...user,
                    last_sign_in_at: new Date().toISOString(),
                });
                state.users[state.users.findIndex((item) => item.id === signedInUser.id)] = signedInUser;

                const session = createSessionFromUser(signedInUser);
                saveCurrentSession(session);
                emitAuthStateChange("SIGNED_IN");

                return { data: { user: publicUser(signedInUser), session }, error: null };
            },

            async signOut() {
                saveCurrentSession(null);
                emitAuthStateChange("SIGNED_OUT");
                return { data: null, error: null };
            },

            async signUp({ email, password, options = {} }) {
                const existingUser = findUserByEmail(email);
                if (existingUser) {
                    return {
                        data: {
                            session: null,
                            user: {
                                ...publicUser(existingUser),
                                identities: [],
                            },
                        },
                        error: null,
                    };
                }

                const user = createOrUpdateUserFromMetadata({
                    data: options.data || {},
                    email,
                    password,
                });

                return { data: { session: clone(state.currentSession), user: publicUser(user) }, error: null };
            },

            async updateUser(payload = {}) {
                const currentUser = state.currentSession?.user ? findUserByEmail(state.currentSession.user.email) : null;
                if (!currentUser) {
                    return { data: null, error: new Error("No active session") };
                }

                const nextEmail = payload.email ? String(payload.email).trim().toLowerCase() : currentUser.email;
                const emailExists = state.users.some((user) => user.id !== currentUser.id && String(user.email || "").toLowerCase() === nextEmail);
                if (payload.email && emailExists) {
                    return { data: null, error: new Error("Email already in use") };
                }

                const nextUser = ensureUserDefaults({
                    ...currentUser,
                    email: nextEmail,
                    password: payload.password || currentUser.password,
                    user_metadata: {
                        ...currentUser.user_metadata,
                        ...(clone(payload.data || {}) || {}),
                    },
                });

                const userIndex = state.users.findIndex((user) => user.id === currentUser.id);
                if (userIndex >= 0) {
                    state.users[userIndex] = nextUser;
                }

                const session = createSessionFromUser(nextUser);
                saveCurrentSession(session);
                emitAuthStateChange("USER_UPDATED");

                return { data: { user: publicUser(nextUser), session }, error: null };
            },
        },

        from(table) {
            return createQuery(state, table);
        },

        rpc(name, params) {
            const result = createRpcResult(state, name, params);
            return {
                maybeSingle() {
                    return Promise.resolve(result);
                },
                then(onFulfilled, onRejected) {
                    return Promise.resolve(result).then(onFulfilled, onRejected);
                },
            };
        },

        storage: {
            from(bucketName) {
                return createStorageBucket(state, bucketName);
            },
        },
    };
}

export const testSupabaseModeEnabled = isTestModeEnabled();
