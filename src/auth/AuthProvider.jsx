import { useCallback, useMemo, useState } from "react";
import { AuthContext } from "./AuthContext";
import { DEMO_SESSION, DEMO_USER } from "../demo/demoData";

export function AuthProvider({ children }) {
    const [session] = useState(DEMO_SESSION);
    const [user] = useState(DEMO_USER);
    const loading = false;

    const clearSession = useCallback(async () => ({ error: null }), []);
    const refreshSession = useCallback(async () => ({ session, error: null }), [session]);
    const signOut = useCallback(async () => ({ error: null }), []);

    const value = useMemo(() => ({
        clearSession,
        loading,
        refreshSession,
        session,
        signOut,
        user,
    }), [clearSession, loading, refreshSession, session, signOut, user]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
