import { Link } from "react-router-dom";
import logo from "../assets/logo.png";

export default function LandingPage({ landingTheme, onToggleTheme }) {
    return (
        <div className="landing-page" data-theme={landingTheme}>
            <div className="landing-shell">
                <header className="landing-header">
                    <div className="landing-brand">
                        <img src={logo} alt="ControlBet" className="landing-logo" />
                    </div>

                    <div className="landing-header-actions">
                        <button
                            type="button"
                            className="landing-theme-button"
                            aria-label={landingTheme === "light" ? "Ativar tema escuro" : "Ativar tema claro"}
                            title={landingTheme === "light" ? "Ativar tema escuro" : "Ativar tema claro"}
                            onClick={onToggleTheme}
                        >
                            {landingTheme === "light" ? (
                                <svg className="landing-theme-icon" viewBox="0 0 24 24" aria-hidden="true">
                                    <circle cx="12" cy="12" r="4" />
                                    <path d="M12 2.75V5" />
                                    <path d="M12 19v2.25" />
                                    <path d="M4.46 4.46l1.59 1.59" />
                                    <path d="M17.95 17.95l1.59 1.59" />
                                    <path d="M2.75 12H5" />
                                    <path d="M19 12h2.25" />
                                    <path d="M4.46 19.54l1.59-1.59" />
                                    <path d="M17.95 6.05l1.59-1.59" />
                                </svg>
                            ) : (
                                <svg className="landing-theme-icon" viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="M20.25 14.18A7.72 7.72 0 0 1 9.82 3.75a8.25 8.25 0 1 0 10.43 10.43Z" />
                                </svg>
                            )}
                        </button>

                        <Link className="landing-top-button landing-create-button" to="/cadastro">
                            Criar conta grátis
                        </Link>

                        <Link className="landing-top-button landing-login-button" to="/login">
                            Já tenho conta
                        </Link>
                    </div>
                </header>

                <main className="landing-main">
                    <section className="landing-hero" id="inicio">
                        <div className="landing-intro">
                            <h1>Controle profissional da sua banca esportiva.</h1>

                            <p>
                                Gerencie apostas, movimentações, desempenho e evolução da banca em uma plataforma clara e organizada.
                            </p>
                        </div>

                        <div className="landing-content">
                            <div className="landing-features" aria-label="Recursos do ControlBet">
                                <article>
                                    <strong>Controle de banca</strong>
                                    <p>Acompanhe saldo inicial, banca atual e evolução por período.</p>
                                </article>

                                <article>
                                    <strong>Bilhetes</strong>
                                    <p>Registre apostas, odds, valores, retornos e resultados.</p>
                                </article>

                                <article>
                                    <strong>Movimentações</strong>
                                    <p>Organize depósitos, saques e histórico financeiro.</p>
                                </article>

                                <article>
                                    <strong>Estatísticas</strong>
                                    <p>Veja ROI, lucro real, taxa de acerto e valores investidos.</p>
                                </article>

                                <article>
                                    <strong>Gráfico de evolução</strong>
                                    <p>Visualize a trajetória da banca de forma simples.</p>
                                </article>

                                <article>
                                    <strong>Multi-casas</strong>
                                    <p>Separe resultados e movimentações por casa de aposta.</p>
                                </article>
                            </div>

                            <aside className="landing-dashboard-preview" id="preview-dashboard" aria-label="Preview ilustrativo do dashboard">
                                <div className="landing-preview-header">
                                    <strong>Preview do dashboard</strong>
                                </div>

                                <div className="landing-preview-metrics">
                                    <div>
                                        <span>Banca atual</span>
                                        <strong>R$ 1.842</strong>
                                    </div>

                                    <div>
                                        <span>Resultado</span>
                                        <strong className="landing-preview-positive">+R$ 312</strong>
                                    </div>

                                    <div>
                                        <span>ROI</span>
                                        <strong>18,4%</strong>
                                    </div>

                                    <div>
                                        <span>Taxa de acerto</span>
                                        <strong>68%</strong>
                                    </div>
                                </div>

                                <div className="landing-preview-chart" aria-hidden="true">
                                    <svg className="landing-preview-graph" viewBox="0 0 620 220" role="presentation" focusable="false">
                                        <defs>
                                            <linearGradient id="landingPreviewAreaGradient" x1="0" x2="0" y1="0" y2="1">
                                                <stop offset="0%" stopColor="#e11d2e" stopOpacity="0.32" />
                                                <stop offset="62%" stopColor="#e11d2e" stopOpacity="0.12" />
                                                <stop offset="100%" stopColor="#e11d2e" stopOpacity="0" />
                                            </linearGradient>
                                        </defs>
                                        <g className="landing-preview-graph-axis-y">
                                            <text x="8" y="42">R$ 1.400</text>
                                            <text x="8" y="82">R$ 1.100</text>
                                            <text x="8" y="122">R$ 800</text>
                                            <text x="8" y="162">R$ 500</text>
                                        </g>
                                        <g className="landing-preview-graph-grid">
                                            <line x1="64" y1="38" x2="606" y2="38" />
                                            <line x1="64" y1="78" x2="606" y2="78" />
                                            <line x1="64" y1="118" x2="606" y2="118" />
                                            <line x1="64" y1="158" x2="606" y2="158" />
                                        </g>
                                        <path className="landing-preview-graph-area" d="M66 146 C118 138 148 126 188 130 C244 136 274 104 318 106 C366 108 394 82 442 84 C496 86 532 58 576 56 C594 55 602 44 606 40 L606 170 L66 170 Z" />
                                        <path className="landing-preview-graph-line" d="M66 146 C118 138 148 126 188 130 C244 136 274 104 318 106 C366 108 394 82 442 84 C496 86 532 58 576 56 C594 55 602 44 606 40" />
                                        <g className="landing-preview-graph-points">
                                            <circle cx="66" cy="146" r="4" />
                                            <circle cx="188" cy="130" r="4" />
                                            <circle cx="318" cy="106" r="4" />
                                            <circle cx="442" cy="84" r="4" />
                                            <circle cx="576" cy="56" r="4" />
                                            <circle className="landing-preview-graph-last-point" cx="606" cy="40" r="6" />
                                        </g>
                                        <g className="landing-preview-graph-axis-x">
                                            <text x="66" y="198">1/5</text>
                                            <text x="188" y="198">5/5</text>
                                            <text x="318" y="198">10/5</text>
                                            <text x="442" y="198">15/5</text>
                                            <text x="576" y="198">20/5</text>
                                            <text x="606" y="198">25/5</text>
                                        </g>
                                    </svg>
                                </div>
                            </aside>
                        </div>
                    </section>
                </main>
            </div>
        </div>
    );
}
