const LEGACY_DASHBOARD_ARCHIVE = String.raw`            {SHOW_LEGACY && (
                <>
            <div className="reference-dashboard reference-dashboard-legacy" aria-label="Dashboard visual ControlBet">
                <aside className="reference-sidebar">
                    <div className="reference-brand" aria-label="ControlBet">
                        <span>Control</span><strong>Bet</strong>
                    </div>

                    <nav className="reference-nav" aria-label="Navegacao visual">
                        <button type="button" className="reference-nav-item active"><span className="ref-icon ref-icon-grid" />Dashboard</button>
                        <button type="button" className="reference-nav-item"><span className="ref-icon ref-icon-ticket" />Bilhetes</button>
                        <button type="button" className="reference-nav-item"><span className="ref-icon ref-icon-wallet" />Bancas</button>
                        <button type="button" className="reference-nav-item"><span className="ref-icon ref-icon-chart" />Relatorios</button>
                        <button type="button" className="reference-nav-item"><span className="ref-icon ref-icon-sync" />Movimentações</button>
                        <button type="button" className="reference-nav-item"><span className="ref-icon ref-icon-gear" />Configurações</button>
                    </nav>

                    <div className="reference-upgrade-card">
                        <span className="reference-crown" />
                        <strong>Plano Free</strong>
                        <b>Upgrade para Pro</b>
                        <p>e desbloqueie recursos avancados.</p>
                        <button type="button">Upgrade agora</button>
                    </div>
                </aside>

                <main className="reference-main">
                    <header className="reference-header">
                        <div>
                            <h1>Dashboard</h1>
                            <p>Bem-vindo de volta, {accountName}! 👋</p>
                        </div>

                        <button type="button" className="reference-account">
                            <span>{accountInitial}</span>
                            <strong>{accountName}</strong>
                            <small>{accountPlan}</small>
                            <i />
                        </button>
                    </header>

                    <section className="reference-control-panel">
                        <div className="reference-toolbar">
                            <label>
                                <span>Casa de aposta</span>
                                <input value="Ex.: Superbet" readOnly />
                            </label>

                            <label>
                                <span>Banca inicial</span>
                                <input value="R$ 0,00" readOnly />
                            </label>

                            <button type="button" className="reference-add-house">Adicionar casa</button>

                            <div className="reference-toolbar-spacer" />

                            <label className="reference-period">
                                <span>Período</span>
                                <select value="Mensal" onChange={() => {}}>
                                    <option>Mensal</option>
                                </select>
                            </label>

                            <button type="button" className="reference-month">
                                05/2026
                                <span className="ref-icon ref-icon-calendar" />
                            </button>
                        </div>

                        <div className="reference-house-grid">
                            <article className="reference-house-card active">
                                <header><strong>Todas as casas</strong><span /></header>
                                <dl>
                                    <div><dt>Apostas</dt><dd>141</dd></div>
                                    <div><dt>Taxa de acerto</dt><dd>32.62%</dd></div>
                                </dl>
                                <div className="reference-sparkline red" />
                            </article>

                            <article className="reference-house-card">
                                <header><strong>Bet365</strong><span /></header>
                                <dl>
                                    <div><dt>Apostas</dt><dd>69</dd></div>
                                    <div><dt>Taxa de acerto</dt><dd>27.54%</dd></div>
                                </dl>
                                <div className="reference-sparkline red" />
                            </article>

                            <article className="reference-house-card">
                                <header><strong>Estrelabet</strong><span /></header>
                                <dl>
                                    <div><dt>Apostas</dt><dd>67</dd></div>
                                    <div><dt>Taxa de acerto</dt><dd>35.82%</dd></div>
                                </dl>
                                <div className="reference-sparkline green" />
                            </article>

                            <article className="reference-house-card">
                                <header><strong>Betano</strong><span /></header>
                                <dl>
                                    <div><dt>Apostas</dt><dd>3</dd></div>
                                    <div><dt>Taxa de acerto</dt><dd>33.33%</dd></div>
                                </dl>
                                <div className="reference-sparkline red" />
                            </article>
                        </div>
                    </section>

                    <section className="reference-kpi-row">
                        {[
                            ["bank", "Bankroll Atual", "R$ 828,36", "Saldo disponivel", "neutral"],
                            ["trend", "Resultado Mensal", "-R$ 291,60", "Prejuízo no mês", "negative"],
                            ["target", "ROI (Retorno)", "-17.98%", "Retorno sobre investimento", "negative"],
                            ["percent", "Win Rate (Acerto)", "32.62%", "Taxa de acerto geral", "neutral"],
                            ["wallet", "Lucro / Prejuízo", "-R$ 291,60", "Resultado total", "negative"],
                        ].map(([icon, label, value, sub, tone]) => (
                            <article className={\`reference-kpi-card \${tone}\`} key={label}>
                                <span className={\`reference-kpi-icon \${icon}\`} />
                                <div>
                                    <small>{label}</small>
                                    <strong>{value}</strong>
                                    <p>{sub}</p>
                                </div>
                            </article>
                        ))}
                    </section>

                    <section className="reference-analytics-grid">
                        <article className="reference-analytics-panel area">
                            <header>
                                <h2>Evolução da banca</h2>
                                <button type="button">Mensal <i /></button>
                            </header>
                            <div className="reference-area-chart">
                                <span className="y y1">R$ 1.200</span>
                                <span className="y y2">R$ 1.000</span>
                                <span className="y y3">R$ 800</span>
                                <span className="y y4">R$ 600</span>
                                <span className="y y5">R$ 400</span>
                                <span className="x x1">12/2025</span>
                                <span className="x x2">01/2026</span>
                                <span className="x x3">02/2026</span>
                                <span className="x x4">03/2026</span>
                                <span className="x x5">05/2026</span>
                                <svg viewBox="0 0 520 230" preserveAspectRatio="none" aria-hidden="true">
                                    <defs>
                                        <linearGradient id="referenceAreaFill" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#ff3048" stopOpacity=".42" />
                                            <stop offset="100%" stopColor="#ff3048" stopOpacity=".03" />
                                        </linearGradient>
                                    </defs>
                                    <path className="fill" d="M28 144 L96 124 L164 98 L240 55 L318 96 L404 116 L494 98 L494 210 L28 210 Z" />
                                    <path className="line" d="M28 144 L96 124 L164 98 L240 55 L318 96 L404 116 L494 98" />
                                    <circle cx="494" cy="98" r="7" />
                                </svg>
                            </div>
                        </article>

                        <article className="reference-analytics-panel bars">
                            <header>
                                <h2>Performance mensal</h2>
                                <button type="button">Mensal <i /></button>
                            </header>
                            <div className="reference-bar-chart" aria-hidden="true">
                                <span className="neg" style={{ height: "38%" }} />
                                <span className="pos" style={{ height: "72%" }} />
                                <span className="neg" style={{ height: "55%" }} />
                                <span className="neg" style={{ height: "86%" }} />
                                <span className="neg" style={{ height: "24%" }} />
                                <span className="neg" style={{ height: "66%" }} />
                            </div>
                        </article>

                        <article className="reference-analytics-panel donut">
                            <header>
                                <h2>Distribuição por casa de aposta</h2>
                            </header>
                            <div className="reference-donut-layout">
                                <div className="reference-donut" />
                                <div className="reference-legend">
                                    <span><i className="green" />Bet365 <b>27.54%</b></span>
                                    <span><i className="blue" />Estrelabet <b>35.82%</b></span>
                                    <span><i className="orange" />Betano <b>33.33%</b></span>
                                    <span><i className="gray" />Outras <b>3.31%</b></span>
                                </div>
                            </div>
                        </article>
                    </section>

                    <section className="reference-actions">
                        <h2>Acoes rapidas</h2>
                        <div>
                            {[
                                ["ticket", "Novo bilhete"],
                                ["clipboard", "Bilhetes do dia"],
                                ["calendar", "Nova movimentação"],
                                ["document", "Extrato"],
                            ].map(([icon, label]) => (
                                <button type="button" key={label}>
                                    <span className={\`reference-action-icon \${icon}\`} />
                                    <strong>{label}</strong>
                                    <i>+</i>
                                </button>
                            ))}
                        </div>
                    </section>
                </main>
            </div>

            <div className="dashboard-shell">
                <aside className="dashboard-sidebar" aria-label="Navegação principal">
                    <div className="dashboard-sidebar-brand">
                        <span className="dashboard-sidebar-logo-frame">
                            <img src={logo} alt="ControlBet" className="dashboard-sidebar-logo" />
                        </span>
                        <div className="dashboard-sidebar-brand-copy">
                            <strong>ControlBet</strong>
                            <span>Fintech analytics</span>
                            <small>Command center</small>
                        </div>
                    </div>

                    <nav className="dashboard-sidebar-nav" aria-label="Menu do dashboard">
                        <span className="dashboard-sidebar-nav-label">Workspace</span>
                        <button type="button" className="dashboard-sidebar-link active">
                            <span>DB</span>
                            <span className="dashboard-sidebar-link-copy">
                                <strong>Dashboard</strong>
                                <small>Visao executiva</small>
                            </span>
                        </button>
                        <button type="button" className="dashboard-sidebar-link">
                            <span>BI</span>
                            <span className="dashboard-sidebar-link-copy">
                                <strong>Bilhetes</strong>
                                <small>Operacoes do dia</small>
                            </span>
                        </button>
                        <button type="button" className="dashboard-sidebar-link">
                            <span>CA</span>
                            <span className="dashboard-sidebar-link-copy">
                                <strong>Bancas</strong>
                                <small>Casas e saldos</small>
                            </span>
                        </button>
                        <button type="button" className="dashboard-sidebar-link">
                            <span>RE</span>
                            <span className="dashboard-sidebar-link-copy">
                                <strong>Relatorios</strong>
                                <small>Analytics</small>
                            </span>
                        </button>
                        <button type="button" className="dashboard-sidebar-link">
                            <span>MO</span>
                            <span className="dashboard-sidebar-link-copy">
                                <strong>Movimentações</strong>
                                <small>Depósitos e saques</small>
                            </span>
                        </button>
                        <button type="button" className="dashboard-sidebar-link">
                            <span>CO</span>
                            <span className="dashboard-sidebar-link-copy">
                                <strong>Configurações</strong>
                                <small>Conta e preferências</small>
                            </span>
                        </button>
                    </nav>

                    <div className="dashboard-sidebar-upgrade">
                        <span>Plano Free</span>
                        <strong>Desbloqueie analises premium</strong>
                        <p>Relatorios avancados, metas e leitura completa da carteira.</p>
                        <button type="button">Upgrade</button>
                    </div>
                </aside>

                <main className="dashboard-main">
                    <div className="container">
                <header className="dashboard-topbar dashboard-hero">
                    <div className="dashboard-hero-content">
                        <div className="dashboard-topbar-brand">
                            <div className="dashboard-heading-copy">
                                <span className="dashboard-section-label">ControlBet workspace</span>
                                <h1>Dashboard</h1>
                                <p>Bem-vindo de volta, {accountName}. Acompanhe banca, exposicao e performance em uma visao executiva.</p>
                            </div>
                        </div>

                        <div className="dashboard-hero-insights" aria-label="Resumo executivo">
                            <div>
                                <span>Banca atual</span>
                                <strong>{formatMoney(totalCurrentBank)}</strong>
                            </div>
                            <div>
                                <span>Resultado</span>
                                <strong className={finalResult >= 0 ? "positive" : "negative"}>
                                    {finalResult > 0 ? "+" : ""}
                                    {formatMoney(finalResult)}
                                </strong>
                            </div>
                            <div>
                                <span>ROI</span>
                                <strong className={summaryStats.roi >= 0 ? "positive" : "negative"}>
                                    {formatPercent(summaryStats.roi)}
                                </strong>
                            </div>
                        </div>
                    </div>

                    <div className="dashboard-topbar-actions">
                        <div className="dashboard-account-menu-wrap" ref={accountMenuRef}>
                            <button
                                type="button"
                                className="dashboard-account-button"
                                onClick={() => setIsAccountMenuOpen((isOpen) => !isOpen)}
                                aria-haspopup="menu"
                                aria-expanded={isAccountMenuOpen}
                            >
                                <span className="dashboard-account-avatar">{accountInitial}</span>
                                <span className="dashboard-account-copy">
                                    <span>Perfil ativo</span>
                                    <strong>{accountName}</strong>
                                </span>

                                <span className="dashboard-account-plan">{accountPlan}</span>
                                <span className="dashboard-account-caret">{"\u25BE"}</span>
                            </button>

                            {isAccountMenuOpen && (
                                <div className="dashboard-account-menu" role="menu">
                                    <button
                                        type="button"
                                        role="menuitem"
                                        onClick={() => {
                                            setIsAccountMenuOpen(false);
                                            setIsAccountSettingsOpen(false);
                                            setPasswordActionFeedback({ type: "", message: "" });
                                            setIsProfileModalOpen(true);
                                        }}
                                    >
                                        Minha Conta
                                    </button>

                                    <button type="button" role="menuitem" onClick={handleLogout}>
                                        Sair
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {isProfileModalOpen && (
                    <div
                        className="profile-modal-overlay"
                        role="presentation"
                        onMouseDown={(event) => {
                            if (event.target === event.currentTarget) {
                                setIsProfileModalOpen(false);
                            }
                        }}
                    >
                        <section className="profile-modal" role="dialog" aria-modal="true" aria-labelledby="profile-modal-title">
                            <button
                                type="button"
                                className="profile-modal-close"
                                onClick={() => setIsProfileModalOpen(false)}
                                aria-label="Fechar minha conta"
                            >
                                ×
                            </button>

                            <div className="profile-modal-header">
                                <span className="dashboard-account-avatar profile-modal-avatar">{accountInitial}</span>

                                <div>
                                    <h2 id="profile-modal-title">Minha Conta</h2>
                                    <p>Informações da sua conta ControlBet.</p>
                                </div>
                            </div>

                            <section className="profile-security-session-box">
                                <div className="profile-security-panel-header">
                                    <strong>Informações da conta</strong>
                                    <p>Resumo dos dados vinculados ao cadastro atual.</p>
                                </div>

                                {isProfileEditing ? (
                                    <form className="profile-form profile-inline-edit-form" onSubmit={handleSaveProfile}>
                                        <div className="profile-session-details">
                                            <div>
                                                <label>
                                                    Nome
                                                    <input
                                                        type="text"
                                                        value={profileDraft.firstName}
                                                        onChange={(event) => {
                                                            setProfileDraft((currentDraft) => ({
                                                                ...currentDraft,
                                                                firstName: event.target.value,
                                                            }));
                                                            setProfileFeedback({ type: "", message: "" });
                                                        }}
                                                        disabled={isProfileSaving}
                                                    />
                                                </label>
                                            </div>

                                            <div>
                                                <label>
                                                    Sobrenome
                                                    <input
                                                        type="text"
                                                        value={profileDraft.lastName}
                                                        onChange={(event) => {
                                                            setProfileDraft((currentDraft) => ({
                                                                ...currentDraft,
                                                                lastName: event.target.value,
                                                            }));
                                                            setProfileFeedback({ type: "", message: "" });
                                                        }}
                                                        disabled={isProfileSaving}
                                                    />
                                                </label>
                                            </div>

                                            <div>
                                                <dt>Usuário</dt>
                                                <dd>{accountUsername}</dd>
                                            </div>

                                            <div>
                                                <dt>Plano</dt>
                                                <dd>{accountPlan}</dd>
                                            </div>

                                            <div>
                                                <dt>Telefone</dt>
                                                <dd>{accountPhone}</dd>
                                            </div>

                                            <div style={{ gridColumn: "1 / -1" }}>
                                                <dt>Email</dt>
                                                <dd style={{ overflowWrap: "anywhere" }}>{accountEmail}</dd>
                                            </div>
                                        </div>

                                        {profileFeedback.message && (
                                            <p className={\`profile-inline-message profile-inline-message-\${profileFeedback.type}\`}>
                                                {profileFeedback.message}
                                            </p>
                                        )}

                                        <div className="profile-actions">
                                            <button
                                                type="button"
                                                className="profile-secondary-button"
                                                onClick={handleCancelProfileEdit}
                                                disabled={isProfileSaving}
                                            >
                                                Cancelar
                                            </button>

                                            <button
                                                type="submit"
                                                className="profile-primary-button"
                                                disabled={isProfileSaving}
                                            >
                                                {isProfileSaving ? "Salvando..." : "Salvar Alterações"}
                                            </button>
                                        </div>
                                    </form>
                                ) : (
                                    <>
                                        <dl className="profile-session-details">
                                            <div>
                                                <dt>Nome</dt>
                                                <dd>{accountName}</dd>
                                            </div>

                                            <div>
                                                <dt>Usuário</dt>
                                                <dd>{accountUsername}</dd>
                                            </div>

                                            <div>
                                                <dt>Plano</dt>
                                                <dd>{accountPlan}</dd>
                                            </div>

                                            <div>
                                                <dt>Telefone</dt>
                                                <dd>{accountPhone}</dd>
                                            </div>

                                            <div style={{ gridColumn: "1 / -1" }}>
                                                <dt>Email</dt>
                                                <dd style={{ overflowWrap: "anywhere" }}>{accountEmail}</dd>
                                            </div>
                                        </dl>

                                        <div className="profile-actions">
                                            <button
                                                type="button"
                                                className="profile-secondary-button"
                                                onClick={() => {
                                                    setProfileDraft({
                                                        firstName: accountFirstName,
                                                        lastName: accountLastName,
                                                    });
                                                    setProfileFeedback({ type: "", message: "" });
                                                    setIsProfileEditing(true);
                                                }}
                                            >
                                                Editar dados básicos
                                            </button>
                                        </div>

                                        {profileFeedback.message && (
                                            <p className={\`profile-inline-message profile-inline-message-\${profileFeedback.type}\`}>
                                                {profileFeedback.message}
                                            </p>
                                        )}
                                    </>
                                )}
                            </section>

                            <section className="profile-security-session-box">
                                <button
                                    type="button"
                                    className="profile-security-box profile-accordion-trigger"
                                    aria-expanded={isAccountSettingsOpen}
                                    onClick={() => setIsAccountSettingsOpen((isOpen) => !isOpen)}
                                >
                                    <span className="profile-security-panel-header">
                                        <strong>Segurança e gerenciamento</strong>
                                        <p>Credenciais, identificadores, sessão e conta.</p>
                                    </span>
                                    <span className="profile-accordion-caret" aria-hidden="true" />
                                </button>

                                <div
                                    className={\`profile-accordion-content \${isAccountSettingsOpen ? "is-open" : ""}\`}
                                    aria-hidden={!isAccountSettingsOpen}
                                >
                                    <div className="profile-accordion-inner">
                                        <div className="profile-security-panel-header">
                                            <strong>Credenciais</strong>
                                        </div>

                                        <div className="profile-security-box">
                                            <div>
                                                <strong>Email da conta</strong>
                                                <p style={{ overflowWrap: "anywhere" }}>{accountEmail}</p>
                                            </div>

                                            <div className="profile-security-actions">
                                                <button type="button" className="profile-secondary-button" disabled>
                                                    Alterar email
                                                </button>
                                            </div>
                                        </div>

                                        <div className="profile-security-box">
                                            <div>
                                                <strong>Senha</strong>
                                            </div>

                                            <div className="profile-security-actions">
                                                <button
                                                    type="button"
                                                    className="profile-secondary-button"
                                                    onClick={handleSendPasswordReset}
                                                    disabled={isPasswordResetSending || !user?.email}
                                                >
                                                    {isPasswordResetSending ? "Enviando..." : "Alterar senha"}
                                                </button>
                                            </div>
                                        </div>

                                        {passwordActionFeedback.message && (
                                            <p className={\`profile-inline-message profile-inline-message-\${passwordActionFeedback.type}\`}>
                                                {passwordActionFeedback.message}
                                            </p>
                                        )}

                                        <div className="profile-security-panel-header">
                                            <strong>Identificadores</strong>
                                        </div>

                                        <div className="profile-security-box">
                                            <div>
                                                <strong>Telefone</strong>
                                                <p>{accountPhone}</p>
                                            </div>

                                            <div className="profile-security-actions">
                                                <button type="button" className="profile-secondary-button" disabled>
                                                    Alterar telefone
                                                </button>
                                            </div>
                                        </div>

                                        <div className="profile-security-box">
                                            <div>
                                                <strong>Usuário</strong>
                                                <p>{accountUsername}</p>
                                            </div>

                                            <div className="profile-security-actions">
                                                <button type="button" className="profile-secondary-button" disabled>
                                                    Alterar usuário
                                                </button>
                                            </div>
                                        </div>

                                        <div className="profile-security-panel-header">
                                            <strong>Sessão atual</strong>
                                        </div>

                                        <dl className="profile-session-details">
                                            <div>
                                                <dt>Provedor</dt>
                                                <dd>{accountProvider}</dd>
                                            </div>

                                            <div>
                                                <dt>Último login</dt>
                                                <dd>{accountLastLogin}</dd>
                                            </div>
                                        </dl>

                                        <section className="profile-security-panel profile-security-panel-danger">
                                            <div className="profile-security-panel-header">
                                                <strong>Conta</strong>
                                                <p>A exclusão de conta ainda não está disponível. Quando habilitada, seguirá um fluxo seguro com confirmação e período de cancelamento.</p>
                                            </div>

                                            <div className="profile-security-panel-actions">
                                                <button type="button" className="profile-danger-button" disabled>
                                                    Solicitar exclusão
                                                </button>
                                            </div>
                                        </section>
                                    </div>
                                </div>
                            </section>
                        </section>
                    </div>
                )}

                <section className={\`panel top-panel \${isStatsCalendarOpen ? "calendar-open" : ""}\`}>
                    <div className="top-desktop-layout">
                        <section className="home-section house-analytics-section" aria-label="House analytics">
                            <div className="home-section-heading">
                                <div>
                                    <span>House analytics</span>
                                    <h2>Casas monitoradas</h2>
                                </div>

                                <p>Compare volume, taxa de acerto e selecione o escopo de análise.</p>
                            </div>

                        <div className="top-house-form-row">
                            <form className="top-house-form-inline" onSubmit={handleAddOrEditHouse}>
                                <div className="field-group top-house-field">
                                    <label>Casa de aposta</label>
                                    <input
                                        type="text"
                                        placeholder="Ex.: Superbet"
                                        value={houseForm.nome}
                                        onChange={(e) => {
                                            setHouseForm((prev) => ({ ...prev, nome: e.target.value }));
                                            setHouseFeedback({ type: "", message: "" });
                                        }}
                                    />
                                </div>

                                <div className="field-group top-house-field top-house-bank-field">
                                    <label>Banca inicial</label>
                                    <input
                                        type="text"
                                        placeholder="R$ 0,00"
                                        value={houseForm.bancaInicial}
                                        onChange={(e) => {
                                            setHouseForm((prev) => ({
                                                ...prev,
                                                bancaInicial: formatCurrencyTyping(e.target.value),
                                            }));
                                            setHouseFeedback({ type: "", message: "" });
                                        }}
                                    />
                                </div>

                                <button type="submit" className="primary-button top-house-add-button">
                                    <span className="btn-text">
                                        {isSavingHouse
                                            ? editingHouseId
                                                ? "Salvando..."
                                                : "Adicionando..."
                                            : editingHouseId
                                                ? "Salvar casa"
                                                : "Adicionar casa"}
                                    </span>
                                    <span className="btn-icon">
                                        {editingHouseId ? "\u2713" : "+"}
                                    </span>
                                </button>

                                {editingHouseId && (
                                    <button
                                        type="button"
                                        className="secondary-button top-house-cancel-button"
                                        onClick={() => {
                                            setEditingHouseId(null);
                                            setHouseForm(initialHouseForm);
                                        }}
                                    >
                                        Cancelar
                                    </button>
                                )}

                                {houseFeedback.message && (
                                    <div className={\`house-feedback \${houseFeedback.type}\`}>
                                        {houseFeedback.message}
                                    </div>
                                )}
                            </form>

                            {!isMobileLive && houses.length + 1 > DESKTOP_HOUSES_PER_PAGE && (
                                <div className="top-houses-arrows">
                                    <button
                                        type="button"
                                        className="arrow-btn"
                                        onClick={() => handleHousePage("prev")}
                                        disabled={!canGoPrev}
                                    >
                                        {"\u2039"}
                                    </button>

                                    <button
                                        type="button"
                                        className="arrow-btn"
                                        onClick={() => handleHousePage("next")}
                                        disabled={!canGoNext}
                                    >
                                        {"\u203A"}
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="top-houses-row">
                            <div className="top-houses-scroll">
                                <div
                                    className={\`top-houses-grid \${isSliding
                                        ? \`is-sliding \${slideDirection === "next" ? "slide-next" : "slide-prev"}\`
                                        : ""
                                        }\`}
                                >
                                    {[
                                        {
                                            id: "all",
                                            nome: "Todas as casas",
                                            quantidadeApostas: baseTicketsForPeriod.length,
                                            taxaAcerto: allHitRate,
                                            isAll: true,
                                        },
                                        ...housesWithCurrentBank,
                                    ]
                                        .slice(housePageStart, housePageStart + housesPerPageLive)
                                        .map((house) => {
                                            if (house.isAll) {
                                                return (
                                                    <div className="top-house-card-wrap" key="all-houses-card">
                                                        <button
                                                            type="button"
                                                            className={\`top-house-card top-house-general-card \${selectedHouseScope === "all"
                                                                ? "selected-house-card"
                                                                : ""
                                                                }\`}
                                                            onClick={selectAllHousesScope}
                                                        >
                                                            <div className="top-house-card-title">Todas as casas</div>

                                                            <div className="top-house-card-info">
                                                                <span>Apostas</span>
                                                                <strong>{house.quantidadeApostas}</strong>
                                                            </div>

                                                            <div className="top-house-card-info">
                                                                <span>Taxa de acerto</span>
                                                                <strong>{formatPercent(house.taxaAcerto)}</strong>
                                                            </div>
                                                        </button>
                                                    </div>
                                                );
                                            }

                                            return (
                                                <div className="top-house-card-wrap" key={house.id}>
                                                    <div
                                                        className={\`top-house-card \${Number(selectedHouseScope) === Number(house.id) ? "selected-house-card" : ""
                                                            }\`}
                                                    >
                                                        <div
                                                            role="button"
                                                            tabIndex={0}
                                                            className="top-house-card-button"
                                                            onClick={() => selectHouseScope(house.id)}
                                                        >
                                                            <div className="top-house-card-header">
                                                                <div className="top-house-card-title">{house.nome}</div>

                                                                <button
                                                                    type="button"
                                                                    className="menu-dots-button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setMenuHouseId((prev) =>
                                                                            prev === house.id ? null : house.id
                                                                        );
                                                                    }}
                                                                >
                                                                    {"\u22EE"}
                                                                </button>
                                                            </div>

                                                            <div className="top-house-card-info">
                                                                <span>Apostas</span>
                                                                <strong>{house.quantidadeApostas}</strong>
                                                            </div>

                                                            <div className="top-house-card-info">
                                                                <span>Taxa de acerto</span>
                                                                <strong>{formatPercent(house.taxaAcerto)}</strong>
                                                            </div>
                                                        </div>

                                                        {menuHouseId === house.id && (
                                                            <div className="top-house-menu-box" ref={menuRef}>
                                                                <button
                                                                    type="button"
                                                                    className="house-menu-item"
                                                                    onClick={() => handleStartEditHouse(house.id)}
                                                                >
                                                                    Editar
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    className="house-menu-item danger-item"
                                                                    onClick={() => handleDeleteHouse(house.id)}
                                                                >
                                                                    Excluir
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>
                        </div>

                        {isMobileLive && houses.length + 1 > MOBILE_HOUSES_PER_PAGE && (
                            <div className="top-houses-arrows bottom-arrows">
                                <button
                                    type="button"
                                    className="arrow-btn"
                                    onClick={() => handleHousePage("prev")}
                                    disabled={!canGoPrev}
                                >
                                    {"\u2039"}
                                </button>

                                <button
                                    type="button"
                                    className="arrow-btn"
                                    onClick={() => handleHousePage("next")}
                                    disabled={!canGoNext}
                                >
                                    {"\u203A"}
                                </button>
                            </div>
                        )}
                        </section>

                        <section className="home-section filters-section" aria-label="Filtros do dashboard">
                            <div className="home-section-heading">
                                <div>
                                    <span>Filtros</span>
                                    <h2>Controle do período</h2>
                                </div>

                                <p>Defina casa, recorte e data para atualizar a visão executiva.</p>
                            </div>

                        <div className="top-filter-summary-row">
                            <div className="top-filter-group">
                                <div className="field-group stats-house-field">
                                    <label>Casa de aposta</label>
                                    <select
                                        value={selectedHouseScope ?? ""}
                                        onChange={(e) => {
                                            const value = e.target.value;

                                            if (value === "all") {
                                                setSelectedHouseScope("all");
                                            } else if (value === "") {
                                                setSelectedHouseScope(null);
                                            } else {
                                                setSelectedHouseScope(Number(value));
                                            }

                                            setTopMetricIndex(0);
                                        }}
                                    >
                                        <option value="">Selecione</option>
                                        <option value="all">Todas as casas</option>
                                        {houses.map((house) => (
                                            <option key={house.id} value={house.id}>
                                                {house.nome}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="field-group period-field">
                                    <label>Período</label>
                                    <select
                                        value={periodType}
                                        onChange={(e) => {
                                            const value = e.target.value;

                                            setPeriodType(value);
                                            setTopMetricIndex(0);

                                            if (value === "Diário") {
                                                setPeriodReference(hojeISO());
                                            }

                                            if (value === "Semanal") {
                                                setPeriodReference(getWeekRef(hojeISO()));
                                            }

                                            if (value === "Mensal") {
                                                setPeriodReference(getMonthRef(hojeISO()));
                                            }

                                            if (value === "Anual") {
                                                setPeriodReference(getYearRef(hojeISO()));
                                            }

                                            if (value === "Geral") {
                                                setPeriodReference("");
                                            }
                                        }}
                                    >
                                        <option value="Diário">Diário</option>
                                        <option value="Semanal">Semanal</option>
                                        <option value="Mensal">Mensal</option>
                                        <option value="Anual">Anual</option>
                                        <option value="Geral">Geral</option>
                                    </select>
                                </div>

                                {periodType !== "Geral" && (
                                    <>
                                        {(periodType === "Diário" ||
                                            periodType === "Semanal" ||
                                            periodType === "Mensal" ||
                                            periodType === "Anual") && (
                                                <div className="field-group stats-calendar-field" ref={statsCalendarRef}>
                                                    <label>Data</label>

                                                    <button
                                                        ref={statsButtonRef}
                                                        type="button"
                                                        className="stats-calendar-button"
                                                        onClick={(e) => {
                                                            const rect = e.currentTarget.getBoundingClientRect();

                                                            const calendarHeight = 360;
                                                            const overflow = rect.bottom + calendarHeight - window.innerHeight;

                                                            if (overflow > 0) {
                                                                window.scrollBy({
                                                                    top: overflow + 40,
                                                                    behavior: "smooth",
                                                                });
                                                            }

                                                            setIsStatsCalendarOpen((prev) => !prev);
                                                        }}
                                                    >
                                                        <span className="stats-calendar-text">
                                                            {periodType === "Diário" && formatDateBR(periodReference)}
                                                            {periodType === "Semanal" && formatWeekRef(periodReference)}
                                                            {periodType === "Mensal" && formatMonthRef(periodReference)}
                                                            {periodType === "Anual" && String(periodReference).slice(0, 4)}
                                                            {periodType === "Geral" && "Geral"}
                                                        </span>

                                                        <span className="stats-calendar-icon">
                                                            DT
                                                        </span>
                                                    </button>

                                                    {isStatsCalendarOpen && (
                                                        <div className="stats-calendar-popover">
                                                            <DayPicker
                                                                mode="single"
                                                                locale={ptBR}
                                                                captionLayout="dropdown"
                                                                fromYear={2020}
                                                                toYear={2035}
                                                                selected={
                                                                    periodReference
                                                                        ? new Date(\`\${periodReference}T12:00:00\`)
                                                                        : undefined
                                                                }
                                                                onSelect={(date) => {
                                                                    if (!date) return;

                                                                    const selectedISO = dateToISO(date);

                                                                    if (periodType === "Diário") {
                                                                        setPeriodReference(selectedISO);
                                                                    }

                                                                    if (periodType === "Semanal") {
                                                                        setPeriodReference(getWeekRef(selectedISO));
                                                                    }

                                                                    if (periodType === "Mensal") {
                                                                        setPeriodReference(selectedISO.slice(0, 7));
                                                                    }

                                                                    if (periodType === "Anual") {
                                                                        setPeriodReference(selectedISO.slice(0, 4));
                                                                    }

                                                                    setTopMetricIndex(0);
                                                                    setIsStatsCalendarOpen(false);
                                                                }}
                                                                modifiers={{
                                                                    hasTicket: ticketMarkedDays,
                                                                    hasMovement: movementMarkedDays,
                                                                }}
                                                                modifiersClassNames={{
                                                                    hasTicket: "day-has-tickets",
                                                                    hasMovement: "day-has-movements",
                                                                }}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                        {false && (
                                            <div className="field-group period-field">
                                                <label>Data</label>

                                                <select
                                                    value={periodReference}
                                                    onChange={(e) => {
                                                        setPeriodReference(e.target.value);
                                                        setTopMetricIndex(0);
                                                    }}
                                                >
                                                    {availableReferences.map((reference) => (
                                                        <option key={reference} value={reference}>
                                                            {periodType === "Mensal" && formatMonthRef(reference)}
                                                            {periodType === "Trimestral" && formatQuarterRef(reference)}
                                                            {periodType === "Semestral" && formatSemesterRef(reference)}
                                                            {periodType === "Anual" && reference}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                    </>
                                )}

                            </div>

                            {showStatsBottomArrows && (
                                <div className="stats-bottom-arrows-mobile">
                                    <button
                                        type="button"
                                        className="arrow-btn"
                                        onClick={() => setTopMetricIndex((prev) => Math.max(0, prev - 1))}
                                        disabled={topMetricIndex === 0}
                                    >
                                        {"\u2039"}
                                    </button>

                                    <button
                                        type="button"
                                        className="arrow-btn"
                                        onClick={() =>
                                            setTopMetricIndex((prev) =>
                                                Math.min(topMetricPages.length - 1, prev + 1)
                                            )
                                        }
                                        disabled={topMetricIndex >= topMetricPages.length - 1}
                                    >
                                        {"\u203A"}
                                    </button>
                                </div>
                            )}

                            {!isMobileLive && topMetricPages.length > 1 && (
                                <div className="stats-top-arrows-inline">
                                    <button
                                        type="button"
                                        className="arrow-btn"
                                        onClick={prevMetric}
                                        disabled={!canPrevMetric}
                                    >
                                        {"\u2039"}
                                    </button>

                                    <button
                                        type="button"
                                        className="arrow-btn"
                                        onClick={nextMetric}
                                        disabled={!canNextMetric}
                                    >
                                        {"\u203A"}
                                    </button>
                                </div>
                            )}
                        </div>
                        </section>

                        <section className="home-section kpi-section" aria-label="Indicadores principais">
                            <div className="home-section-heading">
                                <div>
                                    <span>KPI row</span>
                                    <h2>Indicadores principais</h2>
                                </div>

                                <p>Leitura rápida de banca, exposição e retorno.</p>
                            </div>

                        <div className="stats-top-section">
                            <div
                                className={\`stats-top-grid \${isStatsSliding ? \`is-sliding \${statsSlideDirection === "next" ? "slide-next" : "slide-prev"}\` : ""}\`}
                            >
                                {topMetricPages[topMetricIndex].map((item) => (
                                    <div
                                        key={item.title}
                                        className={\`stats-top-card \${item.onClick ? "clickable" : ""} \${item.tone === "positive" ? "positive" : item.tone === "negative" ? "negative" : ""}\`}
                                        onClick={item.onClick}
                                    >
                                        <div className="metric-card-visual">
                                            <span className="metric-icon-box" aria-hidden="true">
                                                {item.icon}
                                            </span>

                                            {item.title === "Evolução da banca" && (
                                                <span className={\`metric-toggle-indicator \${isBankChartOpen ? "is-open" : ""}\`} aria-hidden="true" />
                                            )}
                                        </div>

                                        <div className="metric-card-body">
                                            <div className="metric-title-row">
                                                <span>{item.eyebrow || item.title}</span>
                                                <strong>{item.title}</strong>
                                            </div>

                                            <div className="metric-main-content">
                                                <strong className={\`metric-value \${item.tone || "neutral"}\`}>
                                                    {renderTopValue(item.value, item.formatter)}
                                                </strong>

                                                <p className="metric-subtext">{item.description}</p>

                                                {item.extraValue !== null && item.extraValue !== undefined && (
                                                    <div className="metric-extra-value">
                                                        {item.extraLabel || "Real"}: {item.extraValue > 0 ? "+" : ""}
                                                        {formatMoney(item.extraValue)}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {isMobileLive && topMetricPages.length > 1 && (
                                <div className="stats-bottom-arrows">
                                    <button
                                        type="button"
                                        className="arrow-btn"
                                        onClick={() => setTopMetricIndex((prev) => Math.max(0, prev - 1))}
                                        disabled={topMetricIndex === 0}
                                    >
                                        {"\u2039"}
                                    </button>

                                    <button
                                        type="button"
                                        className="arrow-btn"
                                        onClick={() =>
                                            setTopMetricIndex((prev) =>
                                                Math.min(topMetricPages.length - 1, prev + 1)
                                            )
                                        }
                                        disabled={topMetricIndex >= topMetricPages.length - 1}
                                    >
                                        {"\u203A"}
                                    </button>
                                </div>
                            )}
                        </div>
                        </section>

                    </div>
                </section>

                {bankHistoryData.length > 0 && (
                    <section ref={bankChartRef} className="analytics-section">
                        <div className="analytics-section-header">
                            <div>
                                <span className="analytics-panel-kicker">Performance center</span>
                                <h2>Analytics da banca</h2>
                                <p>Leitura visual do saldo, retorno mensal e distribuição entre casas.</p>
                            </div>

                            <div className="analytics-section-summary">
                                <span>{formatPeriodLabel(periodType, periodReference)}</span>
                                <strong>{selectedHouseScope === "all" ? "Todas as casas" : selectedHouseData?.nome || "Casa selecionada"}</strong>
                            </div>
                        </div>

                        <div className="analytics-grid">
                            <article className="panel bank-chart-panel analytics-panel analytics-panel-large">
                        <div className="bank-chart-header">
                            <div className="bank-chart-title">
                                <span className="analytics-panel-kicker">Analytics</span>
                                <h2>Evolução da banca</h2>
                                <span>{chartMode === "Banca" ? "Saldo acumulado no período" : "Desempenho realizado no período"}</span>
                            </div>

                            <select
                                value={chartMode}
                                onChange={(e) => setChartMode(e.target.value)}
                                className="bank-chart-select"
                            >
                                <option value="Banca">Banca</option>
                                <option value="Desempenho">Desempenho</option>
                            </select>

                        </div>

                        <div className="bank-chart-box">
                            <ResponsiveContainer width="100%" height={310}>
                                <AreaChart
                                    data={bankHistoryData}
                                    margin={{ top: 20, right: 12, left: -10, bottom: 15 }}
                                >
                                    <defs>
                                        <linearGradient id="bankGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop
                                                offset="0%"
                                                stopColor={isBankChartPositive ? "#16a34a" : "#dc2626"}
                                                stopOpacity={0.2}
                                            />
                                            <stop
                                                offset="100%"
                                                stopColor={isBankChartPositive ? "#16a34a" : "#dc2626"}
                                                stopOpacity={0.02}
                                            />
                                        </linearGradient>
                                    </defs>

                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        stroke="#e2e8f0"
                                        vertical={false}
                                    />

                                    <ReferenceLine
                                        y={bankHistoryData[0]?.banca}
                                        stroke="#94a3b8"
                                        strokeDasharray="4 4"
                                    />

                                    <XAxis
                                        dataKey="data"
                                        axisLine={false}
                                        tickLine={false}
                                        interval={0}
                                        dy={12}
                                        tick={{ fontSize: 11, fill: "#64748b" }}
                                        tickFormatter={(value) => {
                                            const date = new Date(\`\${value}T12:00:00\`);
                                            return \`\${date.getDate()}/\${date.getMonth() + 1}\`;
                                        }}
                                    />
                                    <YAxis
                                        domain={["dataMin - 50", "dataMax + 50"]}
                                        axisLine={false}
                                        tickLine={false}
                                        width={64}
                                        tick={{ fontSize: 11, fill: "#64748b" }}
                                        tickFormatter={(value) =>
                                            \`R$ \${Number(value).toLocaleString("pt-BR")}\`
                                        }
                                    />
                                    <Tooltip
                                        cursor={{ stroke: "#cbd5e1", strokeWidth: 1 }}
                                        content={({ active, payload }) => {
                                            if (!active || !payload || !payload.length) return null;

                                            const data = payload[0].payload;

                                            return (
                                                <div className="chart-tooltip">
                                                    <div><strong>{formatDateBR(data.data)}</strong></div>

                                                    <div>Banca: {formatMoney(data.banca)}</div>

                                                    {data.deposito > 0 && (
                                                        <div style={{ color: "#16a34a" }}>
                                                            Depósito: +{formatMoney(data.deposito)}
                                                        </div>
                                                    )}

                                                    {data.saque > 0 && (
                                                        <div style={{ color: "#dc2626" }}>
                                                            Saque: -{formatMoney(data.saque)}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        }}
                                    />

                                    <Area
                                        type="natural"
                                        dataKey="banca"
                                        stroke={isBankChartPositive ? "#16a34a" : "#dc2626"}
                                        fill="url(#bankGradient)"
                                        strokeWidth={3}
                                        dot={({ cx, cy, payload }) => {
                                            if (!payload?.deposito && !payload?.saque) return null;

                                            return (
                                                <circle
                                                    cx={cx}
                                                    cy={cy}
                                                    r={6}
                                                    fill={Number(payload.saque || 0) > 0 ? "#dc2626" : "#16a34a"}
                                                    stroke="#ffffff"
                                                    strokeWidth={3}
                                                />
                                            );
                                        }}
                                        activeDot={{
                                            r: 7,
                                            stroke: "#ffffff",
                                            strokeWidth: 3,
                                            fill: isBankChartPositive ? "#16a34a" : "#dc2626",
                                        }}
                                    />

                                    {bankHistoryData.map((item, index) => {
                                        if (!item.deposito && !item.saque) return null;

                                        return (
                                            <ReferenceDot
                                                key={index}
                                                x={item.data}
                                                y={item.banca}
                                                r={7}
                                                fill={item.deposito > 0 ? "#16a34a" : "#dc2626"}
                                                stroke="#ffffff"
                                                strokeWidth={3}
                                                isFront={true}
                                            />
                                        );
                                    })}

                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                            </article>

                            <article className="panel analytics-panel analytics-mini-panel">
                                <div className="analytics-mini-header">
                                    <span className="analytics-panel-kicker">Mensal</span>
                                    <h2>Performance mensal</h2>
                                    <p>Retorno, lucro real e movimentações do período.</p>
                                </div>

                                <div className="analytics-mini-hero">
                                    <span>Resultado real</span>
                                    <strong className={summaryStats.realProfit >= 0 ? "positive" : "negative"}>
                                        {summaryStats.realProfit > 0 ? "+" : ""}
                                        {formatMoney(summaryStats.realProfit)}
                                    </strong>
                                </div>

                                <div className="analytics-bar-visual" aria-hidden="true">
                                    <span className="negative" style={{ height: "44%" }} />
                                    <span className="positive" style={{ height: "78%" }} />
                                    <span className="negative" style={{ height: "62%" }} />
                                    <span className="negative" style={{ height: "86%" }} />
                                    <span className="negative" style={{ height: "30%" }} />
                                    <span className="negative" style={{ height: "70%" }} />
                                </div>

                                <div className="analytics-performance-list">
                                    <div className="analytics-performance-row">
                                        <span>ROI</span>
                                        <strong className={summaryStats.roi >= 0 ? "positive" : "negative"}>
                                            {formatPercent(summaryStats.roi)}
                                        </strong>
                                    </div>

                                    <div className="analytics-performance-track">
                                        <span
                                            style={{
                                                width: \`\${Math.min(100, Math.max(8, Math.abs(summaryStats.roi)))}%\`,
                                            }}
                                        />
                                    </div>

                                    <div className="analytics-performance-row">
                                        <span>Lucro real</span>
                                        <strong className={summaryStats.realProfit >= 0 ? "positive" : "negative"}>
                                            {summaryStats.realProfit > 0 ? "+" : ""}
                                            {formatMoney(summaryStats.realProfit)}
                                        </strong>
                                    </div>

                                    <div className="analytics-performance-row">
                                        <span>Movimentações</span>
                                        <strong className={summaryStats.movementBalance >= 0 ? "positive" : "negative"}>
                                            {summaryStats.movementBalance > 0 ? "+" : ""}
                                            {formatMoney(summaryStats.movementBalance)}
                                        </strong>
                                    </div>
                                </div>
                            </article>

                            <article className="panel analytics-panel analytics-mini-panel">
                                <div className="analytics-mini-header">
                                    <span className="analytics-panel-kicker">Carteira</span>
                                    <h2>Distribuição por casa</h2>
                                    <p>Participacao das maiores bancas no saldo consolidado.</p>
                                </div>

                                <div className="analytics-mini-hero">
                                    <span>Total em carteira</span>
                                    <strong>{formatMoney(totalCurrentBank)}</strong>
                                </div>

                                <div className="analytics-donut-layout">
                                    <div className="analytics-donut-visual" aria-hidden="true" />

                                    <div className="analytics-house-list">
                                        {housesWithCurrentBank.slice(0, 4).map((house) => (
                                            <div className="analytics-house-row" key={house.id}>
                                                <div>
                                                    <span>{house.nome}</span>
                                                    <strong>{formatMoney(house.bancaAtual)}</strong>
                                                </div>

                                                <div className="analytics-house-track">
                                                    <span
                                                        style={{
                                                            width: \`\${Math.min(
                                                                100,
                                                                Math.max(
                                                                    8,
                                                                    totalCurrentBank > 0
                                                                        ? (Number(house.bancaAtual || 0) / totalCurrentBank) * 100
                                                                        : 8
                                                                )
                                                            )}%\`,
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </article>
                        </div>
                    </section>
                )}

                <div className="bottom-action-grid">
                    <button
                        type="button"
                        className={\`bottom-action-card \${activeBottomPanel === "ticket" ? "active" : ""}\`}
                        onClick={() => {
                            const nextPanel = activeBottomPanel === "ticket" ? null : "ticket";
                            setActiveBottomPanel(nextPanel);

                            if (nextPanel === "ticket") {
                                setTimeout(() => {
                                    leftPanelRef.current?.scrollIntoView({
                                        behavior: "smooth",
                                        block: "start",
                                    });
                                }, 120);
                            }
                        }}
                    >
                        <span className="bottom-action-icon" aria-hidden="true">NB</span>
                        <span className="bottom-action-copy">
                            <span className="bottom-action-label">Novo bilhete</span>
                            <small>Registre uma aposta com stake, odd e retorno.</small>
                        </span>
                        <strong className="bottom-action-indicator">{activeBottomPanel === "ticket" ? "-" : "+"}</strong>
                    </button>

                    <button
                        type="button"
                        className={\`bottom-action-card \${activeBottomPanel === "ticketsDay" ? "active" : ""}\`}
                        onClick={() => {
                            const nextPanel = activeBottomPanel === "ticketsDay" ? null : "ticketsDay";
                            setActiveBottomPanel(nextPanel);

                            if (nextPanel === "ticketsDay") {
                                setTimeout(() => {
                                    leftPanelRef.current?.scrollIntoView({
                                        behavior: "smooth",
                                        block: "start",
                                    });
                                }, 120);
                            }
                        }}
                    >
                        <span className="bottom-action-icon" aria-hidden="true">BD</span>
                        <span className="bottom-action-copy">
                            <span className="bottom-action-label">Bilhetes do dia</span>
                            <small>Audite apostas abertas e resultados recentes.</small>
                        </span>
                        <strong className="bottom-action-indicator">{activeBottomPanel === "ticketsDay" ? "-" : "+"}</strong>
                    </button>

                    <button
                        type="button"
                        className={\`bottom-action-card \${activeBottomPanel === "movement" ? "active" : ""}\`}
                        onClick={() => {
                            const nextPanel = activeBottomPanel === "movement" ? null : "movement";
                            setActiveBottomPanel(nextPanel);

                            if (nextPanel === "movement") {
                                setTimeout(() => {
                                    rightPanelRef.current?.scrollIntoView({
                                        behavior: "smooth",
                                        block: "start",
                                    });
                                }, 120);
                            }
                        }}
                    >
                        <span className="bottom-action-icon" aria-hidden="true">MO</span>
                        <span className="bottom-action-copy">
                            <span className="bottom-action-label">
                                {window.innerWidth <= 375
                                    ? "Movimentação"
                                    : "Nova movimentação"}
                            </span>
                            <small>Controle depósitos e saques da banca.</small>
                        </span>
                        <strong className="bottom-action-indicator">{activeBottomPanel === "movement" ? "-" : "+"}</strong>
                    </button>

                    <button
                        type="button"
                        className={\`bottom-action-card \${activeBottomPanel === "extract" ? "active" : ""}\`}
                        onClick={() => {
                            const isClosing = activeBottomPanel === "extract";
                            const nextPanel = isClosing ? null : "extract";

                            setActiveBottomPanel(nextPanel);

                            if (isClosing) {
                                setActiveMovementExtractTab(null);
                                setMovementExtractHouseScope("");
                                setMovementExtractPeriodType("");
                                setMovementExtractPeriodReference("");
                                return;
                            }

                            setTimeout(() => {
                                rightPanelRef.current?.scrollIntoView({
                                    behavior: "smooth",
                                    block: "start",
                                });
                            }, 120);
                        }}
                    >
                        <span className="bottom-action-icon" aria-hidden="true">EX</span>
                        <span className="bottom-action-copy">
                            <span className="bottom-action-label">Extrato</span>
                            <small>Veja movimentações consolidadas por período.</small>
                        </span>
                        <strong className="bottom-action-indicator">{activeBottomPanel === "extract" ? "-" : "+"}</strong>
                    </button>
                </div>

                {activeBottomPanel === "ticket" && (
                    <section className="panel bottom-dynamic-panel align-left" ref={leftPanelRef}>
                        {/* HEADER */}
                        <div className="section-header ticket-header-row">
                            <h2>{editingTicketId ? "Editar bilhete" : "Novo bilhete"}</h2>

                            <div className="ticket-form-calendar-field" ref={ticketFormCalendarRef}>
                                <button
                                    type="button"
                                    className="ticket-date-top"
                                    onClick={() => {
                                        setIsTicketFormCalendarOpen((prev) => !prev);

                                        setTimeout(() => {
                                            rightPanelRef.current?.scrollIntoView({
                                                behavior: "smooth",
                                                block: "start",
                                            });
                                        }, 80);
                                    }}
                                >
                                    <span>{formatDateBR(ticketForm.data)}</span>
                                    <span className="ticket-date-icon">▾</span>
                                </button>

                                {isTicketFormCalendarOpen && (
                                    <div className="ticket-form-calendar-popover">
                                        <DayPicker
                                            locale={ptBR}
                                            mode="single"
                                            captionLayout="dropdown"
                                            fromYear={2020}
                                            toYear={2035}
                                            selected={
                                                ticketForm.data
                                                    ? new Date(\`\${ticketForm.data}T12:00:00\`)
                                                    : undefined
                                            }
                                            onSelect={(date) => {
                                                if (!date) return;

                                                setTicketForm((prev) => ({
                                                    ...prev,
                                                    data: dateToISO(date),
                                                }));

                                                setIsTicketFormCalendarOpen(false);
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        <form className="form-stack" onSubmit={handleSaveTicket}>
                            {/* CASA */}
                            <div className="form-row">
                                <div className="field-group">
                                    <label>Casa de aposta</label>
                                    <select
                                        value={ticketForm.casaId}
                                        onChange={(e) =>
                                            setTicketForm((prev) => ({
                                                ...prev,
                                                casaId: e.target.value,
                                            }))
                                        }
                                    >
                                        <option value="">Selecione</option>
                                        {houses.map((house) => (
                                            <option key={house.id} value={house.id}>
                                                {house.nome}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* CATEGORIA */}
                            <div className="form-row">
                                <div className="field-group">
                                    <label>Categoria</label>
                                    <input
                                        type="text"
                                        placeholder="Ex.: Ambas marcam"
                                        value={ticketForm.categoria}
                                        onChange={(e) =>
                                            setTicketForm((prev) => ({
                                                ...prev,
                                                categoria: e.target.value,
                                            }))
                                        }
                                    />
                                </div>
                            </div>

                            {/* FINANCEIRO */}
                            <div className="form-row form-row-3">
                                <div className="field-group">
                                    <label>Odd</label>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        placeholder="1.80"
                                        value={ticketForm.odd}
                                        onChange={(e) => {
                                            const value = e.target.value.replace(",", ".");
                                            if (/^\d*\.?\d*$/.test(value)) {
                                                setTicketForm((prev) => ({ ...prev, odd: value }));
                                            }
                                        }}
                                    />
                                </div>

                                <div className="field-group">
                                    <label>Valor apostado</label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        placeholder="R$ 0,00"
                                        value={ticketForm.stake}
                                        onChange={(e) =>
                                            setTicketForm((prev) => ({
                                                ...prev,
                                                stake: formatCurrencyTyping(e.target.value),
                                            }))
                                        }
                                    />
                                </div>

                                <div className="field-group">
                                    <label>Retorno</label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        placeholder="R$ 0,00"
                                        value={ticketForm.retorno}
                                        onChange={(e) =>
                                            setTicketForm((prev) => ({
                                                ...prev,
                                                retorno: formatCurrencyTyping(e.target.value),
                                            }))
                                        }
                                    />
                                </div>
                            </div>

                            {/* ORIGEM + RESULTADO */}
                            <div className="form-row">
                                <div className="field-group">
                                    <label>Origem do dinheiro</label>
                                    <select
                                        value={ticketForm.origemStake}
                                        onChange={(e) =>
                                            setTicketForm((prev) => ({
                                                ...prev,
                                                origemStake: e.target.value,
                                                stakeSaldo: "",
                                                stakeBonus: "",
                                            }))
                                        }
                                    >
                                        <option>Saldo</option>
                                        <option>Bônus</option>
                                        <option>Saldo + Bônus</option>
                                    </select>
                                </div>

                                <div className="field-group">
                                    <label>Resultado</label>
                                    <select
                                        value={ticketForm.resultado}
                                        onChange={(e) =>
                                            setTicketForm((prev) => ({
                                                ...prev,
                                                resultado: e.target.value,
                                            }))
                                        }
                                    >
                                        <option value="Pendente">Pendente</option>
                                        <option value="Green">Ganho</option>
                                        <option value="Red">Perda</option>
                                        <option value="Cash Out">Cash Out</option>
                                    </select>
                                </div>
                            </div>

                            {/* DIVISÃO */}
                            {ticketForm.origemStake === "Saldo + Bônus" && (
                                <div className="form-row form-row-2">
                                    <div className="field-group">
                                        <label>Valor em saldo</label>
                                        <input
                                            type="text"
                                            placeholder="R$ 0,00"
                                            value={ticketForm.stakeSaldo}
                                            onChange={(e) =>
                                                setTicketForm((prev) => ({
                                                    ...prev,
                                                    stakeSaldo: formatCurrencyTyping(e.target.value),
                                                }))
                                            }
                                        />
                                    </div>

                                    <div className="field-group">
                                        <label>Valor em bônus</label>
                                        <input
                                            type="text"
                                            placeholder="R$ 0,00"
                                            value={ticketForm.stakeBonus}
                                            onChange={(e) =>
                                                setTicketForm((prev) => ({
                                                    ...prev,
                                                    stakeBonus: formatCurrencyTyping(e.target.value),
                                                }))
                                            }
                                        />
                                    </div>
                                </div>
                            )}

                            {/* OBS */}
                            <div className="field-group">
                                <label>Observações</label>
                                <textarea
                                    rows="2"
                                    placeholder="Opcional"
                                    value={ticketForm.observacoes}
                                    onChange={(e) =>
                                        setTicketForm((prev) => ({
                                            ...prev,
                                            observacoes: e.target.value,
                                        }))
                                    }
                                />
                            </div>

                            {/* BOTÃO */}
                            <div className="button-row">
                                <button type="submit" className="primary-button">
                                    {editingTicketId ? "Salvar bilhete" : "Adicionar bilhete"}
                                </button>
                            </div>
                        </form>
                    </section>
                )}
                {activeBottomPanel === "ticketsDay" && (
                    <section className="panel bottom-dynamic-panel align-left" ref={leftPanelRef}>
                        <div className="section-header">
                            <h2>Bilhetes do dia</h2>
                        </div>

                        <div className="movement-extract-filter">
                            <div className="field-group">
                                <label>Casa de aposta</label>
                                <select
                                    value={ticketsDayHouseScope}
                                    onChange={(e) => {
                                        setTicketsDayHouseScope(e.target.value);
                                        setOpenedCollapsedTicketId(null);
                                    }}
                                >
                                    <option value="all">Todas as casas</option>
                                    {houses.map((house) => (
                                        <option key={house.id} value={house.id}>
                                            {house.nome}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="field-group">
                                <label>Período</label>
                                <select
                                    value={ticketsDayPeriodType}
                                    onChange={(e) => {
                                        const value = e.target.value;

                                        setTicketsDayPeriodType(value);
                                        setOpenedCollapsedTicketId(null);

                                        if (value === "Geral") {
                                            setTicketsDayPeriodReference("");
                                            return;
                                        }

                                        if (value === "Diário") {
                                            setTicketsDayPeriodReference(hojeISO());
                                            return;
                                        }

                                        if (value === "Semanal") {
                                            setTicketsDayPeriodReference(getWeekRef(hojeISO()));
                                            return;
                                        }

                                        if (value === "Mensal") {
                                            setTicketsDayPeriodReference(getMonthRef(hojeISO()));
                                            return;
                                        }

                                        if (value === "Anual") {
                                            setTicketsDayPeriodReference(getYearRef(hojeISO()));
                                        }
                                    }}
                                >
                                    <option value="Diário">Diário</option>
                                    <option value="Semanal">Semanal</option>
                                    <option value="Mensal">Mensal</option>
                                    <option value="Anual">Anual</option>
                                    <option value="Geral">Geral</option>
                                </select>
                            </div>

                            {ticketsDayPeriodType !== "Geral" && (
                                <div className="field-group">
                                    <label>Referência</label>
                                    <div className="movement-extract-calendar-field" ref={ticketsCalendarRef}>
                                        <button
                                            type="button"
                                            className="movement-extract-calendar-button"
                                            onClick={() => {
                                                setIsTicketsCalendarOpen((prev) => !prev);
                                            }}
                                        >
                                            {ticketsDayPeriodType === "Diário" &&
                                                formatDateBR(ticketsDayPeriodReference)}

                                            {ticketsDayPeriodType === "Semanal" &&
                                                (window.innerWidth <= 375
                                                    ? formatWeekRefShort(ticketsDayPeriodReference)
                                                    : formatWeekRef(ticketsDayPeriodReference))}

                                            {ticketsDayPeriodType === "Mensal" &&
                                                formatMonthRef(ticketsDayPeriodReference)}

                                            {ticketsDayPeriodType === "Anual" &&
                                                ticketsDayPeriodReference}
                                        </button>
                                        {isTicketsCalendarOpen && (
                                            <div className="tickets-dynamic-calendar-popover">
                                                <DayPicker
                                                    locale={ptBR}
                                                    mode="single"
                                                    captionLayout="dropdown"
                                                    fromYear={2020}
                                                    toYear={2035}
                                                    selected={
                                                        ticketsDayPeriodReference
                                                            ? new Date(\`\${ticketsDayPeriodReference}T12:00:00\`)
                                                            : undefined
                                                    }
                                                    onSelect={(date) => {
                                                        if (!date) return;

                                                        const selectedISO = dateToISO(date);

                                                        if (ticketsDayPeriodType === "Diário") {
                                                            setTicketsDayPeriodReference(selectedISO);
                                                        }

                                                        if (ticketsDayPeriodType === "Semanal") {
                                                            setTicketsDayPeriodReference(getWeekRef(selectedISO));
                                                        }

                                                        if (ticketsDayPeriodType === "Mensal") {
                                                            setTicketsDayPeriodReference(getMonthRef(selectedISO));
                                                        }

                                                        if (ticketsDayPeriodType === "Anual") {
                                                            setTicketsDayPeriodReference(getYearRef(selectedISO));
                                                        }

                                                        setOpenedCollapsedTicketId(null);
                                                        setIsTicketsCalendarOpen(false);
                                                    }}
                                                    modifiers={{
                                                        hasTicket: ticketMarkedDays,
                                                    }}
                                                    modifiersClassNames={{
                                                        hasTicket: "day-has-tickets",
                                                    }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="collapsed-ticket-list">
                            {ticketsOfDay.length === 0 ? (
                                <div className="empty-state">
                                    <strong>Nenhum bilhete neste período.</strong>
                                    <span className="empty-state-hint">Adicione um bilhete para começar.</span>
                                </div>
                            ) : (
                                ticketsOfDay.map((ticket) => {
                                    const house = houses.find(
                                        (item) => Number(item.id) === Number(ticket.casaId)
                                    );

                                    return (
                                        <div
                                            key={ticket.id}
                                            id={\`collapsed-ticket-\${ticket.id}\`}
                                            id={\`collapsed-ticket-\${ticket.id}\`}
                                            className={\`collapsed-ticket-card \${openedCollapsedTicketId === ticket.id ? "open" : ""
                                                }\`}
                                        >
                                            <button
                                                type="button"
                                                className="collapsed-ticket-item"
                                                onClick={() => {
                                                    const nextOpenId = openedCollapsedTicketId === ticket.id ? null : ticket.id;
                                                    setOpenedCollapsedTicketId(nextOpenId);

                                                    if (nextOpenId === ticket.id) {
                                                        setTimeout(() => {
                                                            document.getElementById(\`collapsed-ticket-\${ticket.id}\`)?.scrollIntoView({
                                                                behavior: "smooth",
                                                                block: "start",
                                                            });
                                                        }, 120);
                                                    }
                                                }}
                                            >
                                                <div className="collapsed-ticket-main">
                                                    <div className="collapsed-ticket-name">
                                                        {ticket.nomeBilhete || "Bilhete"}
                                                    </div>

                                                    <div className="collapsed-ticket-meta">
                                                        <span>{house?.nome || "Casa não encontrada"}</span>
                                                        <span>{ticket.categoria}</span>
                                                    </div>
                                                </div>

                                                <span
                                                    className={\`collapsed-ticket-status \${ticket.resultado === "Cash Out"
                                                        ? Number(ticket.retorno || 0) >= Number(ticket.stake || 0)
                                                            ? "green"
                                                            : "red"
                                                        : String(ticket.resultado || "").toLowerCase()
                                                        }\`}
                                                >
                                                    {ticket.resultado === "Green"
                                                        ? "Ganho"
                                                        : ticket.resultado === "Red"
                                                            ? "Perda"
                                                            : ticket.resultado === "Cash Out"
                                                                ? "Cash Out"
                                                                : "Pendente"}
                                                </span>
                                            </button>

                                            {openedCollapsedTicketId === ticket.id && (
                                                <div className="collapsed-ticket-detail">
                                                    <div className="ticket-info-grid">
                                                        <div className="info-box">
                                                            <span>Casa</span>
                                                            <strong>{house?.nome || "Casa não encontrada"}</strong>
                                                        </div>

                                                        <div className="info-box">
                                                            <span>Categoria</span>
                                                            <strong>{ticket.categoria}</strong>
                                                        </div>

                                                        <div className="info-box">
                                                            <span>Odd</span>
                                                            <strong>{Number(ticket.odd || 0).toFixed(2)}</strong>
                                                        </div>

                                                        <div className="info-box">
                                                            <span>Valor apostado</span>
                                                            <strong>{formatMoney(ticket.stake)}</strong>
                                                        </div>

                                                        <div className="info-box">
                                                            <span>Retorno</span>
                                                            <strong>{formatMoney(ticket.retorno)}</strong>
                                                        </div>
                                                    </div>

                                                    {ticket.observacoes && (
                                                        <div className="ticket-note">{ticket.observacoes}</div>
                                                    )}

                                                    <div className="card-actions">
                                                        <button
                                                            type="button"
                                                            className="secondary-button"
                                                            onClick={() => handleStartEditTicket(ticket.id)}
                                                        >
                                                            Editar
                                                        </button>

                                                        <button
                                                            type="button"
                                                            className="danger-button"
                                                            onClick={() => handleDeleteTicket(ticket.id)}
                                                        >
                                                            Excluir
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </section>
                )}

                {activeBottomPanel === "movement" && (
                    <section className="panel bottom-dynamic-panel align-right" ref={rightPanelRef}>
                        <div className="section-header ticket-header-row">
                            <h2>{editingMovementId ? "Editar movimentação" : "Nova movimentação"}</h2>

                            <div className="ticket-form-calendar-field" ref={movementFormCalendarRef}>
                                <button
                                    type="button"
                                    className="ticket-date-top"
                                    onClick={() => {
                                        setIsMovementFormCalendarOpen((prev) => !prev);
                                    }}
                                >
                                    <span>{formatDateBR(movementForm.data)}</span>
                                    <span className="ticket-date-icon">▾</span>
                                </button>

                                {isMovementFormCalendarOpen && (
                                    <div className="movement-form-calendar-popover">
                                        <DayPicker
                                            locale={ptBR}
                                            mode="single"
                                            disabled={{ after: new Date() }}
                                            captionLayout="dropdown"
                                            fromYear={2020}
                                            toYear={new Date().getFullYear()}
                                            selected={
                                                movementForm.data
                                                    ? new Date(\`\${movementForm.data}T12:00:00\`)
                                                    : undefined
                                            }
                                            onSelect={(date) => {
                                                if (!date) return;

                                                setMovementForm((prev) => ({
                                                    ...prev,
                                                    data: dateToISO(date),
                                                }));

                                                setIsMovementFormCalendarOpen(false);
                                            }}
                                            modifiers={{
                                                hasMovement: movementMarkedDays,
                                            }}
                                            modifiersClassNames={{
                                                hasMovement: "day-has-movements",
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        <form className="form-stack" onSubmit={handleSaveMovement}>
                            <div className="form-row form-row-3 movement-mobile-row">
                                <div className="field-group">
                                    <label>Casa de aposta</label>
                                    <select
                                        value={movementForm.casaId}
                                        onChange={(e) =>
                                            setMovementForm((prev) => ({
                                                ...prev,
                                                casaId: e.target.value,
                                            }))
                                        }
                                    >
                                        <option value="">Selecione</option>
                                        {houses.map((house) => (
                                            <option key={house.id} value={house.id}>
                                                {house.nome}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="field-group">
                                    <label>Tipo</label>
                                    <select
                                        value={movementForm.tipo}
                                        onChange={(e) =>
                                            setMovementForm((prev) => ({
                                                ...prev,
                                                tipo: e.target.value,
                                            }))
                                        }
                                    >
                                        <option>Depósito</option>
                                        <option>Saque</option>
                                    </select>
                                </div>

                                <div className="field-group">
                                    <label>Valor</label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        placeholder="R$ 0,00"
                                        value={movementForm.valor}
                                        onChange={(e) =>
                                            setMovementForm((prev) => ({
                                                ...prev,
                                                valor: formatCurrencyTyping(e.target.value),
                                            }))
                                        }
                                    />
                                </div>
                            </div>



                            <div className="field-group">
                                <label>Observações</label>
                                <textarea
                                    rows="2"
                                    placeholder="Opcional"
                                    value={movementForm.observacoes}
                                    onChange={(e) =>
                                        setMovementForm((prev) => ({
                                            ...prev,
                                            observacoes: e.target.value,
                                        }))
                                    }
                                />
                            </div>

                            <div className="button-row">
                                <button type="submit" className="primary-button">
                                    {editingMovementId ? "Salvar movimentação" : "Adicionar movimentação"}
                                </button>

                                {editingMovementId && (
                                    <button
                                        type="button"
                                        className="secondary-button"
                                        onClick={resetMovementForm}
                                    >
                                        Cancelar
                                    </button>
                                )}
                            </div>
                        </form>
                    </section>
                )}

                {activeBottomPanel === "extract" && (
                    <section className="panel bottom-dynamic-panel align-right" ref={rightPanelRef}>
                        <div className="section-header">
                            <h2>Extrato de movimentações</h2>
                        </div>

                        <div className="movement-extract-filter">
                            <div className="field-group">
                                <label>Casa de aposta</label>
                                <select
                                    value={movementExtractHouseScope}
                                    onChange={(e) => {
                                        setMovementExtractHouseScope(e.target.value);
                                        setActiveMovementExtractTab(null);
                                    }}
                                >
                                    <option value="">Selecione</option>
                                    <option value="all">Todas as casas</option>
                                    {houses.map((house) => (
                                        <option key={house.id} value={house.id}>
                                            {house.nome}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="field-group">
                                <label>Período</label>
                                <select
                                    value={movementExtractPeriodType || "Diário"}
                                    onChange={(e) => {
                                        const value = e.target.value;

                                        setMovementExtractPeriodType(value);
                                        setActiveMovementExtractTab(null);

                                        if (value === "Geral") {
                                            setMovementExtractPeriodReference("");
                                            return;
                                        }

                                        if (value === "Diário") {
                                            setMovementExtractPeriodReference(hojeISO());
                                            return;
                                        }

                                        if (value === "Semanal") {
                                            setMovementExtractPeriodReference(getWeekRef(hojeISO()));
                                            return;
                                        }

                                        if (value === "Mensal") {
                                            setMovementExtractPeriodReference(getMonthRef(hojeISO()));
                                            return;
                                        }

                                        if (value === "Anual") {
                                            setMovementExtractPeriodReference(getYearRef(hojeISO()));
                                        }
                                    }}
                                >
                                    <option value="Diário">Diário</option>
                                    <option value="Semanal">Semanal</option>
                                    <option value="Mensal">Mensal</option>
                                    <option value="Anual">Anual</option>
                                    <option value="Geral">Geral</option>
                                </select>
                            </div>

                            {(movementExtractPeriodType || "Diário") !== "Geral" && (
                                <div className="field-group">
                                    <label>Referência</label>

                                    <div className="movement-extract-calendar-field" ref={movementExtractCalendarRef}>
                                        <button
                                            type="button"
                                            className="movement-extract-calendar-button"
                                            onClick={() => {
                                                if (!movementExtractPeriodType) {
                                                    setMovementExtractPeriodType("Diário");
                                                    setMovementExtractPeriodReference(hojeISO());
                                                }

                                                setIsMovementExtractCalendarOpen((prev) => !prev);
                                            }}
                                        >
                                            {(movementExtractPeriodType || "Diário") === "Diário" &&
                                                formatDateBR(movementExtractPeriodReference || hojeISO())}

                                            {movementExtractPeriodType === "Semanal" &&
                                                (window.innerWidth <= 375
                                                    ? formatWeekRefShort(movementExtractPeriodReference)
                                                    : formatWeekRef(movementExtractPeriodReference))}

                                            {movementExtractPeriodType === "Mensal" &&
                                                formatMonthRef(movementExtractPeriodReference)}

                                            {movementExtractPeriodType === "Anual" &&
                                                movementExtractPeriodReference}
                                        </button>

                                        {isMovementExtractCalendarOpen && (
                                            <div className="movement-form-calendar-popover">
                                                <DayPicker
                                                    locale={ptBR}
                                                    mode="single"
                                                    captionLayout="dropdown"
                                                    fromYear={2020}
                                                    toYear={2035}
                                                    selected={
                                                        movementExtractPeriodReference
                                                            ? new Date(\`\${movementExtractPeriodReference}T12:00:00\`)
                                                            : new Date(\`\${hojeISO()}T12:00:00\`)
                                                    }
                                                    onSelect={(date) => {
                                                        if (!date) return;

                                                        const selectedISO = dateToISO(date);

                                                        if ((movementExtractPeriodType || "Diário") === "Diário") {
                                                            setMovementExtractPeriodReference(selectedISO);
                                                        }

                                                        if (movementExtractPeriodType === "Semanal") {
                                                            setMovementExtractPeriodReference(getWeekRef(selectedISO));
                                                        }

                                                        if (movementExtractPeriodType === "Mensal") {
                                                            setMovementExtractPeriodReference(getMonthRef(selectedISO));
                                                        }

                                                        if (movementExtractPeriodType === "Anual") {
                                                            setMovementExtractPeriodReference(getYearRef(selectedISO));
                                                        }

                                                        setActiveMovementExtractTab(null);
                                                        setIsMovementExtractCalendarOpen(false);
                                                    }}
                                                    modifiers={{
                                                        hasMovement: movementMarkedDays,
                                                    }}
                                                    modifiersClassNames={{
                                                        hasMovement: "day-has-movements",
                                                    }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="movement-summary-grid">
                            <button
                                type="button"
                                className={\`movement-summary-card \${activeMovementExtractTab === "deposits" ? "active" : ""}\`}
                                onClick={() => {
                                    const nextTab = activeMovementExtractTab === "deposits" ? null : "deposits";
                                    setActiveMovementExtractTab(nextTab);

                                    if (nextTab) {
                                        setTimeout(() => {
                                            movementExtractListRef.current?.scrollIntoView({
                                                behavior: "smooth",
                                                block: "start",
                                            });
                                        }, 120);
                                    }
                                }}
                            >
                                <div className="movement-summary-card-header">
                                    <span>Depósitos</span>
                                    <span className="card-action-icon">
                                        {activeMovementExtractTab === "deposits" ? "-" : "+"}
                                    </span>
                                </div>
                                <strong className="movement-positive">
                                    {movementExtractHouseScope ? formatMoney(totalDeposits) : "-"}
                                </strong>
                            </button>

                            <button
                                type="button"
                                className={\`movement-summary-card \${activeMovementExtractTab === "withdrawals" ? "active" : ""}\`}
                                onClick={() => {
                                    const nextTab = activeMovementExtractTab === "withdrawals" ? null : "withdrawals";
                                    setActiveMovementExtractTab(nextTab);

                                    if (nextTab) {
                                        setTimeout(() => {
                                            movementExtractListRef.current?.scrollIntoView({
                                                behavior: "smooth",
                                                block: "start",
                                            });
                                        }, 120);
                                    }
                                }}
                            >
                                <div className="movement-summary-card-header">
                                    <span>Saques</span>
                                    <span className="card-action-icon">
                                        {activeMovementExtractTab === "withdrawals" ? "-" : "+"}
                                    </span>
                                </div>
                                <strong className="movement-negative">
                                    {movementExtractHouseScope ? formatMoney(totalWithdrawals) : "-"}
                                </strong>
                            </button>
                        </div>

                        {activeMovementExtractTab === "deposits" && (
                            <div className="movement-extract-list" ref={movementExtractListRef}>
                                {depositMovements.length === 0 ? (
                                    <div className="empty-state">
                                        <strong>Nenhum deposito encontrado.</strong>
                                        <span className="empty-state-hint">Registre uma movimentação para acompanhar entradas.</span>
                                    </div>
                                ) : (
                                    depositMovements.map((movement) => {
                                        const house = houses.find(
                                            (item) => Number(item.id) === Number(movement.casaId)
                                        );

                                        return (
                                            <div className="movement-card" key={movement.id}>
                                                <div className="movement-top">
                                                    <div>
                                                        <div className="movement-title">Depósito</div>
                                                        <div className="movement-subtitle">
                                                            {formatDateBR(movement.data)} • {house?.nome || "Casa não encontrada"}
                                                        </div>
                                                    </div>

                                                    <strong className="movement-positive">
                                                        +{formatMoney(movement.valor)}
                                                    </strong>
                                                </div>

                                                {movement.observacoes && (
                                                    <div className="movement-note">{movement.observacoes}</div>
                                                )}

                                                <div className="card-actions">
                                                    <button
                                                        type="button"
                                                        className="secondary-button"
                                                        onClick={() => handleStartEditMovement(movement.id)}
                                                    >
                                                        Editar
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className="danger-button"
                                                        onClick={() => handleDeleteMovement(movement.id)}
                                                    >
                                                        Excluir
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        )}

                        {activeMovementExtractTab === "withdrawals" && (
                            <div className="movement-extract-list" ref={movementExtractListRef}>
                                {withdrawalMovements.length === 0 ? (
                                    <div className="empty-state">
                                        <strong>Nenhum saque encontrado.</strong>
                                        <span className="empty-state-hint">Registre uma movimentação para acompanhar saídas.</span>
                                    </div>
                                ) : (
                                    withdrawalMovements.map((movement) => {
                                        const house = houses.find(
                                            (item) => Number(item.id) === Number(movement.casaId)
                                        );

                                        return (
                                            <div className="movement-card" key={movement.id}>
                                                <div className="movement-top">
                                                    <div>
                                                        <div className="movement-title">Saque</div>
                                                        <div className="movement-subtitle">
                                                            {formatDateBR(movement.data)} • {house?.nome || "Casa não encontrada"}
                                                        </div>
                                                    </div>

                                                    <strong className="movement-negative">
                                                        -{formatMoney(movement.valor)}
                                                    </strong>
                                                </div>

                                                {movement.observacoes && (
                                                    <div className="movement-note">{movement.observacoes}</div>
                                                )}

                                                <div className="card-actions">
                                                    <button
                                                        type="button"
                                                        className="secondary-button"
                                                        onClick={() => handleStartEditMovement(movement.id)}
                                                    >
                                                        Editar
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className="danger-button"
                                                        onClick={() => handleDeleteMovement(movement.id)}
                                                    >
                                                        Excluir
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        )}
                    </section>
                )}

                <section className="main-grid bottom-layout-grid">
                    <div className="left-column">

                        <section
                            className={\`panel ticket-panel \${!isTicketPanelOpen ? "panel-closed-compact" : ""}\`}
                            ref={ticketPanelRef}
                        >
                            <button
                                type="button"
                                className="section-header dashboard-collapse-trigger"
                                aria-expanded={isTicketPanelOpen}
                                onClick={() => {
                                    const nextOpen = !isTicketPanelOpen;
                                    setIsTicketPanelOpen(nextOpen);

                                    requestAnimationFrame(() => {
                                        ticketPanelRef.current?.scrollIntoView({
                                            behavior: "smooth",
                                            block: "start",
                                        });
                                    });
                                }}
                            >
                                <span className="dashboard-collapse-title">
                                    {editingTicketId ? "Editar bilhete" : "Novo bilhete"}
                                </span>
                                <span className="dashboard-collapse-caret" aria-hidden="true" />
                            </button>

                            {isTicketPanelOpen && (
                                <>
                                    <form className="form-stack" onSubmit={handleSaveTicket}>
                                        <div className="form-row">
                                            <div className="field-group">
                                                <label>Data</label>
                                                <input
                                                    type="date"
                                                    value={ticketForm.data}
                                                    onChange={(e) =>
                                                        setTicketForm((prev) => ({
                                                            ...prev,
                                                            data: e.target.value,
                                                        }))
                                                    }
                                                />
                                            </div>

                                            <div className="field-group">
                                                <label>Casa de aposta</label>
                                                <select
                                                    value={ticketForm.casaId}
                                                    onChange={(e) =>
                                                        setTicketForm((prev) => ({
                                                            ...prev,
                                                            casaId: e.target.value,
                                                        }))
                                                    }
                                                >
                                                    <option value="">Selecione</option>
                                                    {houses.map((house) => (
                                                        <option key={house.id} value={house.id}>
                                                            {house.nome}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="form-row">
                                            <div className="field-group">
                                                <label>Categoria</label>
                                                <input
                                                    type="text"
                                                    placeholder="Ex.: Ambas marcam"
                                                    value={ticketForm.categoria}
                                                    onChange={(e) =>
                                                        setTicketForm((prev) => ({
                                                            ...prev,
                                                            categoria: e.target.value,
                                                        }))
                                                    }
                                                />
                                            </div>

                                            <div className="field-group">
                                                <label>Odd</label>
                                                <input
                                                    type="text"
                                                    inputMode="decimal"
                                                    placeholder="1.80"
                                                    value={ticketForm.odd}
                                                    onChange={(e) => {
                                                        const value = e.target.value.replace(",", ".");
                                                        if (/^\d*\.?\d*$/.test(value)) {
                                                            setTicketForm((prev) => ({ ...prev, odd: value }));
                                                        }
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        <div className="form-row">
                                            <div className="field-group">
                                                <label>Valor Apostado</label>
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    placeholder="R$ 0,00"
                                                    value={ticketForm.stake}
                                                    onChange={(e) =>
                                                        setTicketForm((prev) => ({
                                                            ...prev,
                                                            stake: formatCurrencyTyping(e.target.value),
                                                        }))
                                                    }
                                                />
                                            </div>

                                            <div className="field-group">
                                                <label>Retorno</label>
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    placeholder="R$ 0,00"
                                                    value={ticketForm.retorno}
                                                    onChange={(e) =>
                                                        setTicketForm((prev) => ({
                                                            ...prev,
                                                            retorno: formatCurrencyTyping(e.target.value),
                                                        }))
                                                    }
                                                />
                                            </div>
                                        </div>
                                        {selectedStakeFields.length > 0 && (
                                            <>
                                                <div className="split-title">Divisão da stake</div>

                                                <div className="form-row">
                                                    {selectedStakeFields.map((field) => (
                                                        <div className="field-group" key={field.key}>
                                                            <label>
                                                                {field.label
                                                                    .replace("Valor do ", "")
                                                                    .replace(/^./, (c) => c.toUpperCase())}
                                                            </label>
                                                            <input
                                                                type="text"
                                                                inputMode="numeric"
                                                                placeholder="R$ 0,00"
                                                                value={ticketForm[field.key]}
                                                                onChange={(e) =>
                                                                    setTicketForm((prev) => ({
                                                                        ...prev,
                                                                        [field.key]: formatCurrencyTyping(e.target.value),
                                                                    }))
                                                                }
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                        <div className="form-row">
                                            <div className="field-group">
                                                <label>Origem da stake</label>
                                                <select
                                                    value={ticketForm.origemStake}
                                                    onChange={(e) =>
                                                        setTicketForm((prev) => ({
                                                            ...prev,
                                                            origemStake: e.target.value,
                                                            stakeSaldo: "",
                                                            stakeDeposito: "",
                                                            stakeBonus: "",
                                                        }))
                                                    }
                                                >
                                                    <option>Saldo</option>
                                                    <option>Depósito</option>
                                                    <option>Bônus</option>
                                                    <option>Saldo + Bônus</option>
                                                    <option>Saldo + Depósito</option>
                                                    <option>Depósito + Bônus</option>
                                                </select>
                                            </div>

                                            <div className="field-group">
                                                <label>Resultado</label>
                                                <select
                                                    value={ticketForm.resultado}
                                                    onChange={(e) =>
                                                        setTicketForm((prev) => ({
                                                            ...prev,
                                                            resultado: e.target.value,
                                                        }))
                                                    }
                                                >
                                                    <option value="Pendente">Pendente</option>
                                                    <option value="Green">Ganho</option>
                                                    <option value="Red">Perda</option>
                                                    <option value="Cash Out">Cash Out</option>
                                                </select>
                                            </div>

                                            <div className="field-group">
                                                <label>Observações</label>
                                                <textarea
                                                    rows="2"
                                                    placeholder="Opcional"
                                                    value={ticketForm.observacoes}
                                                    onChange={(e) =>
                                                        setTicketForm((prev) => ({
                                                            ...prev,
                                                            observacoes: e.target.value,
                                                        }))
                                                    }
                                                />
                                            </div>
                                        </div>

                                        <div className="button-row">
                                            <button type="submit" className="primary-button">
                                                {editingTicketId ? "Salvar bilhete" : "Adicionar bilhete"}
                                            </button>

                                            {editingTicketId && (
                                                <button
                                                    type="button"
                                                    className="secondary-button"
                                                    onClick={resetTicketForm}
                                                >
                                                    Cancelar
                                                </button>
                                            )}
                                        </div>
                                    </form>
                                </>
                            )}
                        </section>

                        <section
                            className={\`panel tickets-day-panel \${!isTicketsDayPanelOpen ? "tickets-day-panel-closed" : ""}\`}
                            ref={ticketsDayPanelRef}
                        >
                            {isMobileLive ? (
                                <>
                                    <button
                                        type="button"
                                        className="section-header dashboard-collapse-trigger"
                                        aria-expanded={isTicketsDayPanelOpen}
                                        onClick={() => {
                                            const nextOpen = !isTicketsDayPanelOpen;
                                            setIsTicketsDayPanelOpen(nextOpen);

                                            requestAnimationFrame(() => {
                                                ticketsDayPanelRef.current?.scrollIntoView({
                                                    behavior: "smooth",
                                                    block: "start",
                                                });
                                            });
                                        }}
                                    >
                                        <span className="dashboard-collapse-title">Bilhetes do dia</span>
                                        <span className="dashboard-collapse-caret" aria-hidden="true" />
                                    </button>

                                </>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        className="movement-extract-title-row dashboard-collapse-trigger"
                                        aria-expanded={isTicketsDayPanelOpen}
                                        onClick={() => {
                                            setActiveBottomPanel((prev) =>
                                                prev === "ticketsDay" ? null : "ticketsDay"
                                            );

                                            setTimeout(() => {
                                                leftPanelRef.current?.scrollIntoView({
                                                    behavior: "smooth",
                                                    block: "start",
                                                });
                                            }, 120);
                                        }}
                                    >
                                        <span className="dashboard-collapse-title">Bilhetes do dia</span>
                                        <span className="dashboard-collapse-caret" aria-hidden="true" />
                                    </button>

                                    <div className="movement-extract-filter">


                                        <div className="field-group">
                                            <label>Casa de aposta</label>
                                            <select
                                                value={ticketsDayHouseScope}
                                                onChange={(e) => {
                                                    setTicketsDayHouseScope(e.target.value);
                                                    setOpenedCollapsedTicketId(null);
                                                }}
                                            >
                                                <option value="all">Todas as casas</option>
                                                {houses.map((house) => (
                                                    <option key={house.id} value={house.id}>
                                                        {house.nome}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="field-group">
                                            <label>Período</label>
                                            <select
                                                value={ticketsDayPeriodType}
                                                onChange={(e) => {
                                                    const value = e.target.value;

                                                    setTicketsDayPeriodType(value);
                                                    setOpenedCollapsedTicketId(null);

                                                    if (value === "Geral") {
                                                        setTicketsDayPeriodReference("");
                                                        return;
                                                    }

                                                    if (value === "Diário") {
                                                        setTicketsDayPeriodReference(hojeISO());
                                                        return;
                                                    }

                                                    if (value === "Semanal") {
                                                        setTicketsDayPeriodReference(getWeekRef(hojeISO()));
                                                        return;
                                                    }

                                                    if (value === "Mensal") {
                                                        setTicketsDayPeriodReference(getMonthRef(hojeISO()));
                                                        return;
                                                    }

                                                    if (value === "Anual") {
                                                        setTicketsDayPeriodReference(getYearRef(hojeISO()));
                                                    }
                                                }}
                                            >
                                                <option value="Diário">Diário</option>
                                                <option value="Semanal">Semanal</option>
                                                <option value="Mensal">Mensal</option>
                                                <option value="Anual">Anual</option>
                                                <option value="Geral">Geral</option>
                                            </select>
                                        </div>

                                        {ticketsDayPeriodType !== "Geral" && (
                                            <div className="field-group">
                                                <label>Data</label>

                                                <div ref={ticketsCalendarRef} className="movement-extract-calendar-field">
                                                    <button
                                                        type="button"
                                                        className="movement-extract-calendar-button"
                                                        onClick={() => setIsTicketsCalendarOpen((prev) => !prev)}
                                                    >
                                                        {ticketsDayPeriodType === "Diário" && formatDateBR(ticketsDayPeriodReference)}
                                                        {ticketsDayPeriodType === "Semanal" && formatWeekRef(ticketsDayPeriodReference)}
                                                        {ticketsDayPeriodType === "Mensal" && formatMonthRef(ticketsDayPeriodReference)}
                                                        {ticketsDayPeriodType === "Anual" && ticketsDayPeriodReference}
                                                    </button>

                                                    {isTicketsCalendarOpen && (
                                                        <div className="movement-extract-calendar-popover">
                                                            <DayPicker
                                                                locale={ptBR}
                                                                mode="single"
                                                                captionLayout="dropdown"
                                                                fromYear={2020}
                                                                toYear={2035}
                                                                selected={
                                                                    ticketsDayPeriodReference
                                                                        ? new Date(
                                                                            ticketsDayPeriodType === "Mensal"
                                                                                ? \`\${ticketsDayPeriodReference}-01T12:00:00\`
                                                                                : ticketsDayPeriodType === "Anual"
                                                                                    ? \`\${ticketsDayPeriodReference}-01-01T12:00:00\`
                                                                                    : \`\${ticketsDayPeriodReference}T12:00:00\`
                                                                        )
                                                                        : undefined
                                                                }
                                                                onSelect={(date) => {
                                                                    if (!date) return;

                                                                    const selectedISO = dateToISO(date);

                                                                    if (ticketsDayPeriodType === "Diário") {
                                                                        setTicketsDayPeriodReference(selectedISO);
                                                                    }

                                                                    if (ticketsDayPeriodType === "Semanal") {
                                                                        setTicketsDayPeriodReference(getWeekRef(selectedISO));
                                                                    }

                                                                    if (ticketsDayPeriodType === "Mensal") {
                                                                        setTicketsDayPeriodReference(getMonthRef(selectedISO));
                                                                    }

                                                                    if (ticketsDayPeriodType === "Anual") {
                                                                        setTicketsDayPeriodReference(getYearRef(selectedISO));
                                                                    }

                                                                    setOpenedCollapsedTicketId(null);
                                                                    setIsTicketsCalendarOpen(false);
                                                                }}
                                                                modifiers={{
                                                                    hasTicket: ticketMarkedDays,
                                                                }}
                                                                modifiersClassNames={{
                                                                    hasTicket: "day-has-tickets",
                                                                }}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                    </div>

                                    <div className="collapsed-ticket-list">
                                        {ticketsOfDay.length === 0 ? (
                                            <div className="empty-state">
                                                <strong>Nenhum bilhete neste dia.</strong>
                                                <span className="empty-state-hint">Adicione um bilhete para começar.</span>
                                            </div>
                                        ) : (
                                            ticketsOfDay.map((ticket) => {
                                                const house = houses.find((item) => item.id === Number(ticket.casaId));

                                                return (
                                                    <div
                                                        id={\`collapsed-ticket-\${ticket.id}\`}
                                                        key={ticket.id}
                                                        className={\`collapsed-ticket-card \${openedCollapsedTicketId === ticket.id ? "open" : ""}\`}
                                                    >
                                                        <button
                                                            type="button"
                                                            className="collapsed-ticket-item"
                                                            onClick={() => {
                                                                const nextOpenId = openedCollapsedTicketId === ticket.id ? null : ticket.id;
                                                                setOpenedCollapsedTicketId(nextOpenId);

                                                                if (nextOpenId === ticket.id) {
                                                                    requestAnimationFrame(() => {
                                                                        setTimeout(() => {
                                                                            document.getElementById(\`collapsed-ticket-\${ticket.id}\`)?.scrollIntoView({
                                                                                behavior: "smooth",
                                                                                block: "start",
                                                                            });
                                                                        }, 50);
                                                                    });
                                                                }
                                                            }}
                                                        >
                                                            <div className="collapsed-ticket-main">
                                                                <div className="collapsed-ticket-name">
                                                                    {ticket.nomeBilhete || "Bilhete"}
                                                                </div>
                                                                <div className="collapsed-ticket-meta">
                                                                    <span>{house?.nome || "Casa não encontrada"}</span>
                                                                    <span>{ticket.categoria}</span>
                                                                </div>
                                                            </div>

                                                            <span
                                                                className={\`collapsed-ticket-status \${ticket.resultado === "Cash Out"
                                                                    ? (Number(ticket.retorno || 0) >= Number(ticket.stake || 0)
                                                                        ? "green"
                                                                        : "red")
                                                                    : String(ticket.resultado || "").toLowerCase()
                                                                    }\`}
                                                            >
                                                                {ticket.resultado === "Green"
                                                                    ? "Ganho"
                                                                    : ticket.resultado === "Red"
                                                                        ? "Perda"
                                                                        : ticket.resultado === "Cash Out"
                                                                            ? "Cash Out"
                                                                            : "Pendente"}
                                                            </span>
                                                        </button>

                                                        {openedCollapsedTicketId === ticket.id && (
                                                            <div className="collapsed-ticket-detail">
                                                                <div className="ticket-info-grid">
                                                                    <div className="info-box">
                                                                        <span>Casa</span>
                                                                        <strong>{house?.nome || "Casa não encontrada"}</strong>
                                                                    </div>
                                                                    <div className="info-box">
                                                                        <span>Categoria</span>
                                                                        <strong>{ticket.categoria}</strong>
                                                                    </div>
                                                                    <div className="info-box">
                                                                        <span>Odd</span>
                                                                        <strong>{Number(ticket.odd || 0).toFixed(2)}</strong>
                                                                    </div>
                                                                    <div className="info-box">
                                                                        <span>Valor apostado</span>
                                                                        <strong>{formatMoney(ticket.stake)}</strong>
                                                                    </div>
                                                                    <div className="info-box">
                                                                        <span>Retorno</span>
                                                                        <strong>{formatMoney(ticket.retorno)}</strong>
                                                                    </div>
                                                                </div>

                                                                {ticket.observacoes && (
                                                                    <div className="ticket-note">{ticket.observacoes}</div>
                                                                )}

                                                                <div className="card-actions">
                                                                    <button
                                                                        type="button"
                                                                        className="secondary-button"
                                                                        onClick={() => handleStartEditTicket(ticket.id)}
                                                                    >
                                                                        Editar
                                                                    </button>

                                                                    <button
                                                                        type="button"
                                                                        className="danger-button"
                                                                        onClick={() => handleDeleteTicket(ticket.id)}
                                                                    >
                                                                        Excluir
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </>
                            )}
                        </section>

                    </div>

                    <div className="right-column">

                        <section className="panel movement-panel" ref={movementPanelRef}>
                            <button
                                type="button"
                                className="section-header dashboard-collapse-trigger"
                                aria-expanded={isMovementPanelOpen}
                                onClick={() => {
                                    const nextOpen = !isMovementPanelOpen;
                                    setIsMovementPanelOpen(nextOpen);

                                    requestAnimationFrame(() => {
                                        movementPanelRef.current?.scrollIntoView({
                                            behavior: "smooth",
                                            block: "start",
                                        });
                                    });
                                }}
                            >
                                <span className="dashboard-collapse-title">
                                    {editingMovementId ? "Editar movimentação" : "Nova movimentação"}
                                </span>
                                <span className="dashboard-collapse-caret" aria-hidden="true" />
                            </button>

                            {isMovementPanelOpen && (
                                <>
                                    <form className="form-stack" onSubmit={handleSaveMovement}>
                                        <div className="form-row">
                                            <div className="field-group">
                                                <label>Data</label>
                                                <input
                                                    type="date"
                                                    value={movementForm.data}
                                                    onChange={(e) =>
                                                        setMovementForm((prev) => ({ ...prev, data: e.target.value }))
                                                    }
                                                />
                                            </div>

                                            <div className="field-group">
                                                <label>Casa de aposta</label>
                                                <select
                                                    value={movementForm.casaId}
                                                    onChange={(e) =>
                                                        setMovementForm((prev) => ({ ...prev, casaId: e.target.value }))
                                                    }
                                                >
                                                    <option value="">Selecione</option>
                                                    {houses.map((house) => (
                                                        <option key={house.id} value={house.id}>
                                                            {house.nome}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="form-row">
                                            <div className="field-group">
                                                <label>Tipo</label>
                                                <select
                                                    value={movementForm.tipo}
                                                    onChange={(e) =>
                                                        setMovementForm((prev) => ({ ...prev, tipo: e.target.value }))
                                                    }
                                                >
                                                    <option>Depósito</option>
                                                    <option>Saque</option>
                                                    <option>Bônus</option>
                                                    <option>Ajuste</option>
                                                </select>
                                            </div>

                                            <div className="field-group">
                                                <label>Valor</label>
                                                <input
                                                    type="text"
                                                    placeholder="R$ 0,00"
                                                    value={movementForm.valor}
                                                    onChange={(e) =>
                                                        setMovementForm((prev) => ({
                                                            ...prev,
                                                            valor: formatCurrencyTyping(e.target.value),
                                                        }))
                                                    }
                                                />
                                            </div>
                                        </div>

                                        <div className="field-group">
                                            <label>Observações</label>
                                            <textarea
                                                rows="2"
                                                placeholder="Opcional"
                                                value={movementForm.observacoes}
                                                onChange={(e) =>
                                                    setMovementForm((prev) => ({
                                                        ...prev,
                                                        observacoes: e.target.value,
                                                    }))
                                                }
                                            />
                                        </div>

                                        <div className="button-row">
                                            <button type="submit" className="primary-button">
                                                {editingMovementId ? "Salvar movimentação" : "Adicionar movimentação"}
                                            </button>

                                            {editingMovementId && (
                                                <button
                                                    type="button"
                                                    className="secondary-button"
                                                    onClick={resetMovementForm}
                                                >
                                                    Cancelar
                                                </button>
                                            )}
                                        </div>
                                    </form>
                                </>
                            )}
                        </section>

                        <section className="panel movement-day-panel" ref={movementDayPanelRef}>
                            <button
                                type="button"
                                className="section-header dashboard-collapse-trigger"
                                aria-expanded={isMovementDayPanelOpen}
                                onClick={() => {
                                    const nextOpen = !isMovementDayPanelOpen;

                                    setIsMovementDayPanelOpen(nextOpen);

                                    if (!nextOpen) {
                                        setActiveMovementExtractTab(null);
                                        setMovementExtractPeriodType("");
                                        setMovementExtractPeriodReference("");
                                        setMovementExtractHouseScope("all");
                                        setIsMovementExtractCalendarOpen(false);
                                    }

                                    requestAnimationFrame(() => {
                                        movementDayPanelRef.current?.scrollIntoView({
                                            behavior: "smooth",
                                            block: "start",
                                        });
                                    });
                                }}
                            >
                                <span className="dashboard-collapse-title">Extrato de movimentações</span>
                                <span className="dashboard-collapse-caret" aria-hidden="true" />
                            </button>

                            {isMovementDayPanelOpen && (
                                <>
                                    <div className="movement-extract-filter">
                                        <div className="field-group">
                                            <select
                                                value={movementExtractHouseScope}
                                                onChange={(e) => {
                                                    setMovementExtractHouseScope(e.target.value);
                                                    setActiveMovementExtractTab(null);
                                                }}
                                            >
                                                <option value="all">Todas as casas</option>
                                                {houses.map((house) => (
                                                    <option key={house.id} value={house.id}>
                                                        {house.nome}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="field-group">
                                            <select
                                                value={movementExtractPeriodType}
                                                onChange={(e) => {
                                                    const newType = e.target.value;

                                                    setMovementExtractPeriodType(newType);
                                                    setActiveMovementExtractTab(null);

                                                    if (newType === "Diário") {
                                                        setMovementExtractPeriodReference(hojeISO());
                                                    }

                                                    if (newType === "Semanal") {
                                                        setMovementExtractPeriodReference(getWeekRef(hojeISO()));
                                                    }

                                                    if (newType === "Mensal") {
                                                        setMovementExtractPeriodReference(getMonthRef(hojeISO()));
                                                    }

                                                    if (newType === "Anual") {
                                                        setMovementExtractPeriodReference(getYearRef(hojeISO()));
                                                    }

                                                    if (newType === "Geral") {
                                                        setMovementExtractPeriodReference("");
                                                    }
                                                }}
                                            >
                                                <option value="">Período</option>
                                                <option value="Diário">Diário</option>
                                                <option value="Semanal">Semanal</option>
                                                <option value="Mensal">Mensal</option>
                                                <option value="Anual">Anual</option>
                                                <option value="Geral">Geral</option>
                                            </select>
                                        </div>

                                        {movementExtractPeriodType !== "Geral" && (
                                            <>
                                                {(movementExtractPeriodType === "Diário" || movementExtractPeriodType === "Semanal") && (
                                                    <div className="movement-extract-calendar-field" ref={movementExtractCalendarRef}>
                                                        <button
                                                            type="button"
                                                            className="movement-extract-calendar-button"
                                                            onClick={() => {
                                                                setIsStatsCalendarOpen(false);
                                                                setIsTicketsCalendarOpen(false);
                                                                setIsMovementsCalendarOpen(false);
                                                                setIsMovementExtractCalendarOpen((prev) => !prev);
                                                            }}
                                                        >
                                                            {movementExtractPeriodType === "Diário" &&
                                                                formatDateBR(movementExtractPeriodReference)}

                                                            {movementExtractPeriodType === "Semanal" &&
                                                                (window.innerWidth <= 375
                                                                    ? formatWeekRefShort(movementExtractPeriodReference)
                                                                    : formatWeekRef(movementExtractPeriodReference))}
                                                        </button>

                                                        {isMovementExtractCalendarOpen && (
                                                            <div className="movement-extract-calendar-popover movement-extract-calendar-popover-fixed">
                                                                <DayPicker
                                                                    locale={ptBR}
                                                                    captionLayout="dropdown"
                                                                    fromYear={2020}
                                                                    toYear={2035}
                                                                    mode="single"
                                                                    selected={
                                                                        movementExtractPeriodReference
                                                                            ? new Date(\`\${movementExtractPeriodReference}T12:00:00\`)
                                                                            : undefined
                                                                    }
                                                                    onSelect={(date) => {
                                                                        if (!date) return;

                                                                        const selectedISO = dateToISO(date);

                                                                        if (movementExtractPeriodType === "Diário") {
                                                                            setMovementExtractPeriodReference(selectedISO);
                                                                        }

                                                                        if (movementExtractPeriodType === "Semanal") {
                                                                            setMovementExtractPeriodReference(getWeekRef(selectedISO));
                                                                        }

                                                                        setActiveMovementExtractTab(null);
                                                                        setIsMovementExtractCalendarOpen(false);
                                                                    }}
                                                                    modifiers={{
                                                                        hasMovement: movementMarkedDays,
                                                                    }}
                                                                    modifiersClassNames={{
                                                                        hasMovement: "day-has-movements",
                                                                    }}
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {(movementExtractPeriodType === "Mensal" || movementExtractPeriodType === "Anual") && (
                                                    <div className="field-group">
                                                        <select
                                                            value={movementExtractPeriodReference}
                                                            onChange={(e) => {
                                                                setMovementExtractPeriodReference(e.target.value);
                                                                setActiveMovementExtractTab(null);
                                                            }}
                                                        >
                                                            {movementExtractReferences.map((ref) => (
                                                                <option key={ref} value={ref}>
                                                                    {movementExtractPeriodType === "Mensal" && formatMonthRef(ref)}
                                                                    {movementExtractPeriodType === "Anual" && ref}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>

                                    {movementExtractPeriodType && (
                                        <div className="movement-summary-grid">
                                            <button
                                                type="button"
                                                className={\`movement-summary-card \${activeMovementExtractTab === "depositos" ? "active" : ""}\`}
                                                onClick={() =>
                                                    setActiveMovementExtractTab((prev) =>
                                                        prev === "depositos" ? null : "depositos"
                                                    )
                                                }
                                            >
                                                <div className="movement-summary-card-header">
                                                    <span>Total depositado</span>

                                                    <span className="card-action-icon">
                                                        {activeMovementExtractTab === "depositos" ? "-" : "+"}
                                                    </span>
                                                </div>

                                                <strong className="movement-positive">
                                                    {formatMoney(totalDeposits)}
                                                </strong>
                                            </button>

                                            <button
                                                type="button"
                                                className={\`movement-summary-card \${activeMovementExtractTab === "saques" ? "active" : ""}\`}
                                                onClick={() =>
                                                    setActiveMovementExtractTab((prev) =>
                                                        prev === "saques" ? null : "saques"
                                                    )
                                                }
                                            >
                                                <div className="movement-summary-card-header">
                                                    <span>Total sacado</span>

                                                    <span className="card-action-icon">
                                                        {activeMovementExtractTab === "saques" ? "-" : "+"}
                                                    </span>
                                                </div>

                                                <strong className="movement-negative">
                                                    {formatMoney(totalWithdrawals)}
                                                </strong>
                                            </button>
                                        </div>
                                    )}

                                    {activeMovementExtractTab && (
                                        <div className="movement-extract-list">
                                            {(activeMovementExtractTab === "depositos"
                                                ? depositMovements
                                                : withdrawalMovements
                                            ).length === 0 && (
                                                    <div className="empty-state">
                                                        <strong>Nenhuma movimentação encontrada.</strong>
                                                        <span className="empty-state-hint">Registre depósitos ou saques para preencher este extrato.</span>
                                                    </div>
                                                )}

                                            {(activeMovementExtractTab === "depositos"
                                                ? depositMovements
                                                : withdrawalMovements
                                            ).map((movement) => {
                                                const houseName =
                                                    houses.find((house) => house.id === Number(movement.casaId))?.nome ||
                                                    "Casa não encontrada";

                                                const positive = movementSignal(movement.tipo) > 0;

                                                return (
                                                    <div className="movement-card" key={movement.id}>
                                                        <div className="movement-top">
                                                            <div>
                                                                <div className="movement-title">
                                                                    {movement.tipo}
                                                                </div>
                                                                <div className="movement-subtitle">
                                                                    {houseName} • {formatDateBR(movement.data)}
                                                                </div>
                                                            </div>

                                                            <strong
                                                                className={positive ? "movement-positive" : "movement-negative"}
                                                            >
                                                                {positive ? "+" : "-"} {formatMoney(movement.valor)}
                                                            </strong>
                                                        </div>

                                                        {movement.observacoes && (
                                                            <div className="movement-note">{movement.observacoes}</div>
                                                        )}

                                                        <div className="card-actions">
                                                            <button
                                                                type="button"
                                                                className="secondary-button"
                                                                onClick={() => handleStartEditMovement(movement.id)}
                                                            >
                                                                Editar
                                                            </button>

                                                            <button
                                                                type="button"
                                                                className="danger-button"
                                                                onClick={() => handleDeleteMovement(movement.id)}
                                                            >
                                                                Excluir
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </>
                            )}
                        </section>

                    </div>

                </section>

                <footer className="footer">
                    Desenvolvido por <strong>Alves Tech</strong> © 2026
                </footer>
                    </div>
                </main>
            </div>
                </>
            )}`;

export { LEGACY_DASHBOARD_ARCHIVE };

export default function LegacyDashboardArchive() {
    return null;
}
