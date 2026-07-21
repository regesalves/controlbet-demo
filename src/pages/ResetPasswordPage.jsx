import { Link, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import logo from "../assets/logo.png";
import { supabase } from "../supabase";
import { useAuth } from "../auth/AuthContext";

const passwordRequirements = [
    {
        id: "minLength",
        label: "8 caracteres",
        test: (value) => value.length >= 8,
    },
    {
        id: "uppercase",
        label: "letra maiúscula",
        test: (value) => /[A-Z]/.test(value),
    },
    {
        id: "lowercase",
        label: "letra minúscula",
        test: (value) => /[a-z]/.test(value),
    },
    {
        id: "number",
        label: "número",
        test: (value) => /\d/.test(value),
    },
    {
        id: "symbol",
        label: "símbolo",
        test: (value) => /[^A-Za-z0-9]/.test(value),
    },
];

const RECOVERY_SESSION_STORAGE_KEY = "controlbet_password_recovery";

function hasRecoveryUrlMarker() {
    if (typeof window === "undefined") return false;

    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const searchParams = new URLSearchParams(window.location.search);

    return hashParams.get("type") === "recovery" || searchParams.get("type") === "recovery";
}

export default function ResetPasswordPage({ landingTheme }) {
    const navigate = useNavigate();
    const { loading: authLoading, session } = useAuth();
    const [checkedSession, setCheckedSession] = useState(false);
    const [hasRecoverySession, setHasRecoverySession] = useState(false);
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isPasswordFocused, setIsPasswordFocused] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [feedback, setFeedback] = useState({ type: "", message: "" });

    const passwordChecks = useMemo(
        () => passwordRequirements.map((requirement) => ({
            ...requirement,
            isValid: requirement.test(password),
        })),
        [password]
    );
    const isPasswordStrong = passwordChecks.every((requirement) => requirement.isValid);
    const shouldShowPasswordRequirements = isPasswordFocused || password.length > 0;
    const isCheckingLink = authLoading || !checkedSession;

    useEffect(() => {
        let isMounted = true;
        const hasUrlRecoveryMarker = hasRecoveryUrlMarker();

        if (hasUrlRecoveryMarker) {
            window.sessionStorage.setItem(RECOVERY_SESSION_STORAGE_KEY, "true");
        }

        async function checkSession() {
            if (authLoading) return;

            const { data, error } = await supabase.auth.getSession();

            if (!isMounted) return;

            const currentSession = data?.session ?? session;
            const hasStoredRecoveryMarker =
                window.sessionStorage.getItem(RECOVERY_SESSION_STORAGE_KEY) === "true";

            setHasRecoverySession(Boolean(currentSession) && !error && (hasUrlRecoveryMarker || hasStoredRecoveryMarker));
            setCheckedSession(true);
        }

        const { data: listener } = supabase.auth.onAuthStateChange((event) => {
            if (event !== "PASSWORD_RECOVERY") return;

            window.sessionStorage.setItem(RECOVERY_SESSION_STORAGE_KEY, "true");

            if (isMounted) {
                setHasRecoverySession(true);
                setCheckedSession(true);
            }
        });

        checkSession();

        return () => {
            isMounted = false;
            listener.subscription.unsubscribe();
        };
    }, [authLoading, session]);

    async function handleSubmit(event) {
        event.preventDefault();

        if (isSaving || isCheckingLink) return;

        setFeedback({ type: "", message: "" });

        if (!hasRecoverySession) {
            setFeedback({
                type: "error",
                message: "Link inválido ou expirado. Solicite uma nova recuperação de senha.",
            });
            return;
        }

        if (!isPasswordStrong) {
            setFeedback({
                type: "error",
                message: "Crie uma senha mais forte antes de continuar.",
            });
            return;
        }

        if (password !== confirmPassword) {
            setFeedback({
                type: "error",
                message: "A nova senha e a confirmação precisam ser iguais.",
            });
            return;
        }

        setIsSaving(true);

        const { error } = await supabase.auth.updateUser({ password });

        setIsSaving(false);

        if (error) {
            setFeedback({
                type: "error",
                message: "Não foi possível redefinir sua senha. Solicite uma nova recuperação de senha.",
            });
            return;
        }

        setFeedback({
            type: "success",
            message: "Senha redefinida com sucesso. Você será redirecionado para entrar novamente.",
        });

        window.sessionStorage.removeItem(RECOVERY_SESSION_STORAGE_KEY);

        setTimeout(() => {
            navigate("/login", { replace: true });
        }, 1800);
    }

    return (
        <div className="landing-page auth-page" data-theme={landingTheme}>
            <main className="auth-main auth-login-main">
                <section className="auth-card login-card reset-password-card">
                    <Link className="auth-card-logo-link" to="/" aria-label="Voltar para a landing do ControlBet">
                        <img src={logo} alt="ControlBet" className="auth-card-logo" />
                    </Link>

                    <div className="auth-card-header">
                        <h1>Redefinir senha</h1>
                        <p>Crie uma nova senha segura para acessar sua conta.</p>
                    </div>

                    {isCheckingLink ? (
                        <p className="auth-message auth-message-info">Validando link de recuperação...</p>
                    ) : !hasRecoverySession ? (
                        <p className="auth-message auth-message-error">
                            Link inválido ou expirado. Solicite uma nova recuperação de senha.
                        </p>
                    ) : (
                        <form className="auth-form" onSubmit={handleSubmit}>
                            <label>
                                Nova senha
                                <input
                                    type="password"
                                    placeholder="Digite sua nova senha"
                                    autoComplete="new-password"
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                    onFocus={() => setIsPasswordFocused(true)}
                                    onBlur={() => setIsPasswordFocused(false)}
                                    required
                                    disabled={isSaving}
                                />
                            </label>

                            {shouldShowPasswordRequirements && (
                                <div className="auth-password-box">
                                    {isPasswordStrong ? (
                                        <span className="auth-password-strong">✓ Senha forte</span>
                                    ) : (
                                        <>
                                            <span className="auth-password-title">Sua senha deve conter:</span>
                                            <ul className="auth-password-requirements" aria-label="Requisitos da senha">
                                                {passwordChecks.map((requirement) => (
                                                    <li key={requirement.id} className={requirement.isValid ? "is-valid" : ""}>
                                                        <span aria-hidden="true">{requirement.isValid ? "✓" : "○"}</span>
                                                        {requirement.label}
                                                    </li>
                                                ))}
                                            </ul>
                                        </>
                                    )}
                                </div>
                            )}

                            <label>
                                Confirmar nova senha
                                <input
                                    type="password"
                                    placeholder="Digite novamente"
                                    autoComplete="new-password"
                                    value={confirmPassword}
                                    onChange={(event) => setConfirmPassword(event.target.value)}
                                    required
                                    disabled={isSaving}
                                />
                            </label>

                            {feedback.message && (
                                <p className={`auth-message ${feedback.type === "success" ? "auth-message-success" : "auth-message-error"}`}>
                                    {feedback.message}
                                </p>
                            )}

                            <button type="submit" className="auth-submit-button" disabled={isSaving}>
                                {isSaving ? "Salvando..." : "Salvar nova senha"}
                            </button>
                        </form>
                    )}

                    <p className="auth-switch">
                        Lembrou sua senha? <Link to="/login">Entrar</Link>
                    </p>
                </section>
            </main>
        </div>
    );
}
