// DEV-only auth bypass for local visual QA. Remove this file and its imports after testing.
export const isDevAuthBypassEnabled =
    import.meta.env.DEV && import.meta.env.VITE_BYPASS_AUTH === "true";

export const devUser = {
    id: "dev-user",
    name: "RÃ©ges Alves",
    email: "dev@controlbet.local",
    plan: "free",
    user_metadata: {
        full_name: "Réges Alves",
        first_name: "Réges",
        last_name: "Alves",
        name: "Réges Alves",
        plan: "free",
    },
};

export const devSession = {
    access_token: "dev-auth-bypass",
    token_type: "bearer",
    user: devUser,
};
