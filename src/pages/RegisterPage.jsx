import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import logo from "../assets/logo.png";
import { supabase } from "../supabase";

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

export default function RegisterPage({ landingTheme }) {
    const navigate = useNavigate();
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [username, setUsername] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isPasswordFocused, setIsPasswordFocused] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [feedback, setFeedback] = useState({ type: "", message: "" });
    const passwordChecks = passwordRequirements.map((requirement) => ({
        ...requirement,
        isValid: requirement.test(password),
    }));
    const isPasswordStrong = passwordChecks.every((requirement) => requirement.isValid);
    const shouldShowPasswordRequirements = isPasswordFocused || password.length > 0;
    const normalizedUsername = username.trim();

    function getRegisterErrorMessage(message = "") {
        const normalizedMessage = message.toLowerCase();

        if (
            normalizedMessage.includes("already registered") ||
            normalizedMessage.includes("already been registered") ||
            normalizedMessage.includes("already exists") ||
            normalizedMessage.includes("user already")
        ) {
            return "Este e-mail já está cadastrado. Tente entrar na sua conta ou recuperar o acesso.";
        }

        if (normalizedMessage.includes("password")) {
            return "Sua senha precisa atender aos requisitos mínimos do Supabase.";
        }

        if (normalizedMessage.includes("invalid")) {
            return "Confira os dados informados e tente novamente.";
        }

        return "Não foi possível criar sua conta agora. Tente novamente em instantes.";
    }

    async function handleSubmit(event) {
        event.preventDefault();

        if (isLoading) return;

        setFeedback({ type: "", message: "" });

        if (
            !normalizedUsername ||
            normalizedUsername.length < 3 ||
            normalizedUsername.length > 30 ||
            /\s/.test(username) ||
            !usernamePattern.test(normalizedUsername)
        ) {
            setFeedback({
                type: "error",
                message: "Informe um usuário válido: 3 a 30 caracteres, sem espaços, usando apenas letras minúsculas, números, ponto, underline ou hífen.",
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

        setIsLoading(true);

        const trimmedFirstName = firstName.trim();
        const trimmedLastName = lastName.trim();
        const trimmedPhone = phone.trim();

        const { data, error } = await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
                data: {
                    first_name: trimmedFirstName,
                    last_name: trimmedLastName,
                    full_name: `${trimmedFirstName} ${trimmedLastName}`.trim(),
                    username: normalizedUsername,
                    phone: trimmedPhone,
                },
            },
        });

        setIsLoading(false);

        if (error) {
            setFeedback({
                type: "error",
                message: getRegisterErrorMessage(error.message),
            });
            return;
        }

        if (!data?.session && (!data?.user || data.user.identities?.length === 0)) {
            setFeedback({
                type: "error",
                message: "Este e-mail já está cadastrado. Tente entrar na sua conta ou recuperar o acesso.",
            });
            return;
        }

        if (data.session) {
            navigate("/dashboard");
            return;
        }

        setFeedback({
            type: "success",
            message: "Conta criada. Confira seu e-mail para confirmar o cadastro antes de entrar.",
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

                    <form className="auth-form" onSubmit={handleSubmit}>
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
                                Telefone (recomendado)
                                <input
                                    type="tel"
                                    placeholder="(00) 00000-0000"
                                    autoComplete="tel"
                                    value={phone}
                                    onChange={(event) => setPhone(event.target.value)}
                                    disabled={isLoading}
                                />
                            </label>
                        </div>

                        <label>
                            E-mail
                            <input
                                type="email"
                                placeholder="voce@email.com"
                                autoComplete="email"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                required
                                disabled={isLoading}
                            />
                        </label>

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

                        {feedback.message && (
                            <p className={`auth-message ${feedback.type === "success" ? "auth-message-success" : "auth-message-error"}`}>
                                {feedback.message}
                            </p>
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
