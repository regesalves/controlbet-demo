import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase";
import { AuthContext } from "./AuthContext";
import { devSession, devUser, isDevAuthBypassEnabled } from "./devAuth";

export function AuthProvider({ children }) {
    const [session, setSession] = useState(() => (isDevAuthBypassEnabled ? devSession : null));
    const [user, setUser] = useState(() => (isDevAuthBypassEnabled ? devUser : null));
    const [loading, setLoading] = useState(() => !isDevAuthBypassEnabled);

    const applySession = useCallback((currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
    }, []);

    const clearSession = useCallback(() => {
        if (isDevAuthBypassEnabled) {
            applySession(devSession);
            setLoading(false);
            return;
        }

        applySession(null);
        setLoading(false);
    }, [applySession]);

    const refreshSession = useCallback(async () => {
        if (isDevAuthBypassEnabled) {
            applySession(devSession);
            setLoading(false);
            return { session: devSession, error: null };
        }

        try {
            setLoading(true);

            const { data, error } = await supabase.auth.getSession();

            if (error) {
                console.error("Erro ao carregar sessao:", error);
                applySession(null);
                return { session: null, error };
            }

            const currentSession = data?.session ?? null;
            applySession(currentSession);
            return { session: currentSession, error: null };
        } catch (error) {
            console.error("Erro ao carregar sessao:", error);
            applySession(null);
            return { session: null, error };
        } finally {
            setLoading(false);
        }
    }, [applySession]);

    const signOut = useCallback(async () => {
        if (isDevAuthBypassEnabled) {
            applySession(devSession);
            setLoading(false);
            return { error: null };
        }

        try {
            const { error } = await supabase.auth.signOut();

            if (error) {
                return { error };
            }

            applySession(null);
            return { error: null };
        } catch (error) {
            return { error };
        }
    }, [applySession]);

    useEffect(() => {
        if (isDevAuthBypassEnabled) {
            // DEV-only auth bypass for local screenshots; real auth remains active otherwise.
            applySession(devSession);
            setLoading(false);
            return undefined;
        }

        let mounted = true;

        async function loadSession() {
            setLoading(true);

            try {
                const { data, error } = await supabase.auth.getSession();

                if (!mounted) return;

                if (error) {
                    console.error("Erro ao carregar sessao:", error);
                    applySession(null);
                } else {
                    applySession(data?.session ?? null);
                }
            } catch (error) {
                if (!mounted) return;

                console.error("Erro ao carregar sessao:", error);
                applySession(null);
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        }

        loadSession();

        const { data: listener } = supabase.auth.onAuthStateChange((_event, currentSession) => {
            if (!mounted) return;

            applySession(currentSession);
            setLoading(false);
        });

        return () => {
            mounted = false;
            listener?.subscription?.unsubscribe?.();
        };
    }, [applySession]);

    const value = useMemo(() => ({
        clearSession,
        loading,
        refreshSession,
        session,
        signOut,
        user,
    }), [clearSession, loading, refreshSession, session, signOut, user]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}
