import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [session, setSession] = useState(null);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        async function loadSession() {
            const { data, error } = await supabase.auth.getSession();

            if (!mounted) return;

            if (error) {
                console.error("Erro ao carregar sessão:", error);
                setSession(null);
                setUser(null);
            } else {
                setSession(data.session);
                setUser(data.session?.user ?? null);
            }

            setLoading(false);
        }

        loadSession();

        const { data: listener } = supabase.auth.onAuthStateChange((_event, currentSession) => {
            setSession(currentSession);
            setUser(currentSession?.user ?? null);
            setLoading(false);
        });

        return () => {
            mounted = false;
            listener.subscription.unsubscribe();
        };
    }, []);

    const value = useMemo(() => ({
        loading,
        session,
        user,
    }), [loading, session, user]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error("useAuth deve ser usado dentro de AuthProvider");
    }

    return context;
}
