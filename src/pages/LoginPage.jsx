import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import logo from "../assets/logo.png";
import { supabase } from "../supabase";

export default function LoginPage({ landingTheme }) {
    const navigate = useNavigate();
    const [loginIdentifier, setLoginIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isRecoveryLoading, setIsRecoveryLoading] = useState(false);
    const [feedback, setFeedback] = useState({ type: "", message: "" });
    const [isAccessRecoveryOpen, setIsAccessRecoveryOpen] = useState(false);
    const [recoveryEmail, setRecoveryEmail] = useState("");
    const [supportIdentifier, setSupportIdentifier] = useState("");
    const [accessFeedback, setAccessFeedback] = useState({ type: "", message: "" });

    function isEmail(value) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    }

    function getLoginErrorMessage(message = "") {
        const normalizedMessage = message.toLowerCase();

        if (normalizedMessage.includes("invalid login credentials")) {
            return "E-mail ou senha inválidos. Confira os dados e tente novamente.";
        }

        if (normalizedMessage.includes("email not confirmed")) {
            return "Confirme seu e-mail antes de entrar.";
        }

        return "Não foi possível entrar agora. Tente novamente em instantes.";
    }

    async function handleSubmit(event) {
        event.preventDefault();

        if (isLoading) return;

        const trimmedLoginIdentifier = loginIdentifier.trim();

        if (!isEmail(trimmedLoginIdentifier)) {
            setFeedback({
                type: "error",
                message: "Login por usuário será ativado em breve. Por enquanto, entre com seu e-mail cadastrado.",
            });
            return;
        }

        setFeedback({ type: "", message: "" });
        setIsLoading(true);

        const { error } = await supabase.auth.signInWithPassword({
            email: trimmedLoginIdentifier,
            password,
        });

        setIsLoading(false);

        if (error) {
            setFeedback({ type: "error", message: getLoginErrorMessage(error.message) });
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
                message: "Informe o e-mail cadastrado para receber as instruções de recuperação.",
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
                message: "Não foi possível enviar as instruções agora. Confira o e-mail e tente novamente.",
            });
            return;
        }

        setAccessFeedback({
            type: "success",
            message: "Enviamos as instruções de recuperação. Verifique seu e-mail.",
        });
    }

    function handleOpenAccessRecovery() {
        const trimmedLoginIdentifier = loginIdentifier.trim();

        setIsAccessRecoveryOpen(true);
        setRecoveryEmail(isEmail(trimmedLoginIdentifier) ? trimmedLoginIdentifier : "");
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
            message: "Use seu usuário ou telefone cadastrado para solicitar suporte. Nesta etapa, a recuperação automática por usuário ou telefone ainda não está disponível.",
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
                        <p>Acesse seu painel para acompanhar banca, apostas, movimentações e desempenho.</p>
                    </div>

                    <form className="auth-form" onSubmit={handleSubmit}>
                        <label>
                            E-mail ou usuário
                            <input
                                type="text"
                                placeholder="voce@email.com"
                                autoComplete="username"
                                value={loginIdentifier}
                                onChange={(event) => setLoginIdentifier(event.target.value)}
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

                        <div className="auth-help-links auth-help-links-single">
                            <button
                                type="button"
                                onClick={handleOpenAccessRecovery}
                                disabled={isLoading || isRecoveryLoading}
                                aria-expanded={isAccessRecoveryOpen}
                            >
                                Esqueceu seu acesso?
                            </button>
                        </div>

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
                        Não possui conta? <Link to="/cadastro">Criar conta grátis</Link>
                    </p>
                </section>

                {isAccessRecoveryOpen && (
                    <div className="auth-modal-overlay" role="presentation" onMouseDown={handleModalOverlayClick}>
                        <section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="access-recovery-title">
                            <button
                                type="button"
                                className="auth-modal-close"
                                onClick={handleCloseAccessRecovery}
                                disabled={isRecoveryLoading}
                                aria-label="Fechar recuperação de acesso"
                            >
                                ×
                            </button>

                            <div className="auth-modal-header">
                                <h2 id="access-recovery-title">Recuperar acesso</h2>
                            </div>

                            <div className="auth-modal-options">
                                <form className="auth-recovery-option" onSubmit={handlePasswordReset}>
                                    <strong>Recuperar senha por e-mail</strong>
                                    <label>
                                        E-mail
                                        <input
                                            type="email"
                                            placeholder="voce@email.com"
                                            autoComplete="email"
                                            value={recoveryEmail}
                                            onChange={(event) => setRecoveryEmail(event.target.value)}
                                            disabled={isRecoveryLoading}
                                        />
                                    </label>
                                    <button type="submit" className="auth-secondary-button" disabled={isRecoveryLoading}>
                                        {isRecoveryLoading ? "Enviando..." : "Enviar instruções"}
                                    </button>
                                </form>

                                <form className="auth-recovery-option auth-recovery-option-muted" onSubmit={handleSupportRecovery}>
                                    <strong>Não lembro meu e-mail</strong>
                                    <label>
                                        Usuário ou telefone
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
