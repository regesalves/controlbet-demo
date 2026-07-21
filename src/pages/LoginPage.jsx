import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import logo from "../assets/logo.png";
import { supabase } from "../supabase";
import { useAuth } from "../auth/AuthContext";

export default function LoginPage({ landingTheme }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { refreshSession } = useAuth();
    const isLegacyRecoveryFlowEnabled = false;
    const initialFeedback = location.state?.message
        ? { type: "success", message: location.state.message }
        : { type: "", message: "" };
    const [loginEmail, setLoginEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isRecoveryLoading, setIsRecoveryLoading] = useState(false);
    const [feedback, setFeedback] = useState(initialFeedback);
    const [isAccessRecoveryOpen, setIsAccessRecoveryOpen] = useState(false);
    const [recoveryEmail, setRecoveryEmail] = useState("");
    const [supportIdentifier, setSupportIdentifier] = useState("");
    const [accessFeedback, setAccessFeedback] = useState({ type: "", message: "" });

    useEffect(() => {
        if (!location.state?.message) return;

        window.history.replaceState({}, document.title);
    }, [location.state]);

    function isEmail(value) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    }

    function getLoginErrorMessage(message = "") {
        const normalizedMessage = message.toLowerCase();

        if (normalizedMessage.includes("invalid login credentials")) {
            return "E-mail ou senha invalidos. Confira os dados e tente novamente.";
        }

        if (normalizedMessage.includes("email not confirmed")) {
            return "Seu e-mail ainda nao foi confirmado. Verifique sua caixa de entrada.";
        }

        return "Nao foi possivel entrar agora. Tente novamente em instantes.";
    }

    async function handleSubmit(event) {
        event.preventDefault();

        if (isLoading) return;

        const trimmedLoginEmail = loginEmail.trim();

        if (!isEmail(trimmedLoginEmail)) {
            setFeedback({
                type: "error",
                message: "Informe um e-mail valido para entrar.",
            });
            return;
        }

        setFeedback({ type: "", message: "" });
        setIsLoading(true);

        const { error } = await supabase.auth.signInWithPassword({
            email: trimmedLoginEmail,
            password,
        });

        if (error) {
            setIsLoading(false);
            setFeedback({ type: "error", message: getLoginErrorMessage(error.message) });
            return;
        }

        const { error: sessionError } = await refreshSession();
        setIsLoading(false);

        if (sessionError) {
            setFeedback({
                type: "error",
                message: "Nao foi possivel confirmar sua sessao. Tente entrar novamente.",
            });
            return;
        }

        navigate("/dashboard");
    }

    async function handlePasswordReset(event) {
        event.preventDefault();

        if (isRecoveryLoading) return;

        const trimmedRecoveryEmail = recoveryEmail.trim();

        if (!trimmedRecoveryEmail) {
            setAccessFeedback({
                type: "error",
                message: "Informe o e-mail cadastrado para receber as instrucoes de recuperacao.",
            });
            return;
        }

        setAccessFeedback({ type: "", message: "" });
        setIsRecoveryLoading(true);

        const redirectTo = `${window.location.origin}/redefinir-senha`;
        const { error } = await supabase.auth.resetPasswordForEmail(trimmedRecoveryEmail, {
            redirectTo,
        });

        setIsRecoveryLoading(false);

        if (error) {
            setAccessFeedback({
                type: "error",
                message: "Nao foi possivel enviar as instrucoes agora. Confira o e-mail e tente novamente.",
            });
            return;
        }

        setAccessFeedback({
            type: "success",
            message: "Enviamos as instrucoes de recuperacao. Verifique seu e-mail.",
        });
    }

    function handleOpenAccessRecovery() {
        const trimmedLoginEmail = loginEmail.trim();

        setIsAccessRecoveryOpen(true);
        setRecoveryEmail(isEmail(trimmedLoginEmail) ? trimmedLoginEmail : "");
        setSupportIdentifier("");
        setAccessFeedback({ type: "", message: "" });
    }

    function handleCloseAccessRecovery() {
        if (isRecoveryLoading) return;

        setIsAccessRecoveryOpen(false);
        setAccessFeedback({ type: "", message: "" });
    }

    function handleSupportRecovery(event) {
        event.preventDefault();

        setAccessFeedback({
            type: "info",
            message: "Use seu usuario ou telefone cadastrado para solicitar suporte. Em breve essa recuperacao sera automatica.",
        });
    }

    function handleModalOverlayClick(event) {
        if (event.target !== event.currentTarget) return;

        handleCloseAccessRecovery();
    }

    return (
        <div className="landing-page auth-page" data-theme={landingTheme}>
            <main className="auth-main auth-login-main">
                <section className="auth-card login-card">
                    <Link className="auth-card-logo-link" to="/" aria-label="Voltar para a landing do ControlBet">
                        <img src={logo} alt="ControlBet" className="auth-card-logo" />
                    </Link>

                    <div className="auth-card-header">
                        <span>Bem-vindo de volta</span>
                        <h1>Entrar na sua conta</h1>
                        <p>Acesse seu painel para acompanhar banca, apostas, movimentacoes e desempenho.</p>
                    </div>

                    <form className="auth-form" onSubmit={handleSubmit}>
                        <label>
                            E-mail
                            <input
                                type="email"
                                placeholder="seu@email.com"
                                autoComplete="email"
                                inputMode="email"
                                value={loginEmail}
                                onChange={(event) => setLoginEmail(event.target.value)}
                                required
                                disabled={isLoading}
                            />
                        </label>

                        <label>
                            Senha
                            <input
                                type="password"
                                placeholder="Sua senha"
                                autoComplete="current-password"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                required
                                disabled={isLoading}
                            />
                        </label>

                        <p className="auth-credential-note">
                            Na versao 1.0, o acesso esta disponivel somente com e-mail e senha.
                        </p>

                        {isLegacyRecoveryFlowEnabled && (
                            <div className="auth-help-links auth-help-links-single">
                                <button
                                    type="button"
                                    onClick={handleOpenAccessRecovery}
                                    disabled={isLoading || isRecoveryLoading}
                                    aria-expanded={isAccessRecoveryOpen}
                                >
                                    Esqueceu seu e-mail ou senha?
                                </button>
                            </div>
                        )}

                        {feedback.message && (
                            <p className={`auth-message ${feedback.type === "success" ? "auth-message-success" : "auth-message-error"}`}>
                                {feedback.message}
                            </p>
                        )}

                        <button type="submit" className="auth-submit-button" disabled={isLoading}>
                            {isLoading ? "Entrando..." : "Entrar"}
                        </button>
                    </form>

                    <p className="auth-switch">
                        Nao possui conta? <Link to="/cadastro">Criar conta gratis</Link>
                    </p>
                </section>

                {isLegacyRecoveryFlowEnabled && isAccessRecoveryOpen && (
                    <div className="auth-modal-overlay" role="presentation" onMouseDown={handleModalOverlayClick}>
                        <section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="access-recovery-title">
                            <button
                                type="button"
                                className="auth-modal-close"
                                onClick={handleCloseAccessRecovery}
                                disabled={isRecoveryLoading}
                                aria-label="Fechar recuperacao de acesso"
                            >
                                X
                            </button>

                            <div className="auth-modal-header">
                                <h2 id="access-recovery-title">Recuperar acesso</h2>
                                <p>Escolha a melhor forma de recuperar sua conta.</p>
                            </div>

                            <div className="auth-modal-options">
                                <form className="auth-recovery-option" onSubmit={handlePasswordReset}>
                                    <strong>Recuperar senha por e-mail</strong>
                                    <label>
                                        E-mail
                                        <input
                                            type="email"
                                            placeholder="seu@email.com"
                                            autoComplete="email"
                                            value={recoveryEmail}
                                            onChange={(event) => setRecoveryEmail(event.target.value)}
                                            disabled={isRecoveryLoading}
                                        />
                                    </label>
                                    <button type="submit" className="auth-secondary-button" disabled={isRecoveryLoading}>
                                        {isRecoveryLoading ? "Enviando..." : "Enviar instrucoes"}
                                    </button>
                                </form>

                                <form className="auth-recovery-option auth-recovery-option-muted" onSubmit={handleSupportRecovery}>
                                    <strong>Nao lembro meu e-mail</strong>
                                    <label>
                                        Usuario ou telefone
                                        <input
                                            type="text"
                                            placeholder="seu.usuario ou telefone"
                                            value={supportIdentifier}
                                            onChange={(event) => setSupportIdentifier(event.target.value)}
                                            disabled={isRecoveryLoading}
                                        />
                                    </label>
                                    <button type="submit" className="auth-text-button" disabled={isRecoveryLoading}>
                                        Solicitar suporte
                                    </button>
                                </form>
                            </div>

                            {accessFeedback.message && (
                                <p
                                    className={`auth-message ${
                                        accessFeedback.type === "success"
                                            ? "auth-message-success"
                                            : accessFeedback.type === "info"
                                              ? "auth-message-info"
                                              : "auth-message-error"
                                    }`}
                                >
                                    {accessFeedback.message}
                                </p>
                            )}
                        </section>
                    </div>
                )}
            </main>
        </div>
    );
}
