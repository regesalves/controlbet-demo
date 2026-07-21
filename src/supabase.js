import { createClient } from "@supabase/supabase-js";

const env = import.meta.env || {};
const supabaseUrl = normalizeEnvValue(env.VITE_SUPABASE_URL);
const supabaseAnonKey = normalizeEnvValue(env.VITE_SUPABASE_ANON_KEY);

function normalizeEnvValue(value) {
    return typeof value === "string" ? value.trim() : "";
}

function isValidHttpUrl(value) {
    try {
        const url = new URL(value);
        return url.protocol === "https:" || url.protocol === "http:";
    } catch {
        return false;
    }
}

function getSupabaseConfigError() {
    const missing = [];

    if (!supabaseUrl) missing.push("VITE_SUPABASE_URL");
    if (!supabaseAnonKey) missing.push("VITE_SUPABASE_ANON_KEY");

    if (missing.length > 0) {
        return `Missing Supabase environment variables: ${missing.join(", ")}.`;
    }

    if (!isValidHttpUrl(supabaseUrl)) {
        return "Invalid VITE_SUPABASE_URL. Expected a valid http(s) URL.";
    }

    return "";
}

function createUnavailableResult(error) {
    return { data: null, error };
}

function createUnavailableQuery(error) {
    const query = {};
    const chainMethods = [
        "delete",
        "eq",
        "filter",
        "gt",
        "gte",
        "in",
        "insert",
        "is",
        "limit",
        "lt",
        "lte",
        "match",
        "maybeSingle",
        "neq",
        "not",
        "or",
        "order",
        "range",
        "select",
        "single",
        "throwOnError",
        "update",
        "upsert",
    ];

    chainMethods.forEach((method) => {
        query[method] = () => query;
    });

    query.then = (onFulfilled, onRejected) =>
        Promise.resolve(createUnavailableResult(error)).then(onFulfilled, onRejected);
    query.catch = (onRejected) =>
        Promise.resolve(createUnavailableResult(error)).catch(onRejected);
    query.finally = (onFinally) =>
        Promise.resolve(createUnavailableResult(error)).finally(onFinally);

    return query;
}

function createUnavailableSupabaseClient(error) {
    const authResult = async () => createUnavailableResult(error);
    const unavailableStorageBucket = {
        getPublicUrl: () => ({ data: { publicUrl: "" } }),
        upload: authResult,
    };

    return {
        auth: {
            getSession: async () => ({ data: { session: null }, error }),
            getUser: async () => ({ data: { user: null }, error }),
            onAuthStateChange: () => ({
                data: {
                    subscription: {
                        unsubscribe() {},
                    },
                },
            }),
            refreshSession: authResult,
            resend: authResult,
            resetPasswordForEmail: authResult,
            signInWithPassword: authResult,
            signOut: authResult,
            signUp: authResult,
            updateUser: authResult,
        },
        from: () => createUnavailableQuery(error),
        rpc: () => createUnavailableQuery(error),
        storage: {
            from: () => unavailableStorageBucket,
        },
    };
}

export const supabaseConfigError = getSupabaseConfigError();
export const isSupabaseConfigured = !supabaseConfigError;

if (supabaseConfigError) {
    console.error(supabaseConfigError);
}

export const supabase = isSupabaseConfigured
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            autoRefreshToken: true,
            detectSessionInUrl: true,
            persistSession: true,
        },
    })
    : createUnavailableSupabaseClient(new Error(supabaseConfigError));
