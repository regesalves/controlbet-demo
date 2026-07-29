import { createContext, useContext } from "react";

export const AuthContext = createContext(null);

export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        return {
            clearSession: async () => ({ error: null }),
            loading: false,
            refreshSession: async () => ({ session: null, error: null }),
            session: null,
            signOut: async () => ({ error: null }),
            user: null,
        };
    }

    return context;
}
