function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

export function AppShell({ children, className = "", mainClassName = "", sidebar = null, sidebarAsChild = false, ...rest }) {
  return (
    <div className={cx("cb-app-shell", className)} {...rest}>
      {sidebar ? (sidebarAsChild ? sidebar : <aside className="cb-app-shell__sidebar">{sidebar}</aside>) : null}
      <main className={cx("cb-app-shell__main", mainClassName)}>{children}</main>
    </div>
  );
}

export function Sidebar({ brand = null, children, className = "", footer = null }) {
  return (
    <nav className={cx("cb-sidebar", className)} aria-label="Navegacao principal">
      {brand ? <div className="cb-sidebar__brand">{brand}</div> : null}
      <div className="cb-sidebar__content">{children}</div>
      {footer ? <div className="cb-sidebar__footer">{footer}</div> : null}
    </nav>
  );
}

export function PageHeader({ actions = null, className = "", description, eyebrow, icon = null, title }) {
  return (
    <header className={cx("cb-page-header", className)}>
      {icon ? <span className="cb-page-header__icon" aria-hidden="true">{icon}</span> : null}
      <div className="cb-page-header__copy">
        {eyebrow ? <span className="cb-page-header__eyebrow">{eyebrow}</span> : null}
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="cb-page-header__actions">{actions}</div> : null}
    </header>
  );
}

export function FilterToolbar({ actions = null, children, className = "" }) {
  return (
    <section className={cx("cb-filter-toolbar", className)}>
      <div className="cb-filter-toolbar__fields">{children}</div>
      {actions ? <div className="cb-filter-toolbar__actions">{actions}</div> : null}
    </section>
  );
}

export function MetricCard({ className = "", detail, icon = null, label, tone = "neutral", value }) {
  return (
    <article className={cx("cb-metric-card", `is-${tone}`, className)}>
      {icon ? <span className="cb-metric-card__icon" aria-hidden="true">{icon}</span> : null}
      <div className="cb-metric-card__copy">
        <span>{label}</span>
        <strong>{value}</strong>
        {detail ? <small>{detail}</small> : null}
      </div>
    </article>
  );
}

export function PrimaryMetricCard(props) {
  return (
    <MetricCard {...props} />
  );
}

export function DataCard({ actions = null, children, className = "", description, title }) {
  return (
    <section className={cx("cb-data-card", className)}>
      {(title || description || actions) ? (
        <header className="cb-data-card__header">
          <div>
            {title ? <h2>{title}</h2> : null}
            {description ? <p>{description}</p> : null}
          </div>
          {actions ? <div className="cb-data-card__actions">{actions}</div> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}

export function Button({ children, className = "", disabled = false, onClick, tone = "secondary", type = "button" }) {
  return (
    <button
      type={type}
      className={cx("cb-button", `is-${tone}`, className)}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function Field({ children, className = "", label }) {
  return (
    <label className={cx("cb-field", className)}>
      {label ? <span>{label}</span> : null}
      {children}
    </label>
  );
}

export function ActionMenuButton({ label = "Acoes", onClick, open = false }) {
  return (
    <button
      type="button"
      className="cb-action-menu-button"
      aria-label={label}
      aria-expanded={open}
      onClick={onClick}
    >
      <span aria-hidden="true">...</span>
    </button>
  );
}

export function AppTable({ columns = [], empty = null, getRowKey, rows = [] }) {
  return (
    <div className="cb-table-wrap">
      <table className="cb-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key || column.header}>{column.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length > 0 ? rows.map((row, index) => (
            <tr key={getRowKey ? getRowKey(row, index) : index}>
              {columns.map((column) => (
                <td key={column.key || column.header}>
                  {column.render ? column.render(row, index) : row[column.key]}
                </td>
              ))}
            </tr>
          )) : (
            <tr>
              <td colSpan={columns.length || 1}>{empty || <EmptyState title="Nenhum dado encontrado" />}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function StatusBadge({ children, tone = "neutral" }) {
  return <span className={cx("cb-status-badge", `is-${tone}`)}>{children}</span>;
}

export function EmptyState({ action = null, description, title }) {
  return (
    <div className="cb-empty-state">
      <strong>{title}</strong>
      {description ? <p>{description}</p> : null}
      {action ? <div>{action}</div> : null}
    </div>
  );
}

export function Pagination({ children, className = "" }) {
  return <nav className={cx("cb-pagination", className)} aria-label="Paginacao">{children}</nav>;
}

export function ChartCard({ actions = null, children, description, title }) {
  return (
    <DataCard className="cb-chart-card" title={title} description={description} actions={actions}>
      <div className="cb-chart-card__body">{children}</div>
    </DataCard>
  );
}

export function FormSection({ children, description, title }) {
  return (
    <section className="cb-form-section">
      {(title || description) ? (
        <header>
          {title ? <h2>{title}</h2> : null}
          {description ? <p>{description}</p> : null}
        </header>
      ) : null}
      <div className="cb-form-section__body">{children}</div>
    </section>
  );
}

export function SummaryPanel({ children, className = "", title }) {
  return (
    <aside className={cx("cb-summary-panel", className)}>
      {title ? <h2>{title}</h2> : null}
      {children}
    </aside>
  );
}
