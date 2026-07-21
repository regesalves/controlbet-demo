import { Link } from "react-router-dom";
import logo from "../assets/logo.png";

export default function TermsPage({ landingTheme }) {
    return (
        <div className="landing-page legal-page" data-theme={landingTheme}>
            <main className="legal-main">
                <article className="legal-card">
                    <Link className="legal-logo-link" to="/" aria-label="Voltar para a página inicial do ControlBet">
                        <img src={logo} alt="ControlBet" className="legal-logo" />
                    </Link>

                    <header className="legal-header">
                        <span>Versão inicial</span>
                        <h1>Termos de Uso</h1>
                        <p>Estes termos explicam, de forma simples, as condições básicas para usar o ControlBet.</p>
                    </header>

                    <section className="legal-section">
                        <h2>Uso da plataforma</h2>
                        <p>
                            O ControlBet é uma ferramenta para organização pessoal de banca, apostas, movimentações e desempenho. Você é responsável pelas informações que registra e pelas decisões tomadas a partir delas.
                        </p>
                    </section>

                    <section className="legal-section">
                        <h2>Conta e acesso</h2>
                        <p>
                            Ao criar uma conta, você deve informar dados verdadeiros, manter suas credenciais em segurança e usar a plataforma de maneira responsável.
                        </p>
                    </section>

                    <section className="legal-section">
                        <h2>Disponibilidade</h2>
                        <p>
                            Trabalhamos para manter o serviço estável, mas podem ocorrer indisponibilidades, ajustes técnicos ou melhorias sem aviso prévio.
                        </p>
                    </section>

                    <section className="legal-section">
                        <h2>Versão inicial</h2>
                        <p>
                            Este texto é uma versão inicial e poderá ser revisado conforme o produto evoluir. Mudanças importantes devem ser comunicadas dentro da plataforma.
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
