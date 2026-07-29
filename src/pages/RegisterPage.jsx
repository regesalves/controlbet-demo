import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
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

const usernamePattern = /^[a-z0-9._-]+$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getPhoneDigits(value = "") {
    return value.replace(/\D/g, "").slice(0, 11);
}

function formatBrazilianPhone(value = "") {
    const digits = getPhoneDigits(value);

    if (!digits) return "";

    if (digits.length <= 2) {
        return `(${digits}`;
    }

    if (digits.length <= 6) {
        return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    }

    if (digits.length <= 10) {
        return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }

    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function getProfileAvailabilityErrorMessage(error) {
    const message = `${error?.message || ""} ${error?.details || ""} ${error?.hint || ""}`.toLowerCase();

    if (message.includes("phone")) {
        return "Este telefone já está em uso.";
    }

    if (message.includes("username")) {
        return "Este usuário já está em uso.";
    }

    return "";
}

export default function RegisterPage({ landingTheme }) {
    const navigate = useNavigate();
    const { refreshSession } = useAuth();
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [username, setUsername] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [confirmEmail, setConfirmEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [hasAcceptedLegalTerms, setHasAcceptedLegalTerms] = useState(false);
    const [isPasswordFocused, setIsPasswordFocused] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isResendLoading, setIsResendLoading] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [feedback, setFeedback] = useState({ type: "", message: "" });
    const passwordChecks = passwordRequirements.map((requirement) => ({
        ...requirement,
        isValid: requirement.test(password),
    }));
    const isPasswordStrong = passwordChecks.every((requirement) => requirement.isValid);
    const shouldShowPasswordRequirements = isPasswordFocused || password.length > 0;
    const normalizedUsername = username.trim();

    useEffect(() => {
        if (resendCooldown <= 0) return undefined;

        const timeoutId = window.setTimeout(() => {
            setResendCooldown((currentValue) => Math.max(currentValue - 1, 0));
        }, 1000);

        return () => window.clearTimeout(timeoutId);
    }, [resendCooldown]);

    useEffect(() => {
        if (!feedback.message) return undefined;

        const timeoutId = window.setTimeout(() => {
            setFeedback({ type: "", message: "" });
        }, feedback.type === "success" ? 3000 : 5000);

        return () => window.clearTimeout(timeoutId);
    }, [feedback]);

    function getRegisterErrorMessage(message = "") {
        const normalizedMessage = message.toLowerCase();

        if (
            normalizedMessage.includes("already registered") ||
            normalizedMessage.includes("already been registered") ||
            normalizedMessage.includes("already exists") ||
            normalizedMessage.includes("user already")
        ) {
            return "Este e-mail já está cadastrado. Tente entrar ou recuperar o acesso.";
        }

        if (normalizedMessage.includes("password")) {
            return "Sua senha precisa atender aos requisitos mínimos do Supabase.";
        }

        if (normalizedMessage.includes("invalid") && normalizedMessage.includes("email")) {
            return "Informe um e-mail válido.";
        }

        if (normalizedMessage.includes("invalid")) {
            return "Confira os dados informados.";
        }

        return "Confira os dados informados.";
    }

    async function handleSubmit(event) {
        event.preventDefault();

        if (isLoading) return;

        setFeedback({ type: "", message: "" });

        const trimmedFirstName = firstName.trim();
        const trimmedLastName = lastName.trim();

        if (!trimmedFirstName) {
            setFeedback({
                type: "error",
                message: "Informe seu nome.",
            });
            return;
        }

        if (!trimmedLastName) {
            setFeedback({
                type: "error",
                message: "Informe seu sobrenome.",
            });
            return;
        }

        if (!normalizedUsername) {
            setFeedback({
                type: "error",
                message: "Informe seu usuário.",
            });
            return;
        }

        if (
            normalizedUsername.length < 3 ||
            normalizedUsername.length > 30 ||
            /\s/.test(username) ||
            !usernamePattern.test(normalizedUsername)
        ) {
            setFeedback({
                type: "error",
                message: "Use apenas letras, números, ponto, underline ou hífen.",
            });
            return;
        }

        const phoneDigits = getPhoneDigits(phone);

        if (!phoneDigits) {
            setFeedback({
                type: "error",
                message: "Informe seu telefone.",
            });
            return;
        }

        if (phoneDigits.length !== 10 && phoneDigits.length !== 11) {
            setFeedback({
                type: "error",
                message: "Informe um telefone válido com DDD.",
            });
            return;
        }

        const trimmedEmail = email.trim();

        if (!trimmedEmail) {
            setFeedback({
                type: "error",
                message: "Informe seu e-mail.",
            });
            return;
        }

        const trimmedConfirmEmail = confirmEmail.trim();

        if (!trimmedConfirmEmail) {
            setFeedback({
                type: "error",
                message: "Confirme seu e-mail.",
            });
            return;
        }

        if (!emailPattern.test(trimmedEmail)) {
            setFeedback({
                type: "error",
                message: "Informe um e-mail válido.",
            });
            return;
        }

        if (!emailPattern.test(trimmedConfirmEmail)) {
            setFeedback({
                type: "error",
                message: "Informe um e-mail válido.",
            });
            return;
        }

        if (trimmedEmail.toLowerCase() !== trimmedConfirmEmail.toLowerCase()) {
            setFeedback({
                type: "error",
                message: "Os e-mails não coincidem.",
            });
            return;
        }

        if (!isPasswordStrong) {
            setFeedback({
                type: "error",
                message: "Crie uma senha mais forte antes de continuar. Ela precisa cumprir todos os requisitos abaixo.",
            });
            return;
        }

        if (password !== confirmPassword) {
            setFeedback({
                type: "error",
                message: "A senha e a confirmação precisam ser iguais.",
            });
            return;
        }

        if (!hasAcceptedLegalTerms) {
            setFeedback({
                type: "error",
                message: "Você precisa aceitar os Termos de Uso e a Política de Privacidade.",
            });
            return;
        }

        setIsLoading(true);

        const { data: availabilityData, error: availabilityError } = await supabase
            .rpc("check_profile_availability", {
                p_username: normalizedUsername,
                p_phone: phoneDigits,
            })
            .maybeSingle();

        if (availabilityError) {
            setIsLoading(false);
            setFeedback({
                type: "error",
                message: getProfileAvailabilityErrorMessage(availabilityError) || "Não foi possível verificar usuário e telefone agora. Tente novamente em instantes.",
            });
            return;
        }

        if (availabilityData && !availabilityData.username_available) {
            setIsLoading(false);
            setFeedback({
                type: "error",
                message: "Este usuário já está em uso.",
            });
            return;
        }

        if (availabilityData && !availabilityData.phone_available) {
            setIsLoading(false);
            setFeedback({
                type: "error",
                message: "Este telefone já está em uso.",
            });
            return;
        }

        const consentAt = new Date().toISOString();

        const { data, error } = await supabase.auth.signUp({
            email: trimmedEmail,
            password,
            options: {
                data: {
                    first_name: trimmedFirstName,
                    last_name: trimmedLastName,
                    full_name: `${trimmedFirstName} ${trimmedLastName}`.trim(),
                    username: normalizedUsername,
                    phone: phoneDigits,
                    accepted_terms_at: consentAt,
                    accepted_privacy_at: consentAt,
                },
            },
        });

        setIsLoading(false);

        if (error) {
            setFeedback({
                type: "error",
                message: getProfileAvailabilityErrorMessage(error) || getRegisterErrorMessage(error.message),
            });
            return;
        }

        if (!data?.session && (!data?.user || data.user.identities?.length === 0)) {
            setFeedback({
                type: "error",
                message: "Este e-mail já está cadastrado. Tente entrar ou recuperar o acesso.",
            });
            return;
        }

        if (data.session) {
            const { error: sessionError } = await refreshSession();

            if (sessionError) {
                setFeedback({
                    type: "error",
                    message: "Não foi possível confirmar sua sessão. Tente entrar novamente.",
                });
                return;
            }

            navigate("/dashboard");
            return;
        }

        setFeedback({
            type: "success",
            message: "Conta criada. Confira seu e-mail para confirmar o cadastro antes de entrar.",
        });
    }

    async function handleResendConfirmation() {
        if (isResendLoading || resendCooldown > 0) return;

        setIsResendLoading(true);

        const { error } = await supabase.auth.resend({
            type: "signup",
            email: email.trim(),
        });

        setIsResendLoading(false);

        if (error) {
            setFeedback({
                type: "error",
                message: "Não foi possível reenviar o e-mail agora. Tente novamente em instantes.",
            });
            return;
        }

        setResendCooldown(30);
        setFeedback({
            type: "success",
            message: "Reenviamos o e-mail de confirmação. Verifique sua caixa de entrada.",
        });
    }

    return (
        <div className="landing-page auth-page" data-theme={landingTheme}>
            <main className="auth-main">
                <section className="auth-card register-card">
                    <Link className="auth-card-logo-link" to="/" aria-label="Voltar para a landing do ControlBet">
                        <img src={logo} alt="ControlBet" className="auth-card-logo" />
                    </Link>

                    <div className="auth-card-header">
                        <h1>Crie sua conta grátis</h1>
                        <p>Monte sua base para controlar banca, casas de aposta e desempenho.</p>
                    </div>

                    <form className="auth-form" onSubmit={handleSubmit} noValidate>
                        <div className="auth-name-row">
                            <label>
                                Nome
                                <input
                                    type="text"
                                    placeholder="Seu nome"
                                    autoComplete="given-name"
                                    value={firstName}
                                    onChange={(event) => setFirstName(event.target.value)}
                                    required
                                    disabled={isLoading}
                                />
                            </label>

                            <label>
                                Sobrenome
                                <input
                                    type="text"
                                    placeholder="Seu sobrenome"
                                    autoComplete="family-name"
                                    value={lastName}
                                    onChange={(event) => setLastName(event.target.value)}
                                    required
                                    disabled={isLoading}
                                />
                            </label>
                        </div>

                        <div className="auth-name-row">
                            <label>
                                Usuário
                                <input
                                    type="text"
                                    placeholder="seu.usuario"
                                    autoComplete="username"
                                    value={username}
                                    onChange={(event) => setUsername(event.target.value.toLowerCase())}
                                    minLength={3}
                                    maxLength={30}
                                    required
                                    disabled={isLoading}
                                />
                            </label>

                            <label>
                                Telefone
                                <input
                                    type="tel"
                                    inputMode="numeric"
                                    placeholder="(00) 00000-0000"
                                    autoComplete="tel"
                                    value={phone}
                                    onChange={(event) => setPhone(formatBrazilianPhone(event.target.value))}
                                    required
                                    disabled={isLoading}
                                />
                            </label>
                        </div>

                        <div className="auth-name-row">
                            <label>
                                E-mail
                                <input
                                    type="email"
                                    placeholder="seu@email.com"
                                    autoComplete="email"
                                    value={email}
                                    onChange={(event) => setEmail(event.target.value)}
                                    required
                                    disabled={isLoading}
                                />
                            </label>

                            <label>
                                Confirmar e-mail
                                <input
                                    type="email"
                                    placeholder="repita seu e-mail"
                                    autoComplete="email"
                                    value={confirmEmail}
                                    onChange={(event) => setConfirmEmail(event.target.value)}
                                    required
                                    disabled={isLoading}
                                />
                            </label>
                        </div>

                        <div className="auth-name-row auth-password-row">
                            <label>
                                Senha
                                <input
                                    type="password"
                                    placeholder="Crie uma senha"
                                    autoComplete="new-password"
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                    onFocus={() => setIsPasswordFocused(true)}
                                    onBlur={() => setIsPasswordFocused(false)}
                                    required
                                    disabled={isLoading}
                                />
                            </label>

                            <label>
                                Confirmar senha
                                <input
                                    type="password"
                                    placeholder="Digite novamente"
                                    autoComplete="new-password"
                                    value={confirmPassword}
                                    onChange={(event) => setConfirmPassword(event.target.value)}
                                    required
                                    disabled={isLoading}
                                />
                            </label>
                        </div>

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

                        <label className="auth-consent-inline">
                            <input
                                type="checkbox"
                                checked={hasAcceptedLegalTerms}
                                onChange={(event) => {
                                    setFeedback({ type: "", message: "" });
                                    setHasAcceptedLegalTerms(event.target.checked);
                                }}
                                disabled={isLoading}
                            />
                            <span>
                                Li e concordo com os <Link to="/termos">Termos de Uso</Link> e a <Link to="/privacidade">Política de Privacidade</Link>.
                            </span>
                        </label>

                        {feedback.message && (
                            <p className={`auth-message ${feedback.type === "success" ? "auth-message-success" : "auth-message-error"}`}>
                                {feedback.message}
                            </p>
                        )}

                        {feedback.type === "success" && (
                            <button
                                type="button"
                                className="auth-secondary-button auth-resend-button"
                                onClick={handleResendConfirmation}
                                disabled={isResendLoading || resendCooldown > 0}
                            >
                                {resendCooldown > 0
                                    ? `Reenviar em ${resendCooldown}s`
                                    : isResendLoading
                                        ? "Reenviando..."
                                        : "Reenviar e-mail"}
                            </button>
                        )}

                        <button type="submit" className="auth-submit-button" disabled={isLoading}>
                            {isLoading ? "Criando conta..." : "Criar conta"}
                        </button>
                    </form>

                    <p className="auth-switch">
                        Já possui conta? <Link to="/login">Entrar</Link>
                    </p>
                </section>
            </main>
        </div>
    );
}
