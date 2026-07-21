import { Link } from "react-router-dom";
import logo from "../assets/logo.png";

export default function PrivacyPage({ landingTheme }) {
    return (
        <div className="landing-page legal-page" data-theme={landingTheme}>
            <main className="legal-main">
                <article className="legal-card">
                    <Link className="legal-logo-link" to="/" aria-label="Voltar para a página inicial do ControlBet">
                        <img src={logo} alt="ControlBet" className="legal-logo" />
                    </Link>

                    <header className="legal-header">
                        <span>Versão inicial</span>
                        <h1>Política de Privacidade</h1>
                        <p>Esta política resume como tratamos os dados necessários para sua conta e para o funcionamento do ControlBet.</p>
                    </header>

                    <section className="legal-section">
                        <h2>Dados da conta</h2>
                        <p>
                            Coletamos dados como nome, usuário, telefone e e-mail para criar sua conta, autenticar seu acesso e manter seu perfil atualizado.
                        </p>
                    </section>

                    <section className="legal-section">
                        <h2>Dados de uso</h2>
                        <p>
                            As informações financeiras e operacionais registradas por você são usadas para exibir o dashboard, cálculos, histórico e gráficos da própria conta.
                        </p>
                    </section>

                    <section className="legal-section">
                        <h2>Segurança e exclusão</h2>
                        <p>
                            Mantemos recursos de segurança da conta e um fluxo de exclusão agendada, permitindo cancelar a solicitação dentro do prazo exibido na plataforma.
                        </p>
                    </section>

                    <section className="legal-section">
                        <h2>Versão inicial</h2>
                        <p>
                            Este texto é uma versão inicial e será aprimorado conforme novas funções, integrações ou obrigações forem adicionadas ao produto.
                        </p>
                    </section>

                    <div className="legal-actions">
                        <Link to="/cadastro">Voltar ao cadastro</Link>
                        <Link to="/login">Voltar ao login</Link>
                    </div>
                </article>
            </main>
        </div>
    );
}
