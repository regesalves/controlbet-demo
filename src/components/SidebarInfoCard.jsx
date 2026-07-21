import { useEffect, useState } from "react";
import { REPORT_FACTS } from "../data/sidebarFacts";
import {
  DASHBOARD_TIPS,
  MOVEMENT_BEST_PRACTICES,
  SECURITY_TIPS,
  TICKET_REMINDERS,
} from "../data/sidebarTips";
import { getDailySidebarItem, getLocalDateKey } from "../utils/sidebarDailyContent";

const MONEY_FORMATTER = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function useDailyDateKey() {
  const [dateKey, setDateKey] = useState(() => getLocalDateKey());

  useEffect(() => {
    let timerId;

    function scheduleNextDay() {
      const now = new Date();
      const nextDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      timerId = window.setTimeout(() => {
        setDateKey(getLocalDateKey());
        scheduleNextDay();
      }, Math.max(1_000, nextDay.getTime() - now.getTime() + 100));
    }

    scheduleNextDay();
    return () => window.clearTimeout(timerId);
  }, []);

  return dateKey;
}

function resolvePage(context) {
  if (context?.activeItem === "reports") return "reports";
  if (context?.activeItem === "settings") return "settings";
  if (context?.activeItem === "tickets") {
    return context.activeSubItem === "ticket" ? "new-ticket" : "tickets-day";
  }
  if (context?.activeItem === "movements") {
    return ["movement", "movementForm"].includes(context.activeSubItem) ? "new-movement" : "statement";
  }
  return "dashboard";
}

function CardIcon({ type }) {
  const paths = {
    bulb: <><path d="M9 18h6" /><path d="M10 22h4" /><path d="M8.4 14.5A6 6 0 1 1 15.6 14.5C14.6 15.3 14 16.5 14 18h-4c0-1.5-.6-2.7-1.6-3.5Z" /></>,
    calendar: <><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4M16 3v4M4 10h16" /></>,
    chart: <><path d="M5 19V9M12 19V5M19 19v-7" /><path d="M3 19h18" /></>,
    shield: <path d="M12 3 5 6v5c0 4.6 2.8 8 7 10 4.2-2 7-5.4 7-10V6l-7-3Z" />,
    spark: <><path d="m12 3 1.3 4.2L17.5 8.5l-4.2 1.3L12 14l-1.3-4.2-4.2-1.3 4.2-1.3L12 3Z" /><path d="m18.5 14 .7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7.7-2.3Z" /></>,
    wallet: <><path d="M4 6.5h14a2 2 0 0 1 2 2V18H6a2 2 0 0 1-2-2V6.5Z" /><path d="M4.5 7 16 3.5V7M15 12h5" /></>,
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {paths[type] || paths.spark}
    </svg>
  );
}

function TextContent({ children }) {
  return <p className="sidebar-info-card__text">{children}</p>;
}

function SummaryContent({ items }) {
  return (
    <dl className="sidebar-info-card__summary">
      {items.map((item) => (
        <div key={item.label}>
          <dt>{item.label}</dt>
          <dd className={item.tone || ""}>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function getFooterAction(page, onNavigate) {
  const actions = {
    dashboard: { label: "Abrir relatórios", run: () => onNavigate("reports", null) },
    "new-ticket": { label: "Ver bilhetes", run: () => onNavigate("tickets", "ticketsDay") },
    "tickets-day": { label: "Novo bilhete", run: () => onNavigate("tickets", "ticket") },
    "new-movement": { label: "Abrir extrato", run: () => onNavigate("movements", "extract") },
    statement: { label: "Nova movimentação", run: () => onNavigate("movements", "movementForm") },
    reports: { label: "Voltar ao dashboard", run: () => onNavigate("dashboard", null) },
    settings: { label: "Voltar ao dashboard", run: () => onNavigate("dashboard", null) },
  };

  return typeof onNavigate === "function" ? actions[page] : null;
}

export default function SidebarInfoCard({ context }) {
  const dateKey = useDailyDateKey();
  const page = resolvePage(context);
  const todayTickets = (context?.tickets || []).filter((ticket) => ticket.data === dateKey);
  const pendingTickets = todayTickets.filter((ticket) => String(ticket.resultado || "").toLowerCase() === "pendente").length;
  const financialSummary = context?.financialSummary || {};
  const footerAction = getFooterAction(page, context?.onNavigate);
  let card;

  if (page === "tickets-day") {
    card = {
      icon: "calendar",
      title: "Resumo do dia",
      content: (
        <SummaryContent
        items={[
          { label: "Bilhetes", value: todayTickets.length },
          { label: "Pendentes", value: pendingTickets, tone: "pending" },
          { label: "Encerrados", value: todayTickets.length - pendingTickets },
        ]}
        />
      ),
    };
  } else if (page === "statement") {
    card = {
      icon: "wallet",
      title: "Resumo financeiro",
      content: (
        <SummaryContent
        items={[
          { label: "Entradas", value: MONEY_FORMATTER.format(financialSummary.entries || 0), tone: "positive" },
          { label: "Saídas", value: MONEY_FORMATTER.format(financialSummary.exits || 0), tone: "negative" },
          { label: "Saldo líquido", value: MONEY_FORMATTER.format(financialSummary.balance || 0), tone: Number(financialSummary.balance || 0) < 0 ? "negative" : "positive" },
        ]}
        />
      ),
    };
  } else if (page === "new-ticket") {
    card = { icon: "calendar", title: "Lembrete", content: <TextContent>{getDailySidebarItem(TICKET_REMINDERS, dateKey)}</TextContent> };
  } else if (page === "new-movement") {
    card = { icon: "wallet", title: "Boa prática", content: <TextContent>{getDailySidebarItem(MOVEMENT_BEST_PRACTICES, dateKey)}</TextContent> };
  } else if (page === "reports") {
    card = { icon: "chart", title: "Você sabia?", content: <TextContent>{getDailySidebarItem(REPORT_FACTS, dateKey)}</TextContent> };
  } else if (page === "settings") {
    card = { icon: "shield", title: "Segurança", content: <TextContent>{getDailySidebarItem(SECURITY_TIPS, dateKey)}</TextContent> };
  } else {
    card = { icon: "bulb", title: "Dica do dia", content: <TextContent>{getDailySidebarItem(DASHBOARD_TIPS, dateKey)}</TextContent> };
  }

  return (
    <section
      className="light-sidebar-help sidebar-info-card"
      data-page-context={page}
      data-testid="sidebar-info-card"
      aria-live="polite"
    >
      <header className="sidebar-info-card__header">
        <span className="sidebar-info-card__icon"><CardIcon type={card.icon} /></span>
        <strong>{card.title}</strong>
      </header>
      <div className={`sidebar-info-card__content ${["tickets-day", "statement"].includes(page) ? "is-summary" : ""}`}>
        {card.content}
      </div>
      <footer className="sidebar-info-card__footer">
        {footerAction ? (
          <button className="sidebar-info-card__action" onClick={footerAction.run} type="button">
            {footerAction.label}
          </button>
        ) : null}
      </footer>
    </section>
  );
}
