// DEV-only auth bypass for local visual QA. Remove this file and its imports after testing.
export const isDevAuthBypassEnabled =
    import.meta.env.DEV && import.meta.env.VITE_BYPASS_AUTH === "true";

export const devUser = {
    id: "dev-user",
    name: "ControlBet Demo",
    email: "demo@controlbet.local",
    plan: "demo",
    user_metadata: {
        full_name: "ControlBet Demo",
        first_name: "ControlBet",
        last_name: "Portfolio Edition",
        name: "ControlBet Demo",
        plan: "demo",
    },
};

export const devSession = {
    access_token: "dev-auth-bypass",
    token_type: "bearer",
    user: devUser,
};
