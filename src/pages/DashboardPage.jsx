import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import logo from "../assets/logo.png";
import { supabase } from "../supabase";
import { useAuth } from "../auth/AuthContext";
import {
    AppShell as DesignAppShell,
    MetricCard as DesignMetricCard,
    PageHeader as DesignPageHeader,
} from "../design-system";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
} from "recharts";

const ANIMATION_MS = 220;
const PERSISTENT_ID_RANDOM_RANGE = 4096;
const STAKE_ORIGINS = {
    BALANCE: "Saldo",
    BONUS: "Bônus",
    BALANCE_BONUS: "Saldo + Bônus",
};

const KPI_TOOLTIP_TEXTS = {
    initialBank: "Valor da banca no início do período selecionado.",
    currentBank: "Valor atual da banca considerando apostas e movimentações.",
    result: "Diferença entre a banca inicial e a banca atual.",
    wagered: "Total apostado no período selecionado.",
    gains: "Total recebido em apostas vencedoras.",
    hitRate: "Percentual de apostas vencedoras no período.",
};

const usernamePattern = /^[a-z0-9._-]+$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getPhoneDigits(value = "") {
    return String(value || "").replace(/\D/g, "").slice(0, 11);
}

function formatBrazilianPhone(value = "") {
    const digits = getPhoneDigits(value);

    if (!digits) return "";
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function normalizeStakeOrigin(value) {
    const origin = String(value || "").trim();

    if (origin === STAKE_ORIGINS.BALANCE) return STAKE_ORIGINS.BALANCE;
    if (origin === STAKE_ORIGINS.BONUS || origin === "Bonus" || origin === "Bônus" || origin === "Bônus") {
        return STAKE_ORIGINS.BONUS;
    }
    if (
        origin === STAKE_ORIGINS.BALANCE_BONUS ||
        origin === "Saldo + Bonus" ||
        origin === "Saldo + Bônus" ||
        origin === "Saldo + Bônus"
    ) {
        return STAKE_ORIGINS.BALANCE_BONUS;
    }

    return STAKE_ORIGINS.BALANCE;
}

function getCryptoRandomInt(maxExclusive) {
    if (globalThis.crypto?.getRandomValues) {
        const values = new Uint32Array(1);
        globalThis.crypto.getRandomValues(values);
        return values[0] % maxExclusive;
    }

    return Math.floor(Math.random() * maxExclusive);
}

function createPersistentId(existingIds = []) {
    const existing = new Set(
        existingIds
            .map((id) => Number(id))
            .filter(Number.isFinite)
    );

    let nextId;

    do {
        nextId = Date.now() * PERSISTENT_ID_RANDOM_RANGE + getCryptoRandomInt(PERSISTENT_ID_RANDOM_RANGE);
    } while (existing.has(nextId));

    return nextId;
}

function hojeISO() {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, "0");
    const dia = String(hoje.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
}

function formatMoney(value) {
    return Number(value || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
    });
}

function formatSignedMoney(value) {
    const numericValue = Number(value || 0);
    if (numericValue === 0) return formatMoney(0);
    return `${numericValue > 0 ? "+" : "-"}${formatMoney(Math.abs(numericValue))}`;
}

function formatPercent(value) {
    return `${Number(value || 0).toFixed(2)}%`;
}

function formatSignedPercent(value) {
    const numericValue = Number(value || 0);
    if (numericValue === 0) return formatPercent(0);
    return `${numericValue > 0 ? "+" : "-"}${formatPercent(Math.abs(numericValue))}`;
}

function formatSignedInteger(value) {
    const numericValue = Number(value || 0);
    const roundedValue = Math.round(Math.abs(numericValue));
    if (numericValue === 0) return "0";
    return `${numericValue > 0 ? "+" : "-"}${roundedValue.toLocaleString("pt-BR")}`;
}

function formatDateBR(dateISO) {
    if (!dateISO) return "";
    const [year, month, day] = dateISO.split("-");
    return `${day}/${month}/${year}`;
}

function formatDateTimeBR(value) {
    if (!value) return "Não disponível";
    const date = typeof value === "number" ? new Date(value * 1000) : new Date(value);
    if (Number.isNaN(date.getTime())) return "Não disponível";

    return date.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

const SHORT_MONTH_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

function getAnalyticsPeriodType(periodType) {
    return String(periodType || "").startsWith("Di") ? "Semanal" : periodType;
}

function getShortDateLabel(dateISO) {
    if (!dateISO) return "";
    const date = new Date(`${dateISO}T12:00:00`);
    const day = String(date.getDate()).padStart(2, "0");
    return `${day} ${SHORT_MONTH_LABELS[date.getMonth()]}`;
}

function getAnalyticsDateLabel(dateISO, periodType) {
    if (!dateISO) return "";

    const date = new Date(`${dateISO}T12:00:00`);

    if (periodType === "Semanal") {
        return WEEKDAY_LABELS[date.getDay()];
    }

    if (periodType === "Anual") {
        return SHORT_MONTH_LABELS[date.getMonth()];
    }

    return getShortDateLabel(dateISO);
}

function getCompactResultLabel(dateISO, periodType) {
    if (!dateISO) return "";
    if (periodType === "Anual") return getAnalyticsDateLabel(dateISO, periodType);

    const [, month, day] = dateISO.split("-");
    return `${day}/${month}`;
}

function getMonthKeyFromDate(dateISO) {
    return String(dateISO || "").slice(0, 7);
}

function addDays(dateISO, amount) {
    const date = new Date(`${dateISO}T12:00:00`);
    date.setDate(date.getDate() + amount);
    return date.toISOString().slice(0, 10);
}

function getMonthRef(dateISO) {
    return dateISO.slice(0, 7);
}

function getYearRef(dateISO) {
    return dateISO.slice(0, 4);
}

function getWeekRef(dateISO) {
    const date = new Date(`${dateISO}T12:00:00`);
    const day = date.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;

    const monday = new Date(date);
    monday.setDate(date.getDate() + diffToMonday);

    return monday.toISOString().slice(0, 10);
}

function getQuarterRef(dateISO) {
    const year = dateISO.slice(0, 4);
    const month = Number(dateISO.slice(5, 7));
    const quarter = Math.ceil(month / 3);
    return `${year}-T${quarter}`;
}

function getSemesterRef(dateISO) {
    const year = dateISO.slice(0, 4);
    const month = Number(dateISO.slice(5, 7));
    const semester = month <= 6 ? 1 : 2;
    return `${year}-S${semester}`;
}

function lastDayOfMonth(year, month) {
    return new Date(year, month, 0).getDate();
}

export function getPeriodInterval(periodType, reference) {
    if (periodType === "Geral" || !reference) {
        return { start: "", end: "" };
    }

    if (periodType === "Diário") {
        return {
            start: reference,
            end: reference,
        };
    }

    if (periodType === "Semanal") {
        const start = reference;
        const endDate = new Date(`${reference}T12:00:00`);
        endDate.setDate(endDate.getDate() + 6);

        return {
            start,
            end: endDate.toISOString().slice(0, 10),
        };
    }

    if (periodType === "Mensal") {
        const [year, month] = reference.split("-");
        const lastDay = lastDayOfMonth(Number(year), Number(month));
        return {
            start: `${year}-${month}-01`,
            end: `${year}-${month}-${String(lastDay).padStart(2, "0")}`,
        };
    }

    if (periodType === "Trimestral") {
        const [year, q] = reference.split("-T");
        const quarter = Number(q);
        const startMonth = (quarter - 1) * 3 + 1;
        const endMonth = startMonth + 2;
        const lastDay = lastDayOfMonth(Number(year), endMonth);

        return {
            start: `${year}-${String(startMonth).padStart(2, "0")}-01`,
            end: `${year}-${String(endMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
        };
    }

    if (periodType === "Semestral") {
        const [year, s] = reference.split("-S");
        const semester = Number(s);
        const startMonth = semester === 1 ? 1 : 7;
        const endMonth = semester === 1 ? 6 : 12;
        const lastDay = lastDayOfMonth(Number(year), endMonth);

        return {
            start: `${year}-${String(startMonth).padStart(2, "0")}-01`,
            end: `${year}-${String(endMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
        };
    }

    if (periodType === "Anual") {
        return {
            start: `${reference}-01-01`,
            end: `${reference}-12-31`,
        };
    }

    return { start: "", end: "" };
}

function getTicketNumberForDate(tickets, dateISO, currentId = null) {
    return (
        tickets.filter((ticket) => ticket.data === dateISO && ticket.id !== currentId)
            .length + 1
    );
}

function getAvailablePeriodReferencesForDates(periodType, dates = []) {
    const cleanDates = dates.filter(Boolean);

    if (periodType === "Diário") {
        return [...new Set([hojeISO(), ...cleanDates])].sort().reverse();
    }

    if (periodType === "Semanal") {
        return [...new Set([getWeekRef(hojeISO()), ...cleanDates.map((date) => getWeekRef(date))])].sort().reverse();
    }

    if (periodType === "Mensal") {
        return [...new Set([getMonthRef(hojeISO()), ...cleanDates.map((date) => getMonthRef(date))])].sort().reverse();
    }

    if (periodType === "Anual") {
        return [...new Set([getYearRef(hojeISO()), ...cleanDates.map((date) => getYearRef(date))])].sort().reverse();
    }

    return [];
}

function isSupabaseAuthError(error) {
    if (!error) return false;

    const status = Number(error.status || error.code || 0);
    const message = String(error.message || "").toLowerCase();

    return (
        status === 401 ||
        message.includes("jwt") ||
        message.includes("auth session") ||
        message.includes("refresh token") ||
        message.includes("session not found")
    );
}

function SidebarIcon({ type }) {
    const iconPaths = {
        grid: (
            <>
                <rect x="4" y="4" width="5.5" height="5.5" rx="1" />
                <rect x="14.5" y="4" width="5.5" height="5.5" rx="1" />
                <rect x="4" y="14.5" width="5.5" height="5.5" rx="1" />
                <rect x="14.5" y="14.5" width="5.5" height="5.5" rx="1" />
            </>
        ),
        ticket: (
            <>
                <rect x="5" y="4" width="14" height="16" rx="2" />
                <path d="M8 3v4" />
                <path d="M16 3v4" />
                <path d="M8 10h8" />
                <path d="M8 14h5" />
            </>
        ),
        sync: (
            <>
                <path d="M7.5 5H5a2 2 0 0 0-2 2v2.5" />
                <path d="M16.5 19H19a2 2 0 0 0 2-2v-2.5" />
                <path d="M3 15.5V18a2 2 0 0 0 2 2h2.5" />
                <path d="M21 8.5V6a2 2 0 0 0-2-2h-2.5" />
                <path d="M8 12h8" />
            </>
        ),
        chart: (
            <>
                <path d="M4 19V5" />
                <path d="M4 19h16" />
                <path d="M8 16v-5" />
                <path d="M12 16V8" />
                <path d="M16 16v-9" />
            </>
        ),
        target: (
            <>
                <circle cx="12" cy="12" r="7" />
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v3" />
                <path d="M12 19v3" />
                <path d="M2 12h3" />
                <path d="M19 12h3" />
            </>
        ),
        bank: (
            <>
                <path d="M4 10h16" />
                <path d="M5 10l7-5 7 5" />
                <path d="M6 10v8" />
                <path d="M10 10v8" />
                <path d="M14 10v8" />
                <path d="M18 10v8" />
                <path d="M4 19h16" />
            </>
        ),
        gear: (
            <>
                <path d="M12 3.5 15 5l3.2-.8 1.6 2.8-2.1 2.5v3l2.1 2.5-1.6 2.8L15 19l-3 1.5L9 19l-3.2.8-1.6-2.8 2.1-2.5v-3L4.2 7l1.6-2.8L9 5l3-1.5Z" />
                <circle cx="12" cy="12" r="3" />
            </>
        ),
    };

    return (
        <svg className="ref-icon-svg" viewBox="0 0 24 24" aria-hidden="true">
            {iconPaths[type] || iconPaths.grid}
        </svg>
    );
}

function ThemeToggleIcon({ theme }) {
    if (theme === "dark") {
        return (
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 3v2.2" />
                <path d="M12 18.8V21" />
                <path d="m4.2 4.2 1.6 1.6" />
                <path d="m18.2 18.2 1.6 1.6" />
                <path d="M3 12h2.2" />
                <path d="M18.8 12H21" />
                <path d="m4.2 19.8 1.6-1.6" />
                <path d="m18.2 5.8 1.6-1.6" />
                <circle cx="12" cy="12" r="4.2" />
            </svg>
        );
    }

    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20.5 14.5A7.5 7.5 0 0 1 9.5 3.5 8.5 8.5 0 1 0 20.5 14.5Z" />
        </svg>
    );
}

function CalendarIcon({ className = "reference-calendar-icon" }) {
    return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 2.75v3" />
            <path d="M16 2.75v3" />
            <path d="M3.75 9.25h16.5" />
            <path d="M5.75 4.25h12.5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5.75a2 2 0 0 1-2-2v-12a2 2 0 0 1 2-2Z" />
        </svg>
    );
}

function getAccountInitials(name = "Usuário") {
    return String(name || "Usuário")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase() || "U";
}

function Sidebar({
    accountFirstName,
    activeItem,
    activeSubItem,
    onNavigate,
}) {
    const [expandedGroups, setExpandedGroups] = useState(() => ({
        movements: activeItem === "movements",
        settings: activeItem === "settings",
        tickets: activeItem === "tickets",
    }));
    const visibleNavigationItems = [
        { id: "dashboard", icon: "grid", label: "Dashboard" },
        {
            id: "tickets",
            icon: "ticket",
            label: "Bilhetes",
            children: [
                { id: "ticket", label: "Novo bilhete" },
                { id: "ticketsDay", label: "Bilhetes do dia" },
            ],
        },
        {
            id: "movements",
            icon: "sync",
            label: "Movimentações",
            children: [
                { id: "movementForm", label: "Nova movimentação" },
                { id: "extract", label: "Extrato" },
            ],
        },
        { id: "reports", icon: "chart", label: "Relatórios" },
        {
            id: "settings",
            icon: "gear",
            label: "Configurações",
            children: [
                { id: "accountReal", label: "Minha conta" },
                { id: "profileReal", label: "Preferências" },
                { id: "system", label: "Segurança" },
            ],
        },
    ];

    useEffect(() => {
        if (activeItem !== "tickets" && activeItem !== "movements" && activeItem !== "settings") return;

        setExpandedGroups((current) => ({
            ...current,
            [activeItem]: true,
        }));
    }, [activeItem]);

    function handleNavigationClick(item) {
        if (item.children) {
            setExpandedGroups((current) => ({
                ...current,
                [item.id]: !current[item.id],
            }));
            return;
        }

        onNavigate(item.id, null);
    }

    return (
        <aside className="light-dashboard-sidebar">
            <div className="light-sidebar-brand" aria-label="ControlBet">
                <img src={logo} alt="ControlBet" />
            </div>

            <nav className="light-sidebar-nav" aria-label="Navegacao principal">
                {visibleNavigationItems.map((item) => {
                    const isGroupExpanded = Boolean(expandedGroups[item.id]);
                    const hasChildren = Boolean(item.children?.length);

                    return (
                        <div className={`light-sidebar-item ${hasChildren ? "has-children" : ""}`} key={item.id}>
                            <button
                                type="button"
                                className={`light-sidebar-link ${activeItem === item.id ? "active" : ""} ${isGroupExpanded ? "is-expanded" : ""}`}
                                onClick={() => handleNavigationClick(item)}
                                aria-expanded={hasChildren ? isGroupExpanded : undefined}
                            >
                                <span aria-hidden="true">
                                    <SidebarIcon type={item.icon} />
                                </span>
                                <strong>{item.label}</strong>
                                {hasChildren && <span className="light-sidebar-chevron" aria-hidden="true" />}
                            </button>

                            {hasChildren && (
                                <div className={`light-sidebar-subnav ${isGroupExpanded ? "is-open" : ""}`}>
                                    {item.children.map((child) => (
                                        <button
                                            type="button"
                                            className={`light-sidebar-sublink ${activeItem === item.id && activeSubItem === child.id ? "active" : ""}`}
                                            key={child.id}
                                            onClick={() => onNavigate(item.id, child.id)}
                                        >
                                            {child.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </nav>

            <div className="light-sidebar-help">
                <span className="light-sidebar-help-icon" aria-hidden="true">?</span>
                <strong>Precisa de ajuda?</strong>
                <span>Atalhos e dicas para gerir sua banca.</span>
                <button type="button">Ver ajuda <i aria-hidden="true">→</i></button>
            </div>

        </aside>
    );

}

function DashboardHeader() {
    return null;
}

function dateToISO(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function isoToDate(dateISO) {
    if (!dateISO) return undefined;
    const normalized = dateISO.length === 4 ? `${dateISO}-01-01` : dateISO.length === 7 ? `${dateISO}-01` : dateISO;
    return new Date(`${normalized}T12:00:00`);
}

function buildDayMarkers(tickets = [], movements = []) {
    const markers = {};

    tickets.forEach((ticket) => {
        if (!ticket.data) return;
        markers[ticket.data] = markers[ticket.data] === "movement" ? "both" : "ticket";
    });

    movements.forEach((movement) => {
        if (!movement.data) return;
        markers[movement.data] = markers[movement.data] === "ticket" ? "both" : "movement";
    });

    return markers;
}

function getInitialCalendarView(periodType) {
    if (periodType === "Mensal") return "month";
    if (periodType === "Anual") return "year";
    return "day";
}

function ReferenceDatePicker({ label = "Data", value, onChange, dayMarkers = {} }) {
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const pickerRef = useRef(null);
    const selectedDate = isoToDate(value);
    const hasMarkers = Object.keys(dayMarkers).length > 0;

    useEffect(() => {
        if (!isCalendarOpen) return undefined;

        function handleOutsideClick(event) {
            if (pickerRef.current?.contains(event.target)) return;
            setIsCalendarOpen(false);
        }

        document.addEventListener("mousedown", handleOutsideClick);
        return () => document.removeEventListener("mousedown", handleOutsideClick);
    }, [isCalendarOpen]);

    function handleDaySelect(date) {
        if (!date) return;

        onChange(dateToISO(date));
        setIsCalendarOpen(false);
    }

    return (
        <label className="reference-date-field">
            <span>{label}</span>
            <div className="reference-calendar-picker" ref={pickerRef}>
                <button
                    type="button"
                    className="reference-selector-surface reference-date-trigger"
                    onClick={() => setIsCalendarOpen((current) => !current)}
                    aria-expanded={isCalendarOpen}
                >
                    <strong className="reference-selector-value">{value ? formatDateBR(value) : "Selecionar"}</strong>
                    <CalendarIcon />
                </button>

                {isCalendarOpen && (
                    <div className="reference-calendar-popover reference-form-calendar-popover">
                        <DayPicker
                            mode="single"
                            selected={selectedDate}
                            onSelect={handleDaySelect}
                            modifiers={{
                                hasTicket: (date) => dayMarkers[dateToISO(date)] === "ticket",
                                hasMovement: (date) => dayMarkers[dateToISO(date)] === "movement",
                                hasBoth: (date) => dayMarkers[dateToISO(date)] === "both",
                            }}
                            modifiersClassNames={{
                                hasTicket: "reference-day-ticket",
                                hasMovement: "reference-day-movement",
                                hasBoth: "reference-day-both",
                            }}
                        />
                        {hasMarkers && (
                            <div className="reference-calendar-legend" aria-label="Legenda do calendário">
                                <span><i className="ticket" /> Aposta</span>
                                <span><i className="movement" /> Movimentação</span>
                                <span><i className="both" /> Ambos</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </label>
    );
}

export function PeriodFields({ dayMarkers = {}, onPeriodReferenceChange, onPeriodTypeChange, periodReference, periodType }) {
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [calendarView, setCalendarView] = useState("day");
    const [drillDate, setDrillDate] = useState(() => isoToDate(periodReference) || isoToDate(hojeISO()));
    const pickerRef = useRef(null);
    const selectedDate = isoToDate(periodReference);
    const todayISO = hojeISO();
    const currentDrillDate = drillDate || selectedDate || isoToDate(hojeISO());
    const drillYear = currentDrillDate.getFullYear();
    const yearGridStart = Math.floor(drillYear / 12) * 12;

    useEffect(() => {
        if (!isCalendarOpen) return undefined;

        function handleOutsideClick(event) {
            if (pickerRef.current?.contains(event.target)) return;
            setIsCalendarOpen(false);
        }

        document.addEventListener("mousedown", handleOutsideClick);
        return () => document.removeEventListener("mousedown", handleOutsideClick);
    }, [isCalendarOpen]);

    function getReferenceDisplayValue() {
        if (periodType === "Geral") return "Geral";
        if (!periodReference) return "Selecionar";
        if (String(periodType || "").startsWith("Di") || periodType === "Semanal") return formatDateBR(periodReference);
        if (periodType === "Mensal") return periodReference.split("-").reverse().join("/");
        return periodReference;
    }

    function handleDaySelect(date) {
        if (!date) return;

        const dateISO = dateToISO(date);

        if (String(periodType || "").startsWith("Di")) {
            onPeriodReferenceChange(dateISO);
        } else if (periodType === "Semanal") {
            onPeriodReferenceChange(getWeekRef(dateISO));
        } else if (periodType === "Mensal") {
            onPeriodReferenceChange(getMonthRef(dateISO));
        } else if (periodType === "Anual") {
            onPeriodReferenceChange(getYearRef(dateISO));
        }

        setIsCalendarOpen(false);
    }

    function handleCalendarTriggerClick() {
        if (!isCalendarOpen) {
            setCalendarView(getInitialCalendarView(periodType));
            setDrillDate(isoToDate(periodReference) || isoToDate(hojeISO()));
        }
        setIsCalendarOpen((current) => !current);
    }

    function handleYearSelect(year) {
        setDrillDate(new Date(year, 0, 1, 12));
        setCalendarView("month");
    }

    function handleMonthSelect(monthIndex) {
        setDrillDate(new Date(drillYear, monthIndex, 1, 12));
        setCalendarView("day");
    }

    function renderYearView() {
        const years = Array.from({ length: 12 }, (_, index) => yearGridStart + index);
        const selectedYear = selectedDate?.getFullYear();

        return (
            <div className="reference-calendar-step">
                <div className="reference-calendar-step-header">
                    <button type="button" onClick={() => setDrillDate(new Date(yearGridStart - 12, 0, 1, 12))} aria-label="Anos anteriores">‹</button>
                    <strong>{yearGridStart} - {yearGridStart + 11}</strong>
                    <button type="button" onClick={() => setDrillDate(new Date(yearGridStart + 12, 0, 1, 12))} aria-label="Próximos anos">›</button>
                </div>
                <div className="reference-calendar-step-grid year-grid">
                    {years.map((year) => (
                        <button
                            type="button"
                            key={year}
                            className={year === selectedYear ? "selected" : ""}
                            onClick={() => handleYearSelect(year)}
                        >
                            {year}
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    function renderMonthView() {
        const selectedMonth = selectedDate && selectedDate.getFullYear() === drillYear
            ? selectedDate.getMonth()
            : null;

        return (
            <div className="reference-calendar-step">
                <div className="reference-calendar-step-header">
                    <button type="button" onClick={() => setDrillDate(new Date(drillYear - 1, currentDrillDate.getMonth(), 1, 12))} aria-label="Ano anterior">‹</button>
                    <strong>{drillYear}</strong>
                    <button type="button" onClick={() => setDrillDate(new Date(drillYear + 1, currentDrillDate.getMonth(), 1, 12))} aria-label="Próximo ano">›</button>
                </div>
                <div className="reference-calendar-step-grid month-grid">
                    {SHORT_MONTH_LABELS.map((month, index) => (
                        <button
                            type="button"
                            key={month}
                            className={index === selectedMonth ? "selected" : ""}
                            onClick={() => handleMonthSelect(index)}
                        >
                            {month}
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    function renderDayView() {
        return (
            <DayPicker
                mode="single"
                month={currentDrillDate}
                selected={String(periodType || "").startsWith("Di") ? selectedDate : undefined}
                onMonthChange={setDrillDate}
                onSelect={handleDaySelect}
                modifiers={{
                    todayMarker: (date) => dateToISO(date) === todayISO,
                    hasTicket: (date) => dayMarkers[dateToISO(date)] === "ticket",
                    hasMovement: (date) => dayMarkers[dateToISO(date)] === "movement",
                    hasBoth: (date) => dayMarkers[dateToISO(date)] === "both",
                }}
                modifiersClassNames={{
                    todayMarker: "reference-day-today",
                    hasTicket: "reference-day-ticket",
                    hasMovement: "reference-day-movement",
                    hasBoth: "reference-day-both",
                }}
            />
        );
    }

    return (
        <>
            <label className="reference-period">
                <span>Período</span>
                <select value={periodType} onChange={(event) => {
                    onPeriodTypeChange(event.target.value);
                    setIsCalendarOpen(false);
                    setCalendarView(getInitialCalendarView(event.target.value));
                }}>
                    {["Diário", "Semanal", "Mensal", "Anual", "Geral"].map((option) => (
                        <option key={option} value={option}>{option}</option>
                    ))}
                </select>
            </label>

            <label className="reference-period">
                <span>Referência</span>
                <div className="reference-calendar-picker" ref={pickerRef}>
                    <button
                        type="button"
                        className="reference-selector-surface"
                        disabled={periodType === "Geral"}
                        onClick={handleCalendarTriggerClick}
                        aria-expanded={isCalendarOpen}
                    >
                        <strong className="reference-selector-value">{getReferenceDisplayValue()}</strong>
                        <CalendarIcon />
                    </button>

                    {isCalendarOpen && (
                        <div className="reference-calendar-popover">
                            {calendarView === "year" && renderYearView()}
                            {calendarView === "month" && renderMonthView()}
                            {calendarView === "day" && renderDayView()}
                            {calendarView === "day" && (
                                <div className="reference-calendar-legend" aria-label="Legenda do calendário">
                                    <span><i className="ticket" /> Aposta</span>
                                    <span><i className="movement" /> Movimentação</span>
                                    <span><i className="both" /> Ambos</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </label>
        </>
    );
}

function NativePeriodFields({ availableReferences, onPeriodReferenceChange, onPeriodTypeChange, periodReference, periodType }) {
    const referenceControlRef = useRef(null);

    function openReferencePicker() {
        const control = referenceControlRef.current;
        if (!control || control.disabled) return;

        if (typeof control.showPicker === "function") {
            control.showPicker();
            return;
        }

        control.focus();
        if (typeof control.select === "function") {
            control.select();
        }
    }

    function getReferenceDisplayValue() {
        if (periodType === "Geral") return "Geral";
        if (!periodReference) return "Selecionar";

        if (String(periodType || "").startsWith("Di") || periodType === "Semanal") {
            return formatDateBR(periodReference);
        }

        if (periodType === "Mensal") {
            const [year, month] = periodReference.split("-");
            return `${month}/${year}`;
        }

        return periodReference;
    }

    return (
        <>
            <label className="reference-period">
                <span>Período</span>
                <select value={periodType} onChange={(event) => onPeriodTypeChange(event.target.value)}>
                    {["Diário", "Semanal", "Mensal", "Anual", "Geral"].map((option) => (
                        <option key={option} value={option}>{option}</option>
                    ))}
                </select>
            </label>

            <label className="reference-period">
                <span>Referência</span>
                <div
                    className="reference-selector-surface"
                    role="button"
                    tabIndex={0}
                    onClick={openReferencePicker}
                    onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            openReferencePicker();
                        }
                    }}
                >
                    {String(periodType || "").startsWith("Di") ? (
                        <input
                            ref={referenceControlRef}
                            type="date"
                            value={periodReference}
                            onChange={(event) => onPeriodReferenceChange(event.target.value)}
                        />
                    ) : periodType === "Semanal" ? (
                        <input
                            ref={referenceControlRef}
                            type="date"
                            value={periodReference}
                            onChange={(event) => onPeriodReferenceChange(getWeekRef(event.target.value))}
                        />
                    ) : periodType === "Mensal" ? (
                        <input
                            ref={referenceControlRef}
                            type="month"
                            value={periodReference}
                            onChange={(event) => onPeriodReferenceChange(event.target.value)}
                        />
                    ) : periodType === "Anual" ? (
                        <input
                            ref={referenceControlRef}
                            type="number"
                            min="2020"
                            max="2035"
                            value={periodReference}
                            onChange={(event) => onPeriodReferenceChange(event.target.value)}
                        />
                    ) : (
                        <select
                            ref={referenceControlRef}
                            value={periodReference}
                            onChange={(event) => onPeriodReferenceChange(event.target.value)}
                            disabled={periodType === "Geral"}
                        >
                            {periodType === "Geral" ? (
                                <option value="">Geral</option>
                            ) : (
                                availableReferences.map((reference) => (
                                    <option key={reference} value={reference}>{reference}</option>
                                ))
                            )}
                        </select>
                    )}
                    <strong className="reference-selector-value">{getReferenceDisplayValue()}</strong>
                    <CalendarIcon />
                </div>
            </label>
        </>
    );
}

function FilterToolbar({
    accountName = "Usuário",
    houses = [],
    houseForm,
    onHouseChange,
    onSubmitHouse,
    isSavingHouse,
    houseFeedback,
    editingHouseId,
    onCancelEdit,
    onSelectHouse,
    periodType,
    onPeriodTypeChange,
    periodReference,
    onPeriodReferenceChange,
    selectedHouseScope,
    dayMarkers = {},
    theme = "dark",
    onToggleTheme = () => { },
}) {
    const selectedHouseValue = selectedHouseScope === "all" ? "all" : selectedHouseScope ? String(selectedHouseScope) : "";
    const [isHousePickerOpen, setIsHousePickerOpen] = useState(true);
    const selectedHouse = houses.find((house) => String(house.id) === selectedHouseValue);
    const selectedHouseLabel = selectedHouseValue === "all" ? "Todas as casas" : selectedHouse?.nome || "Selecione";

    return (
        <form className={`reference-toolbar ${editingHouseId ? "editing-house" : ""}`} onSubmit={onSubmitHouse}>
            <div className={`reference-selected-house-field ${isHousePickerOpen ? "open" : ""}`}>
                <span>Casa de aposta</span>
                <button
                    type="button"
                    className="reference-selected-house-trigger"
                    onClick={() => setIsHousePickerOpen((current) => !current)}
                    aria-expanded={isHousePickerOpen}
                >
                    <i aria-hidden="true">{selectedHouseLabel.slice(0, 1)}</i>
                    <strong>{selectedHouseLabel}</strong>
                    <em aria-hidden="true">âŒ„</em>
                </button>
                {isHousePickerOpen && (
                    <div className="reference-selected-house-menu">
                        {houses.map((house) => {
                            const isSelected = String(house.id) === selectedHouseValue;
                            return (
                                <button
                                    type="button"
                                    className={isSelected ? "selected" : ""}
                                    key={house.id}
                                    onClick={() => onSelectHouse(String(house.id))}
                                >
                                    <i aria-hidden="true">{house.nome.slice(0, 1)}</i>
                                    <strong>{house.nome}</strong>
                                    {isSelected && <em aria-hidden="true">âœ“</em>}
                                </button>
                            );
                        })}
                        <button type="button" className="add-house-option" onClick={() => setIsHousePickerOpen(false)}>
                            + Adicionar nova casa
                        </button>
                    </div>
                )}
            </div>

            <label>
                <span>Nova casa</span>
                <input
                    value={houseForm.nome}
                    onChange={(event) => onHouseChange((prev) => ({ ...prev, nome: event.target.value }))}
                    placeholder="Ex.: Superbet"
                />
            </label>

            <label>
                <span>Banca inicial</span>
                <input
                    value={houseForm.bancaInicial}
                    inputMode="numeric"
                    onChange={(event) => onHouseChange((prev) => ({ ...prev, bancaInicial: formatCurrencyTyping(event.target.value) }))}
                    placeholder="R$ 0,00"
                />
            </label>

            <div className="reference-house-actions">
                <button type="submit" className="reference-add-house" disabled={isSavingHouse}>
                    {isSavingHouse ? "Salvando..." : editingHouseId ? "Salvar" : "Adicionar casa"}
                </button>

                {editingHouseId && (
                    <button type="button" className="reference-cancel-house" onClick={onCancelEdit} disabled={isSavingHouse}>
                        Cancelar
                    </button>
                )}
            </div>

            {houseFeedback.message && (
                <div className={`house-feedback ${houseFeedback.type}`}>
                    {houseFeedback.message}
                </div>
            )}

            <PeriodFields
                dayMarkers={dayMarkers}
                onPeriodReferenceChange={onPeriodReferenceChange}
                onPeriodTypeChange={onPeriodTypeChange}
                periodReference={periodReference}
                periodType={periodType}
            />

            <div className="reference-top-actions" aria-label="Ações rápidas">
                <button type="button" className="reference-icon-button" onClick={onToggleTheme} aria-label="Alternar tema">
                    <ThemeToggleIcon theme={theme} />
                </button>
                <button type="button" className="reference-icon-button reference-notification-button" aria-label="Notificações">
                    <span aria-hidden="true">!</span>
                </button>
                <div className="reference-user-pill reference-user-pill-compact">
                    <i className="reference-user-avatar" aria-hidden="true">{getAccountInitials(accountName)}</i>
                    <strong>{accountName}</strong>
                </div>
            </div>
        </form>
    );
}

function HouseAnalyticsGrid({
    housesWithCurrentBank,
    selectedHouseScope,
    onSelectHouse,
    onEditHouse,
    onRequestDeleteHouse,
    allTicketsCount,
    allHitRate,
}) {
    const [openHouseMenuId, setOpenHouseMenuId] = useState(null);
    const [openHouseDetailsId, setOpenHouseDetailsId] = useState(null);
    const [houseMenuPosition, setHouseMenuPosition] = useState({ top: 0, left: 0 });
    const [houseDetailsPosition, setHouseDetailsPosition] = useState({ top: 0, left: 0 });
    const menuRootRef = useRef(null);
    const houseMenuButtonRefs = useRef({});
    const houseCards = housesWithCurrentBank;

    useEffect(() => {
        if (openHouseMenuId === null && openHouseDetailsId === null) return undefined;

        function handleOutsideClick(event) {
            if (event.target.closest(".reference-house-floating-menu")) return;
            if (event.target.closest(".reference-house-details-popover")) return;
            if (event.target.closest(".reference-house-menu-button")) return;
            setOpenHouseMenuId(null);
            setOpenHouseDetailsId(null);
        }

        document.addEventListener("mousedown", handleOutsideClick);
        return () => document.removeEventListener("mousedown", handleOutsideClick);
    }, [openHouseMenuId, openHouseDetailsId]);

    useEffect(() => {
        if (openHouseMenuId === null && openHouseDetailsId === null) return undefined;

        function updateFloatingPosition() {
            const activeHouseId = openHouseMenuId ?? openHouseDetailsId;
            const button = houseMenuButtonRefs.current[activeHouseId];
            if (!button) return;

            const rect = button.getBoundingClientRect();
            const menuLeft = Math.max(12, Math.min(window.innerWidth - 164, rect.right - 148));
            const detailsLeft = Math.max(12, Math.min(window.innerWidth - 272, rect.left));

            setHouseMenuPosition({
                top: rect.bottom + 6,
                left: menuLeft,
            });
            setHouseDetailsPosition({
                top: rect.bottom + 6,
                left: detailsLeft,
            });
        }

        function closeFloatingPanels() {
            setOpenHouseMenuId(null);
            setOpenHouseDetailsId(null);
        }

        updateFloatingPosition();
        window.addEventListener("scroll", closeFloatingPanels, true);
        window.addEventListener("resize", updateFloatingPosition);
        return () => {
            window.removeEventListener("scroll", closeFloatingPanels, true);
            window.removeEventListener("resize", updateFloatingPosition);
        };
    }, [openHouseMenuId, openHouseDetailsId]);

    const openHouse = houseCards.find((house) => Number(house.id) === Number(openHouseMenuId));
    const openHouseDetails = houseCards.find((house) => Number(house.id) === Number(openHouseDetailsId));

    return (
        <>
            <div className="reference-house-grid" ref={menuRootRef}>
                <article
                    className={`reference-house-card reference-house-card-all ${selectedHouseScope === "all" ? "active" : ""}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectHouse("all")}
                    onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            onSelectHouse("all");
                        }
                    }}
                >
                    <header>
                        <span className="reference-house-avatar" aria-hidden="true">T</span>
                        <strong>Todas</strong>
                    </header>
                    <span>{allTicketsCount || 0} bilhetes</span>
                    <em>{formatPercent(allHitRate || 0)} acerto</em>
                </article>
                {houseCards.map((house) => {
                    const selected = Number(selectedHouseScope) === Number(house.id);

                    function selectHouse() {
                        onSelectHouse(house.id);
                    }

                    return (
                        <article
                            className={`reference-house-card ${selected ? "active" : ""}`}
                            key={house.id}
                            role="button"
                            tabIndex={0}
                            onClick={selectHouse}
                            onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                    event.preventDefault();
                                    selectHouse();
                                }
                            }}
                        >
                            <header>
                                <span className="reference-house-avatar" aria-hidden="true">{house.nome.slice(0, 1).toUpperCase()}</span>
                                <strong>{house.nome}</strong>
                                <div className="reference-house-menu-wrap" onClick={(event) => event.stopPropagation()}>
                                    <button
                                        ref={(node) => {
                                            if (node) {
                                                houseMenuButtonRefs.current[house.id] = node;
                                            } else {
                                                delete houseMenuButtonRefs.current[house.id];
                                            }
                                        }}
                                        type="button"
                                        className="reference-house-menu-button"
                                        aria-label={`Ações para ${house.nome}`}
                                        aria-expanded={openHouseMenuId === house.id}
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            setOpenHouseMenuId((current) => current === house.id ? null : house.id);
                                            setOpenHouseDetailsId(null);
                                        }}
                                    >
                                        &#8942;
                                    </button>
                                </div>
                            </header>
                        </article>
                    );
                })}
                <article className="reference-house-card reference-house-card-add" role="button" tabIndex={0}>
                    <header>
                        <span className="reference-house-avatar" aria-hidden="true">+</span>
                        <strong>Adicionar casa</strong>
                    </header>
                </article>
            </div>
            {openHouse && (
                <div
                    className="reference-house-floating-menu"
                    style={{ top: `${houseMenuPosition.top}px`, left: `${houseMenuPosition.left}px` }}
                    onClick={(event) => event.stopPropagation()}
                >
                    <button
                        type="button"
                        onClick={() => {
                            setOpenHouseMenuId(null);
                            setOpenHouseDetailsId(openHouse.id);
                        }}
                    >
                        <KpiIcon type="target" />Detalhes
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setOpenHouseMenuId(null);
                            onEditHouse(openHouse.id);
                        }}
                    >
                        <KpiIcon type="edit" />Editar
                    </button>
                    <button
                        type="button"
                        className="danger"
                        onClick={() => {
                            setOpenHouseMenuId(null);
                            onRequestDeleteHouse(openHouse);
                        }}
                    >
                        <KpiIcon type="delete" />Excluir
                    </button>
                </div>
            )}
            {openHouseDetails && (
                <aside
                    className="reference-house-details-popover"
                    style={{ top: `${houseDetailsPosition.top}px`, left: `${houseDetailsPosition.left}px` }}
                    aria-label={`Detalhes de ${openHouseDetails.nome}`}
                >
                    <header>
                        <span>Detalhes</span>
                        <strong>{openHouseDetails.nome}</strong>
                    </header>
                    <dl>
                        <div>
                            <dt>Total de apostas</dt>
                            <dd>{openHouseDetails.quantidadeApostas || 0}</dd>
                        </div>
                        <div>
                            <dt>Apostas ganhas</dt>
                            <dd>{openHouseDetails.apostasGanhas || 0}</dd>
                        </div>
                        <div>
                            <dt>Apostas perdidas</dt>
                            <dd>{openHouseDetails.apostasPerdidas || 0}</dd>
                        </div>
                        <div>
                            <dt>Taxa de acerto</dt>
                            <dd>{formatPercent(openHouseDetails.taxaAcerto || 0)}</dd>
                        </div>
                    </dl>
                </aside>
            )}
        </>
    );
}

function KpiIcon({ type }) {
    const iconPaths = {
        bank: (
            <>
                <path d="M3 7h18" />
                <path d="M5 7V5.5L12 3l7 2.5V7" />
                <path d="M6 10v6" />
                <path d="M10 10v6" />
                <path d="M14 10v6" />
                <path d="M18 10v6" />
                <path d="M4 19h16" />
            </>
        ),
        grid: (
            <>
                <rect x="4.5" y="4.5" width="5.5" height="5.5" rx="1.2" />
                <rect x="14" y="4.5" width="5.5" height="5.5" rx="1.2" />
                <rect x="4.5" y="14" width="5.5" height="5.5" rx="1.2" />
                <rect x="14" y="14" width="5.5" height="5.5" rx="1.2" />
            </>
        ),
        bell: (
            <>
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                <path d="M10 20a2 2 0 0 0 4 0" />
            </>
        ),
        "bank-initial": (
            <>
                <path d="M3.5 8.2h17" />
                <path d="M5.4 8.2V6.5L12 3.7l6.6 2.8v1.7" />
                <path d="M7.1 11.2v5.2" />
                <path d="M10.4 11.2v5.2" />
                <path d="M13.6 11.2v5.2" />
                <path d="M16.9 11.2v5.2" />
                <path d="M5 18.6h14" />
                <path d="M4 21h16" />
                <path d="m15.4 4.9 1.2-1.7" />
                <path d="m18.1 5.8 1.8-.8" />
            </>
        ),
        "bank-current": (
            <>
                <path d="M3.5 8.2h17" />
                <path d="M5.4 8.2V6.5L12 3.7l6.6 2.8v1.7" />
                <path d="M7.1 11.2v5.2" />
                <path d="M10.4 11.2v5.2" />
                <path d="M13.6 11.2v5.2" />
                <path d="M16.9 11.2v5.2" />
                <path d="M5 18.6h14" />
                <path d="M4 21h16" />
                <path d="m15.4 4.9 1.2-1.7" />
                <path d="m18.1 5.8 1.8-.8" />
            </>
        ),
        delete: (
            <>
                <path d="M3 6h18" />
                <path d="M8 6V4h8v2" />
                <path d="M6 6l1 16h10l1-16" />
                <path d="M10 11v6" />
                <path d="M14 11v6" />
            </>
        ),
        edit: (
            <>
                <path d="M4 20h4l11-11a2.8 2.8 0 0 0-4-4L4 16v4Z" />
                <path d="m13 6 4 4" />
            </>
        ),
        calculator: (
            <>
                <path fill="currentColor" stroke="none" d="M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm2 3v3h8V7H8Zm0 5v2h2v-2H8Zm4 0v2h2v-2h-2Zm4 0v2h2v-2h-2Zm-8 4v2h2v-2H8Zm4 0v2h6v-2h-6Z" />
            </>
        ),
        cash: (
            <>
                <path fill="currentColor" stroke="none" d="M4 7h16a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Zm3 2.5A1.5 1.5 0 0 1 5.5 11v2A1.5 1.5 0 0 1 7 14.5h10A1.5 1.5 0 0 1 18.5 13v-2A1.5 1.5 0 0 1 17 9.5H7ZM12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z" />
            </>
        ),
        checklist: (
            <>
                <rect x="6.4" y="4.4" width="11.2" height="16" rx="1.8" />
                <path d="M9.5 4.4h5" />
                <path d="m8.9 10.3 1.2 1.2 2.2-2.4" />
                <path d="M13.5 10.6h2.3" />
                <path d="m8.9 15.3 1.2 1.2 2.2-2.4" />
                <path d="M13.5 15.6h2.3" />
            </>
        ),
        close: (
            <>
                <path d="M6.2 6.2 17.8 17.8" />
                <path d="M17.8 6.2 6.2 17.8" />
            </>
        ),
        gauge: (
            <>
                <path fill="currentColor" stroke="none" d="M12 5a9 9 0 0 1 9 9 8.9 8.9 0 0 1-.8 3.7 1.7 1.7 0 0 1-1.6 1H5.4a1.7 1.7 0 0 1-1.6-1A8.9 8.9 0 0 1 3 14a9 9 0 0 1 9-9Zm0 3a6 6 0 0 0-6 6h2.4a3.6 3.6 0 0 1 7.2 0H18a6 6 0 0 0-6-6Zm4.7 2.1-3.3 4.1a2 2 0 1 0 1.4 1.4l4.1-3.3-2.2-2.2Z" />
            </>
        ),
        hourglass: (
            <>
                <path fill="currentColor" stroke="none" d="M7 3h10a1.2 1.2 0 0 1 0 2h-.8c-.3 2.5-1.3 4.5-3 6l-.7.6.7.6c1.7 1.5 2.7 3.5 3 6h.8a1.2 1.2 0 0 1 0 2H7a1.2 1.2 0 0 1 0-2h.8c.3-2.5 1.3-4.5 3-6l.7-.6-.7-.6c-1.7-1.5-2.7-3.5-3-6H7a1.2 1.2 0 0 1 0-2Zm3.2 2c.3 1.7 1 3 1.8 3.8.8-.8 1.5-2.1 1.8-3.8h-3.6Zm1.8 9.3c-.9.8-1.5 2.1-1.8 3.7h3.6c-.3-1.6-.9-2.9-1.8-3.7Z" />
            </>
        ),
        info: (
            <>
                <circle cx="12" cy="12" r="8" />
                <path d="M12 11v5" />
                <path d="M12 8h.01" />
            </>
        ),
        lifebuoy: (
            <>
                <circle cx="12" cy="12" r="8" />
                <circle cx="12" cy="12" r="3.2" />
                <path d="m6.4 6.4 3.2 3.2" />
                <path d="m14.4 14.4 3.2 3.2" />
                <path d="m17.6 6.4-3.2 3.2" />
                <path d="m9.6 14.4-3.2 3.2" />
            </>
        ),
        percent: (
            <>
                <circle cx="8" cy="8" r="2.2" />
                <circle cx="16" cy="16" r="2.2" />
                <path d="m18 6-12 12" />
            </>
        ),
        plus: (
            <>
                <path d="M12 5v14" />
                <path d="M5 12h14" />
            </>
        ),
        target: (
            <>
                <path fill="currentColor" stroke="none" d="M12 3a9 9 0 1 0 9 9h-3a6 6 0 1 1-6-6V3Zm0 5a4 4 0 1 0 4 4h-3a1 1 0 1 1-1-1V8Zm2-5v5.2L9.6 12.6l1.8 1.8L15.8 10H21V7h-3.9l3.4-3.4-2.1-2.1L15 4.9V3h-1Z" />
            </>
        ),
        trend: (
            <>
                <path fill="currentColor" stroke="none" d="M4 18h16a1 1 0 1 1 0 2H3a1 1 0 0 1-1-1V5a1 1 0 1 1 2 0v13Zm3-2.5-1.6-1.6 5-5 3 3L19.3 6H16V4h7v7h-2V7.7l-7.6 7.6-3-3L7 15.5Z" />
            </>
        ),
        trophy: (
            <>
                <path d="M8 4h8v4.5a4 4 0 0 1-8 0V4Z" />
                <path d="M8 6H5.8a2.3 2.3 0 0 0 0 4.6H8" />
                <path d="M16 6h2.2a2.3 2.3 0 0 1 0 4.6H16" />
                <path d="M12 12.5V17" />
                <path d="M8.8 20h6.4" />
                <path d="M10 17h4" />
            </>
        ),
        upload: (
            <>
                <path d="M12 16V7" />
                <path d="m8.5 10.5 3.5-3.5 3.5 3.5" />
                <path d="M6 15.5a4 4 0 0 1 .7-7.9A5.4 5.4 0 0 1 17 9.2a3.6 3.6 0 0 1 1 7H6" />
            </>
        ),
        wallet: (
            <>
                <path d="M4 7h15a2 2 0 0 1 2 2v10H6a2 2 0 0 1-2-2V7Z" />
                <path d="M4 7a3 3 0 0 1 3-3h13v4" />
                <path d="M17 12h4v4h-4a2 2 0 0 1 0-4Z" />
            </>
        ),
    };

    return (
        <svg className="reference-kpi-svg" viewBox="0 0 24 24" aria-hidden="true">
            {iconPaths[type] || iconPaths.bank}
        </svg>
    );
}

export function KpiRow({ metrics, renderValue }) {
    const iconClassMap = {
        BA: "bank-current",
        BF: "bank-current",
        BI: "bank-initial",
        CALC: "calculator",
        CASH: "cash",
        CHECK: "checklist",
        CLOSE: "close",
        EV: "trend",
        GAUGE: "gauge",
        HOUR: "hourglass",
        LIFE: "lifebuoy",
        ROI: "percent",
        RS: "trend",
        TARGET: "target",
        TROPHY: "trophy",
        VA: "wallet",
    };

    return (
        <section className="reference-kpi-row">
            {metrics.map((item) => (
                <article className={`reference-kpi-card bg-white rounded-2xl shadow-sm border border-slate-200 ${item.tone || "neutral"} ${item.className || ""}`} key={item.title}>
                    <span className={`reference-kpi-icon ${iconClassMap[item.icon] || "bank"}`} aria-hidden="true">
                        <KpiIcon type={iconClassMap[item.icon] || "bank"} />
                    </span>
                    <div>
                        <div className="reference-kpi-title-row">
                            <KpiTitleWithTooltip title={item.title} text={item.tooltip} />
                        </div>
                        <strong>{renderValue(item.value, item.formatter)}</strong>
                    </div>
                </article>
            ))}
        </section>
    );
}

function KpiTitleWithTooltip({ title, text }) {
    if (!text) {
        return <small>{title}</small>;
    }

    return (
        <span className="reference-kpi-title-tooltip" tabIndex={0} aria-label={`${title}: ${text}`}>
            <small>{title}</small>
            <span role="tooltip">{text}</span>
        </span>
    );
}

export function AnalyticsSection({ analyticsPeriodType, bankHistoryData, chartMode, isResultScrollable, resultChartData, sectionRef, setChartMode, onOpenReports = () => { } }) {
    const maxResultValue = Math.max(
        1,
        ...resultChartData.map((item) => Math.abs(Number(item.value || 0)))
    );
    const performanceBars = resultChartData.map((item, index) => {
        const delta = Number(item.value || 0);
        const height = item.hasActivity
            ? Math.min(88, Math.max(16, (Math.abs(delta) / maxResultValue) * 88))
            : 0;
        return { ...item, id: `${item.key || item.label}-${index}`, delta, height };
    });
    const knownBankPoints = bankHistoryData.filter((item) => item.bancaLinha !== null && item.bancaLinha !== undefined);
    const firstBankPoint = knownBankPoints[0];
    const lastBankPoint = knownBankPoints[knownBankPoints.length - 1];
    const bankDelta =
        firstBankPoint && lastBankPoint
            ? Number(lastBankPoint.banca || 0) - Number(firstBankPoint.banca || 0)
            : 0;
    const bankDeltaPercent =
        firstBankPoint && Number(firstBankPoint.banca || 0) !== 0
            ? (bankDelta / Number(firstBankPoint.banca || 0)) * 100
            : 0;
    const bankTone = bankDelta >= 0 ? "positive" : "negative";
    const bankChartColor = bankTone === "positive" ? "#35d38b" : "#ff3048";
    const bankChartGlow = bankTone === "positive" ? "rgba(53, 211, 139, 0.18)" : "rgba(255, 48, 72, 0.16)";
    const lastBankPointKey = lastBankPoint?.data;
    const resultTimelineClass = isResultScrollable ? "scrollable" : "";
    const bankChartData = bankHistoryData;
    const bankChartLabelByDate = new Map(bankChartData.map((point) => [point.data, point.label]));
    const bankChartTicks = bankChartData.map((point) => point.data);
    const bankYAxisDomain = [
        (dataMin) => {
            const numericMin = Number(dataMin || 0);
            if (numericMin >= 0) return 0;
            return Math.floor(numericMin * 1.12);
        },
        (dataMax) => {
            const numericMax = Number(dataMax || 0);
            if (numericMax === 0) return 1;
            return Math.ceil(numericMax * 1.16);
        },
    ];
    const shouldUseMonthlyPointTicks = analyticsPeriodType === "Mensal";
    const shouldShowAllMonthTicks = analyticsPeriodType === "Anual" || analyticsPeriodType === "Geral";
    const dailyResultRows = [...performanceBars]
        .filter((item) => item.hasActivity)
        .slice(0, 5);
    const getChartNumberTone = (value) => {
        const numericValue = Number(value || 0);
        if (numericValue > 0) return "positive";
        if (numericValue < 0) return "negative";
        return "neutral";
    };
    const renderChartYAxisTick = ({ x, y, payload }) => {
        const value = Number(payload?.value || 0);
        const axisTone = value < 0 ? "negative" : "neutral";
        return (
            <text
                x={x}
                y={y}
                className={`reference-chart-axis-value ${axisTone}`}
                textAnchor="end"
                dy="0.35em"
            >
                {`R$ ${value.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`}
            </text>
        );
    };
    const renderBankXAxisTick = ({ x, y, payload }) => {
        const label = shouldUseMonthlyPointTicks
            ? "•"
            : bankChartLabelByDate.get(payload?.value) || "";

        return (
            <text
                x={x}
                y={y + 8}
                className={`reference-chart-axis-label ${shouldUseMonthlyPointTicks ? "point" : ""}`}
                textAnchor="middle"
            >
                {label}
            </text>
        );
    };

    return (
        <section className="reference-analytics-grid has-daily-result" ref={sectionRef}>
            <article className={`reference-analytics-panel area ${bankTone} bg-white rounded-2xl shadow-sm border border-slate-200`}>
                <header>
                    <div>
                        <h2>Evolução da banca</h2>
                        <p>Evolução acumulada da banca no período</p>
                    </div>
                    <div className="reference-analytics-summary compact">
                        <span className={bankDelta > 0 ? "positive" : bankDelta < 0 ? "negative" : "neutral"}>
                            {formatSignedPercent(bankDeltaPercent)}
                        </span>
                    </div>
                    <button className="reference-chart-mode-button" type="button" onClick={() => setChartMode(chartMode === "Banca" ? "Desempenho" : "Banca")} aria-label="Alternar modo do gráfico">
                        {chartMode} <i />
                    </button>
                </header>
                <div className={`reference-area-chart reference-recharts ${shouldUseMonthlyPointTicks ? "monthly-points" : ""}`}>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={bankChartData} margin={{ top: 22, right: 8, left: 4, bottom: 8 }}>
                            <defs>
                                <linearGradient id="referenceRealAreaFill" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={bankChartColor} stopOpacity={0.42} />
                                    <stop offset="100%" stopColor={bankChartColor} stopOpacity={0.03} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(139, 161, 196, 0.1)" vertical={false} />
                            <XAxis
                                dataKey="data"
                                type="category"
                                ticks={bankChartTicks}
                                tickFormatter={(value) => shouldUseMonthlyPointTicks ? "•" : bankChartLabelByDate.get(value) || ""}
                                allowDuplicatedCategory={false}
                                axisLine={false}
                                tickLine={false}
                                interval={shouldUseMonthlyPointTicks || shouldShowAllMonthTicks ? 0 : "preserveEnd"}
                                padding={{ left: 0, right: 0 }}
                                tick={renderBankXAxisTick}
                            />
                            <YAxis axisLine={false} tickLine={false} tickMargin={8} width={58} domain={bankYAxisDomain} tick={renderChartYAxisTick} />
                            <Tooltip
                                trigger="hover"
                                cursor={{
                                    stroke: "rgba(216, 228, 242, 0.16)",
                                    strokeDasharray: "3 6",
                                    strokeWidth: 1,
                                }}
                                isAnimationActive={false}
                                wrapperStyle={{ pointerEvents: "none" }}
                                content={({ active, label, payload }) => {
                                    if (!active || !payload?.length || payload[0].payload?.bancaLinha === null || payload[0].payload?.bancaLinha === undefined) return null;

                                    return (
                                        <div className="chart-tooltip">
                                            <span>{payload[0].payload.tooltipLabel || label}</span>
                                            <strong className={Number(payload[0].payload.bancaLinha || 0) < 0 ? "negative" : "neutral"}>{formatMoney(payload[0].payload.bancaLinha)}</strong>
                                        </div>
                                    );
                                }}
                            />
                            <Area
                                type="monotone"
                                dataKey="bancaLinha"
                                stroke={bankChartColor}
                                fill="url(#referenceRealAreaFill)"
                                strokeWidth={3.8}
                                dot={(props) => {
                                    if (props.payload?.bancaLinha === null || props.payload?.bancaLinha === undefined) return null;
                                    const shouldHighlightPoint = props.payload?.data === lastBankPointKey;
                                    if (!shouldHighlightPoint) return null;
                                    return <circle cx={props.cx} cy={props.cy} r={4.2} style={{ fill: bankChartColor, stroke: "#081421" }} strokeWidth={2} />;
                                }}
                                activeDot={(props) => {
                                    if (props.payload?.bancaLinha === null || props.payload?.bancaLinha === undefined) return null;
                                    return (
                                        <g pointerEvents="none">
                                            <line
                                                x1={props.cx}
                                                x2={props.cx}
                                                y1={props.cy}
                                                y2="100%"
                                                className="reference-chart-hover-line"
                                            />
                                            <circle
                                                cx={props.cx}
                                                cy={props.cy}
                                                r={5.2}
                                                style={{ fill: bankChartColor, stroke: "#081421" }}
                                                strokeWidth={2}
                                            />
                                        </g>
                                    );
                                }}
                                connectNulls={false}
                                style={{ filter: `drop-shadow(0 7px 10px ${bankChartGlow})` }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </article>

            <article className="reference-analytics-panel bars bg-white rounded-2xl shadow-sm border border-slate-200">
                <header>
                    <div>
                        <h2>Resultado do período</h2>
                        <p>Variação por referência da banca</p>
                    </div>
                </header>
                <div className={`reference-daily-results-list ${resultTimelineClass}`} aria-label="Resultado temporal do período">
                    {(dailyResultRows.length ? dailyResultRows : performanceBars.slice(0, 5)).map((bar) => (
                        <div className="reference-daily-result-row" key={`daily-${bar.id}`}>
                            <span>{bar.label}</span>
                            <strong className={getChartNumberTone(bar.delta)}>{formatSignedMoney(bar.delta)}</strong>
                            <i className={bar.delta >= 0 ? "positive" : "negative"} aria-hidden="true">{bar.delta >= 0 ? "â†‘" : "â†“"}</i>
                        </div>
                    ))}
                </div>
                <button type="button" className="reference-outline-action" onClick={onOpenReports}>Ver todos os resultados</button>
                <div className={`reference-bar-chart ${resultTimelineClass}`} aria-label="Resultado temporal do período">
                    {performanceBars.map((bar) => (
                        <span
                            key={bar.id}
                            className={`${bar.hasActivity ? "has-event" : "no-event"} ${bar.delta >= 0 ? "pos" : "neg"}`}
                            style={{ "--bar-size": `${bar.height}%` }}
                            title={bar.hasActivity ? `${bar.label}: ${formatSignedInteger(bar.delta)}` : bar.label}
                        >
                            <b>{bar.label}</b>
                            {bar.hasActivity && <em className={getChartNumberTone(bar.delta)}>{formatSignedInteger(bar.delta)}</em>}
                        </span>
                    ))}
                </div>
            </article>

        </section>
    );
}

function TopbarCard({
    accountName = "Usuario",
    houses = [],
    houseForm,
    onHouseChange,
    onSubmitHouse,
    isSavingHouse,
    houseFeedback,
    editingHouseId,
    onCancelEdit,
    onSelectHouse,
    periodType,
    onPeriodTypeChange,
    periodReference,
    onPeriodReferenceChange,
    selectedHouseScope,
    dayMarkers = {},
    theme = "dark",
    onToggleTheme = () => { },
    isCreatingHouse = false,
    onStartCreateHouse = () => { },
}) {
    const [isHousePickerOpen, setIsHousePickerOpen] = useState(false);
    const selectedHouseValue = selectedHouseScope === "all" ? "all" : selectedHouseScope ? String(selectedHouseScope) : "";
    const selectedHouse = houses.find((house) => String(house.id) === selectedHouseValue);
    const selectedHouseLabel = selectedHouseValue === "all" ? "Todas as casas" : selectedHouse?.nome || "Selecione";
    const showHouseNameInput = isCreatingHouse || Boolean(editingHouseId);

    return (
        <form className="cb-topbar-card" onSubmit={onSubmitHouse}>
            <div className="cb-topbar-field cb-house-select-field">
                <span>Casa de aposta</span>
                {showHouseNameInput ? (
                    <input
                        value={houseForm.nome}
                        onChange={(event) => onHouseChange((prev) => ({ ...prev, nome: event.target.value }))}
                        placeholder="Nome da casa"
                    />
                ) : (
                    <div className="cb-house-select-wrap">
                        <button
                            type="button"
                            className="cb-house-select-trigger"
                            onClick={() => setIsHousePickerOpen((current) => !current)}
                            aria-expanded={isHousePickerOpen}
                        >
                            <i aria-hidden="true">{selectedHouseLabel.slice(0, 1).toUpperCase()}</i>
                            <strong>{selectedHouseLabel}</strong>
                            <em aria-hidden="true">âŒ„</em>
                        </button>
                        {isHousePickerOpen && (
                            <div className="cb-house-select-menu">
                                <button type="button" className={selectedHouseValue === "all" ? "selected" : ""} onClick={() => { onSelectHouse("all"); setIsHousePickerOpen(false); }}>
                                    <i aria-hidden="true">T</i>
                                    <strong>Todas as casas</strong>
                                </button>
                                {houses.map((house) => (
                                    <button
                                        type="button"
                                        className={String(house.id) === selectedHouseValue ? "selected" : ""}
                                        key={house.id}
                                        onClick={() => {
                                            onSelectHouse(String(house.id));
                                            setIsHousePickerOpen(false);
                                        }}
                                    >
                                        <i aria-hidden="true">{house.nome.slice(0, 1).toUpperCase()}</i>
                                        <strong>{house.nome}</strong>
                                    </button>
                                ))}
                                <button type="button" className="cb-house-select-add" onClick={() => { setIsHousePickerOpen(false); onStartCreateHouse(); }}>
                                    + Adicionar nova casa
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <label className="cb-topbar-field">
                <span>Banca inicial</span>
                <input
                    value={houseForm.bancaInicial}
                    inputMode="numeric"
                    onChange={(event) => onHouseChange((prev) => ({ ...prev, bancaInicial: formatCurrencyTyping(event.target.value) }))}
                    placeholder="R$ 0,00"
                />
            </label>

            <div className="cb-topbar-actions-main">
                <button type="submit" className="cb-add-house-button" disabled={isSavingHouse}>
                    {isSavingHouse ? "Salvando..." : editingHouseId ? "Salvar casa" : "+ Adicionar casa"}
                </button>
                {(editingHouseId || isCreatingHouse) && (
                    <button type="button" className="cb-cancel-house-button" onClick={onCancelEdit} disabled={isSavingHouse}>
                        Cancelar
                    </button>
                )}
            </div>

            <PeriodFields
                dayMarkers={dayMarkers}
                onPeriodReferenceChange={onPeriodReferenceChange}
                onPeriodTypeChange={onPeriodTypeChange}
                periodReference={periodReference}
                periodType={periodType}
            />

            <div className="cb-topbar-icons" aria-label="Acoes rapidas">
                <button type="button" className="cb-icon-button" onClick={onToggleTheme} aria-label="Alternar tema">
                    <ThemeToggleIcon theme={theme} />
                </button>
                <button type="button" className="cb-icon-button cb-notification-button" aria-label="Notificacoes">
                    <span aria-hidden="true">!</span>
                </button>
                <div className="cb-profile-pill">
                    <i aria-hidden="true">{getAccountInitials(accountName)}</i>
                    <span>
                        <strong>{accountName}</strong>
                        <small>Admin</small>
                    </span>
                    <em aria-hidden="true">âŒ„</em>
                </div>
            </div>

            {houseFeedback.message && (
                <div className={`cb-house-feedback ${houseFeedback.type}`} role="status">
                    {houseFeedback.message}
                </div>
            )}
        </form>
    );
}

function UserSummaryCard({ accountName = "Usuario", plan = "Plano Free" }) {
    return (
        <div className="dashboard-header-user-card" aria-label="Conta">
            <i aria-hidden="true">{getAccountInitials(accountName)}</i>
            <span>
                <strong>{accountName || "Usuario"}</strong>
                <small>{plan || "Plano Free"}</small>
            </span>
        </div>
    );
}

function DashboardContentHeader({ accountName = "Usuario", accountPlan = "Plano Free" }) {
    return (
        <header className="dashboard-home-header">
            <div>
                <h1>Dashboard</h1>
                <p>Bem-vindo de volta, {accountName}! <span aria-hidden="true">ðŸ‘‹</span></p>
            </div>
            <div className="dashboard-home-header-actions" aria-label="Acoes da conta">
                <UserSummaryCard accountName={accountName} plan={accountPlan} />
            </div>
        </header>
    );
}

function DarkTopbarCard({
    accountName = "Usuario",
    houseForm,
    onHouseChange,
    onSubmitHouse,
    isSavingHouse,
    houseFeedback,
    editingHouseId,
    onCancelEdit,
    periodType,
    onPeriodTypeChange,
    periodReference,
    onPeriodReferenceChange,
    dayMarkers = {},
    isCreatingHouse = false,
}) {
    const houseFormSafe = houseForm || { nome: "", bancaInicial: "" };
    const houseFeedbackSafe = houseFeedback || {};

    return (
        <form className="dark-filter-row" onSubmit={onSubmitHouse}>
            <label className="dark-filter-field">
                <span>Casa de aposta</span>
                <input
                    value={houseFormSafe.nome || ""}
                    onChange={(event) => onHouseChange((prev) => ({ ...prev, nome: event.target.value }))}
                    placeholder="Ex.: Superbet"
                />
            </label>

            <label className="dark-filter-field">
                <span>Banca inicial</span>
                <input
                    value={houseFormSafe.bancaInicial || ""}
                    inputMode="numeric"
                    onChange={(event) => onHouseChange((prev) => ({ ...prev, bancaInicial: formatCurrencyTyping(event.target.value) }))}
                    placeholder="R$ 0,00"
                />
            </label>

            <div className="dark-filter-actions">
                <button type="submit" className="dark-add-house-button" disabled={isSavingHouse}>
                    {isSavingHouse ? "Salvando..." : editingHouseId ? "Salvar casa" : "Adicionar casa"}
                </button>
                {(editingHouseId || isCreatingHouse) && (
                    <button type="button" className="dark-cancel-house-button" onClick={onCancelEdit} disabled={isSavingHouse}>
                        Cancelar
                    </button>
                )}
            </div>

            <DarkPeriodFields
                dayMarkers={dayMarkers}
                onPeriodReferenceChange={onPeriodReferenceChange}
                onPeriodTypeChange={onPeriodTypeChange}
                periodReference={periodReference}
                periodType={periodType}
            />

            <div className="dark-dashboard-profile dark-topbar-profile">
                <i aria-hidden="true">{getAccountInitials(accountName)}</i>
                <span>
                    <strong>{accountName}</strong>
                    <small>Admin</small>
                </span>
            </div>

            {houseFeedbackSafe.message && (
                <div className={`dark-house-feedback ${houseFeedbackSafe.type || ""}`} role="status">
                    {houseFeedbackSafe.message}
                </div>
            )}
        </form>
    );
}

function DarkPeriodFields({ dayMarkers = {}, onPeriodReferenceChange, onPeriodTypeChange, periodReference, periodType }) {
    return (
        <div className="dark-period-fields">
            <PeriodFields
                dayMarkers={dayMarkers}
                onPeriodReferenceChange={onPeriodReferenceChange}
                onPeriodTypeChange={onPeriodTypeChange}
                periodReference={periodReference}
                periodType={periodType}
            />
        </div>
    );
}

function BettingHouseCarousel({
    houses,
    housesWithCurrentBank,
    canShowEmptyState = true,
    isLoading = false,
    selectedHouseScope,
    onSelectHouse,
    onEditHouse,
    onRequestDeleteHouse,
    onStartCreateHouse = () => { },
}) {
    const [openHouseMenuId, setOpenHouseMenuId] = useState(null);
    const [houseMenuPosition, setHouseMenuPosition] = useState(null);
    const [isHouseDragActive, setIsHouseDragActive] = useState(false);
    const houseScrollRef = useRef(null);
    const houseDragRef = useRef({
        hasDragged: false,
        isPointerDown: false,
        pointerId: null,
        scrollLeft: 0,
        startX: 0,
    });
    const suppressHouseClickRef = useRef(false);
    const realHouses = Array.isArray(houses) ? houses : [];
    const computedHouses = Array.isArray(housesWithCurrentBank) ? housesWithCurrentBank : [];
    const computedHouseById = new Map(computedHouses.map((house) => [Number(house?.id), house]));
    const houseCards = realHouses.length > 0
        ? realHouses.map((house) => ({
            ...house,
            ...(computedHouseById.get(Number(house?.id)) || {}),
        }))
        : computedHouses;
    const totalTicketsCount = houseCards.reduce((sum, house) => {
        return sum + Number(house?.quantidadeApostas || house?.totalTickets || house?.tickets || 0);
    }, 0);
    const avatarToneClasses = ["green", "orange", "purple", "blue", "cyan"];

    useEffect(() => {
        if (openHouseMenuId === null) return undefined;

        function handleOutsideClick(event) {
            if (event.target.closest(".dashboard-house-menu") || event.target.closest(".dashboard-house-menu-button")) return;
            setOpenHouseMenuId(null);
        }

        document.addEventListener("mousedown", handleOutsideClick);
        return () => document.removeEventListener("mousedown", handleOutsideClick);
    }, [openHouseMenuId]);

    function handleHouseDragStart(event) {
        if (event.target.closest(".dashboard-house-menu") || event.target.closest(".dashboard-house-menu-button")) return;
        if (event.target.closest(".dashboard-house-card")) return;
        if (event.pointerType === "mouse" && event.button !== 0) return;

        const scrollElement = houseScrollRef.current;
        if (!scrollElement) return;

        houseDragRef.current = {
            hasDragged: false,
            isPointerDown: true,
            pointerId: event.pointerId,
            scrollLeft: scrollElement.scrollLeft,
            startX: event.clientX,
        };

        scrollElement.setPointerCapture?.(event.pointerId);
    }

    function handleHouseDragMove(event) {
        const dragState = houseDragRef.current;
        const scrollElement = houseScrollRef.current;
        if (!dragState.isPointerDown || !scrollElement) return;

        const distanceX = event.clientX - dragState.startX;
        if (Math.abs(distanceX) > 4) {
            dragState.hasDragged = true;
            setIsHouseDragActive(true);
            scrollElement.scrollLeft = dragState.scrollLeft - distanceX;
            event.preventDefault();
        }
    }

    function handleHouseDragEnd(event) {
        const dragState = houseDragRef.current;
        const scrollElement = houseScrollRef.current;
        if (!dragState.isPointerDown) return;

        if (dragState.hasDragged) {
            suppressHouseClickRef.current = true;
            window.setTimeout(() => {
                suppressHouseClickRef.current = false;
            }, 0);
        }

        scrollElement?.releasePointerCapture?.(dragState.pointerId ?? event.pointerId);
        houseDragRef.current = {
            hasDragged: false,
            isPointerDown: false,
            pointerId: null,
            scrollLeft: 0,
            startX: 0,
        };
        setIsHouseDragActive(false);
    }

    function handleHouseCardClick(event, houseId) {
        if (suppressHouseClickRef.current) {
            event.preventDefault();
            event.stopPropagation();
            return;
        }

        onSelectHouse(houseId);
    }

    return (
        <div className="dashboard-house-row-fixed">
            <button
                type="button"
                className={`dashboard-house-card dashboard-house-card-all-fixed ${selectedHouseScope === "all" ? "selected" : ""}`}
                onClick={() => onSelectHouse("all")}
            >
                <span className="dashboard-house-avatar all" aria-hidden="true"><KpiIcon type="grid" /></span>
                <span className="dashboard-house-card-copy">
                    <strong>Todas</strong>
                    <small>{totalTicketsCount} {totalTicketsCount === 1 ? "bilhete" : "bilhetes"}</small>
                </span>
            </button>
            <section
                className={`dashboard-house-scroll-fixed ${isHouseDragActive ? "is-dragging" : ""}`}
                aria-label="Casas de aposta cadastradas"
                ref={houseScrollRef}
                onPointerCancel={handleHouseDragEnd}
                onPointerDown={handleHouseDragStart}
                onPointerLeave={handleHouseDragEnd}
                onPointerMove={handleHouseDragMove}
                onPointerUp={handleHouseDragEnd}
            >
                {houseCards.map((house, index) => {
                    const houseId = house?.id ?? `house-${index}`;
                    const houseName = house?.nome || "Casa";
                    const ticketsCount = Number(house?.quantidadeApostas || house?.totalTickets || house?.tickets || 0);
                    const selected = Number(selectedHouseScope) === Number(houseId);
                    return (
                        <article
                            className={`dashboard-house-card ${selected ? "selected" : ""}`}
                            key={houseId}
                            onClick={(event) => handleHouseCardClick(event, houseId)}
                        >
                            <button
                                type="button"
                                className="dashboard-house-card-main"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    handleHouseCardClick(event, houseId);
                                }}
                            >
                                <span className={`dashboard-house-avatar ${avatarToneClasses[index % avatarToneClasses.length]}`} aria-hidden="true">
                                    {house.logoDataUrl ? (
                                        <img src={house.logoDataUrl} alt="" />
                                    ) : (
                                        String(houseName).trim().charAt(0).toUpperCase() || "C"
                                    )}
                                </span>
                                <span className="dashboard-house-card-copy">
                                    <strong>{houseName}</strong>
                                    <small>{ticketsCount} {ticketsCount === 1 ? "bilhete" : "bilhetes"}</small>
                                </span>
                            </button>
                            <button
                                type="button"
                                className="dashboard-house-menu-button"
                                aria-label={`Acoes para ${houseName}`}
                                aria-expanded={openHouseMenuId === houseId}
                                onClick={(event) => {
                                    event.stopPropagation();
                                    if (openHouseMenuId === houseId) {
                                        setOpenHouseMenuId(null);
                                        setHouseMenuPosition(null);
                                        return;
                                    }
                                    const buttonRect = event.currentTarget.getBoundingClientRect();
                                    setHouseMenuPosition({
                                        left: Math.max(8, buttonRect.right - 94),
                                        top: buttonRect.bottom + 6,
                                    });
                                    setOpenHouseMenuId(houseId);
                                }}
                            >
                                &#8942;
                            </button>
                            {openHouseMenuId === houseId && houseMenuPosition && createPortal(
                                <div
                                    className="dashboard-house-menu dashboard-house-menu-portal"
                                    style={{ left: houseMenuPosition.left, top: houseMenuPosition.top }}
                                    onClick={(event) => event.stopPropagation()}
                                >
                                    <button type="button" onClick={() => { setOpenHouseMenuId(null); setHouseMenuPosition(null); onEditHouse(houseId); }}>Editar</button>
                                    <button type="button" className="danger" onClick={() => { setOpenHouseMenuId(null); setHouseMenuPosition(null); onRequestDeleteHouse(house); }}>Excluir</button>
                                </div>,
                                document.body,
                            )}
                        </article>
                    );
                })}
                {houseCards.length === 0 && !isLoading && canShowEmptyState && (
                    <article className="dashboard-house-empty">
                        <strong>Nenhuma casa cadastrada</strong>
                        <span>Adicione sua primeira casa para iniciar o dashboard.</span>
                    </article>
                )}
            </section>
            <button type="button" className="dashboard-house-card dashboard-house-card-add dashboard-house-card-add-fixed" onClick={onStartCreateHouse}>
                <span className="dashboard-house-avatar add" aria-hidden="true"><KpiIcon type="plus" /></span>
                <span className="dashboard-house-card-copy">
                    <strong>Nova casa</strong>
                </span>
            </button>
        </div>
    );
}

function SummaryCards({ metrics, renderValue }) {
    const metricsSafe = Array.isArray(metrics) ? metrics : [];
    const renderValueSafe = typeof renderValue === "function" ? renderValue : (value, formatter) => formatter ? formatter(value || 0) : String(value || 0);
    const iconClassMap = {
        BA: "bank-current",
        BF: "bank-current",
        BI: "bank-initial",
        CALC: "calculator",
        CASH: "cash",
        CHECK: "checklist",
        CLOSE: "close",
        EV: "trend",
        GAUGE: "gauge",
        HOUR: "hourglass",
        LIFE: "lifebuoy",
        ROI: "percent",
        RS: "trend",
        TARGET: "target",
        TROPHY: "trophy",
        VA: "wallet",
    };

    return (
        <section className="dashboard-kpi-grid">
            {metricsSafe.map((item, index) => (
                <article className={`dashboard-kpi-card ${item?.tone || "neutral"} ${item?.className || ""}`} key={item?.title || index}>
                    <span className="dashboard-kpi-icon" aria-hidden="true">
                        <KpiIcon type={iconClassMap[item?.icon] || "bank"} />
                    </span>
                    <div className="dashboard-kpi-copy">
                        <small>{item?.title || "Indicador"}</small>
                        <strong>{renderValueSafe(item?.value || 0, item?.formatter)}</strong>
                        {item?.description && <em>{item.description}</em>}
                    </div>
                    <span className="dashboard-kpi-sparkline" aria-hidden="true" />
                </article>
            ))}
        </section>
    );
}

function BankrollEvolutionChart({ analyticsPeriodType, bankHistoryData, chartMode, sectionRef, setChartMode = () => { } }) {
    const bankHistorySafe = Array.isArray(bankHistoryData) ? bankHistoryData : [];
    const chartScrollRef = useRef(null);
    const chartDragRef = useRef({
        isDragging: false,
        pointerId: null,
        startX: 0,
        startScrollLeft: 0,
    });
    const knownBankPoints = bankHistorySafe.filter((item) => item?.bancaLinha !== null && item?.bancaLinha !== undefined);
    const firstBankPoint = knownBankPoints[0];
    const lastBankPoint = knownBankPoints[knownBankPoints.length - 1];
    const bankDelta =
        firstBankPoint && lastBankPoint
            ? Number(lastBankPoint.banca || 0) - Number(firstBankPoint.banca || 0)
            : 0;
    const bankTone = bankDelta >= 0 ? "positive" : "negative";
    const bankChartColor = bankTone === "positive" ? "#09b96d" : "#ff1732";
    const bankChartFillId = bankTone === "positive" ? "cbBankrollAreaFillPositive" : "cbBankrollAreaFillNegative";
    const bankChartLabelByDate = new Map(bankHistorySafe.map((point) => [point.data, point.label]));
    const bankChartTicks = bankHistorySafe.map((point) => point.data);
    const shouldScrollBankDates = bankHistorySafe.length > 7;
    const chartCanvasWidth = shouldScrollBankDates
        ? `${(bankHistorySafe.length / 7) * 100}%`
        : "100%";
    const bankXAxisInterval = 0;

    useEffect(() => {
        const scrollElement = chartScrollRef.current;
        if (!scrollElement || !shouldScrollBankDates) return;

        window.requestAnimationFrame(() => {
            scrollElement.scrollLeft = shouldScrollBankDates ? scrollElement.scrollWidth : 0;
        });
    }, [shouldScrollBankDates, bankHistorySafe.length, analyticsPeriodType, chartMode]);

    function handleChartPointerDown(event) {
        if (!shouldScrollBankDates || event.button !== 0) return;

        const scrollElement = chartScrollRef.current;
        if (!scrollElement) return;

        chartDragRef.current = {
            isDragging: true,
            pointerId: event.pointerId,
            startX: event.clientX,
            startScrollLeft: scrollElement.scrollLeft,
        };
        scrollElement.classList.add("is-dragging");
        scrollElement.setPointerCapture?.(event.pointerId);
    }

    function handleChartPointerMove(event) {
        const dragState = chartDragRef.current;
        const scrollElement = chartScrollRef.current;
        if (!dragState.isDragging || !scrollElement) return;

        event.preventDefault();
        scrollElement.scrollLeft = dragState.startScrollLeft - (event.clientX - dragState.startX);
    }

    function finishChartDrag() {
        const scrollElement = chartScrollRef.current;
        if (!chartDragRef.current.isDragging) return;

        scrollElement?.classList.remove("is-dragging");
        if (scrollElement && chartDragRef.current.pointerId !== null) {
            scrollElement.releasePointerCapture?.(chartDragRef.current.pointerId);
        }
        chartDragRef.current.isDragging = false;
        chartDragRef.current.pointerId = null;
    }

    const bankValues = knownBankPoints.map((item) => Number(item.bancaLinha ?? item.banca ?? 0));
    const bankValueMin = bankValues.length ? Math.min(...bankValues) : 0;
    const bankValueMax = bankValues.length ? Math.max(...bankValues) : 0;
    const isFlatBankSeries = bankValues.length > 0 && bankValueMin === bankValueMax;
    const flatSeriesPadding = bankValueMax === 0
        ? 10
        : Math.max(5, Math.abs(bankValueMax) * 0.1);
    const bankYAxisDomain = isFlatBankSeries
        ? [bankValueMin - flatSeriesPadding, bankValueMax + flatSeriesPadding]
        : [
            (dataMin) => {
                const numericMin = Number(dataMin || 0);
                if (numericMin >= 0) return 0;
                return Math.floor(numericMin * 1.12);
            },
            (dataMax) => {
                const numericMax = Number(dataMax || 0);
                if (numericMax === 0) return 1;
                return Math.ceil(numericMax * 1.16);
            },
        ];

    const renderChartYAxisTick = ({ x, y, payload }) => {
        const value = Number(payload?.value || 0);
        return (
            <text x={x} y={y} className="cb-chart-axis-value" textAnchor="end" dy="0.35em">
                {`R$ ${value.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`}
            </text>
        );
    };
    const renderBankXAxisTick = ({ x, y, payload }) => {
        const label = getCompactResultLabel(payload?.value, analyticsPeriodType) || bankChartLabelByDate.get(payload?.value) || "";
        return (
            <text x={x} y={y + 16} className="cb-chart-axis-label" textAnchor="middle">
                {label}
            </text>
        );
    };

    return (
        <article className="cb-panel cb-bankroll-panel" ref={sectionRef}>
            <header className="cb-panel-header">
                <div>
                    <h2>Evolução da banca</h2>
                    <p>Evolução acumulada da banca no período</p>
                </div>
                <button
                    className="cb-chart-mode-button"
                    type="button"
                    onClick={() => setChartMode(chartMode === "Banca" ? "Desempenho" : "Banca")}
                    title="Clique para alternar entre banca e desempenho"
                    aria-label={`Modo atual: ${chartMode}. Clique para alternar.`}
                >
                    {chartMode === "Banca" ? "Banca" : "Desempenho"} <i aria-hidden="true" />
                </button>
            </header>
            <div
                className={`cb-area-chart ${shouldScrollBankDates ? "scrollable-dates" : ""}`}
                ref={chartScrollRef}
                onPointerDown={handleChartPointerDown}
                onPointerMove={handleChartPointerMove}
                onPointerUp={finishChartDrag}
                onPointerCancel={finishChartDrag}
                onPointerLeave={finishChartDrag}
            >
                {knownBankPoints.length === 0 ? (
                    <div className="cb-chart-empty">
                        Selecione uma casa para visualizar a evolução da banca.
                    </div>
                ) : (
                    <div
                        className="cb-area-chart-canvas"
                        style={{ "--bank-chart-width": chartCanvasWidth }}
                    >
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={bankHistorySafe} margin={{ top: 24, right: 16, left: 4, bottom: 8 }}>
                                <defs>
                                    <linearGradient id={bankChartFillId} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={bankChartColor} stopOpacity={0.28} />
                                        <stop offset="56%" stopColor={bankChartColor} stopOpacity={0.1} />
                                        <stop offset="100%" stopColor={bankChartColor} stopOpacity={0.01} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="4 5" stroke="rgba(146, 164, 194, 0.28)" vertical={false} />
                                <XAxis
                                    dataKey="data"
                                    type="category"
                                    ticks={bankChartTicks}
                                    allowDuplicatedCategory={false}
                                    axisLine={false}
                                    tickLine={false}
                                    interval={bankXAxisInterval}
                                    tick={renderBankXAxisTick}
                                />
                                <YAxis axisLine={false} tickLine={false} tickMargin={8} width={62} domain={bankYAxisDomain} tick={renderChartYAxisTick} />
                                <Tooltip
                                    cursor={{ stroke: "rgba(9, 185, 109, 0.18)", strokeDasharray: "3 6", strokeWidth: 1 }}
                                    offset={12}
                                    wrapperStyle={{ pointerEvents: "none" }}
                                    content={({ active, payload }) => {
                                        if (!active || !payload?.length || payload[0].payload?.bancaLinha === null || payload[0].payload?.bancaLinha === undefined) return null;
                                        const isFirstDate = payload[0].payload?.data === bankHistorySafe[0]?.data;
                                        return (
                                            <div className={`chart-tooltip ${isFirstDate ? "is-first-date" : "is-left"}`}>
                                                <strong>{formatMoney(payload[0].payload.bancaLinha)}</strong>
                                            </div>
                                        );
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="bancaLinha"
                                    stroke={bankChartColor}
                                    fill={`url(#${bankChartFillId})`}
                                    strokeWidth={3}
                                    dot={{ r: 3.4, fill: bankChartColor, stroke: "#ffffff", strokeWidth: 1.8 }}
                                    activeDot={{ r: 6.2, fill: bankChartColor, stroke: "#08734d", strokeWidth: 3 }}
                                    connectNulls
                                    style={{ filter: `drop-shadow(0 12px 16px ${bankTone === "positive" ? "rgba(9, 185, 109, 0.2)" : "rgba(255, 23, 50, 0.18)"})` }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>
        </article>
    );
}

function DailyResultsCard({ resultChartData, isResultScrollable, onOpenReports = () => { } }) {
    const maxResultValue = Math.max(1, ...resultChartData.map((item) => Math.abs(Number(item.value || 0))));
    const performanceRows = resultChartData.map((item, index) => {
        const delta = Number(item.value || 0);
        const height = item.hasActivity ? Math.min(88, Math.max(16, (Math.abs(delta) / maxResultValue) * 88)) : 0;
        return { ...item, id: `${item.key || item.label}-${index}`, delta, height };
    });
    const shouldScrollResults = isResultScrollable || performanceRows.length > 5;
    const rows = shouldScrollResults ? performanceRows : performanceRows.slice(0, 5);
    const getTone = (value) => {
        if (Number(value || 0) > 0) return "positive";
        if (Number(value || 0) < 0) return "negative";
        return "neutral";
    };

    return (
        <article className="cb-panel cb-daily-results-card">
            <header className="cb-panel-header">
                <div>
                    <h2>Resultado por dia</h2>
                    <p>Variação por referência da banca</p>
                </div>
            </header>
            <div className={`cb-daily-list ${shouldScrollResults ? "scrollable" : ""}`}>
                {rows.map((row) => (
                    <div className="cb-daily-row" key={row.id}>
                        <span>{row.label}</span>
                        <strong className={getTone(row.delta)}>{formatSignedMoney(row.delta)}</strong>
                        <i className={getTone(row.delta)} aria-hidden="true">{row.delta > 0 ? "↑" : row.delta < 0 ? "↓" : "•"}</i>
                    </div>
                ))}
            </div>
            <button type="button" className="cb-outline-button" onClick={onOpenReports}>Ver todos os resultados</button>
        </article>
    );
}

function MonthlyPerformanceCard({ resultChartData = [] }) {
    const resultRowsSafe = Array.isArray(resultChartData) ? resultChartData : [];
    const activeRows = resultRowsSafe.filter((item) => item?.hasActivity);
    const rows = (activeRows.length ? activeRows : resultRowsSafe).slice(-6);
    const maxValue = Math.max(1, ...rows.map((item) => Math.abs(Number(item?.value || 0))));

    return (
        <article className="cb-panel cb-performance-panel">
            <header className="cb-panel-header">
                <div>
                    <h2>Performance mensal</h2>
                </div>
                <button type="button" className="cb-small-select">Mensal <i aria-hidden="true" /></button>
            </header>
            <div className="cb-performance-chart" aria-label="Performance mensal">
                <span className="cb-performance-zero" aria-hidden="true" />
                {rows.map((item, index) => {
                    const value = Number(item?.value || 0);
                    const height = Math.max(16, Math.round((Math.abs(value) / maxValue) * 118));
                    return (
                        <div className="cb-performance-bar-wrap" key={`${item?.key || item?.label || "performance"}-${index}`}>
                            <span
                                className={`cb-performance-bar ${value >= 0 ? "positive" : "negative"}`}
                                style={{ height: `${height}px` }}
                            />
                            <small>{item?.label || "--"}</small>
                        </div>
                    );
                })}
            </div>
        </article>
    );
}

function HouseDistributionCard({ housesWithCurrentBank = [], allHitRate = 0 }) {
    const housesSafe = Array.isArray(housesWithCurrentBank) ? housesWithCurrentBank : [];
    const sortedHouses = [...housesSafe].sort((a, b) => Number(b?.quantidadeApostas || 0) - Number(a?.quantidadeApostas || 0));
    const topHouses = sortedHouses.slice(0, 3);
    const otherTickets = sortedHouses.slice(3).reduce((sum, house) => sum + Number(house?.quantidadeApostas || 0), 0);
    const totalTickets = Math.max(1, sortedHouses.reduce((sum, house) => sum + Number(house?.quantidadeApostas || 0), 0));
    const legend = [
        ...topHouses.map((house, index) => ({
            label: house?.nome || "Casa",
            value: (Number(house?.quantidadeApostas || 0) / totalTickets) * 100,
            colorClass: `color-${index}`,
        })),
        {
            label: "Outras",
            value: (otherTickets / totalTickets) * 100,
            colorClass: "color-other",
        },
    ];

    return (
        <article className="cb-panel cb-distribution-panel">
            <header className="cb-panel-header">
                <div>
                    <h2>Distribuição por casa de aposta</h2>
                </div>
            </header>
            <div className="cb-donut-layout">
                <div className="cb-donut-chart" aria-hidden="true">
                    <span>{formatPercent(allHitRate)}</span>
                </div>
                <div className="cb-donut-legend">
                    {legend.map((item) => (
                        <div key={item.label}>
                            <span><i className={item.colorClass} aria-hidden="true" />{item.label}</span>
                            <strong>{formatPercent(item.value)}</strong>
                        </div>
                    ))}
                </div>
            </div>
        </article>
    );
}

function MainGrid(props) {
    return (
        <section className="cb-main-grid cb-results-model-grid">
            <BankrollEvolutionChart {...props} />
            <DailyResultsCard
                resultChartData={props.resultChartData}
                isResultScrollable={props.isResultScrollable}
                onOpenReports={props.onOpenReports}
            />
        </section>
    );
}

function QuickActionsPanel({ onOpenNewTicket, onOpenTickets, onOpenMovement, onOpenExtract }) {
    const actions = [
        { label: "Novo bilhete", icon: "ticket", onClick: onOpenNewTicket },
        { label: "Bilhetes do dia", icon: "checklist", onClick: onOpenTickets },
        { label: "Nova movimentação", icon: "sync", onClick: onOpenMovement },
        { label: "Extrato", icon: "wallet", onClick: onOpenExtract },
    ];

    return (
        <section className="cb-panel cb-quick-actions-panel">
            <header className="cb-panel-header">
                <div>
                    <h2>Ações rápidas</h2>
                </div>
            </header>
            <div className="cb-quick-actions-grid">
                {actions.map((action) => (
                    <button type="button" key={action.label} className="cb-quick-action-card" onClick={action.onClick}>
                        <span aria-hidden="true"><KpiIcon type={action.icon} /></span>
                        <strong>{action.label}</strong>
                        <i aria-hidden="true">+</i>
                    </button>
                ))}
            </div>
        </section>
    );
}

function QuickSummaryCard({ quickSummary }) {
    return (
        <article className="cb-panel cb-quick-summary-card">
            <header className="cb-panel-header">
                <div>
                    <h2>Resumo rápido</h2>
                </div>
            </header>
            <div className="cb-reference-summary-grid">
                <div><i className="blue" aria-hidden="true"><KpiIcon type="trophy" /></i><span>Apostas hoje</span><strong>{quickSummary.won + quickSummary.lost + quickSummary.pending}</strong></div>
                <div><i className="orange" aria-hidden="true"><KpiIcon type="target" /></i><span>Taxa de acerto</span><strong>{formatPercent(quickSummary.hitRate)}</strong></div>
                <div><i className="purple" aria-hidden="true"><KpiIcon type="trend" /></i><span>Lucro do dia</span><strong className={quickSummary.dayProfit >= 0 ? "positive" : "negative"}>{formatSignedMoney(quickSummary.dayProfit || 0)}</strong></div>
                <div><i className="green" aria-hidden="true"><KpiIcon type="percent" /></i><span>ROI do dia</span><strong>{formatPercent(quickSummary.roi || 0)}</strong></div>
            </div>
            <div className="cb-quick-summary-grid cb-legacy-summary-grid">
                <div><i className="positive" aria-hidden="true">âœ“</i><span>Bilhetes ganhos</span><strong>{quickSummary.won}</strong><small>{formatPercent(quickSummary.hitRate)}</small></div>
                <div><i className="negative" aria-hidden="true">×</i><span>Bilhetes perdidos</span><strong>{quickSummary.lost}</strong></div>
                <div><i className="neutral" aria-hidden="true">âŒ›</i><span>Pendentes</span><strong>{quickSummary.pending}</strong></div>
                <div><i className="blue" aria-hidden="true">âœ“</i><span>Taxa de acerto</span><strong>{formatPercent(quickSummary.hitRate)}</strong></div>
            </div>
        </article>
    );
}

function FinancialSummaryCard({ resultTone = "neutral", roiTone = "neutral", summaryStats }) {
    return (
        <article className="cb-panel cb-financial-summary-card">
            <header className="cb-panel-header">
                <div>
                    <h2>Resumo financeiro</h2>
                </div>
            </header>
            <div className="cb-reference-financial-list">
                <div><i className="blue" aria-hidden="true"><KpiIcon type="bank" /></i><span>Banca inicial</span><strong>{formatMoney(summaryStats.initialBank || 0)}</strong></div>
                <div><i className="orange" aria-hidden="true"><KpiIcon type="wallet" /></i><span>Valor apostado</span><strong>{formatMoney(summaryStats.investedReal ?? summaryStats.invested)}</strong></div>
                <div><i className="purple" aria-hidden="true"><KpiIcon type="trend" /></i><span>Resultado</span><strong className={resultTone}>{formatSignedMoney(summaryStats.realProfit)}</strong></div>
                <div><i className="green" aria-hidden="true"><KpiIcon type="bank" /></i><span>Banca final</span><strong>{formatMoney(summaryStats.finalBank || 0)}</strong></div>
            </div>
            <div className="cb-financial-list cb-legacy-financial-list">
                <div><span>Total apostado</span><strong>{formatMoney(summaryStats.invested)}</strong></div>
                <div><span>Total de retornos</span><strong>{formatMoney(summaryStats.returned)}</strong></div>
                <div><span>Lucro / Prejuízo</span><strong className={resultTone}>{formatSignedMoney(summaryStats.realProfit)}</strong></div>
                <div><span>ROI</span><strong className={roiTone}>{formatSignedPercent(summaryStats?.roi ?? 0)}</strong></div>
            </div>
        </article>
    );
}

function QuickSummaryCardV2({ quickSummary }) {
    return (
        <article className="cb-panel cb-quick-summary-card">
            <header className="cb-panel-header">
                <div>
                    <h2>Resumo rapido</h2>
                </div>
            </header>
            <div className="cb-quick-summary-grid">
                <div><i className="blue" aria-hidden="true"><KpiIcon type="trophy" /></i><span>Apostas hoje</span><strong>{quickSummary.total}</strong></div>
                <div><i className="orange" aria-hidden="true"><KpiIcon type="target" /></i><span>Taxa de acerto</span><strong>{formatPercent(quickSummary.hitRate)}</strong></div>
                <div><i className="purple" aria-hidden="true"><KpiIcon type="trend" /></i><span>Lucro do dia</span><strong className={quickSummary.dayProfit >= 0 ? "positive" : "negative"}>{formatSignedMoney(quickSummary.dayProfit)}</strong></div>
                <div><i className="green" aria-hidden="true"><KpiIcon type="percent" /></i><span>ROI do dia</span><strong>{formatSignedPercent(quickSummary.roi)}</strong></div>
            </div>
        </article>
    );
}

function FinancialSummaryCardV2({ resultTone = "neutral", summaryStats, topCurrentBank = 0, topInitialBank = 0 }) {
    return (
        <article className="cb-panel cb-financial-summary-card">
            <header className="cb-panel-header">
                <div>
                    <h2>Resumo financeiro</h2>
                </div>
            </header>
            <div className="cb-financial-list">
                <div><i className="blue" aria-hidden="true"><KpiIcon type="bank" /></i><span>Banca inicial</span><strong>{formatMoney(topInitialBank || 0)}</strong></div>
                <div><i className="orange" aria-hidden="true"><KpiIcon type="wallet" /></i><span>Valor apostado</span><strong>{formatMoney(summaryStats.investedReal ?? summaryStats.invested ?? 0)}</strong></div>
                <div><i className="purple" aria-hidden="true"><KpiIcon type="trend" /></i><span>Resultado</span><strong className={resultTone}>{formatSignedMoney(summaryStats.realProfit || 0)}</strong></div>
                <div><i className="green" aria-hidden="true"><KpiIcon type="bank" /></i><span>Banca final</span><strong>{formatMoney(topCurrentBank || 0)}</strong></div>
            </div>
        </article>
    );
}

function BottomGrid({ quickSummary, resultTone, summaryStats, topCurrentBank, topInitialBank }) {
    return (
        <section className="cb-bottom-grid">
            <QuickSummaryCardV2 quickSummary={quickSummary} />
            <FinancialSummaryCardV2 resultTone={resultTone} summaryStats={summaryStats} topCurrentBank={topCurrentBank} topInitialBank={topInitialBank} />
        </section>
    );
}

function LatestTicketsTable({ houses, recentTickets, getTicketResultView, onOpenTickets }) {
    return (
        <article className="cb-panel cb-latest-tickets-card">
            <header className="cb-panel-header">
                <div>
                    <h2>Últimos bilhetes do dia</h2>
                </div>
                <button type="button" className="cb-latest-top-action" onClick={onOpenTickets}>Ver todos</button>
            </header>
            <div className="cb-latest-table cb-legacy-latest-table">
                <div className="cb-latest-head">
                    <span>Horário</span>
                    <span>Casa</span>
                    <span>Categoria</span>
                    <span>Odd</span>
                    <span>Valor</span>
                    <span>Retorno</span>
                    <span>Resultado</span>
                </div>
                {recentTickets.length === 0 ? (
                    <div className="cb-latest-empty">Nenhum bilhete encontrado para este dia.</div>
                ) : recentTickets.map((ticket) => {
                    const house = houses.find((item) => Number(item.id) === Number(ticket.casaId));
                    const resultView = getTicketResultView(ticket);
                    return (
                        <div className="cb-latest-row" key={ticket.id}>
                            <span>--</span>
                            <span>{house?.nome || "Casa"}</span>
                            <span>{ticket.categoria || "-"}</span>
                            <span>{Number(ticket.odd || 0).toFixed(2)}</span>
                            <span>{formatMoney(ticket.stake)}</span>
                            <span>{formatMoney(ticket.retorno)}</span>
                            <strong className={resultView.tone}>{resultView.label}</strong>
                        </div>
                    );
                })}
            </div>
            <button type="button" className="cb-outline-button cb-latest-action" onClick={onOpenTickets}>
                + Ver todos os bilhetes
            </button>
        </article>
    );
}

function LatestTicketsTableV2({ houses, recentTickets, getTicketResultView, onOpenTickets }) {
    return (
        <article className="cb-panel cb-latest-tickets-card">
            <header className="cb-panel-header">
                <div>
                    <h2>Últimos bilhetes do dia</h2>
                </div>
                <button type="button" className="cb-latest-top-action" onClick={onOpenTickets}>Ver todos</button>
            </header>
            <div className="cb-latest-table">
                <div className="cb-latest-head">
                    <span>ID</span>
                    <span>Casa</span>
                    <span>Evento</span>
                    <span>Mercado</span>
                    <span>Odd</span>
                    <span>Valor</span>
                    <span>Resultado</span>
                    <span>Lucro/Prejuízo</span>
                    <span>Horario</span>
                    <span />
                </div>
                {recentTickets.length === 0 ? (
                    <div className="cb-latest-empty">Nenhum bilhete encontrado para este dia.</div>
                ) : recentTickets.map((ticket) => {
                    const house = houses.find((item) => Number(item.id) === Number(ticket.casaId));
                    const resultView = getTicketResultView(ticket);
                    return (
                        <div className="cb-latest-row" key={ticket.id}>
                            <span>#{ticket.id}</span>
                            <span><i aria-hidden="true">{String(house?.nome || "C").charAt(0).toUpperCase()}</i>{house?.nome || "Casa"}</span>
                            <span>{ticket.nomeBilhete || ticket.observacoes || "-"}</span>
                            <span>{ticket.categoria || "-"}</span>
                            <span>{Number(ticket.odd || 0).toFixed(2)}</span>
                            <span>{formatMoney(ticket.stake)}</span>
                            <strong className={resultView.tone}>{resultView.label}</strong>
                            <strong className={resultView.tone}>{formatSignedMoney(resultView.value || 0)}</strong>
                            <span>{formatDateBR(ticket.data).slice(0, 5)}</span>
                            <span className="cb-reference-row-menu" aria-hidden="true">...</span>
                        </div>
                    );
                })}
            </div>
        </article>
    );
}

function ReferencePageHeader({ icon = "grid", title, subtitle }) {
    return (
        <DesignPageHeader
            className="submenu-page-header"
            description={subtitle}
            icon={<SidebarIcon type={icon} />}
            title={title}
        />
    );
}

function ReferenceMetricCard({ icon = "grid", label, value, detail, tone = "neutral" }) {
    return (
        <DesignMetricCard
            className={`submenu-metric-card ${tone}`}
            detail={detail}
            icon={<SidebarIcon type={icon} />}
            label={label}
            tone={tone}
            value={value}
        />
    );
}

function getHouseLogoLabel(name = "") {
    const cleanName = String(name || "CB").replace(/[^a-z0-9]/gi, "").slice(0, 4);
    return cleanName || "CB";
}

function HouseLogoMark({ house }) {
    return (
        <span className="house-logo-mark" aria-hidden="true">
            {house?.logoDataUrl ? (
                <img src={house.logoDataUrl} alt="" />
            ) : (
                getHouseLogoLabel(house?.nome || house?.name)
            )}
        </span>
    );
}

function ReferenceInfoNotice({ title, children }) {
    return (
        <aside className="reference-info-notice">
            <span aria-hidden="true">i</span>
            <div>
                <strong>{title}</strong>
                {children && <p>{children}</p>}
            </div>
        </aside>
    );
}

function ReferenceStatusBadge({ result }) {
    const normalized = String(result || "Pendente");
    const tone =
        normalized === "Green" || normalized === "Ganho"
            ? "green"
            : normalized === "Red" || normalized === "Perda"
                ? "red"
                : normalized === "Cash Out"
                    ? "cashout"
                    : "pending";
    const label =
        normalized === "Green"
            ? "Ganho"
            : normalized === "Red"
                ? "Perdido"
                : normalized === "Cash Out"
                    ? "Cash out"
                    : normalized;

    return <span className={`reference-status-badge ${tone}`}>{label}</span>;
}

function TicketFormPanel({ feedback, houses, isSaving, ticketForm, setTicketForm, onSubmit, editingTicketId }) {
    const origemStake = normalizeStakeOrigin(ticketForm.origemStake);
    const showStakeSplitFields = origemStake === STAKE_ORIGINS.BALANCE_BONUS;
    const stakeValue = parseCurrencyTyping(ticketForm.stake);
    const returnValue = parseCurrencyTyping(ticketForm.retorno);
    const safeStake = Number.isFinite(stakeValue) ? stakeValue : 0;
    const safeReturn = Number.isFinite(returnValue) ? returnValue : 0;
    const expectedResult = safeReturn - safeStake;
    const expectedResultTone = expectedResult > 0 ? "positive" : expectedResult < 0 ? "negative" : "neutral";
    const bankImpact =
        ticketForm.resultado === "Red"
            ? -Math.abs(safeStake)
            : expectedResult;
    const bankImpactTone = bankImpact > 0 ? "positive" : bankImpact < 0 ? "negative" : "neutral";

    return (
        <section className="submenu-page submenu-ticket-form-page">
            <ReferencePageHeader
                icon="ticket"
                title={editingTicketId ? "Editar bilhete" : "Novo bilhete"}
                subtitle="Registre uma aposta para acompanhar seu desempenho."
            />
            {feedback.message && (
                <div className={`reference-operation-feedback ${feedback.type}`} role="status">
                    {feedback.message}
                </div>
            )}
            <form className="reference-form-page" onSubmit={onSubmit}>
                <section className="reference-form-card reference-ticket-main-card">
                    <header className="reference-form-card-header">
                        <span aria-hidden="true"><SidebarIcon type="ticket" /></span>
                        <div>
                            <h2>Informações da aposta</h2>
                            <p>Preencha os dados principais do bilhete.</p>
                        </div>
                    </header>
                    <div className="reference-form-grid">
                        <ReferenceDatePicker value={ticketForm.data} onChange={(date) => setTicketForm((prev) => ({ ...prev, data: date }))} />
                        <label>Casa de aposta<select value={ticketForm.casaId} onChange={(e) => setTicketForm((prev) => ({ ...prev, casaId: e.target.value }))}><option value="">Selecione</option>{houses.map((house) => <option key={house.id} value={house.id}>{house.nome}</option>)}</select></label>
                        <label>Categoria<input value={ticketForm.categoria} onChange={(e) => setTicketForm((prev) => ({ ...prev, categoria: e.target.value }))} placeholder="Ex.: Ambas marcam" /></label>
                        <label>Odd<input value={ticketForm.odd} inputMode="decimal" onChange={(e) => setTicketForm((prev) => ({ ...prev, odd: e.target.value.replace(",", ".") }))} placeholder="1.80" /></label>
                        <label>Valor apostado<input value={ticketForm.stake} inputMode="numeric" onChange={(e) => setTicketForm((prev) => ({ ...prev, stake: formatCurrencyTyping(e.target.value) }))} placeholder="R$ 0,00" /></label>
                        <label>Retorno esperado<input value={ticketForm.retorno} inputMode="numeric" onChange={(e) => setTicketForm((prev) => ({ ...prev, retorno: formatCurrencyTyping(e.target.value) }))} placeholder="R$ 0,00" /></label>
                        <label>Origem<select value={origemStake} onChange={(e) => setTicketForm((prev) => ({ ...prev, origemStake: normalizeStakeOrigin(e.target.value), stakeSaldo: "", stakeDeposito: "", stakeBonus: "" }))}><option value={STAKE_ORIGINS.BALANCE}>{STAKE_ORIGINS.BALANCE}</option><option value={STAKE_ORIGINS.BONUS}>{STAKE_ORIGINS.BONUS}</option><option value={STAKE_ORIGINS.BALANCE_BONUS}>{STAKE_ORIGINS.BALANCE_BONUS}</option></select></label>
                        <label>Resultado<select value={ticketForm.resultado} onChange={(e) => setTicketForm((prev) => ({ ...prev, resultado: e.target.value }))}><option value="Pendente">Pendente</option><option value="Green">Ganho</option><option value="Red">Perda</option><option value="Cash Out">Aposta encerrada</option></select></label>
                        {showStakeSplitFields && (
                            <>
                                <label>Valor do saldo<input value={ticketForm.stakeSaldo} inputMode="numeric" onChange={(e) => setTicketForm((prev) => ({ ...prev, stakeSaldo: formatCurrencyTyping(e.target.value) }))} placeholder="R$ 0,00" /></label>
                                <label>Valor do bônus<input value={ticketForm.stakeBonus} inputMode="numeric" onChange={(e) => setTicketForm((prev) => ({ ...prev, stakeBonus: formatCurrencyTyping(e.target.value) }))} placeholder="R$ 0,00" /></label>
                            </>
                        )}
                        <label className="wide reference-textarea-field">Observações (opcional)<textarea rows="4" value={ticketForm.observacoes} onChange={(e) => setTicketForm((prev) => ({ ...prev, observacoes: e.target.value }))} placeholder="Ex.: jogo válido pelo Brasileirão." /></label>
                        <aside className="reference-ticket-summary-box">
                            <strong>Resumo do bilhete</strong>
                            <div>
                                <span>Valor apostado<b>{formatMoney(safeStake)}</b></span>
                                <em aria-hidden="true">â†’</em>
                                <span>Odd<b>{Number(ticketForm.odd || 0).toFixed(2)}</b></span>
                                <em aria-hidden="true">â†’</em>
                                <span>Retorno esperado<b className="positive">{formatMoney(safeReturn)}</b></span>
                            </div>
                        </aside>
                    </div>
                </section>

                <section className="reference-form-card">
                    <header className="reference-form-card-header">
                        <span aria-hidden="true"><SidebarIcon type="target" /></span>
                        <div>
                            <h2>Informações do jogo</h2>
                            <p>Campos opcionais para organizar melhor seus registros.</p>
                        </div>
                    </header>
                    <div className="reference-form-grid four">
                        <label>Competição (opcional)<input placeholder="Ex.: Premier League" /></label>
                        <label>Jogo (opcional)<input placeholder="Ex.: City x Arsenal" /></label>
                        <label>Data do jogo (opcional)<input type="date" /></label>
                        <label>Horário do jogo (opcional)<input placeholder="Ex.: 16:00" /></label>
                    </div>
                </section>

                <div className="reference-form-actions">
                    <button type="reset" className="submenu-secondary-button">Limpar campos</button>
                    <button type="submit" className="submenu-primary-button" disabled={isSaving}>{isSaving ? "Salvando..." : editingTicketId ? "Salvar bilhete" : "Adicionar bilhete"}</button>
                </div>
            </form>
        </section>
    );
}

function GuidedTicketFormPanel({ feedback, houses, isSaving, ticketForm, setTicketForm, onSubmit, editingTicketId }) {
    const origemStake = normalizeStakeOrigin(ticketForm.origemStake);
    const showStakeSplitFields = origemStake === STAKE_ORIGINS.BALANCE_BONUS;
    const stakeValue = parseCurrencyTyping(ticketForm.stake);
    const returnValue = parseCurrencyTyping(ticketForm.retorno);
    const safeStake = Number.isFinite(stakeValue) ? stakeValue : 0;
    const safeReturn = Number.isFinite(returnValue) ? returnValue : 0;
    const expectedResult = safeReturn - safeStake;
    const expectedResultTone = expectedResult > 0 ? "positive" : expectedResult < 0 ? "negative" : "neutral";
    const bankImpact = ticketForm.resultado === "Red" ? -Math.abs(safeStake) : expectedResult;
    const bankImpactTone = bankImpact > 0 ? "positive" : bankImpact < 0 ? "negative" : "neutral";

    return (
        <section className="submenu-page submenu-ticket-form-page">
            <ReferencePageHeader
                icon="ticket"
                title={editingTicketId ? "Editar bilhete" : "Novo bilhete"}
                subtitle="Registre uma aposta para acompanhar seu desempenho."
            />
            {feedback.message && (
                <div className={`reference-operation-feedback ${feedback.type}`} role="status">
                    {feedback.message}
                </div>
            )}

            <form className="reference-form-page reference-ticket-guided-form" onSubmit={onSubmit}>
                <div className="reference-ticket-flow-layout">
                    <div className="reference-ticket-flow-main">
                        <section className="reference-form-card reference-ticket-section">
                            <header className="reference-form-card-header">
                                <span aria-hidden="true"><SidebarIcon type="ticket" /></span>
                                <div>
                                    <h2>Informações da aposta</h2>
                                    <p>Defina os valores e o status inicial do bilhete.</p>
                                </div>
                            </header>
                            <div className="reference-form-grid reference-ticket-fields-grid">
                                <ReferenceDatePicker value={ticketForm.data} onChange={(date) => setTicketForm((prev) => ({ ...prev, data: date }))} />
                                <label>Casa<select value={ticketForm.casaId} onChange={(event) => setTicketForm((prev) => ({ ...prev, casaId: event.target.value }))}><option value="">Selecione</option>{houses.map((house) => <option key={house.id} value={house.id}>{house.nome}</option>)}</select></label>
                                <label>Categoria/Mercado<input value={ticketForm.categoria} onChange={(event) => setTicketForm((prev) => ({ ...prev, categoria: event.target.value }))} placeholder="Ex.: Ambas marcam" /></label>
                                <label>Odd<input value={ticketForm.odd} inputMode="decimal" onChange={(event) => setTicketForm((prev) => ({ ...prev, odd: event.target.value.replace(",", ".") }))} placeholder="1.80" /></label>
                                <label>Valor apostado<input value={ticketForm.stake} inputMode="numeric" onChange={(event) => setTicketForm((prev) => ({ ...prev, stake: formatCurrencyTyping(event.target.value) }))} placeholder="R$ 0,00" /></label>
                                <label>Retorno esperado<input value={ticketForm.retorno} inputMode="numeric" onChange={(event) => setTicketForm((prev) => ({ ...prev, retorno: formatCurrencyTyping(event.target.value) }))} placeholder="R$ 0,00" /></label>
                                <label>Origem<select value={origemStake} onChange={(event) => setTicketForm((prev) => ({ ...prev, origemStake: normalizeStakeOrigin(event.target.value), stakeSaldo: "", stakeDeposito: "", stakeBonus: "" }))}><option value={STAKE_ORIGINS.BALANCE}>{STAKE_ORIGINS.BALANCE}</option><option value={STAKE_ORIGINS.BONUS}>{STAKE_ORIGINS.BONUS}</option><option value={STAKE_ORIGINS.BALANCE_BONUS}>{STAKE_ORIGINS.BALANCE_BONUS}</option></select></label>
                                <label>Resultado<select value={ticketForm.resultado} onChange={(event) => setTicketForm((prev) => ({ ...prev, resultado: event.target.value }))}><option value="Pendente">Pendente</option><option value="Green">Ganho</option><option value="Red">Perda</option><option value="Cash Out">Aposta encerrada</option></select></label>
                                {showStakeSplitFields && (
                                    <>
                                        <label>Valor do saldo<input value={ticketForm.stakeSaldo} inputMode="numeric" onChange={(event) => setTicketForm((prev) => ({ ...prev, stakeSaldo: formatCurrencyTyping(event.target.value) }))} placeholder="R$ 0,00" /></label>
                                        <label>Valor do bônus<input value={ticketForm.stakeBonus} inputMode="numeric" onChange={(event) => setTicketForm((prev) => ({ ...prev, stakeBonus: formatCurrencyTyping(event.target.value) }))} placeholder="R$ 0,00" /></label>
                                    </>
                                )}
                            </div>
                        </section>

                        <section className="reference-form-card reference-ticket-section">
                            <header className="reference-form-card-header">
                                <span aria-hidden="true"><SidebarIcon type="target" /></span>
                                <div>
                                    <h2>Informações do jogo</h2>
                                    <p>Contexto para identificar a aposta depois.</p>
                                </div>
                            </header>
                            <div className="reference-form-grid reference-ticket-fields-grid">
                                <label>Competição<input placeholder="Ex.: Premier League" /></label>
                                <label>Jogo<input placeholder="Ex.: City x Arsenal" /></label>
                                <label>Data do jogo<input type="date" /></label>
                                <label>Horário<input placeholder="Ex.: 16:00" /></label>
                            </div>
                        </section>

                        <section className="reference-form-card reference-ticket-section">
                            <header className="reference-form-card-header">
                                <span aria-hidden="true"><SidebarIcon type="chart" /></span>
                                <div>
                                    <h2>Observações</h2>
                                    <p>Inclua leitura, estratégia ou qualquer detalhe útil.</p>
                                </div>
                            </header>
                            <label className="reference-textarea-field reference-ticket-notes-field">Observações<textarea rows="5" value={ticketForm.observacoes} onChange={(event) => setTicketForm((prev) => ({ ...prev, observacoes: event.target.value }))} placeholder="Ex.: jogo válido pelo Brasileirão." /></label>
                        </section>
                    </div>

                    <aside className="reference-ticket-summary-box reference-ticket-sticky-summary">
                        <span className="reference-ticket-summary-kicker">Resumo do bilhete</span>
                        <strong>Confira antes de adicionar</strong>
                        <div className="reference-ticket-summary-flow">
                            <span>Valor apostado<b>{formatMoney(safeStake)}</b></span>
                            <em aria-hidden="true">â†’</em>
                            <span>Odd<b>{Number(ticketForm.odd || 0).toFixed(2)}</b></span>
                            <em aria-hidden="true">â†’</em>
                            <span>Retorno esperado<b>{formatMoney(safeReturn)}</b></span>
                        </div>
                        <dl className="reference-ticket-summary-results">
                            <div>
                                <dt>Resultado esperado</dt>
                                <dd className={expectedResultTone}>{formatSignedMoney(expectedResult)}</dd>
                            </div>
                            <div>
                                <dt>Impacto na banca</dt>
                                <dd className={bankImpactTone}>{formatSignedMoney(bankImpact)}</dd>
                            </div>
                        </dl>
                    </aside>
                </div>

                <div className="reference-form-actions reference-ticket-form-actions">
                    <button type="button" className="submenu-secondary-button" onClick={() => setTicketForm(initialTicketForm)}>Limpar campos</button>
                    <button type="submit" className="submenu-primary-button" disabled={isSaving}>{isSaving ? "Salvando..." : editingTicketId ? "Salvar bilhete" : "Adicionar bilhete"}</button>
                </div>
            </form>
        </section>
    );
}

function TicketsTablePanel({ deletingTicketId, feedback, tickets, houses, onEdit, onDelete, onNewTicket = () => { } }) {
    const ticketsSafe = Array.isArray(tickets) ? tickets : [];
    const housesSafe = Array.isArray(houses) ? houses : [];
    const [ticketCategoryFilter, setTicketCategoryFilter] = useState("all");
    const [ticketResultFilter, setTicketResultFilter] = useState("all");
    const [ticketPeriodType, setTicketPeriodType] = useState("Diário");
    const [ticketReference, setTicketReference] = useState(hojeISO());
    const ticketTypeFilter =
        ticketResultFilter === "Green"
            ? "Ganho"
            : ticketResultFilter === "Red"
                ? "Perda"
                : ticketResultFilter === "Cash Out"
                    ? "Aposta encerrada"
                    : "all";
    const ticketPeriodReference = ticketReference;
    const setTicketPeriodReference = setTicketReference;
    const [ticketHouseFilter, setTicketHouseFilter] = useState("all");
    const [openTicketMenuId, setOpenTicketMenuId] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(8);
    const ticketCategoryOptions = useMemo(() => {
        return [...new Set(ticketsSafe.map((ticket) => String(ticket?.categoria || "").trim()).filter(Boolean))]
            .sort((a, b) => a.localeCompare(b));
    }, [ticketsSafe]);
    const ticketReferences = useMemo(
        () => getAvailablePeriodReferencesForDates(ticketPeriodType, ticketsSafe.map((ticket) => ticket.data)),
        [ticketPeriodType, ticketsSafe]
    );
    const effectiveTicketPeriodReference =
        ticketPeriodType === "Geral"
            ? ""
            : ticketReferences.includes(ticketPeriodReference)
                ? ticketPeriodReference
                : ticketReferences[0] || "";
    const ticketInterval = useMemo(
        () => getPeriodInterval(ticketPeriodType, effectiveTicketPeriodReference),
        [ticketPeriodType, effectiveTicketPeriodReference]
    );
    const filteredTickets = ticketsSafe.filter((ticket) => {
        const matchesCategory = ticketCategoryFilter === "all" || ticket.categoria === ticketCategoryFilter;
        const matchesType =
            ticketTypeFilter === "all" ||
            (ticketTypeFilter === "Ganho" && ticket.resultado === "Green") ||
            (ticketTypeFilter === "Perda" && ticket.resultado === "Red") ||
            (ticketTypeFilter === "Aposta encerrada" && ticket.resultado === "Cash Out");
        const matchesPeriod = !ticketReference || ticket.data === ticketReference;
        const matchesHouse = ticketHouseFilter === "all" || Number(ticket.casaId) === Number(ticketHouseFilter);
        const matchesPending = ticketResultFilter !== "Pendente" || ticket.resultado === "Pendente";
        return matchesType && matchesPeriod && matchesHouse && matchesCategory && matchesPending;
    });
    const totalPages = Math.max(1, Math.ceil(filteredTickets.length / pageSize));
    const visibleTickets = filteredTickets.slice((currentPage - 1) * pageSize, currentPage * pageSize);
    const firstVisibleItem = filteredTickets.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const lastVisibleItem = Math.min(filteredTickets.length, currentPage * pageSize);

    useEffect(() => {
        setCurrentPage(1);
    }, [ticketCategoryFilter, ticketHouseFilter, ticketReference, ticketResultFilter, pageSize]);

    useEffect(() => {
        setCurrentPage((page) => Math.min(page, totalPages));
    }, [totalPages]);

    useEffect(() => {
        if (openTicketMenuId === null) return undefined;

        function handleOutsideClick(event) {
            if (event.target.closest(".reference-ticket-menu-wrap")) return;
            setOpenTicketMenuId(null);
        }

        document.addEventListener("mousedown", handleOutsideClick);
        return () => document.removeEventListener("mousedown", handleOutsideClick);
    }, [openTicketMenuId]);

    function getTicketResultView(ticket) {
        if (ticket.resultado === "Red") return { label: "Perdido", value: -Math.abs(Number(ticket.stake || 0)), tone: "negative" };
        if (ticket.resultado === "Green") return { label: "Ganho", value: Number(ticket.lucro || 0), tone: "positive" };
        if (ticket.resultado === "Cash Out") {
            const cashOutDelta = Number(ticket.retorno || 0) - Number(ticket.stake || 0);
            return { label: "Cash out", value: cashOutDelta, tone: cashOutDelta > 0 ? "positive" : cashOutDelta < 0 ? "negative" : "neutral" };
        }
        return { label: ticket.resultado || "Pendente", value: Number(ticket.retorno || 0), tone: "neutral" };
    }

    const ticketStats = filteredTickets.reduce((acc, ticket) => {
        const resultView = getTicketResultView(ticket);
        acc.total += 1;
        acc.result += Number(resultView.value || 0);
        if (ticket.resultado === "Green") acc.won += 1;
        if (ticket.resultado === "Red") acc.lost += 1;
        if (ticket.resultado === "Pendente") acc.pending += 1;
        return acc;
    }, { total: 0, won: 0, lost: 0, pending: 0, result: 0 });

    return (
        <section className="submenu-page submenu-tickets-page cb-tickets-day-page">
            <ReferencePageHeader
                icon="ticket"
                title="Bilhetes do dia"
                subtitle="Acompanhe os bilhetes registrados na data selecionada."
            />
            {feedback.message && (
                <div className={`reference-operation-feedback ${feedback.type}`} role="status">
                    {feedback.message}
                </div>
            )}
            <div className="cb-tickets-toolbar" aria-label="Filtros dos bilhetes do dia">
                <label className="cb-ticket-filter-field">
                    <span>Casa</span>
                    <select value={ticketHouseFilter} onChange={(event) => setTicketHouseFilter(event.target.value)}>
                        <option value="all">Todas as casas</option>
                        {housesSafe.map((house) => <option key={house.id} value={house.id}>{house.nome}</option>)}
                    </select>
                </label>
                <label className="cb-ticket-filter-field">
                    <span>Tipo/Categoria</span>
                    <select value={ticketCategoryFilter} onChange={(event) => setTicketCategoryFilter(event.target.value)}>
                        <option value="all">Todas</option>
                        {ticketCategoryOptions.map((category) => (
                            <option key={category} value={category}>{category}</option>
                        ))}
                    </select>
                </label>
                <label className="cb-ticket-filter-field">
                    <span>Resultado</span>
                    <select value={ticketResultFilter} onChange={(event) => setTicketResultFilter(event.target.value)}>
                        <option value="all">Todos</option>
                        <option value="Green">Ganho</option>
                        <option value="Red">Perdido</option>
                        <option value="Pendente">Pendente</option>
                        <option value="Cash Out">Cash out</option>
                    </select>
                </label>
                <ReferenceDatePicker
                    label="Referência"
                    value={ticketReference}
                    onChange={setTicketReference}
                    dayMarkers={buildDayMarkers(ticketsSafe, [])}
                />
                <button type="button" className="cb-ticket-new-button" onClick={onNewTicket}>Novo bilhete</button>
            </div>
            <div className="cb-ticket-metrics-grid">
                <ReferenceMetricCard icon="ticket" label="Total de bilhetes" value={ticketStats.total} />
                <ReferenceMetricCard icon="target" label="Ganhos" value={ticketStats.won} detail={ticketStats.total ? `${((ticketStats.won / ticketStats.total) * 100).toFixed(2)}%` : "0,00%"} tone="positive" />
                <ReferenceMetricCard icon="sync" label="Perdidos" value={ticketStats.lost} detail={ticketStats.total ? `${((ticketStats.lost / ticketStats.total) * 100).toFixed(2)}%` : "0,00%"} tone="negative" />
                <ReferenceMetricCard icon="bank" label="Pendentes" value={ticketStats.pending} detail={ticketStats.total ? `${((ticketStats.pending / ticketStats.total) * 100).toFixed(2)}%` : "0,00%"} tone="warning" />
                <ReferenceMetricCard icon="chart" label="Resultado do dia" value={formatSignedMoney(ticketStats.result)} tone={ticketStats.result > 0 ? "positive" : ticketStats.result < 0 ? "negative" : "neutral"} />
            </div>
            <div className="cb-ticket-table-card">
                <div className="cb-ticket-table-head">
                    <span>Horário</span>
                    <span>Casa</span>
                    <span>Competição/Jogo</span>
                    <span>Mercado</span>
                    <span>Odd</span>
                    <span>Valor</span>
                    <span>Retorno</span>
                    <span>Resultado</span>
                    <span>Ações</span>
                </div>
                {visibleTickets.length === 0 ? (
                    <p className="cb-ticket-empty-row">Nenhum bilhete encontrado.</p>
                ) : visibleTickets.map((ticket) => {
                    const house = housesSafe.find((item) => Number(item.id) === Number(ticket.casaId));
                    return (
                        <div className="cb-ticket-table-row" key={ticket.id}>
                            <span>--</span>
                            <span className="cb-ticket-house-cell"><HouseLogoMark house={house} />{house?.nome || "Casa"}</span>
                            <span>{ticket.nomeBilhete || ticket.observacoes || "-"}</span>
                            <span>{ticket.categoria || "-"}</span>
                            <span>{Number(ticket.odd || 0).toFixed(2)}</span>
                            <span>{formatMoney(ticket.stakeReal ?? ticket.stake ?? 0)}</span>
                            <span>{formatMoney(ticket.retorno)}</span>
                            <ReferenceStatusBadge result={ticket.resultado === "Red" ? "Perda" : ticket.resultado === "Green" ? "Ganho" : ticket.resultado} />
                            <span className="reference-ticket-menu-wrap">
                                <button
                                    type="button"
                                    className="reference-house-menu-button"
                                    aria-label={`Ações do bilhete ${ticket.nomeBilhete || ticket.id}`}
                                    aria-expanded={openTicketMenuId === ticket.id}
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        setOpenTicketMenuId((current) => current === ticket.id ? null : ticket.id);
                                    }}
                                    disabled={deletingTicketId === ticket.id}
                                >
                                    &#8942;
                                </button>
                                {openTicketMenuId === ticket.id && (
                                    <div className="reference-house-menu reference-ticket-menu">
                                        <button type="button" onClick={() => { setOpenTicketMenuId(null); onEdit(ticket.id); }}>Editar</button>
                                        <button type="button" className="danger" onClick={() => { setOpenTicketMenuId(null); onDelete(ticket.id); }}>
                                            {deletingTicketId === ticket.id ? "Excluindo..." : "Excluir"}
                                        </button>
                                    </div>
                                )}
                            </span>
                        </div>
                    );
                })}
                <footer className="cb-ticket-pagination">
                    <span>Mostrando {firstVisibleItem}-{lastVisibleItem} de {filteredTickets.length} bilhetes</span>
                    <div className="cb-ticket-page-controls">
                        <button type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage <= 1}>‹</button>
                        <strong>{currentPage} / {totalPages}</strong>
                        <button type="button" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={currentPage >= totalPages}>›</button>
                    </div>
                    <select className="cb-ticket-page-size" value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
                        <option value="8">8 por página</option>
                        <option value="10">10 por página</option>
                        <option value="15">15 por página</option>
                    </select>
                    <div><button type="button">‹</button><strong>1</strong><button type="button">›</button></div>
                    <select defaultValue="8"><option value="8">8 por página</option><option value="10">10 por página</option></select>
                </footer>
            </div>
        </section>
    );
}

function MovementPanel({ feedback, houses, isSaving, movementForm, setMovementForm, onSubmit, editingMovementId }) {
    const movementValue = parseCurrencyTyping(movementForm.valor);
    const safeMovementValue = Number.isFinite(movementValue) ? movementValue : 0;
    const impact = movementForm.tipo === "Saque" ? -safeMovementValue : safeMovementValue;
    const movementTypes = [
        { type: "Depósito", icon: "bank", title: "Depósito", text: "Entradas que aumentam sua banca.", tone: "positive" },
        { type: "Saque", icon: "sync", title: "Saque", text: "Saídas que diminuem sua banca.", tone: "negative" },
        { type: "Ajuste", icon: "chart", title: "Ajuste", text: "Correções ou ajustes manuais.", tone: "neutral" },
    ];

    return (
        <section className="submenu-page submenu-movement-form-page">
            <ReferencePageHeader
                icon="sync"
                title={editingMovementId ? "Editar movimentação" : "Nova movimentação"}
                subtitle="Registre depósitos, saques ou ajustes na sua banca."
            />
            {feedback.message && (
                <div className={`reference-operation-feedback ${feedback.type}`} role="status">
                    {feedback.message}
                </div>
            )}
            <form className="reference-form-page" onSubmit={onSubmit}>
                <section className="reference-form-card">
                    <header>
                        <h2>1. Tipo de movimentação</h2>
                        <p>Selecione o tipo de movimentação que deseja registrar.</p>
                    </header>
                    <div className="reference-choice-grid">
                        {movementTypes.map((item) => (
                            <button
                                type="button"
                                key={item.type}
                                className={`reference-choice-card ${item.tone} ${movementForm.tipo === item.type ? "active" : ""}`}
                                onClick={() => setMovementForm((prev) => ({ ...prev, tipo: item.type }))}
                            >
                                <span aria-hidden="true"><SidebarIcon type={item.icon} /></span>
                                <strong>{item.title}</strong>
                                <small>{item.text}</small>
                            </button>
                        ))}
                    </div>
                </section>

                <section className="reference-form-card">
                    <header>
                        <h2>2. Informações da movimentação</h2>
                        <p>Preencha os dados da movimentação.</p>
                    </header>
                    <div className="reference-form-grid">
                        <ReferenceDatePicker value={movementForm.data} onChange={(date) => setMovementForm((prev) => ({ ...prev, data: date }))} />
                        <label>Casa de aposta<select value={movementForm.casaId} onChange={(e) => setMovementForm((prev) => ({ ...prev, casaId: e.target.value }))}><option value="">Selecione</option>{houses.map((house) => <option key={house.id} value={house.id}>{house.nome}</option>)}</select></label>
                        <label>Tipo<select value={movementForm.tipo} onChange={(e) => setMovementForm((prev) => ({ ...prev, tipo: e.target.value }))}><option>Depósito</option><option>Saque</option><option>Ajuste</option></select></label>
                        <label>Valor<input value={movementForm.valor} inputMode="numeric" onChange={(e) => setMovementForm((prev) => ({ ...prev, valor: formatCurrencyTyping(e.target.value) }))} placeholder="R$ 0,00" /></label>
                        <label className="wide reference-textarea-field">Descrição (opcional)<textarea rows="3" value={movementForm.observacoes} onChange={(e) => setMovementForm((prev) => ({ ...prev, observacoes: e.target.value }))} placeholder="Ex.: Depósito via PIX" /></label>
                        <label>Método de pagamento (opcional)<select defaultValue="PIX"><option>PIX</option><option>Cartão</option><option>Transferência</option></select></label>
                        <aside className="reference-movement-summary-box">
                            <strong>Resumo da movimentação</strong>
                            <div>
                                <span>Tipo<b className={impact >= 0 ? "positive" : "negative"}>{movementForm.tipo}</b></span>
                                <em aria-hidden="true">â†’</em>
                                <span>Valor<b>{formatMoney(safeMovementValue)}</b></span>
                                <em aria-hidden="true">â†’</em>
                                <span>Impacto no saldo<b className={impact >= 0 ? "positive" : "negative"}>{formatSignedMoney(impact)}</b></span>
                            </div>
                        </aside>
                    </div>
                </section>

                <div className="reference-form-actions">
                    <button type="button" className="submenu-secondary-button">Cancelar</button>
                    <button type="submit" className="submenu-primary-button" disabled={isSaving}>{isSaving ? "Salvando..." : editingMovementId ? "Salvar movimentação" : "Adicionar movimentação"}</button>
                </div>
            </form>
        </section>
    );
}

function StatementPanel({ deletingMovementId, feedback, movements, houses, onEdit, onDelete }) {
    const [movementTypeFilter, setMovementTypeFilter] = useState("all");
    const [movementPeriodType, setMovementPeriodType] = useState("Diário");
    const [movementPeriodReference, setMovementPeriodReference] = useState(hojeISO());
    const [movementHouseFilter, setMovementHouseFilter] = useState("all");
    const [openMovementMenuId, setOpenMovementMenuId] = useState(null);
    const movementReferences = useMemo(
        () => getAvailablePeriodReferencesForDates(movementPeriodType, movements.map((movement) => movement.data)),
        [movementPeriodType, movements]
    );
    const effectiveMovementPeriodReference =
        movementPeriodType === "Geral"
            ? ""
            : movementReferences.includes(movementPeriodReference)
                ? movementPeriodReference
                : movementReferences[0] || "";
    const movementInterval = useMemo(
        () => getPeriodInterval(movementPeriodType, effectiveMovementPeriodReference),
        [movementPeriodType, effectiveMovementPeriodReference]
    );
    const filteredMovements = movements.filter((movement) => {
        const matchesType = movementTypeFilter === "all" || movement.tipo === movementTypeFilter;
        const matchesPeriod =
            movementPeriodType === "Geral" ||
            (!movementInterval.start && !movementInterval.end) ||
            (movement.data >= movementInterval.start && movement.data <= movementInterval.end);
        const matchesHouse = movementHouseFilter === "all" || Number(movement.casaId) === Number(movementHouseFilter);
        return matchesType && matchesPeriod && matchesHouse;
    });

    useEffect(() => {
        if (openMovementMenuId === null) return undefined;

        function handleOutsideClick(event) {
            if (event.target.closest(".reference-ticket-menu-wrap")) return;
            setOpenMovementMenuId(null);
        }

        document.addEventListener("mousedown", handleOutsideClick);
        return () => document.removeEventListener("mousedown", handleOutsideClick);
    }, [openMovementMenuId]);

    const statementTotals = filteredMovements.reduce((acc, movement) => {
        const signedValue = Number(movement.valor || 0) * movementSignal(movement.tipo);
        if (signedValue >= 0) {
            acc.entries += Number(movement.valor || 0);
            acc.entryCount += 1;
        } else {
            acc.exits += Number(movement.valor || 0);
            acc.exitCount += 1;
        }
        acc.balance += signedValue;
        return acc;
    }, { entries: 0, exits: 0, balance: 0, entryCount: 0, exitCount: 0 });

    return (
        <section className="submenu-page submenu-statement-page">
            <ReferencePageHeader
                icon="sync"
                title="Extrato de movimentações"
                subtitle="Confira todas as movimentações da sua banca."
            />
            {feedback.message && (
                <div className={`reference-operation-feedback ${feedback.type}`} role="status">
                    {feedback.message}
                </div>
            )}
            <div className="reference-local-filters reference-filter-bar dashboard-filter-row dashboard-filter-row--full">
                <label className="reference-period">
                    <span>Casa</span>
                    <select value={movementHouseFilter} onChange={(event) => setMovementHouseFilter(event.target.value)}>
                        <option value="all">Todas as casas</option>
                        {houses.map((house) => <option key={house.id} value={house.id}>{house.nome}</option>)}
                    </select>
                </label>
                <label className="reference-period">
                    <span>Tipo</span>
                    <select value={movementTypeFilter} onChange={(event) => setMovementTypeFilter(event.target.value)}>
                        <option value="all">Todos os tipos</option>
                        <option value="Depósito">Depósito</option>
                        <option value="Saque">Saque</option>
                        <option value="Ajuste">Ajuste</option>
                    </select>
                </label>
                <PeriodFields
                    dayMarkers={buildDayMarkers([], movements)}
                    onPeriodReferenceChange={setMovementPeriodReference}
                    onPeriodTypeChange={(nextType) => {
                        setMovementPeriodType(nextType);
                        setMovementPeriodReference(nextType === "Geral" ? "" : getAvailablePeriodReferencesForDates(nextType, movements.map((movement) => movement.data))[0] || "");
                    }}
                    periodReference={effectiveMovementPeriodReference}
                    periodType={movementPeriodType}
                />
            </div>
            <div className="submenu-metric-grid four">
                <ReferenceMetricCard icon="bank" label="Total de entradas" value={formatMoney(statementTotals.entries)} detail={`${statementTotals.entryCount} movimentações`} tone="positive" />
                <ReferenceMetricCard icon="sync" label="Total de saídas" value={formatMoney(statementTotals.exits)} detail={`${statementTotals.exitCount} movimentações`} tone="negative" />
                <ReferenceMetricCard icon="chart" label="Saldo líquido" value={formatSignedMoney(statementTotals.balance)} detail="Resultado do período" tone={statementTotals.balance > 0 ? "positive" : statementTotals.balance < 0 ? "negative" : "neutral"} />
                <ReferenceMetricCard icon="bank" label="Saldo inicial" value={formatMoney(0)} detail={`Em ${formatDateBR(effectiveMovementPeriodReference || hojeISO())}`} />
            </div>
            <div className="reference-data-table reference-movement-table">
                <div className="reference-table-head">
                    <span>Data</span>
                    <span>Tipo</span>
                    <span>Casa</span>
                    <span>Descrição</span>
                    <span>Valor</span>
                    <span>Saldo após</span>
                    <span></span>
                </div>
                {filteredMovements.length === 0 ? (
                    <p className="reference-empty-row">Nenhuma movimentação encontrada.</p>
                ) : filteredMovements.map((movement) => {
                    const house = houses.find((item) => Number(item.id) === Number(movement.casaId));
                    const signedValue = Number(movement.valor || 0) * movementSignal(movement.tipo);
                    return (
                        <div className="reference-table-row" key={movement.id}>
                            <span>{formatDateBR(movement.data)}</span>
                            <ReferenceStatusBadge result={movement.tipo === "Saque" ? "Perda" : movement.tipo === "Ajuste" ? "Cash Out" : "Ganho"} />
                            <span className="reference-house-cell"><HouseLogoMark house={house} />{house?.nome || "Casa"}</span>
                            <span>{movement.observacoes || movement.tipo}</span>
                            <strong className={signedValue >= 0 ? "positive" : "negative"}>{formatSignedMoney(signedValue)}</strong>
                            <span>{formatMoney(statementTotals.balance)}</span>
                            <span className="reference-ticket-menu-wrap">
                                <button
                                    type="button"
                                    className="reference-house-menu-button"
                                    aria-label={`Ações da movimentação ${movement.tipo}`}
                                    aria-expanded={openMovementMenuId === movement.id}
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        setOpenMovementMenuId((current) => current === movement.id ? null : movement.id);
                                    }}
                                    disabled={deletingMovementId === movement.id}
                                >
                                    &#8942;
                                </button>
                                {openMovementMenuId === movement.id && (
                                    <div className="reference-house-menu reference-ticket-menu">
                                        <button type="button" onClick={() => { setOpenMovementMenuId(null); onEdit(movement.id); }}>Editar</button>
                                        <button type="button" className="danger" onClick={() => { setOpenMovementMenuId(null); onDelete(movement.id); }}>
                                            {deletingMovementId === movement.id ? "Excluindo..." : "Excluir"}
                                        </button>
                                    </div>
                                )}
                            </span>
                        </div>
                    );
                })}
                <footer className="reference-table-footer">
                    <span>Mostrando {filteredMovements.length} de {filteredMovements.length} movimentações</span>
                    <div><button type="button">‹</button><strong>1</strong><button type="button">›</button></div>
                    <select defaultValue="10"><option value="10">10 por página</option></select>
                </footer>
            </div>
            <ReferenceInfoNotice title="Entenda seus movimentos">
                Depósitos aumentam o saldo da banca. Saques e ajustes diminuem ou corrigem o saldo conforme necessário.
            </ReferenceInfoNotice>
        </section>
    );
}

function RefinedMovementPanel({ feedback, houses, isSaving, movementForm, setMovementForm, onSubmit, editingMovementId }) {
    const movementValue = parseCurrencyTyping(movementForm.valor);
    const safeMovementValue = Number.isFinite(movementValue) ? movementValue : 0;
    const selectedType = movementForm.tipo || "Depósito";
    const impact = selectedType === "Saque" ? -safeMovementValue : safeMovementValue;
    const impactTone = selectedType === "Saque" ? "negative" : selectedType === "Ajuste" ? "adjustment" : "positive";
    const selectedHouse = houses.find((house) => Number(house.id) === Number(movementForm.casaId));
    const movementTypes = [
        { type: "Depósito", icon: "bank", title: "Depósito", text: "Entrada na banca.", tone: "deposit" },
        { type: "Saque", icon: "sync", title: "Saque", text: "Saída da banca.", tone: "withdraw" },
        { type: "Ajuste", icon: "chart", title: "Ajuste", text: "Correção manual.", tone: "adjustment" },
    ];

    return (
        <section className="submenu-page submenu-movement-form-page refined-movement-page">
            <ReferencePageHeader
                icon="sync"
                title={editingMovementId ? "Editar movimentação" : "Nova movimentação"}
                subtitle="Registre depósitos, saques e ajustes da sua banca."
            />
            {feedback.message && (
                <div className={`reference-operation-feedback ${feedback.type}`} role="status">
                    {feedback.message}
                </div>
            )}
            <form className="reference-form-page refined-movement-form" onSubmit={onSubmit}>
                <section className="reference-form-card refined-movement-type-card">
                    <header>
                        <h2>Tipo de movimentação</h2>
                        <p>Escolha como essa movimentação impacta seu saldo.</p>
                    </header>
                    <div className="reference-choice-grid refined-movement-choice-grid">
                        {movementTypes.map((item) => (
                            <button
                                type="button"
                                key={item.type}
                                className={`reference-choice-card refined-movement-choice ${item.tone} ${selectedType === item.type ? "active" : ""}`}
                                onClick={() => setMovementForm((prev) => ({ ...prev, tipo: item.type }))}
                            >
                                <span aria-hidden="true"><SidebarIcon type={item.icon} /></span>
                                <strong>{item.title}</strong>
                                <small>{item.text}</small>
                            </button>
                        ))}
                    </div>
                </section>

                <div className="refined-movement-layout">
                    <section className="reference-form-card refined-movement-fields-card">
                        <header>
                            <h2>Dados da movimentação</h2>
                            <p>Preencha as informações essenciais do lançamento.</p>
                        </header>
                        <div className="reference-form-grid refined-movement-fields-grid">
                            <ReferenceDatePicker value={movementForm.data} onChange={(date) => setMovementForm((prev) => ({ ...prev, data: date }))} />
                            <label>Casa<select value={movementForm.casaId} onChange={(event) => setMovementForm((prev) => ({ ...prev, casaId: event.target.value }))}><option value="">Selecione</option>{houses.map((house) => <option key={house.id} value={house.id}>{house.nome}</option>)}</select></label>
                            <label>Valor<input value={movementForm.valor} inputMode="numeric" onChange={(event) => setMovementForm((prev) => ({ ...prev, valor: formatCurrencyTyping(event.target.value) }))} placeholder="R$ 0,00" /></label>
                            <label>Método<select value={movementForm.metodo || "PIX"} onChange={(event) => setMovementForm((prev) => ({ ...prev, metodo: event.target.value }))}><option>PIX</option><option>Cartão</option><option>Transferência</option><option>Boleto</option><option>Outro</option></select></label>
                            <label className="wide reference-textarea-field">Descrição<textarea rows="4" value={movementForm.observacoes} onChange={(event) => setMovementForm((prev) => ({ ...prev, observacoes: event.target.value }))} placeholder="Ex.: Depósito via PIX" /></label>
                        </div>
                    </section>

                    <aside className={`reference-movement-summary-box refined-movement-summary ${impactTone}`}>
                        <strong>Resumo do impacto</strong>
                        <dl>
                            <div>
                                <dt>Tipo</dt>
                                <dd><span className={`movement-type-badge ${impactTone}`}>{selectedType === "Depósito" ? "Depósito" : selectedType}</span></dd>
                            </div>
                            <div>
                                <dt>Casa</dt>
                                <dd>{selectedHouse?.nome || "Selecione"}</dd>
                            </div>
                            <div>
                                <dt>Valor</dt>
                                <dd>{formatMoney(safeMovementValue)}</dd>
                            </div>
                            <div>
                                <dt>Impacto no saldo</dt>
                                <dd className={impact >= 0 ? "positive" : "negative"}>{formatSignedMoney(impact)}</dd>
                            </div>
                        </dl>
                    </aside>
                </div>

                <div className="reference-form-actions refined-movement-actions">
                    <button type="button" className="submenu-secondary-button" onClick={() => setMovementForm(initialMovementForm)}>Limpar campos</button>
                    <button type="submit" className="submenu-primary-button" disabled={isSaving}>{isSaving ? "Salvando..." : editingMovementId ? "Salvar movimentação" : "Adicionar movimentação"}</button>
                </div>
            </form>
        </section>
    );
}

function RefinedStatementPanel({ deletingMovementId, feedback, movements, houses, onEdit, onDelete }) {
    const [movementTypeFilter, setMovementTypeFilter] = useState("all");
    const [movementPeriodType, setMovementPeriodType] = useState("Diário");
    const [movementPeriodReference, setMovementPeriodReference] = useState(hojeISO());
    const [movementHouseFilter, setMovementHouseFilter] = useState("all");
    const [openMovementMenuId, setOpenMovementMenuId] = useState(null);
    const movementReferences = useMemo(
        () => getAvailablePeriodReferencesForDates(movementPeriodType, movements.map((movement) => movement.data)),
        [movementPeriodType, movements]
    );
    const effectiveMovementPeriodReference =
        movementPeriodType === "Geral"
            ? ""
            : movementReferences.includes(movementPeriodReference)
                ? movementPeriodReference
                : movementReferences[0] || "";
    const movementInterval = useMemo(
        () => getPeriodInterval(movementPeriodType, effectiveMovementPeriodReference),
        [movementPeriodType, effectiveMovementPeriodReference]
    );
    const movementMatchesHouse = (movement) => movementHouseFilter === "all" || Number(movement.casaId) === Number(movementHouseFilter);
    const filteredMovements = movements.filter((movement) => {
        const matchesType = movementTypeFilter === "all" || movement.tipo === movementTypeFilter;
        const matchesPeriod =
            movementPeriodType === "Geral" ||
            (!movementInterval.start && !movementInterval.end) ||
            (movement.data >= movementInterval.start && movement.data <= movementInterval.end);
        return matchesType && matchesPeriod && movementMatchesHouse(movement);
    });
    const visibleMovements = [...filteredMovements].sort((a, b) => {
        if (a.data !== b.data) return String(b.data || "").localeCompare(String(a.data || ""));
        return Number(b.id || 0) - Number(a.id || 0);
    });
    const scopeHouses = movementHouseFilter === "all"
        ? houses
        : houses.filter((house) => Number(house.id) === Number(movementHouseFilter));
    const statementTotals = filteredMovements.reduce((acc, movement) => {
        const signedValue = Number(movement.valor || 0) * movementSignal(movement.tipo);
        if (signedValue >= 0) {
            acc.entries += Number(movement.valor || 0);
            acc.entryCount += 1;
        } else {
            acc.exits += Number(movement.valor || 0);
            acc.exitCount += 1;
        }
        acc.balance += signedValue;
        return acc;
    }, { entries: 0, exits: 0, balance: 0, entryCount: 0, exitCount: 0 });
    const currentBalance = scopeHouses.reduce((sum, house) => {
        const movementBalance = movements
            .filter((movement) => Number(movement.casaId) === Number(house.id))
            .reduce((acc, movement) => acc + Number(movement.valor || 0) * movementSignal(movement.tipo), 0);
        return sum + Number(house.bancaInicial || 0) + movementBalance;
    }, 0);
    const getBalanceAfterMovement = (movement) => {
        const house = houses.find((item) => Number(item.id) === Number(movement.casaId));
        return Number(house?.bancaInicial || 0) + movements
            .filter((item) => {
                if (Number(item.casaId) !== Number(movement.casaId)) return false;
                if (String(item.data || "") < String(movement.data || "")) return true;
                if (String(item.data || "") > String(movement.data || "")) return false;
                return Number(item.id || 0) <= Number(movement.id || 0);
            })
            .reduce((sum, item) => sum + Number(item.valor || 0) * movementSignal(item.tipo), 0);
    };
    const getMovementTone = (type) => type === "Saque" ? "withdraw" : type === "Ajuste" ? "adjustment" : "deposit";
    const getMovementLabel = (type) => type === "Depósito" ? "Depósito" : type;

    useEffect(() => {
        if (openMovementMenuId === null) return undefined;

        function handleOutsideClick(event) {
            if (event.target.closest(".reference-ticket-menu-wrap")) return;
            setOpenMovementMenuId(null);
        }

        document.addEventListener("mousedown", handleOutsideClick);
        return () => document.removeEventListener("mousedown", handleOutsideClick);
    }, [openMovementMenuId]);

    return (
        <section className="submenu-page submenu-statement-page refined-statement-page">
            <ReferencePageHeader
                icon="sync"
                title="Extrato"
                subtitle="Acompanhe entradas, saídas e ajustes da sua banca."
            />
            {feedback.message && (
                <div className={`reference-operation-feedback ${feedback.type}`} role="status">
                    {feedback.message}
                </div>
            )}
            <div className="reference-local-filters reference-filter-bar refined-statement-toolbar">
                <label className="reference-period">
                    <span>Casa</span>
                    <select value={movementHouseFilter} onChange={(event) => setMovementHouseFilter(event.target.value)}>
                        <option value="all">Todas as casas</option>
                        {houses.map((house) => <option key={house.id} value={house.id}>{house.nome}</option>)}
                    </select>
                </label>
                <label className="reference-period">
                    <span>Tipo</span>
                    <select value={movementTypeFilter} onChange={(event) => setMovementTypeFilter(event.target.value)}>
                        <option value="all">Todos os tipos</option>
                        <option value="Depósito">Depósito</option>
                        <option value="Saque">Saque</option>
                        <option value="Ajuste">Ajuste</option>
                    </select>
                </label>
                <PeriodFields
                    dayMarkers={buildDayMarkers([], movements)}
                    onPeriodReferenceChange={setMovementPeriodReference}
                    onPeriodTypeChange={(nextType) => {
                        setMovementPeriodType(nextType);
                        setMovementPeriodReference(nextType === "Geral" ? "" : getAvailablePeriodReferencesForDates(nextType, movements.map((movement) => movement.data))[0] || "");
                    }}
                    periodReference={effectiveMovementPeriodReference}
                    periodType={movementPeriodType}
                />
            </div>
            <div className="submenu-metric-grid four refined-statement-metrics">
                <ReferenceMetricCard icon="bank" label="Total de entradas" value={formatMoney(statementTotals.entries)} detail={`${statementTotals.entryCount} movimentações`} tone="positive" />
                <ReferenceMetricCard icon="sync" label="Total de saídas" value={formatMoney(statementTotals.exits)} detail={`${statementTotals.exitCount} movimentações`} tone="negative" />
                <ReferenceMetricCard icon="chart" label="Saldo líquido" value={formatSignedMoney(statementTotals.balance)} detail="Resultado filtrado" tone={statementTotals.balance > 0 ? "positive" : statementTotals.balance < 0 ? "negative" : "neutral"} />
                <ReferenceMetricCard icon="bank" label="Saldo atual" value={formatMoney(currentBalance)} detail={movementHouseFilter === "all" ? "Todas as casas" : "Casa selecionada"} />
            </div>
            <div className="reference-data-table reference-movement-table refined-statement-table">
                <div className="reference-table-head">
                    <span>Data/Hora</span>
                    <span>Tipo</span>
                    <span>Casa</span>
                    <span>Descrição</span>
                    <span>Valor</span>
                    <span>Saldo após</span>
                    <span>Ações</span>
                </div>
                {visibleMovements.length === 0 ? (
                    <p className="reference-empty-row">Nenhuma movimentação encontrada.</p>
                ) : visibleMovements.map((movement) => {
                    const house = houses.find((item) => Number(item.id) === Number(movement.casaId));
                    const signedValue = Number(movement.valor || 0) * movementSignal(movement.tipo);
                    const tone = getMovementTone(movement.tipo);
                    return (
                        <div className="reference-table-row" key={movement.id}>
                            <span className="statement-date-cell"><strong>{formatDateBR(movement.data)}</strong><small>Registrado</small></span>
                            <span><i className={`movement-type-badge ${tone}`}>{getMovementLabel(movement.tipo)}</i></span>
                            <span className="reference-house-cell"><HouseLogoMark house={house} />{house?.nome || "Casa"}</span>
                            <span>{movement.observacoes || movement.metodo || getMovementLabel(movement.tipo)}</span>
                            <strong className={signedValue >= 0 ? "positive" : "negative"}>{formatSignedMoney(signedValue)}</strong>
                            <span>{formatMoney(getBalanceAfterMovement(movement))}</span>
                            <span className="reference-ticket-menu-wrap">
                                <button
                                    type="button"
                                    className="reference-house-menu-button"
                                    aria-label={`Ações da movimentação ${getMovementLabel(movement.tipo)}`}
                                    aria-expanded={openMovementMenuId === movement.id}
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        setOpenMovementMenuId((current) => current === movement.id ? null : movement.id);
                                    }}
                                    disabled={deletingMovementId === movement.id}
                                >
                                    &#8942;
                                </button>
                                {openMovementMenuId === movement.id && (
                                    <div className="reference-house-menu reference-ticket-menu">
                                        <button type="button" onClick={() => { setOpenMovementMenuId(null); onEdit(movement.id); }}>Editar</button>
                                        <button type="button" className="danger" onClick={() => { setOpenMovementMenuId(null); onDelete(movement.id); }}>
                                            {deletingMovementId === movement.id ? "Excluindo..." : "Excluir"}
                                        </button>
                                    </div>
                                )}
                            </span>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}

function SettingsPanel({ accountEmail, accountName, accountPhone, accountUsername, onEditProfile }) {
    return (
        <section className="submenu-page submenu-account-page">
            <ReferencePageHeader
                icon="gear"
                title="Minha conta"
                subtitle="Gerencie suas informações pessoais e preferências da conta."
            />
            <section className="reference-account-card reference-account-personal">
                <header>
                    <h2>Dados pessoais</h2>
                    <p>Visualize suas informações pessoais.</p>
                </header>
                <dl>
                    <div><span aria-hidden="true"><SidebarIcon type="gear" /></span><dt>Nome completo</dt><dd>{accountName}</dd></div>
                    <div><span aria-hidden="true"><SidebarIcon type="ticket" /></span><dt>E-mail</dt><dd>{accountEmail}</dd></div>
                    <div><span aria-hidden="true"><SidebarIcon type="grid" /></span><dt>Nome de usuário</dt><dd>{accountUsername || "Não informado"}</dd></div>
                    <div><span aria-hidden="true"><SidebarIcon type="sync" /></span><dt>Telefone</dt><dd>{accountPhone || "Não informado"}</dd></div>
                </dl>
                <button type="button" className="submenu-secondary-button" onClick={onEditProfile}>Editar perfil</button>
                <p>Atualize suas informações pessoais e de contato.</p>
            </section>
            <section className="reference-account-card reference-account-security">
                <header>
                    <h2>Segurança da conta</h2>
                    <p>Gerencie as opções de segurança da sua conta.</p>
                </header>
                <div className="reference-account-action-row">
                    <div>
                        <strong>Senha</strong>
                        <p>Recomendamos alterar sua senha periodicamente.</p>
                    </div>
                    <button type="button" className="submenu-secondary-button danger">Alterar senha</button>
                </div>
                <div className="reference-account-action-row">
                    <div>
                        <strong>Sessões ativas</strong>
                        <p>Veja os dispositivos conectados à sua conta.</p>
                    </div>
                    <button type="button" className="submenu-secondary-button">Ver sessões ativas</button>
                </div>
                <div className="reference-account-action-row">
                    <div>
                        <strong>Desativar conta</strong>
                        <p>Desative sua conta de forma permanente.</p>
                    </div>
                    <button type="button" className="submenu-secondary-button danger">Desativar minha conta</button>
                </div>
            </section>
            <section className="reference-account-card reference-account-system">
                <header>
                    <h2>Sistema</h2>
                    <p>Informações gerais sobre o sistema.</p>
                </header>
                <dl>
                    <div><span aria-hidden="true"><SidebarIcon type="chart" /></span><dt>Versão do sistema</dt><dd>1.2.0</dd></div>
                    <div><span aria-hidden="true"><CalendarIcon /></span><dt>Última atualização</dt><dd>12/06/2026 23:45</dd></div>
                </dl>
            </section>
            <ReferenceInfoNotice title="Seus dados estão seguros">
                Utilizamos criptografia e seguimos as melhores práticas para proteger suas informações.
            </ReferenceInfoNotice>
        </section>
    );
}

function PremiumSettingsPanel({
    accountCreatedAt,
    accountEmail,
    accountId,
    accountLastSignInAt,
    accountName,
    accountPhone,
    accountPlan,
    accountUsername,
    onEditProfile,
    onToggleTheme = () => { },
    session,
    theme = "dark",
}) {
    const displayName = accountName || accountEmail?.split("@")[0] || "Não informado";
    const displayEmail = accountEmail || "Não disponível";
    const activeThemeLabel = theme === "dark" ? "Escuro" : "Claro";
    const sessionProvider = session?.user?.app_metadata?.provider || "E-mail";

    return (
        <section className="submenu-page submenu-account-page premium-account-page">
            <ReferencePageHeader
                icon="gear"
                title="Minha conta"
                subtitle="Gerencie seus dados, segurança e preferências."
            />

            <section className="reference-account-card premium-account-hero">
                <span className="premium-account-avatar" aria-hidden="true">{getAccountInitials(displayName)}</span>
                <div>
                    <strong>{displayName}</strong>
                    <small>{displayEmail}</small>
                </div>
                <button type="button" className="premium-outline-button" onClick={onEditProfile}>Editar perfil</button>
            </section>

            <div className="premium-account-grid">
                <section className="reference-account-card premium-account-card">
                    <header>
                        <span aria-hidden="true"><SidebarIcon type="gear" /></span>
                        <div>
                            <h2>Dados pessoais</h2>
                            <p>Informações vinculadas ao usuário autenticado.</p>
                        </div>
                    </header>
                    <dl>
                        <div><dt>Nome completo</dt><dd>{displayName}</dd></div>
                        <div><dt>E-mail</dt><dd>{displayEmail}</dd></div>
                        <div><dt>Nome de usuário</dt><dd>{accountUsername || "Não informado"}</dd></div>
                        <div><dt>Telefone</dt><dd>{accountPhone || "Não informado"}</dd></div>
                    </dl>
                    <button type="button" className="premium-outline-button" onClick={onEditProfile}>Atualizar dados</button>
                </section>

                <section className="reference-account-card premium-account-card">
                    <header>
                        <span aria-hidden="true"><SidebarIcon type="bank" /></span>
                        <div>
                            <h2>Segurança</h2>
                            <p>Controle o acesso à sua conta.</p>
                        </div>
                    </header>
                    <div className="premium-account-action">
                        <div>
                            <strong>Senha da conta</strong>
                            <p>Use a recuperação de senha para trocar credenciais com segurança.</p>
                        </div>
                        <button type="button" className="premium-outline-button">Alterar senha</button>
                    </div>
                    <div className="premium-account-action danger-zone">
                        <div>
                            <strong>Desativar conta</strong>
                            <p>Remove o acesso à conta e interrompe o uso do painel.</p>
                        </div>
                        <button type="button" className="premium-danger-button">Desativar conta</button>
                    </div>
                </section>

                <section className="reference-account-card premium-account-card">
                    <header>
                        <span aria-hidden="true"><SidebarIcon type="sync" /></span>
                        <div>
                            <h2>Sessões ativas</h2>
                            <p>Sessão autenticada atualmente neste navegador.</p>
                        </div>
                    </header>
                    <dl>
                        <div><dt>Provedor</dt><dd>{sessionProvider}</dd></div>
                        <div><dt>Último login</dt><dd>{formatDateTimeBR(accountLastSignInAt)}</dd></div>
                        <div><dt>Expira em</dt><dd>{formatDateTimeBR(session?.expires_at)}</dd></div>
                    </dl>
                    <button type="button" className="premium-outline-button">Encerrar outras sessões</button>
                </section>

                <section className="reference-account-card premium-account-card">
                    <header>
                        <span aria-hidden="true"><ThemeToggleIcon theme={theme} /></span>
                        <div>
                            <h2>Preferências</h2>
                            <p>Ajustes de experiência do painel.</p>
                        </div>
                    </header>
                    <dl>
                        <div><dt>Tema</dt><dd>{activeThemeLabel}</dd></div>
                        <div><dt>Idioma</dt><dd>Não configurado</dd></div>
                    </dl>
                    <button type="button" className="premium-outline-button" onClick={onToggleTheme}>
                        {theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"}
                    </button>
                </section>

                <section className="reference-account-card premium-account-card premium-account-system-card">
                    <header>
                        <span aria-hidden="true"><SidebarIcon type="chart" /></span>
                        <div>
                            <h2>Sistema</h2>
                            <p>Dados reais carregados da autenticação.</p>
                        </div>
                    </header>
                    <dl>
                        <div><dt>Plano</dt><dd>{accountPlan || "Não informado"}</dd></div>
                        <div><dt>ID da conta</dt><dd>{accountId || "Não disponível"}</dd></div>
                        <div><dt>Conta criada em</dt><dd>{formatDateTimeBR(accountCreatedAt)}</dd></div>
                    </dl>
                </section>
            </div>
        </section>
    );
}

function SystemPanel({ onToggleTheme, theme }) {
    const isDark = theme === "dark";

    return (
        <section className="reference-functional-panel">
            <header><h2>Sistema</h2></header>

            <div className="reference-settings-panel reference-system-panel">
                <h3>Aparência</h3>

                <div className="reference-system-theme-card">
                    <span className="reference-system-theme-icon">
                        <ThemeToggleIcon theme={theme} />
                    </span>
                    <div>
                        <strong>Tema do sistema</strong>
                        <small>{isDark ? "Modo escuro ativo" : "Modo claro ativo"}</small>
                    </div>
                    <button type="button" className="reference-theme-choice" onClick={onToggleTheme}>
                        {isDark ? "Ativar claro" : "Ativar escuro"}
                    </button>
                </div>
            </div>
        </section>
    );
}

function ProfileEditPanel({ accountEmail, accountFirstName, accountLastName, accountMetadata, accountPhone, accountUsername, refreshSession }) {
    const [profileDraft, setProfileDraft] = useState({
        firstName: accountFirstName,
        lastName: accountLastName,
        username: accountUsername,
        email: accountEmail,
        phone: accountPhone,
    });
    const [profileFeedback, setProfileFeedback] = useState({ type: "", message: "" });
    const [isProfileSaving, setIsProfileSaving] = useState(false);

    async function handleSaveProfile(event) {
        event.preventDefault();
        if (isProfileSaving) return;

        const firstName = profileDraft.firstName.trim();
        const lastName = profileDraft.lastName.trim();
        const username = profileDraft.username.trim().toLowerCase();
        const email = profileDraft.email.trim();
        const phoneDigits = getPhoneDigits(profileDraft.phone);
        const usernameChanged = username !== accountUsername;
        const phoneChanged = phoneDigits !== getPhoneDigits(accountPhone);
        const emailChanged = email.toLowerCase() !== accountEmail.toLowerCase();

        if (!firstName) {
            setProfileFeedback({ type: "error", message: "Informe seu nome." });
            return;
        }

        if (!username || username.length < 3 || username.length > 30 || !usernamePattern.test(username)) {
            setProfileFeedback({ type: "error", message: "Use apenas letras, números, ponto, underline ou hífen no usuário." });
            return;
        }

        if (!emailPattern.test(email)) {
            setProfileFeedback({ type: "error", message: "Informe um e-mail válido." });
            return;
        }

        if (phoneDigits && phoneDigits.length !== 10 && phoneDigits.length !== 11) {
            setProfileFeedback({ type: "error", message: "Informe um telefone válido com DDD." });
            return;
        }

        setIsProfileSaving(true);
        setProfileFeedback({ type: "", message: "" });

        if (usernameChanged || phoneChanged) {
            const { data: availabilityData, error: availabilityError } = await supabase
                .rpc("check_profile_availability", {
                    p_username: usernameChanged ? username : "",
                    p_phone: phoneChanged ? phoneDigits : "",
                })
                .maybeSingle();

            if (availabilityError) {
                setIsProfileSaving(false);
                setProfileFeedback({ type: "error", message: "Não foi possível verificar disponibilidade agora." });
                return;
            }

            if (usernameChanged && availabilityData && !availabilityData.username_available) {
                setIsProfileSaving(false);
                setProfileFeedback({ type: "error", message: "Este usuário já está em uso." });
                return;
            }

            if (phoneChanged && availabilityData && !availabilityData.phone_available) {
                setIsProfileSaving(false);
                setProfileFeedback({ type: "error", message: "Este telefone já está em uso." });
                return;
            }
        }

        const updatePayload = {
            data: {
                ...accountMetadata,
                first_name: firstName,
                last_name: lastName,
                full_name: `${firstName} ${lastName}`.trim(),
                username,
                phone: phoneDigits,
            },
        };

        if (emailChanged) {
            updatePayload.email = email;
        }

        const { error } = await supabase.auth.updateUser(updatePayload);

        if (error) {
            setIsProfileSaving(false);
            setProfileFeedback({ type: "error", message: "Não foi possível salvar o perfil agora." });
            return;
        }

        await refreshSession();
        setIsProfileSaving(false);
        setProfileFeedback({
            type: "success",
            message: emailChanged ? "Perfil salvo. Confirme o novo e-mail se o Supabase solicitar." : "Perfil salvo.",
        });
    }

    return (
        <section className="reference-functional-panel">
            <header><h2>Editar perfil</h2></header>
            <form className="reference-panel-form" onSubmit={handleSaveProfile}>
                <label>Nome<input value={profileDraft.firstName} onChange={(event) => setProfileDraft((prev) => ({ ...prev, firstName: event.target.value }))} disabled={isProfileSaving} /></label>
                <label>Sobrenome<input value={profileDraft.lastName} onChange={(event) => setProfileDraft((prev) => ({ ...prev, lastName: event.target.value }))} disabled={isProfileSaving} /></label>
                <label>Nome de usuário<input value={profileDraft.username} onChange={(event) => setProfileDraft((prev) => ({ ...prev, username: event.target.value.toLowerCase() }))} disabled={isProfileSaving} /></label>
                <label>Email<input type="email" value={profileDraft.email} onChange={(event) => setProfileDraft((prev) => ({ ...prev, email: event.target.value }))} disabled={isProfileSaving} /></label>
                <label>Telefone<input type="tel" value={profileDraft.phone} onChange={(event) => setProfileDraft((prev) => ({ ...prev, phone: formatBrazilianPhone(event.target.value) }))} disabled={isProfileSaving} /></label>
                {profileFeedback.message && (
                    <div className={`reference-operation-feedback ${profileFeedback.type}`} role="status">
                        {profileFeedback.message}
                    </div>
                )}
                <button type="submit" disabled={isProfileSaving}>{isProfileSaving ? "Salvando..." : "Salvar perfil"}</button>
            </form>
        </section>
    );
}

function DashboardActionPanels(props) {
    if (props.activeBottomPanel === "ticket") {
        return <GuidedTicketFormPanel feedback={props.ticketFeedback} houses={props.houses} isSaving={props.isSavingTicket} ticketForm={props.ticketForm} setTicketForm={props.setTicketForm} onSubmit={props.handleSaveTicket} editingTicketId={props.editingTicketId} />;
    }
    if (props.activeBottomPanel === "ticketsDay") {
        return <TicketsTablePanel deletingTicketId={props.deletingTicketId} feedback={props.ticketFeedback} tickets={props.ticketsOfDay} houses={props.houses} onEdit={props.handleStartEditTicket} onDelete={props.handleDeleteTicket} onNewTicket={props.onOpenNewTicket} />;
    }
    if (props.activeBottomPanel === "movement") {
        return <RefinedMovementPanel feedback={props.movementFeedback} houses={props.houses} isSaving={props.isSavingMovement} movementForm={props.movementForm} setMovementForm={props.setMovementForm} onSubmit={props.handleSaveMovement} editingMovementId={props.editingMovementId} />;
    }
    if (props.activeBottomPanel === "extract") {
        return <RefinedStatementPanel deletingMovementId={props.deletingMovementId} feedback={props.movementFeedback} movements={props.statementMovements} houses={props.houses} onEdit={props.handleStartEditMovement} onDelete={props.handleDeleteMovement} />;
    }
    if (props.activeBottomPanel === "settings") {
        return <SettingsPanel accountEmail={props.accountEmail} accountName={props.accountName} isLoggingOut={props.isLoggingOut} onLogout={props.handleLogout} session={props.session} />;
    }
    return null;
}

function VisualDashboardHome({
    accountName,
    accountPlan,
    allHitRate,
    analyticsPeriodType,
    bankHistoryData,
    chartMode,
    houses,
    housesWithCurrentBank,
    houseForm,
    houseFeedback,
    isResultScrollable,
    isDashboardLoading = false,
    hasDashboardLoadError = false,
    isSavingHouse,
    editingHouseId,
    onCancelEdit,
    onEditHouse,
    onHouseChange,
    onPeriodReferenceChange,
    onPeriodTypeChange,
    onRequestDeleteHouse,
    onSelectHouse,
    onSubmitHouse,
    onOpenReports = () => { },
    onOpenTickets = () => { },
    onOpenNewTicket = () => { },
    onOpenMovement = () => { },
    onOpenExtract = () => { },
    onLogoutRequest = () => { },
    onToggleTheme = () => { },
    dayMarkers = {},
    periodReference,
    periodType,
    periodTickets,
    renderTopValue,
    resultChartData,
    sectionRef,
    selectedHouseScope,
    setChartMode,
    summaryStats,
    theme = "dark",
    topCurrentBank,
    topInitialBank,
    topMetricPages,
}) {
    const housesSafe = Array.isArray(houses) ? houses : [];
    const housesWithCurrentBankSafe = Array.isArray(housesWithCurrentBank) ? housesWithCurrentBank : [];
    const periodTicketsSafe = Array.isArray(periodTickets) ? periodTickets : [];
    const bankHistoryDataSafe = Array.isArray(bankHistoryData) ? bankHistoryData : [];
    const resultChartDataSafe = Array.isArray(resultChartData) ? resultChartData : [];
    const summaryStatsSafe = summaryStats || {};
    const topMetricPagesSafe = Array.isArray(topMetricPages) ? topMetricPages : [];
    const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
    const topMetrics = topMetricPagesSafe.flatMap((page) => Array.isArray(page) ? page : page ? [page] : []);
    const resultMetric = topMetrics.find((metric) => String(metric?.title || "").includes("Resultado"));
    const roiMetric = topMetrics.find((metric) => String(metric?.title || "").includes("ROI"));
    const selectedHouseLabel =
        selectedHouseScope === "all"
            ? "Todas as casas"
            : selectedHouseScope === null || selectedHouseScope === ""
                ? "Nenhuma casa selecionada"
                : housesSafe.find((house) => Number(house?.id) === Number(selectedHouseScope))?.nome || "Selecione uma casa";
    const quickSummary = useMemo(() => {
        const ticketsList = periodTicketsSafe;
        const pending = ticketsList.filter((ticket) => ticket.resultado === "Pendente").length;
        const resolved = ticketsList.filter((ticket) => ticket.resultado !== "Pendente");
        const won = resolved.filter((ticket) => {
            if (ticket.resultado === "Green") return true;
            if (ticket.resultado === "Cash Out" && Number(ticket.retorno || 0) > Number(ticket.stake || 0)) return true;
            return false;
        }).length;
        const lost = resolved.length - won;

        return {
            total: ticketsList.length,
            won,
            lost,
            pending,
            hitRate: resolved.length > 0 ? (won / resolved.length) * 100 : 0,
            dayProfit: Number(summaryStatsSafe.realProfit || 0),
            roi: Number(summaryStatsSafe.roi || 0),
        };
    }, [periodTicketsSafe, summaryStatsSafe.realProfit, summaryStatsSafe.roi]);
    const recentTickets = useMemo(() => {
        return [...periodTicketsSafe]
            .sort((a, b) => String(b?.data || "").localeCompare(String(a?.data || "")) || Number(b?.id || 0) - Number(a?.id || 0))
            .slice(0, 3);
    }, [periodTicketsSafe]);
    const hasHouseSelection = selectedHouseScope !== null && selectedHouseScope !== "";
    const renderMaskedValue = () => "--";
    const [isCreatingHouse, setIsCreatingHouse] = useState(false);
    const knownBankPoints = bankHistoryDataSafe.filter((item) => item?.bancaLinha !== null && item?.bancaLinha !== undefined);
    const firstBankPoint = knownBankPoints[0];
    const lastBankPoint = knownBankPoints[knownBankPoints.length - 1];
    const periodVariationValue =
        topCurrentBank !== null && topInitialBank !== null
            ? Number(topCurrentBank || 0) - Number(topInitialBank || 0)
            : Number(summaryStatsSafe.realProfit || 0) + Number(summaryStatsSafe.movementBalance || 0);
    const periodVariationPercent =
        topInitialBank && topInitialBank !== 0
            ? (periodVariationValue / Number(topInitialBank || 0)) * 100
            : 0;
    const dashboardTone = periodVariationValue >= 0 ? "positive" : "negative";
    const sparklinePoints = useMemo(() => {
        const points = knownBankPoints.slice(-10);
        if (points.length < 2) return "";

        const values = points.map((item) => Number(item.bancaLinha ?? item.banca ?? 0));
        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = max - min || 1;

        return values
            .map((value, index) => {
                const x = points.length === 1 ? 0 : (index / (points.length - 1)) * 100;
                const y = 42 - ((value - min) / range) * 34;
                return `${x.toFixed(2)},${y.toFixed(2)}`;
            })
            .join(" ");
    }, [knownBankPoints]);
    const secondaryMetrics = [
        {
            title: "Lucro líquido",
            value: hasHouseSelection ? formatSignedMoney(summaryStatsSafe.realProfit) : renderMaskedValue(),
            detailValue: hasHouseSelection ? formatSignedPercent(periodVariationPercent) : "",
            detailText: hasHouseSelection ? "vs. período anterior" : "",
            tone: Number(summaryStatsSafe.realProfit || 0) > 0 ? "positive" : Number(summaryStatsSafe.realProfit || 0) < 0 ? "negative" : "neutral",
            accent: "green",
            icon: "trend",
        },
        {
            title: "ROI",
            value: hasHouseSelection ? formatSignedPercent(summaryStatsSafe.roi) : renderMaskedValue(),
            detailValue: hasHouseSelection ? `${formatSignedPercent(summaryStatsSafe.roi)} p.p.` : "",
            detailText: hasHouseSelection ? "vs. período anterior" : "Sem período",
            tone: Number(summaryStatsSafe.roi || 0) > 0 ? "positive" : Number(summaryStatsSafe.roi || 0) < 0 ? "negative" : "neutral",
            accent: "purple",
            icon: "percent",
        },
        {
            title: "Taxa de acerto",
            value: hasHouseSelection ? formatPercent(quickSummary.hitRate) : renderMaskedValue(),
            detailValue: hasHouseSelection ? `${quickSummary.won + quickSummary.lost} apostas` : "",
            detailText: hasHouseSelection ? "" : "Sem apostas",
            tone: "neutral",
            accent: "blue",
            icon: "target",
        },
        {
            title: "Total apostado",
            value: hasHouseSelection ? formatMoney(summaryStatsSafe.investedReal ?? summaryStatsSafe.invested ?? 0) : renderMaskedValue(),
            detailValue: hasHouseSelection ? `${quickSummary.total} apostas` : "",
            detailText: hasHouseSelection ? "" : "Sem registros",
            tone: "neutral",
            accent: "orange",
            icon: "trophy",
        },
    ];
    useEffect(() => {
        if (editingHouseId) {
            setIsCreatingHouse(true);
        }
    }, [editingHouseId]);

    useEffect(() => {
        if (isCreatingHouse && houseFeedback?.type === "success") {
            setIsCreatingHouse(false);
        }
    }, [houseFeedback?.type, isCreatingHouse]);

    function handleStartCreateHouse() {
        onHouseChange(initialHouseForm);
        setIsCreatingHouse(true);
    }

    function handleCancelHouseEdit() {
        setIsCreatingHouse(false);
        onCancelEdit();
    }

    function handleHouseLogoUpload(event) {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;

        if (!HOUSE_LOGO_ALLOWED_TYPES.includes(file.type)) {
            onHouseChange((prev) => ({
                ...prev,
                logoError: "Envie uma imagem PNG, JPG ou SVG.",
            }));
            return;
        }

        if (file.size > HOUSE_LOGO_MAX_BYTES) {
            onHouseChange((prev) => ({
                ...prev,
                logoError: "A imagem deve ter no máximo 2MB.",
            }));
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            onHouseChange((prev) => ({
                ...prev,
                logoDataUrl: String(reader.result || ""),
                logoName: file.name,
                logoError: "",
            }));
        };
        reader.onerror = () => {
            onHouseChange((prev) => ({
                ...prev,
                logoError: "Não foi possível carregar a imagem.",
            }));
        };
        reader.readAsDataURL(file);
    }

    function handleRemoveHouseLogo() {
        onHouseChange((prev) => ({
            ...prev,
            logoDataUrl: "",
            logoName: "",
            logoError: "",
        }));
    }

    function getTicketResultView(ticket) {
        if (ticket.resultado === "Red") {
            return { label: "Perdido", value: -Math.abs(Number(ticket.stake || 0)), tone: "negative" };
        }

        if (ticket.resultado === "Green") {
            return { label: "Ganho", value: Number(ticket.lucro || 0), tone: "positive" };
        }

        if (ticket.resultado === "Cash Out") {
            const cashOutDelta = Number(ticket.retorno || 0) - Number(ticket.stake || 0);
            return {
                label: "Cash out",
                value: cashOutDelta,
                tone: cashOutDelta > 0 ? "positive" : cashOutDelta < 0 ? "negative" : "neutral",
            };
        }

        return { label: ticket.resultado || "Pendente", value: Number(ticket.retorno || 0), tone: "neutral" };
    }

    function getTicketTimeLabel(ticket) {
        const explicitTime = ticket?.hora || ticket?.horario || ticket?.time;
        if (explicitTime) return `${getCompactResultLabel(ticket?.data, "Mensal")} ${String(explicitTime).slice(0, 5)}`;

        const createdAt = ticket?.created_at || ticket?.createdAt || ticket?.criadoEm;
        if (createdAt) {
            const date = new Date(createdAt);
            if (!Number.isNaN(date.getTime())) {
                return `${getCompactResultLabel(ticket?.data, "Mensal")} ${date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
            }
        }

        return getCompactResultLabel(ticket?.data, "Mensal") || "--";
    }

    const quickSummaryTotal = Math.max(1, quickSummary.total || 0);
    const quickSummaryRows = [
        {
            icon: "checklist",
            label: "Bilhetes ganhos",
            value: quickSummary.won,
            percent: quickSummary.total ? (quickSummary.won / quickSummaryTotal) * 100 : 0,
            tone: "positive",
        },
        {
            icon: "close",
            label: "Bilhetes perdidos",
            value: quickSummary.lost,
            percent: quickSummary.total ? (quickSummary.lost / quickSummaryTotal) * 100 : 0,
            tone: "negative",
        },
        {
            icon: "hourglass",
            label: "Pendentes",
            value: quickSummary.pending,
            percent: quickSummary.total ? (quickSummary.pending / quickSummaryTotal) * 100 : 0,
            tone: "pending",
        },
        {
            icon: "target",
            label: "Taxa de acerto",
            value: formatPercent(quickSummary.hitRate),
            percent: null,
            tone: "target",
        },
    ];

    return (
        <section className="dashboard-home-light cb-dashboard-overview" aria-label={`Dashboard ${selectedHouseLabel}`}>
            <header className="cb-dashboard-page-header">
                <div>
                    <h1>Dashboard</h1>
                    <p>Visão geral da sua banca.</p>
                </div>
                <div className="cb-dashboard-top-controls">
                    <section className="cb-dashboard-toolbar" aria-label="Filtros globais do dashboard">
                        <PeriodFields
                            dayMarkers={dayMarkers}
                            onPeriodReferenceChange={onPeriodReferenceChange}
                            onPeriodTypeChange={onPeriodTypeChange}
                            periodReference={periodReference}
                            periodType={periodType}
                        />
                    </section>
                    <div className="cb-dashboard-user-menu" aria-label="Conta do usuário">
                        <span className="cb-dashboard-user-avatar" aria-hidden="true">{getAccountInitials(accountName)}</span>
                        <span className="cb-dashboard-user-text">
                            <strong>{accountName || "Usuário"}</strong>
                            <small>Admin</small>
                        </span>
                        <button
                            type="button"
                            className="cb-dashboard-user-logout"
                            aria-label="Abrir menu da conta"
                            aria-expanded={isAccountMenuOpen}
                            onClick={() => setIsAccountMenuOpen((isOpen) => !isOpen)}
                        >
                            <span className="cb-dashboard-user-chevron" aria-hidden="true" />
                        </button>
                        {isAccountMenuOpen && (
                            <div className="cb-dashboard-account-menu" role="menu">
                                <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => {
                                        setIsAccountMenuOpen(false);
                                        onLogoutRequest();
                                    }}
                                >
                                    Sair
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <BettingHouseCarousel
                canShowEmptyState={false}
                houses={housesSafe}
                housesWithCurrentBank={housesWithCurrentBankSafe}
                isLoading={isDashboardLoading}
                onEditHouse={onEditHouse}
                onRequestDeleteHouse={onRequestDeleteHouse}
                onSelectHouse={onSelectHouse}
                onStartCreateHouse={handleStartCreateHouse}
                selectedHouseScope={selectedHouseScope}
            />

            <section className="cb-dashboard-hero-grid">
                <article className={`cb-dashboard-hero-metric ${dashboardTone}`}>
                    <div className="cb-dashboard-card-heading">
                        <span className="cb-dashboard-hero-icon" aria-hidden="true"><KpiIcon type="wallet" /></span>
                        <span>Saldo atual</span>
                    </div>
                    <div className="cb-dashboard-hero-copy">
                        <strong>{hasHouseSelection ? formatMoney(topCurrentBank || 0) : renderMaskedValue()}</strong>
                        {hasHouseSelection && (
                            <em className={dashboardTone}>
                                <b>{`${formatSignedMoney(periodVariationValue)} (${formatSignedPercent(periodVariationPercent)})`}</b>
                                <span>vs. período anterior</span>
                            </em>
                        )}
                    </div>
                    <svg className="cb-dashboard-sparkline" viewBox="0 0 100 48" preserveAspectRatio="none" aria-hidden="true">
                        <polyline points={sparklinePoints || "0,38 100,38"} />
                    </svg>
                </article>

                <div className="cb-dashboard-secondary-grid">
                    {secondaryMetrics.map((metric) => (
                        <article className={`cb-dashboard-secondary-card ${metric.tone} accent-${metric.accent}`} key={metric.title}>
                            <div className="cb-dashboard-card-heading">
                                <span aria-hidden="true"><KpiIcon type={metric.icon} /></span>
                                <small>{metric.title}</small>
                            </div>
                            <strong>{metric.value}</strong>
                            {(metric.detailValue || metric.detailText) && (
                                <em>
                                    {metric.detailValue && <b>{metric.detailValue}</b>}
                                    {metric.detailText && <span>{metric.detailText}</span>}
                                </em>
                            )}
                        </article>
                    ))}
                </div>
            </section>

            <section className="cb-dashboard-insights-grid">
                <BankrollEvolutionChart
                    analyticsPeriodType={analyticsPeriodType}
                    bankHistoryData={hasHouseSelection ? bankHistoryDataSafe : []}
                    chartMode={chartMode}
                    sectionRef={sectionRef}
                    setChartMode={setChartMode}
                />

                <DailyResultsCard
                    isResultScrollable={isResultScrollable}
                    onOpenReports={onOpenReports}
                    resultChartData={resultChartDataSafe}
                />
            </section>

            <section className="cb-dashboard-bottom-grid">
                <article className="cb-panel cb-dashboard-latest-panel">
                    <header className="cb-panel-header">
                        <div>
                            <h2><span aria-hidden="true"><KpiIcon type="trend" /></span>Últimos bilhetes do dia</h2>
                        </div>
                    </header>
                    <div className="cb-dashboard-latest-list">
                        <div className="cb-dashboard-latest-head" aria-hidden="true">
                            <span>Data</span>
                            <span>Casa</span>
                            <span>Categoria</span>
                            <span>Odd</span>
                            <span>Valor</span>
                            <span>Retorno</span>
                            <span>Resultado</span>
                        </div>
                        {recentTickets.length > 0 ? recentTickets.map((ticket) => {
                            const house = housesSafe.find((item) => Number(item.id) === Number(ticket.casaId));
                            const resultView = getTicketResultView(ticket);
                            return (
                                <div className="cb-dashboard-latest-row" key={ticket.id}>
                                    <span>{getTicketTimeLabel(ticket)}</span>
                                    <strong><HouseLogoMark house={house || { nome: "Casa" }} />{house?.nome || "Casa"}</strong>
                                    <span>{ticket.categoria || ticket.jogo || "Bilhete"}</span>
                                    <span>{Number(ticket.odd || 0).toFixed(2)}</span>
                                    <span>{formatMoney(ticket.stakeReal ?? ticket.stake ?? 0)}</span>
                                    <span>{formatMoney(ticket.retorno || 0)}</span>
                                    <em className={resultView.tone}>{resultView.label}</em>
                                </div>
                            );
                        }) : (
                            <div className="cb-dashboard-empty-state">Nenhum bilhete encontrado para os filtros selecionados.</div>
                        )}
                    </div>
                    <button type="button" className="cb-dashboard-show-all-button" onClick={onOpenTickets}>+ Ver todos os bilhetes</button>
                </article>

                <article className="cb-panel cb-dashboard-quick-panel">
                    <header className="cb-panel-header">
                        <div>
                            <h2><span aria-hidden="true"><KpiIcon type="trend" /></span>Resumo rápido</h2>
                        </div>
                    </header>
                    <div className="cb-dashboard-quick-list">
                        {quickSummaryRows.map((item) => (
                            <div className={`cb-dashboard-quick-row ${item.tone}`} key={item.label}>
                                <span aria-hidden="true"><KpiIcon type={item.icon} /></span>
                                <strong>{item.label}</strong>
                                <b>{typeof item.value === "number" ? item.value.toLocaleString("pt-BR") : item.value}</b>
                                <small aria-hidden={item.percent === null}>{item.percent !== null ? formatPercent(item.percent) : ""}</small>
                            </div>
                        ))}
                    </div>
                </article>
            </section>

            {isCreatingHouse && (
                <div className="light-modal-backdrop" role="presentation" onClick={handleCancelHouseEdit}>
                    <form
                        className="light-house-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="new-house-title"
                        onSubmit={onSubmitHouse}
                        onClick={(event) => event.stopPropagation()}
                    >
                        <header>
                            <div>
                                <h2 id="new-house-title">{editingHouseId ? "Editar casa" : "Nova Casa"}</h2>
                                <p>Cadastre uma nova casa para começar a acompanhar seus resultados.</p>
                            </div>
                            <button type="button" onClick={handleCancelHouseEdit} aria-label="Fechar">&times;</button>
                        </header>
                        <div className="light-house-modal-divider" />
                        <div className="light-house-form-grid">
                            <label>
                                <span>Nome da casa <i aria-hidden="true"><KpiIcon type="info" /></i></span>
                                <span className="light-house-input-wrap">
                                    <input
                                        value={houseForm.nome}
                                        onChange={(event) => onHouseChange((prev) => ({ ...prev, nome: event.target.value }))}
                                        placeholder="Ex.: Superbet"
                                        autoFocus
                                    />
                                    <em aria-hidden="true"><KpiIcon type="bank" /></em>
                                </span>
                            </label>
                            <label className="light-house-upload-field">
                                <span>Logo da casa <small>(opcional)</small> <i aria-hidden="true"><KpiIcon type="info" /></i></span>
                                <input
                                    accept=".png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml"
                                    className="light-house-file-input"
                                    type="file"
                                    onChange={handleHouseLogoUpload}
                                />
                                <span className={`light-house-upload-box ${houseForm.logoDataUrl ? "has-preview" : ""}`}>
                                    {houseForm.logoDataUrl ? (
                                        <>
                                            <img src={houseForm.logoDataUrl} alt="" />
                                            <strong>{houseForm.logoName || "Logo carregada"}</strong>
                                            <button
                                                type="button"
                                                onClick={(event) => {
                                                    event.preventDefault();
                                                    event.stopPropagation();
                                                    handleRemoveHouseLogo();
                                                }}
                                            >
                                                Remover
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <KpiIcon type="upload" />
                                            <strong>Clique para enviar</strong>
                                            <small>PNG, JPG ou SVG (máx. 2MB)</small>
                                        </>
                                    )}
                                </span>
                                {houseForm.logoError && <em className="light-house-upload-error">{houseForm.logoError}</em>}
                            </label>
                            <label className="light-house-bank-field">
                                <span>Banca inicial <i aria-hidden="true"><KpiIcon type="info" /></i></span>
                                <input
                                    value={houseForm.bancaInicial}
                                    inputMode="numeric"
                                    onChange={(event) => onHouseChange((prev) => ({ ...prev, bancaInicial: formatCurrencyTyping(event.target.value) }))}
                                    placeholder="R$ 0,00"
                                />
                                <small>Informe o saldo inicial nesta casa</small>
                            </label>
                            <label className="light-house-notes-field">
                                <span>Observações <small>(opcional)</small> <i aria-hidden="true"><KpiIcon type="info" /></i></span>
                                <textarea
                                    maxLength={200}
                                    rows={4}
                                    value={houseForm.observacoes || ""}
                                    onChange={(event) => onHouseChange((prev) => ({ ...prev, observacoes: event.target.value }))}
                                    placeholder="Ex.: Estratégia utilizada, limites, regras específicas..."
                                />
                                <small>{String(houseForm.observacoes || "").length}/200</small>
                            </label>
                        </div>
                        <div className="light-house-info-note">
                            <KpiIcon type="info" />
                            <span><strong>Importante:</strong> Você poderá editar essas informações a qualquer momento nas configurações da casa.</span>
                        </div>
                        {houseFeedback.message && (
                            <div className={`light-house-feedback ${houseFeedback.type}`} role="status">
                                {houseFeedback.message}
                            </div>
                        )}
                        <footer>
                            <button type="button" className="light-secondary-button" onClick={handleCancelHouseEdit} disabled={isSavingHouse}>Cancelar</button>
                            <button type="submit" className="light-primary-button" disabled={isSavingHouse}>
                                {isSavingHouse ? "Salvando..." : "Salvar"}
                            </button>
                        </footer>
                    </form>
                </div>
            )}

            {false && (
                <section className="reference-quick-summary-section">
                    <header>
                        <h2>Resumo rápido</h2>
                    </header>
                    <div className="reference-quick-summary-grid">
                        <div className="reference-quick-summary-card positive"><span>Bilhetes ganhos</span><strong>{quickSummary.won}</strong></div>
                        <div className="reference-quick-summary-card negative"><span>Bilhetes perdidos</span><strong>{quickSummary.lost}</strong></div>
                        <div className="reference-quick-summary-card neutral"><span>Pendentes</span><strong>{quickSummary.pending}</strong></div>
                        <div className="reference-quick-summary-card"><span>Taxa de acerto</span><strong>{formatPercent(quickSummary.hitRate)}</strong></div>
                    </div>
                </section>
            )}

            {false && (
                <section className="reference-lower-grid">
                    {recentTickets.length > 0 && (
                        <article className="reference-latest-tickets-card">
                            <header>
                                <h2>Últimos bilhetes do dia</h2>
                            </header>
                            <div className="reference-latest-tickets-table">
                                <div className="reference-latest-tickets-head">
                                    <span>Horário</span>
                                    <span>Casa</span>
                                    <span>Categoria</span>
                                    <span>Odd</span>
                                    <span>Valor</span>
                                    <span>Retorno</span>
                                    <span>Resultado</span>
                                </div>
                                {recentTickets.map((ticket) => {
                                    const house = houses.find((item) => Number(item.id) === Number(ticket.casaId));
                                    const resultView = getTicketResultView(ticket);
                                    return (
                                        <div className="reference-latest-ticket-row" key={ticket.id}>
                                            <span>--</span>
                                            <span>{house?.nome || "Casa"}</span>
                                            <span>{ticket.categoria || "-"}</span>
                                            <span>{Number(ticket.odd || 0).toFixed(2)}</span>
                                            <span>{formatMoney(ticket.stake)}</span>
                                            <span>{formatMoney(ticket.retorno)}</span>
                                            <strong className={resultView.tone}>{resultView.label}</strong>
                                        </div>
                                    );
                                })}
                            </div>
                            <button type="button" className="reference-outline-action reference-latest-action" onClick={onOpenTickets}>
                                + Ver todos os bilhetes
                            </button>
                        </article>
                    )}

                    {hasFinancialSummary && (
                        <article className="reference-financial-summary-card">
                            <header>
                                <h2>Resumo financeiro</h2>
                            </header>
                            <div className="reference-financial-summary-row">
                                <span>Total apostado</span>
                                <strong>{formatMoney(summaryStats.invested)}</strong>
                            </div>
                            <div className="reference-financial-summary-row">
                                <span>Total de retornos</span>
                                <strong>{formatMoney(summaryStats.returned)}</strong>
                            </div>
                            <div className="reference-financial-summary-row">
                                <span>Lucro / Prejuízo</span>
                                <strong className={resultMetric?.tone || "neutral"}>{formatSignedMoney(summaryStats.realProfit)}</strong>
                            </div>
                            <div className="reference-financial-summary-row">
                                <span>ROI</span>
                                <strong className={roiMetric?.tone || "neutral"}>{formatSignedPercent(summaryStats?.roi ?? 0)}</strong>
                            </div>
                        </article>
                    )}
                </section>
            )}
        </section>
    );
}

export function DashboardShell({
    accountFirstName,
    activeNavItem,
    activeSubItem = null,
    children,
    monthlyResult = 0,
    onLogoutRequest = () => { },
    onSidebarNavigate,
    onToggleTheme = () => { },
    quickActions,
    selectedHouseLabel = "Todas as casas",
}) {
    const sidebar = (
        <Sidebar
            accountFirstName={accountFirstName}
            activeItem={activeNavItem}
            activeSubItem={activeSubItem}
            monthlyResult={monthlyResult}
            onNavigate={onSidebarNavigate}
            onLogoutRequest={onLogoutRequest}
            onToggleTheme={onToggleTheme}
            quickActions={quickActions}
            selectedHouseLabel={selectedHouseLabel}
            theme="light"
        />
    );

    return (
        <DesignAppShell
            className="light-dashboard-shell"
            mainClassName="light-dashboard-main"
            sidebar={sidebar}
            sidebarAsChild
            data-theme="light"
            aria-label="Dashboard ControlBet"
        >
            <div className="dashboard-content">{children}</div>
        </DesignAppShell>
    );
}

function NavigationPlaceholderPage({ title }) {
    return (
        <section className="reference-page-placeholder" aria-live="polite">
            <h1>{title}</h1>
        </section>
    );
}

function DeleteHouseDialog({ house, isDeleting, onCancel, onConfirm }) {
    if (!house) return null;

    return (
        <div className="reference-modal-backdrop" role="presentation" onClick={onCancel}>
            <section
                className="reference-confirm-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="delete-house-title"
                onClick={(event) => event.stopPropagation()}
            >
                <h2 id="delete-house-title">Deseja excluir esta casa de apostas?</h2>
                <p>{house.nome}</p>
                <div>
                    <button type="button" onClick={onCancel} disabled={isDeleting}>
                        Cancelar
                    </button>
                    <button type="button" className="danger" onClick={onConfirm} disabled={isDeleting}>
                        {isDeleting ? "Excluindo..." : "Excluir"}
                    </button>
                </div>
            </section>
        </div>
    );
}

function LogoutConfirmDialog({ isOpen, isLoggingOut, onCancel, onConfirm }) {
    if (!isOpen) return null;

    return (
        <div className="reference-modal-backdrop" role="presentation" onClick={onCancel}>
            <section
                className="reference-confirm-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="logout-confirm-title"
                onClick={(event) => event.stopPropagation()}
            >
                <h2 id="logout-confirm-title">Deseja realmente sair?</h2>
                <div>
                    <button type="button" onClick={onCancel} disabled={isLoggingOut}>
                        Cancelar
                    </button>
                    <button type="button" className="danger" onClick={onConfirm} disabled={isLoggingOut}>
                        {isLoggingOut ? "Saindo..." : "Sair"}
                    </button>
                </div>
            </section>
        </div>
    );
}

function buildTicketName(dateISO, number) {
    return `Bilhete ${number}`;
}

function reorderTickets(tickets) {
    const groups = {};

    tickets.forEach((ticket) => {
        if (!groups[ticket.data]) groups[ticket.data] = [];
        groups[ticket.data].push(ticket);
    });

    const rebuilt = [];

    Object.keys(groups).forEach((dateISO) => {
        const ordered = [...groups[dateISO]].sort((a, b) => a.id - b.id);

        ordered.forEach((ticket, index) => {
            const ticketNumber = index + 1;
            rebuilt.push({
                ...ticket,
                numeroBilhete: ticketNumber,
                nomeBilhete: buildTicketName(dateISO, ticketNumber),
            });
        });
    });

    return rebuilt.sort((a, b) => b.id - a.id);
}

function formatCurrencyTyping(rawValue) {
    const digits = String(rawValue || "").replace(/\D/g, "");
    if (!digits) return "";
    const number = Number(digits) / 100;
    return number.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
    });
}

function parseCurrencyTyping(maskedValue) {
    const digits = String(maskedValue || "").replace(/\D/g, "");
    if (!digits) return NaN;
    return Number(digits) / 100;
}

function movementSignal(type) {
    if (type === "Saque") return -1;
    return 1;
}

function normalizeStakeBreakdown(form, stake) {
    const origemStake = normalizeStakeOrigin(form.origemStake);
    let stakeSaldo = 0;
    let stakeDeposito = 0;
    let stakeBonus = 0;

    if (origemStake === STAKE_ORIGINS.BALANCE) {
        stakeSaldo = stake;
    } else if (origemStake === STAKE_ORIGINS.BONUS) {
        stakeBonus = stake;
    } else if (origemStake === STAKE_ORIGINS.BALANCE_BONUS) {
        stakeSaldo = parseCurrencyTyping(form.stakeSaldo) || 0;
        stakeBonus = parseCurrencyTyping(form.stakeBonus) || 0;

        const sum = stakeSaldo + stakeBonus;
        const diff = Math.abs(sum - stake);

        if (diff > 0.009) {
            return {
                valid: false,
                message: "A soma das origens precisa ser igual ao valor total apostado.",
            };
        }
    } else {
        return {
            valid: false,
            message: "Origem da stake inválida.",
        };
    }

    return {
        valid: true,
        stakeSaldo,
        stakeDeposito,
        stakeBonus,
    };
}

function calculateStakeDetails({ returned, stakeSaldo, stakeDeposito, stakeBonus }) {
    const stakeReal = stakeSaldo + stakeDeposito;
    const bonusStake = stakeBonus;
    const recoveredReal = Math.min(returned, stakeReal);
    const remainingAfterReal = Math.max(0, returned - recoveredReal);
    const recoveredBonus = Math.min(remainingAfterReal, bonusStake);

    return {
        stakeReal,
        stakeBonus: bonusStake,
        recoveredReal,
        recoveredBonus,
        perdaReal: Math.max(0, stakeReal - recoveredReal),
        perdaBonus: Math.max(0, bonusStake - recoveredBonus),
        lucroReal: Math.max(0, returned - stakeReal),
    };
}

function getRealTicketImpact(ticket) {
    const lucroReal = Number(ticket.lucroReal || 0);
    const perdaReal = Number(ticket.perdaReal || 0);
    return lucroReal - perdaReal;
}

function validateHouseLedger({ houses = [], movements = [], tickets = [] }, houseId, removedItemLabel = "esse registro") {
    const house = houses.find((item) => Number(item.id) === Number(houseId));
    if (!house) return { valid: true };

    let balance = Number(house.bancaInicial || 0);
    const houseTickets = tickets.filter((ticket) => Number(ticket.casaId) === Number(houseId));
    const houseMovements = movements.filter((movement) => Number(movement.casaId) === Number(houseId));
    const events = [
        ...houseMovements.map((movement) => ({
            id: movement.id,
            date: movement.data,
            order: 1,
            type: "movement",
            movement,
        })),
        ...houseTickets.map((ticket) => ({
            id: ticket.id,
            date: ticket.data,
            order: 2,
            type: "ticket",
            ticket,
        })),
    ].sort((a, b) => {
        const dateCompare = String(a.date || "").localeCompare(String(b.date || ""));
        if (dateCompare !== 0) return dateCompare;
        if (a.order !== b.order) return a.order - b.order;
        return Number(a.id || 0) - Number(b.id || 0);
    });

    for (const event of events) {
        if (event.type === "movement") {
            balance += Number(event.movement.valor || 0) * movementSignal(event.movement.tipo);
        } else {
            const ticket = event.ticket;
            const stakeReal = Number(ticket.stakeReal || 0);

            if (stakeReal > balance + 0.009) {
                return {
                    valid: false,
                    message: `Não é possível excluir. Sem ${removedItemLabel}, a banca de ${house.nome} ficaria insuficiente para o ${ticket.nomeBilhete || "bilhete"} de ${formatDateBR(ticket.data)}.`,
                };
            }

            if (ticket.resultado !== "Pendente") {
                balance += getRealTicketImpact(ticket);
            }
        }

        if (balance < -0.009) {
            return {
                valid: false,
                message: `Não é possível excluir. Sem ${removedItemLabel}, a banca de ${house.nome} ficaria negativa em ${formatDateBR(event.date)}.`,
            };
        }
    }

    return { valid: true };
}

const initialTicketForm = {
    data: hojeISO(),
    casaId: "",
    categoria: "",
    odd: "",
    stake: "",
    retorno: "",
    origemStake: STAKE_ORIGINS.BALANCE,
    stakeSaldo: "",
    stakeDeposito: "",
    stakeBonus: "",
    resultado: "Pendente",
    observacoes: "",
};

const initialHouseForm = {
    nome: "",
    bancaInicial: "",
    logoDataUrl: "",
    logoName: "",
    moeda: "BRL",
    observacoes: "",
};

const HOUSE_DETAILS_STORAGE_KEY = "controlbet_house_details_v1";
const HOUSE_LOGO_MAX_BYTES = 2 * 1024 * 1024;
const HOUSE_LOGO_ALLOWED_TYPES = ["image/png", "image/jpeg", "image/svg+xml"];

function readStoredHouseDetails(userId) {
    if (typeof window === "undefined" || !userId) return {};

    try {
        const parsed = JSON.parse(window.localStorage.getItem(HOUSE_DETAILS_STORAGE_KEY) || "{}");
        return parsed?.[userId] || {};
    } catch {
        return {};
    }
}

function getStoredHouseDetails(userId, houseId) {
    return readStoredHouseDetails(userId)?.[String(houseId)] || {};
}

function saveStoredHouseDetails(userId, houseId, details) {
    if (typeof window === "undefined" || !userId || !houseId) return;

    try {
        const parsed = JSON.parse(window.localStorage.getItem(HOUSE_DETAILS_STORAGE_KEY) || "{}");
        const userDetails = parsed[userId] || {};

        parsed[userId] = {
            ...userDetails,
            [String(houseId)]: {
                logoDataUrl: details.logoDataUrl || "",
                logoName: details.logoName || "",
                moeda: details.moeda || "BRL",
                observacoes: details.observacoes || "",
            },
        };

        window.localStorage.setItem(HOUSE_DETAILS_STORAGE_KEY, JSON.stringify(parsed));
    } catch (error) {
        console.warn("Não foi possível salvar os detalhes locais da casa.", error);
    }
}

const initialMovementForm = {
    data: hojeISO(),
    casaId: "",
    tipo: "Depósito",
    valor: "",
    metodo: "PIX",
    observacoes: "",
};

export default function DashboardPage({ landingTheme = "dark", onToggleTheme = () => { } }) {
    const { clearSession, refreshSession, session, signOut, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const userId = user?.id;
    const controlPanelRef = useRef(null);
    const analyticsSectionRef = useRef(null);
    const [houses, setHouses] = useState([]);

    const [tickets, setTickets] = useState([]);

    const [movements, setMovements] = useState([]);

    const [ticketForm, setTicketForm] = useState(initialTicketForm);
    const [houseForm, setHouseForm] = useState(initialHouseForm);
    const [movementForm, setMovementForm] = useState(initialMovementForm);
    const [isDashboardLoading, setIsDashboardLoading] = useState(true);
    const [dashboardLoadError, setDashboardLoadError] = useState(null);

    const [editingTicketId, setEditingTicketId] = useState(null);
    const [editingHouseId, setEditingHouseId] = useState(null);
    const [editingMovementId, setEditingMovementId] = useState(null);

    const [periodType, setPeriodType] = useState("Diário");
    const [periodReference, setPeriodReference] = useState(hojeISO());
    const [selectedHouseScope, setSelectedHouseScope] = useState(null);
    const [chartMode, setChartMode] = useState("Banca");

    const [isSavingHouse, setIsSavingHouse] = useState(false);
    const [isSavingTicket, setIsSavingTicket] = useState(false);
    const [isSavingMovement, setIsSavingMovement] = useState(false);
    const [deletingTicketId, setDeletingTicketId] = useState(null);
    const [deletingMovementId, setDeletingMovementId] = useState(null);
    const [deletingHouseId, setDeletingHouseId] = useState(null);
    const [housePendingDelete, setHousePendingDelete] = useState(null);
    const [houseFeedback, setHouseFeedback] = useState({
        type: "",
        message: "",
    });
    const [ticketFeedback, setTicketFeedback] = useState({
        type: "",
        message: "",
    });
    const [movementFeedback, setMovementFeedback] = useState({
        type: "",
        message: "",
    });
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
    const [dashboardReloadKey, setDashboardReloadKey] = useState(0);

    const shouldUseNavigationState = location.key !== "default";
    const [activeBottomPanel, setActiveBottomPanel] = useState(
        shouldUseNavigationState ? location.state?.activeBottomPanel || null : null
    );
    const [activeNavItem, setActiveNavItem] = useState(
        shouldUseNavigationState ? location.state?.activeNavItem || "dashboard" : "dashboard"
    );

    useEffect(() => {
        if (!shouldUseNavigationState) return;
        if (!location.state?.activeNavItem) return;

        setActiveNavItem(location.state.activeNavItem);
        setActiveBottomPanel(location.state.activeBottomPanel || null);
    }, [location.state?.activeBottomPanel, location.state?.activeNavItem, shouldUseNavigationState]);

    function scrollToSection(ref) {
        ref.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
        });
    }

    function clearOperationFeedback() {
        setHouseFeedback({ type: "", message: "" });
        setTicketFeedback({ type: "", message: "" });
        setMovementFeedback({ type: "", message: "" });
    }

    function handleSidebarNavigate(itemId, panelId = null) {
        clearOperationFeedback();
        setActiveNavItem(itemId);

        if (itemId === "dashboard") {
            setActiveBottomPanel(null);
            window.scrollTo({ top: 0, behavior: "smooth" });
            return;
        }

        if (itemId === "tickets") {
            setActiveBottomPanel(panelId || "ticketsDay");
            return;
        }

        if (itemId === "reports") {
            setActiveBottomPanel(null);
            navigate("/relatorios");
            return;
        }

        if (itemId === "performance" || itemId === "goals") {
            setActiveBottomPanel(null);
            return;
        }

        if (itemId === "movements") {
            setActiveBottomPanel(panelId || "extract");
            return;
        }

        if (itemId === "settings") {
            setActiveBottomPanel(panelId || "accountReal");
            return;
        }
    }

    const handleAuthFailure = useCallback(() => {
        clearSession();
    }, [clearSession]);

    function handleRetryDashboardLoad() {
        setDashboardReloadKey((current) => current + 1);
    }

    async function handleLogout() {
        if (isLoggingOut) return;

        setIsLoggingOut(true);
        setIsLogoutDialogOpen(false);

        const { error } = await signOut();

        if (error) {
            console.error("Erro ao sair:", error);
            setIsLoggingOut(false);
            alert("Não foi possível sair. Tente novamente.");
        }
    }


    useEffect(() => {
        async function loadInitialData() {
            setIsDashboardLoading(true);
            setDashboardLoadError(null);

            if (!userId) {
                setHouses([]);
                setTickets([]);
                setMovements([]);
                setDashboardLoadError(null);
                setIsDashboardLoading(false);
                return;
            }

            try {
                let effectiveUserId = userId;

                let housesQuery = supabase
                    .from("houses")
                    .select("*")
                    .order("id", { ascending: true });
                if (effectiveUserId) housesQuery = housesQuery.eq("user_id", effectiveUserId);

                const { data: housesData, error: housesError } = await housesQuery;

                if (housesError) {
                    console.error("Erro ao carregar casas do Supabase:", housesError);
                    if (isSupabaseAuthError(housesError)) {
                        handleAuthFailure();
                        return;
                    }
                    setDashboardLoadError("Não foi possível carregar todos os dados da dashboard.");
                    setHouses([]);
                    setTickets([]);
                    setMovements([]);
                    return;
                }

                const formattedHouses = (housesData || []).map((house) => ({
                    id: house.id,
                    nome: house.nome,
                    bancaInicial: Number(house.banca_inicial || 0),
                    ...getStoredHouseDetails(userId, house.id),
                }));
                const registeredHouseIds = new Set(formattedHouses.map((house) => Number(house.id)));
                const onlyRegisteredHouseData = (item) => registeredHouseIds.has(Number(item.casaId));

                setHouses(formattedHouses);

                let ticketsQuery = supabase
                    .from("tickets")
                    .select("*")
                    .order("id", { ascending: false });
                if (effectiveUserId) ticketsQuery = ticketsQuery.eq("user_id", effectiveUserId);

                const { data: ticketsData, error: ticketsError } = await ticketsQuery;

                console.log("ticketsData:", ticketsData);
                console.log("ticketsError:", ticketsError);

                if (ticketsError) {
                    console.error("Erro ao carregar bilhetes do Supabase:", ticketsError);
                    if (isSupabaseAuthError(ticketsError)) {
                        handleAuthFailure();
                        return;
                    }
                    setDashboardLoadError("Não foi possível carregar todos os dados da dashboard.");
                    setTickets([]);
                } else {
                    const formattedTickets = (ticketsData || []).map((ticket) => ({
                        id: ticket.id,
                        data: ticket.data,
                        casaId: Number(ticket.casa_id),
                        categoria: ticket.categoria,
                        odd: Number(ticket.odd || 0),
                        stake: Number(ticket.stake || 0),
                        retorno: Number(ticket.retorno || 0),
                        origemStake: normalizeStakeOrigin(ticket.origem_stake),
                        stakeSaldo: Number(ticket.stake_saldo || 0),
                        stakeDeposito: Number(ticket.stake_deposito || 0),
                        stakeBonus: Number(ticket.stake_bonus || 0),
                        resultado: ticket.resultado || "Pendente",
                        observacoes: ticket.observacoes || "",
                        lucro: Number(ticket.lucro || 0),
                        stakeReal: Number(ticket.stake_real || 0),
                        recoveredReal: Number(ticket.recovered_real || 0),
                        recoveredBonus: Number(ticket.recovered_bonus || 0),
                        perdaReal: Number(ticket.perda_real || 0),
                        perdaBonus: Number(ticket.perda_bonus || 0),
                        lucroReal: Number(ticket.lucro_real || 0),
                        numeroBilhete: Number(ticket.numero_bilhete || 0),
                        nomeBilhete: ticket.nome_bilhete || "",
                    }));

                    console.log("formattedTickets:", formattedTickets);
                    setTickets(formattedTickets.filter(onlyRegisteredHouseData));
                }

                let movementsQuery = supabase
                    .from("movements")
                    .select("*")
                    .order("id", { ascending: false });
                if (effectiveUserId) movementsQuery = movementsQuery.eq("user_id", effectiveUserId);

                const { data: movementsData, error: movementsError } = await movementsQuery;

                console.log("movementsData:", movementsData);
                console.log("movementsError:", movementsError);

                if (movementsError) {
                    console.error("Erro ao carregar movimentações:", movementsError);
                    if (isSupabaseAuthError(movementsError)) {
                        handleAuthFailure();
                        return;
                    }
                    setDashboardLoadError("Não foi possível carregar todos os dados da dashboard.");
                    setMovements([]);
                } else {
                    const formattedMovements = (movementsData || []).map((movement) => ({
                        id: movement.id,
                        data: movement.data,
                        casaId: Number(movement.casa_id),
                        tipo: movement.tipo,
                        valor: Number(movement.valor || 0),
                        metodo: movement.metodo || "PIX",
                        observacoes: movement.observacoes || "",
                    }));

                    setMovements(formattedMovements.filter(onlyRegisteredHouseData));
                    console.log("formattedMovements:", formattedMovements);
                }
            } catch (error) {
                console.error("Erro ao carregar dados iniciais:", error);
                if (isSupabaseAuthError(error)) {
                    handleAuthFailure();
                    return;
                }
                setDashboardLoadError("Não foi possível carregar os dados da dashboard.");
                setHouses([]);
                setTickets([]);
                setMovements([]);
            } finally {
                setIsDashboardLoading(false);
            }
        }

        loadInitialData();
    }, [dashboardReloadKey, handleAuthFailure, userId]);

    const dailyReferences = useMemo(() => {
        const ticketDates = tickets.map((t) => t.data);
        const movementDates = movements.map((m) => m.data);
        return [...new Set([hojeISO(), ...ticketDates, ...movementDates])]
            .filter(Boolean)
            .sort((a, b) => b.localeCompare(a));
    }, [tickets, movements]);

    const weekReferences = useMemo(() => {
        const ticketWeeks = tickets.map((t) => getWeekRef(t.data));
        const movementWeeks = movements.map((m) => getWeekRef(m.data));

        return [...new Set([getWeekRef(hojeISO()), ...ticketWeeks, ...movementWeeks])]
            .filter(Boolean)
            .sort((a, b) => b.localeCompare(a));
    }, [tickets, movements]);

    const monthReferences = useMemo(() => {
        const ticketMonths = tickets.map((t) => getMonthRef(t.data));
        const movementMonths = movements.map((m) => getMonthRef(m.data));
        return [...new Set([getMonthRef(hojeISO()), ...ticketMonths, ...movementMonths])]
            .filter(Boolean)
            .sort((a, b) => b.localeCompare(a));
    }, [tickets, movements]);

    const quarterReferences = useMemo(() => {
        const ticketRefs = tickets.map((t) => getQuarterRef(t.data));
        const movementRefs = movements.map((m) => getQuarterRef(m.data));
        return [...new Set([...ticketRefs, ...movementRefs])]
            .filter(Boolean)
            .sort((a, b) => b.localeCompare(a));
    }, [tickets, movements]);

    const semesterReferences = useMemo(() => {
        const ticketRefs = tickets.map((t) => getSemesterRef(t.data));
        const movementRefs = movements.map((m) => getSemesterRef(m.data));
        return [...new Set([...ticketRefs, ...movementRefs])]
            .filter(Boolean)
            .sort((a, b) => b.localeCompare(a));
    }, [tickets, movements]);

    const yearReferences = useMemo(() => {
        const ticketRefs = tickets.map((t) => getYearRef(t.data));
        const movementRefs = movements.map((m) => getYearRef(m.data));
        return [...new Set([getYearRef(hojeISO()), ...ticketRefs, ...movementRefs])]
            .filter(Boolean)
            .sort((a, b) => b.localeCompare(a));
    }, [tickets, movements]);

    const availableReferences = useMemo(() => {
        if (periodType === "Diário") return dailyReferences;
        if (periodType === "Semanal") return weekReferences;
        if (periodType === "Mensal") return monthReferences;
        if (periodType === "Trimestral") return quarterReferences;
        if (periodType === "Semestral") return semesterReferences;
        if (periodType === "Anual") return yearReferences;
        return [];
    }, [
        periodType,
        dailyReferences,
        weekReferences,
        monthReferences,
        quarterReferences,
        semesterReferences,
        yearReferences,
    ]);

    useEffect(() => {
        if (periodType === "Geral") {
            setPeriodReference("");
            return;
        }

        if (!availableReferences.includes(periodReference)) {
            setPeriodReference(availableReferences[0] || "");
        }
    }, [periodType, availableReferences, periodReference]);

    function handleDashboardPeriodTypeChange(nextPeriodType) {
        setPeriodType(nextPeriodType);

        if (nextPeriodType === "Geral") {
            setPeriodReference("");
            return;
        }

        if (nextPeriodType === "Mensal") {
            setPeriodReference(getMonthRef(hojeISO()));
            return;
        }

        if (nextPeriodType === "Anual") {
            setPeriodReference(getYearRef(hojeISO()));
            return;
        }

        if (nextPeriodType === "Semanal") {
            setPeriodReference(getWeekRef(hojeISO()));
            return;
        }

        if (String(nextPeriodType || "").startsWith("Di")) {
            setPeriodReference(hojeISO());
        }
    }

    function handleSelectDashboardHouse(houseId) {
        if (houseId === null || houseId === "" || houseId === "all") {
            setSelectedHouseScope((currentHouseId) => (
                currentHouseId === "all" ? null : "all"
            ));
            return;
        }

        setSelectedHouseScope((currentHouseId) => (
            Number(currentHouseId) === Number(houseId) ? null : houseId
        ));
    }

    const periodInterval = useMemo(() => {
        return getPeriodInterval(periodType, periodReference);
    }, [periodType, periodReference]);

    const analyticsPeriodType = useMemo(() => {
        return getAnalyticsPeriodType(periodType);
    }, [periodType]);

    const analyticsPeriodReference = useMemo(() => {
        if (!String(periodType || "").startsWith("Di")) return periodReference;
        return getWeekRef(periodReference || hojeISO());
    }, [periodType, periodReference]);

    const analyticsPeriodInterval = useMemo(() => {
        return getPeriodInterval(analyticsPeriodType, analyticsPeriodReference);
    }, [analyticsPeriodType, analyticsPeriodReference]);

    const resultDailyMonthReference = useMemo(() => {
        if (periodType === "Mensal" && periodReference) return periodReference;

        if ((periodType === "Diário" || periodType === "Semanal") && periodReference) {
            return getMonthRef(periodReference);
        }

        if (periodType === "Anual" && periodReference) {
            const currentMonth = getMonthRef(hojeISO());
            return currentMonth.startsWith(`${periodReference}-`) ? currentMonth : `${periodReference}-01`;
        }

        if ((periodType === "Trimestral" || periodType === "Semestral") && periodInterval.start) {
            return getMonthRef(periodInterval.start);
        }

        return getMonthRef(hojeISO());
    }, [periodType, periodReference, periodInterval.start]);

    const resultDailyMonthInterval = useMemo(() => {
        return getPeriodInterval("Mensal", resultDailyMonthReference);
    }, [resultDailyMonthReference]);

    const baseTicketsForPeriod = useMemo(() => {
        let base = tickets;

        if (periodType !== "Geral") {
            if (!periodInterval.start || !periodInterval.end) return [];
            base = base.filter(
                (ticket) =>
                    ticket.data >= periodInterval.start && ticket.data <= periodInterval.end
            );
        }

        return base;
    }, [tickets, periodType, periodInterval]);

    const baseMovementsForPeriod = useMemo(() => {
        let base = movements;

        if (periodType !== "Geral") {
            if (!periodInterval.start || !periodInterval.end) return [];
            base = base.filter(
                (movement) =>
                    movement.data >= periodInterval.start && movement.data <= periodInterval.end
            );
        }

        return base;
    }, [movements, periodType, periodInterval]);

    const analyticsBaseTicketsForPeriod = useMemo(() => {
        let base = tickets;

        if (analyticsPeriodType !== "Geral") {
            if (!analyticsPeriodInterval.start || !analyticsPeriodInterval.end) return [];
            base = base.filter(
                (ticket) =>
                    ticket.data >= analyticsPeriodInterval.start && ticket.data <= analyticsPeriodInterval.end
            );
        }

        return base;
    }, [tickets, analyticsPeriodType, analyticsPeriodInterval]);

    const analyticsBaseMovementsForPeriod = useMemo(() => {
        let base = movements;

        if (analyticsPeriodType !== "Geral") {
            if (!analyticsPeriodInterval.start || !analyticsPeriodInterval.end) return [];
            base = base.filter(
                (movement) =>
                    movement.data >= analyticsPeriodInterval.start && movement.data <= analyticsPeriodInterval.end
            );
        }

        return base;
    }, [movements, analyticsPeriodType, analyticsPeriodInterval]);

    const ticketsForPeriod = useMemo(() => {
        if (selectedHouseScope === null) return [];
        if (selectedHouseScope === "all") return baseTicketsForPeriod;

        return baseTicketsForPeriod.filter(
            (ticket) => Number(ticket.casaId) === Number(selectedHouseScope)
        );
    }, [baseTicketsForPeriod, selectedHouseScope]);

    const movementsForPeriod = useMemo(() => {
        if (selectedHouseScope === null) return [];
        if (selectedHouseScope === "all") return baseMovementsForPeriod;

        return baseMovementsForPeriod.filter(
            (movement) => Number(movement.casaId) === Number(selectedHouseScope)
        );
    }, [baseMovementsForPeriod, selectedHouseScope]);

    const housesWithCurrentBank = useMemo(() => {
        return houses.map((house) => {
            const previousResolvedTickets =
                periodType === "Geral"
                    ? []
                    : tickets.filter(
                        (ticket) =>
                            Number(ticket.casaId) === house.id &&
                            ticket.resultado !== "Pendente" &&
                            ticket.data < periodInterval.start
                    );

            const previousTicketBalance = previousResolvedTickets.reduce(
                (acc, ticket) => acc + getRealTicketImpact(ticket),
                0
            );

            const previousMovements =
                periodType === "Geral"
                    ? []
                    : movements.filter(
                        (movement) =>
                            Number(movement.casaId) === house.id &&
                            movement.data < periodInterval.start
                    );

            const previousMovementBalance = previousMovements.reduce((acc, movement) => {
                return acc + Number(movement.valor || 0) * movementSignal(movement.tipo);
            }, 0);

            const bancaInicialPeriodo =
                Number(house.bancaInicial || 0) +
                previousTicketBalance +
                previousMovementBalance;

            const periodHouseTickets = baseTicketsForPeriod.filter(
                (ticket) => Number(ticket.casaId) === house.id
            );

            const resolvedPeriodTickets = periodHouseTickets.filter(
                (ticket) => ticket.resultado !== "Pendente"
            );

            const totalProfit = resolvedPeriodTickets.reduce(
                (acc, ticket) => acc + getRealTicketImpact(ticket),
                0
            );

            const periodHouseMovements = baseMovementsForPeriod.filter(
                (movement) => Number(movement.casaId) === house.id
            );

            const movementBalance = periodHouseMovements.reduce((acc, movement) => {
                return acc + Number(movement.valor || 0) * movementSignal(movement.tipo);
            }, 0);

            const greenCount = resolvedPeriodTickets.filter((ticket) => {
                if (ticket.resultado === "Green") return true;
                if (
                    ticket.resultado === "Cash Out" &&
                    Number(ticket.retorno || 0) > Number(ticket.stake || 0)
                ) {
                    return true;
                }
                return false;
            }).length;

            const hitRate =
                resolvedPeriodTickets.length > 0
                    ? (greenCount / resolvedPeriodTickets.length) * 100
                    : 0;

            return {
                ...house,
                bancaInicialPeriodo,
                bancaAtual: bancaInicialPeriodo + totalProfit + movementBalance,
                quantidadeApostas: periodHouseTickets.length,
                apostasGanhas: greenCount,
                apostasPerdidas: resolvedPeriodTickets.length - greenCount,
                taxaAcerto: hitRate,
            };
        });
    }, [
        houses,
        tickets,
        movements,
        baseTicketsForPeriod,
        baseMovementsForPeriod,
        periodType,
        periodInterval,
    ]);

    const selectedHouseData = useMemo(() => {
        if (selectedHouseScope === null || selectedHouseScope === "all") return null;
        return (
            housesWithCurrentBank.find(
                (house) => house.id === Number(selectedHouseScope)
            ) || null
        );
    }, [housesWithCurrentBank, selectedHouseScope]);

    const summaryStats = useMemo(() => {
        const resolved = ticketsForPeriod.filter(
            (ticket) => ticket.resultado !== "Pendente"
        );

        const invested = resolved.reduce(
            (acc, ticket) => acc + Number(ticket.stake || 0),
            0
        );

        const investedReal = resolved.reduce(
            (acc, ticket) => acc + Number(ticket.stakeReal || 0),
            0
        );

        const returned = resolved.reduce(
            (acc, ticket) => acc + Number(ticket.retorno || 0),
            0
        );

        const profit = returned - invested;
        const realProfit = resolved.reduce(
            (acc, ticket) => acc + getRealTicketImpact(ticket),
            0
        );

        const roi = investedReal > 0 ? (realProfit / investedReal) * 100 : 0;

        const movementBalance = movementsForPeriod.reduce((acc, movement) => {
            return acc + Number(movement.valor || 0) * movementSignal(movement.tipo);
        }, 0);

        return {
            invested,
            investedReal,
            returned,
            profit,
            realProfit,
            roi,
            movementBalance,
        };
    }, [ticketsForPeriod, movementsForPeriod]);

    const bankHistoryData = useMemo(() => {
        if (selectedHouseScope === null) return [];

        const chartTickets = analyticsBaseTicketsForPeriod.filter((ticket) => {
            if (selectedHouseScope === "all") return true;
            return Number(ticket.casaId) === Number(selectedHouseScope);
        });

        const chartMovements = analyticsBaseMovementsForPeriod.filter((movement) => {
            if (selectedHouseScope === "all") return true;
            return Number(movement.casaId) === Number(selectedHouseScope);
        });

        const initialBank = houses
            .filter((house) => {
                if (selectedHouseScope === "all") return true;
                return Number(house.id) === Number(selectedHouseScope);
            })
            .reduce((acc, house) => {
                const previousTickets =
                    analyticsPeriodType === "Geral"
                        ? []
                        : tickets.filter(
                            (ticket) =>
                                Number(ticket.casaId) === Number(house.id) &&
                                ticket.resultado !== "Pendente" &&
                                ticket.data < analyticsPeriodInterval.start
                        );

                const previousMovements =
                    analyticsPeriodType === "Geral"
                        ? []
                        : movements.filter(
                            (movement) =>
                                Number(movement.casaId) === Number(house.id) &&
                                movement.data < analyticsPeriodInterval.start
                        );

                const previousTicketBalance = previousTickets.reduce(
                    (sum, ticket) => sum + getRealTicketImpact(ticket),
                    0
                );
                const previousMovementBalance = previousMovements.reduce((sum, movement) => {
                    return sum + Number(movement.valor || 0) * movementSignal(movement.tipo);
                }, 0);

                return acc + Number(house.bancaInicial || 0) + previousTicketBalance + previousMovementBalance;
            }, 0);
        const chartStartValue = initialBank;

        const dailyTotals = {};
        const dailyMovements = {};

        chartTickets
            .filter((ticket) => ticket.resultado !== "Pendente")
            .forEach((ticket) => {
                if (!dailyTotals[ticket.data]) dailyTotals[ticket.data] = 0;
                dailyTotals[ticket.data] += getRealTicketImpact(ticket);
            });

        if (chartMode === "Banca") {
            chartMovements.forEach((movement) => {
                if (!dailyTotals[movement.data]) dailyTotals[movement.data] = 0;

                if (!dailyMovements[movement.data]) {
                    dailyMovements[movement.data] = {
                        deposito: 0,
                        saque: 0,
                    };
                }

                const value = Number(movement.valor || 0);

                dailyTotals[movement.data] += value * movementSignal(movement.tipo);

                if (movement.tipo === "Depósito") {
                    dailyMovements[movement.data].deposito += value;
                }

                if (movement.tipo === "Saque") {
                    dailyMovements[movement.data].saque += value;
                }
            });
        }

        if (analyticsPeriodType === "Anual") {
            const year = analyticsPeriodReference;
            const currentYear = getYearRef(hojeISO());
            const currentMonth = Number(hojeISO().slice(5, 7));
            const monthlyTotals = {};

            Object.entries(dailyTotals).forEach(([dateISO, value]) => {
                if (!String(dateISO).startsWith(`${year}-`)) return;
                const monthKey = getMonthKeyFromDate(dateISO);
                monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + Number(value || 0);
            });

            let banca = chartStartValue;

            return Array.from({ length: 12 }, (_, index) => {
                const month = String(index + 1).padStart(2, "0");
                const monthKey = `${year}-${month}`;
                banca += monthlyTotals[monthKey] || 0;
                const isFutureMonth = year === currentYear && index + 1 > currentMonth;
                const roundedBank = Number(banca.toFixed(2));

                return {
                    data: `${monthKey}-01`,
                    banca: roundedBank,
                    bancaLinha: isFutureMonth ? undefined : roundedBank,
                    deposito: 0,
                    saque: 0,
                    future: isFutureMonth,
                    label: getAnalyticsDateLabel(`${monthKey}-01`, "Anual"),
                    tooltipLabel: `${month}/${year}`,
                };
            });
        }

        if (analyticsPeriodType === "Geral") {
            const currentYear = Number(getYearRef(hojeISO()));
            const firstTicketYear = chartTickets.reduce((earliestYear, ticket) => {
                const ticketYear = Number(getYearRef(ticket.data));
                if (!Number.isFinite(ticketYear)) return earliestYear;
                return earliestYear === null ? ticketYear : Math.min(earliestYear, ticketYear);
            }, null);
            const startYear = firstTicketYear ?? currentYear;
            const yearlyTotals = {};

            Object.entries(dailyTotals).forEach(([dateISO, value]) => {
                const year = Number(getYearRef(dateISO));
                if (year < startYear || year > currentYear) return;
                yearlyTotals[year] = (yearlyTotals[year] || 0) + Number(value || 0);
            });

            const previousTotals = Object.entries(dailyTotals).reduce((sum, [dateISO, value]) => {
                const year = Number(getYearRef(dateISO));
                return year < startYear ? sum + Number(value || 0) : sum;
            }, 0);
            let banca = chartStartValue + previousTotals;

            return Array.from({ length: currentYear - startYear + 1 }, (_, index) => {
                const year = startYear + index;
                banca += yearlyTotals[year] || 0;
                const roundedBank = Number(banca.toFixed(2));

                return {
                    data: `${year}-01-01`,
                    banca: roundedBank,
                    bancaLinha: roundedBank,
                    deposito: 0,
                    saque: 0,
                    label: String(year),
                    tooltipLabel: String(year),
                };
            });
        }

        const orderedDates = Object.keys(dailyTotals).sort((a, b) =>
            a.localeCompare(b)
        );
        const shouldShowFullWeeklyAxis = analyticsPeriodType === "Semanal";
        const shouldShowMonthlyDailyAxis = analyticsPeriodType === "Mensal";
        const today = hojeISO();
        const boundedEndDate = analyticsPeriodInterval.end
            ? (today < analyticsPeriodInterval.end ? today : analyticsPeriodInterval.end)
            : today;

        const startDate =
            shouldShowFullWeeklyAxis
                ? analyticsPeriodInterval.start
                : shouldShowMonthlyDailyAxis
                    ? analyticsPeriodInterval.start
                    : analyticsPeriodType === "Geral"
                        ? orderedDates[0] || hojeISO()
                        : analyticsPeriodInterval.start;

        const lastActivityDateInPeriod =
            analyticsPeriodType === "Geral"
                ? orderedDates[orderedDates.length - 1]
                : orderedDates
                    .filter((date) => date >= analyticsPeriodInterval.start && date <= analyticsPeriodInterval.end)
                    .pop();

        const endDate =
            shouldShowFullWeeklyAxis
                ? analyticsPeriodInterval.end
                : shouldShowMonthlyDailyAxis
                    ? boundedEndDate
                    : analyticsPeriodType === "Geral"
                        ? orderedDates[orderedDates.length - 1] || hojeISO()
                        : lastActivityDateInPeriod || analyticsPeriodInterval.start;

        if (!startDate || !endDate) return [];

        let banca = chartStartValue;
        const result = [];
        let currentDate = startDate;

        while (currentDate <= endDate) {
            const dailyValue = dailyTotals[currentDate] || 0;
            const hasActivity = Object.prototype.hasOwnProperty.call(dailyTotals, currentDate);

            if (shouldShowFullWeeklyAxis || shouldShowMonthlyDailyAxis || hasActivity || result.length === 0) {
                banca += dailyValue;

                result.push({
                    data: currentDate,
                    banca: Number(banca.toFixed(2)),
                    deposito: dailyMovements[currentDate]?.deposito || 0,
                    saque: dailyMovements[currentDate]?.saque || 0,
                    hasActivity,
                    future: shouldShowFullWeeklyAxis ? currentDate > today : false,
                });
            }

            currentDate = addDays(currentDate, 1);
        }

        const labeledResult = result.map((item) => ({
            ...item,
            bancaLinha: item.future ? undefined : item.banca,
            label: analyticsPeriodType === "Semanal"
                ? getAnalyticsDateLabel(item.data, "Semanal")
                : getCompactResultLabel(item.data, analyticsPeriodType),
            tooltipLabel: formatDateBR(item.data),
        }));

        if (labeledResult.length === 1) {
            const onlyPoint = labeledResult[0];
            const baselineDate = addDays(onlyPoint.data, -1);
            return [
                {
                    ...onlyPoint,
                    data: baselineDate,
                    label: getCompactResultLabel(baselineDate, analyticsPeriodType),
                    tooltipLabel: formatDateBR(baselineDate),
                    hasActivity: false,
                },
                onlyPoint,
            ];
        }

        if (analyticsPeriodType !== "Anual") {
            return labeledResult;
        }

        return Object.values(
            labeledResult.reduce((acc, item) => {
                acc[getMonthKeyFromDate(item.data)] = {
                    ...item,
                    label: getAnalyticsDateLabel(item.data, analyticsPeriodType),
                };
                return acc;
            }, {})
        );
    }, [
        analyticsBaseTicketsForPeriod,
        analyticsBaseMovementsForPeriod,
        houses,
        tickets,
        movements,
        selectedHouseScope,
        periodType,
        periodReference,
        analyticsPeriodType,
        analyticsPeriodReference,
        analyticsPeriodInterval,
        chartMode,
    ]);

    const resultChartData = useMemo(() => {
        if (selectedHouseScope === null) return [];

        const totals = {};
        const activityKeys = new Set();
        const slotKeys = [];

        if (resultDailyMonthInterval.start && resultDailyMonthInterval.end) {
            let currentDate = resultDailyMonthInterval.start;
            while (currentDate <= resultDailyMonthInterval.end) {
                slotKeys.push(currentDate);
                currentDate = addDays(currentDate, 1);
            }
        }

        const chartTickets = tickets.filter((ticket) => {
            if (!resultDailyMonthInterval.start || !resultDailyMonthInterval.end) return false;
            if (ticket.data < resultDailyMonthInterval.start || ticket.data > resultDailyMonthInterval.end) return false;
            if (selectedHouseScope === "all") return true;
            return Number(ticket.casaId) === Number(selectedHouseScope);
        });

        const chartMovements = movements.filter((movement) => {
            if (!resultDailyMonthInterval.start || !resultDailyMonthInterval.end) return false;
            if (movement.data < resultDailyMonthInterval.start || movement.data > resultDailyMonthInterval.end) return false;
            if (selectedHouseScope === "all") return true;
            return Number(movement.casaId) === Number(selectedHouseScope);
        });

        chartTickets
            .filter((ticket) => ticket.resultado !== "Pendente")
            .forEach((ticket) => {
                const key = ticket.data;
                activityKeys.add(key);
                totals[key] = (totals[key] || 0) + getRealTicketImpact(ticket);
            });

        if (chartMode === "Banca") {
            chartMovements.forEach((movement) => {
                const key = movement.data;
                activityKeys.add(key);
                totals[key] = (totals[key] || 0) + Number(movement.valor || 0) * movementSignal(movement.tipo);
            });
        }

        const keys = slotKeys.length
            ? Array.from(new Set([...slotKeys, ...Object.keys(totals)]))
            : Object.keys(totals);

        return keys
            .sort((a, b) => a.localeCompare(b))
            .map((key) => {
                const hasActivity = activityKeys.has(key);
                return {
                    key,
                    label: getCompactResultLabel(key, "Mensal"),
                    value: Number(Number(totals[key] || 0).toFixed(2)),
                    hasActivity,
                };
            });
    }, [
        tickets,
        movements,
        selectedHouseScope,
        resultDailyMonthInterval,
        chartMode,
    ]);

    const totalInitialBank = useMemo(() => {
        return housesWithCurrentBank.reduce(
            (acc, house) => acc + Number(house.bancaInicialPeriodo ?? house.bancaInicial ?? 0),
            0
        );
    }, [housesWithCurrentBank]);

    const allResolvedPeriodTickets = useMemo(() => {
        return baseTicketsForPeriod.filter((ticket) => ticket.resultado !== "Pendente");
    }, [baseTicketsForPeriod]);

    const allGreenPeriodCount = useMemo(() => {
        return allResolvedPeriodTickets.filter((ticket) => {
            if (ticket.resultado === "Green") return true;
            if (ticket.resultado === "Cash Out" && Number(ticket.retorno || 0) > Number(ticket.stake || 0)) return true;
            return false;
        }).length;
    }, [allResolvedPeriodTickets]);

    const allHitRate = useMemo(() => {
        return allResolvedPeriodTickets.length > 0
            ? (allGreenPeriodCount / allResolvedPeriodTickets.length) * 100
            : 0;
    }, [allResolvedPeriodTickets, allGreenPeriodCount]);

    const topInitialBank =
        selectedHouseScope === null
            ? null
            : selectedHouseScope === "all"
                ? totalInitialBank
                : selectedHouseData?.bancaInicialPeriodo ?? selectedHouseData?.bancaInicial ?? 0;

    const topCurrentBank =
        selectedHouseScope === null || topInitialBank === null
            ? null
            : topInitialBank + summaryStats.realProfit + summaryStats.movementBalance;

    const finalResult =
        selectedHouseScope === null ? null : summaryStats.realProfit;
    const topBankEvolutionPercent =
        topInitialBank && topInitialBank !== 0 && topCurrentBank !== null
            ? ((topCurrentBank - topInitialBank) / topInitialBank) * 100
            : 0;
    const ticketsOfDay = useMemo(() => {
        return [...baseTicketsForPeriod].sort(
            (a, b) => b.data.localeCompare(a.data) || b.id - a.id
        );
    }, [baseTicketsForPeriod]);
    const authRequiredMessage = "Sessão expirada. Faça login novamente para continuar.";

    async function handleAddOrEditHouse(event) {
        event.preventDefault();
        setIsSavingHouse(true);

        try {
            const name = houseForm.nome.trim();
            const initialBank = parseCurrencyTyping(houseForm.bancaInicial);

            if (!name) {
                setHouseFeedback({
                    type: "error",
                    message: "Informe o nome da casa.",
                });
                return;
            }

            if (Number.isNaN(initialBank)) {
                setHouseFeedback({
                    type: "error",
                    message: "Informe a banca inicial. Pode ser R$ 0,00.",
                });
                return;
            }

            const exists = houses.some(
                (house) =>
                    house.nome.toLowerCase() === name.toLowerCase() &&
                    house.id !== editingHouseId
            );

            if (exists) {
                setHouseFeedback({
                    type: "error",
                    message: "Essa casa já foi cadastrada.",
                });
                return;
            }

            if (!userId) {
                setHouseFeedback({
                    type: "error",
                    message: authRequiredMessage,
                });
                return;
            }

            if (editingHouseId) {
                const houseDetails = {
                    logoDataUrl: houseForm.logoDataUrl || "",
                    logoName: houseForm.logoName || "",
                    moeda: houseForm.moeda || "BRL",
                    observacoes: String(houseForm.observacoes || "").slice(0, 200),
                };
                const { error } = await supabase
                    .from("houses")
                    .update({
                        nome: name,
                        banca_inicial: initialBank,
                    })
                    .eq("id", editingHouseId)
                    .eq("user_id", userId);

                if (error) {
                    console.error("Erro ao atualizar casa no Supabase:", error);

                    setHouseFeedback({
                        type: "error",
                        message: "Não foi possível atualizar a casa.",
                    });

                    return;
                }

                setHouses((prev) =>
                    prev.map((house) =>
                        house.id === editingHouseId
                            ? { ...house, nome: name, bancaInicial: initialBank, ...houseDetails }
                            : house
                    )
                );
                saveStoredHouseDetails(userId, editingHouseId, houseDetails);

                setEditingHouseId(null);
                setHouseForm(initialHouseForm);

                setHouseFeedback({
                    type: "success",
                    message: "Casa atualizada com sucesso!",
                });

                setTimeout(() => {
                    setHouseFeedback({ type: "", message: "" });
                }, 3000);

                return;
            }

            const newHouse = {
                id: createPersistentId(houses.map((house) => house.id)),
                nome: name,
                bancaInicial: initialBank,
                logoDataUrl: houseForm.logoDataUrl || "",
                logoName: houseForm.logoName || "",
                moeda: houseForm.moeda || "BRL",
                observacoes: String(houseForm.observacoes || "").slice(0, 200),
            };

            const { error } = await supabase.from("houses").insert([
                {
                    id: newHouse.id,
                    nome: newHouse.nome,
                    banca_inicial: newHouse.bancaInicial,
                    user_id: userId,
                },
            ]);

            if (error) {
                console.error("Erro ao salvar casa no Supabase:", error);

                setHouseFeedback({
                    type: "error",
                    message: "Não foi possível adicionar a casa.",
                });

                return;
            }

            setHouses((prev) => [...prev, newHouse]);
            saveStoredHouseDetails(userId, newHouse.id, newHouse);
            setEditingHouseId(null);
            setHouseForm(initialHouseForm);

            setHouseFeedback({
                type: "success",
                message: "Casa adicionada com sucesso!",
            });

            setTimeout(() => {
                setHouseFeedback({ type: "", message: "" });
            }, 3000);
        } finally {
            setTimeout(() => {
                setIsSavingHouse(false);
            }, 600);
        }
    }

    function handleStartEditHouse(houseId) {
        const house = houses.find((item) => Number(item.id) === Number(houseId));
        if (!house) return;

        setHouseForm({
            nome: house.nome,
            bancaInicial: formatMoney(house.bancaInicial),
            logoDataUrl: house.logoDataUrl || "",
            logoName: house.logoName || "",
            moeda: house.moeda || "BRL",
            observacoes: house.observacoes || "",
        });
        setEditingHouseId(house.id);
        setHouseFeedback({ type: "", message: "" });
    }

    function handleCancelEditHouse() {
        setEditingHouseId(null);
        setHouseForm(initialHouseForm);
        setHouseFeedback({ type: "", message: "" });
    }

    async function handleConfirmDeleteHouse() {
        if (!housePendingDelete || deletingHouseId) return;

        if (!userId) {
            setHouseFeedback({
                type: "error",
                message: authRequiredMessage,
            });
            setHousePendingDelete(null);
            return;
        }

        setDeletingHouseId(housePendingDelete.id);

        const { error } = await supabase
            .from("houses")
            .delete()
            .eq("id", housePendingDelete.id)
            .eq("user_id", userId);

        if (error) {
            console.error("Erro ao excluir casa no Supabase:", error);
            setHouseFeedback({
                type: "error",
                message: "Não foi possível excluir a casa.",
            });
            setDeletingHouseId(null);
            return;
        }

        setHouses((prev) => prev.filter((house) => Number(house.id) !== Number(housePendingDelete.id)));
        setTickets((prev) => prev.filter((ticket) => Number(ticket.casaId) !== Number(housePendingDelete.id)));
        setMovements((prev) => prev.filter((movement) => Number(movement.casaId) !== Number(housePendingDelete.id)));

        if (Number(selectedHouseScope) === Number(housePendingDelete.id)) {
            setSelectedHouseScope(null);
        }

        if (editingHouseId === housePendingDelete.id) {
            handleCancelEditHouse();
        }

        setHousePendingDelete(null);
        setDeletingHouseId(null);
        setHouseFeedback({
            type: "success",
            message: "Casa excluida com sucesso.",
        });
    }

    function resetTicketForm() {
        setTicketForm({
            ...initialTicketForm,
            data: hojeISO(),
        });
        setEditingTicketId(null);
        setTicketFeedback({ type: "", message: "" });
    }

    function resetMovementForm() {
        setMovementForm({
            ...initialMovementForm,
            data: hojeISO(),
        });
        setEditingMovementId(null);
        setMovementFeedback({ type: "", message: "" });
    }

    async function handleSaveTicket(event) {
        event.preventDefault();
        if (isSavingTicket) return;
        setTicketFeedback({ type: "", message: "" });

        if (!userId) {
            setTicketFeedback({ type: "error", message: authRequiredMessage });
            handleAuthFailure();
            return;
        }

        if (!ticketForm.casaId || !ticketForm.categoria || !ticketForm.odd || !ticketForm.stake) {
            setTicketFeedback({ type: "error", message: "Preencha casa, categoria, odd e valor apostado." });
            return;
        }

        const odd = Number(String(ticketForm.odd || "").replace(",", "."));
        if (Number.isNaN(odd) || odd <= 0) {
            setTicketFeedback({ type: "error", message: "Informe uma odd válida." });
            return;
        }

        const stake = parseCurrencyTyping(ticketForm.stake);
        if (Number.isNaN(stake) || stake <= 0) {
            setTicketFeedback({ type: "error", message: "Informe um valor apostado válido." });
            return;
        }

        let returned = parseCurrencyTyping(ticketForm.retorno);

        if (ticketForm.resultado === "Red") {
            returned = 0;
        }

        if (ticketForm.resultado === "Green" && !ticketForm.retorno) {
            returned = stake * odd;
        }

        if (
            ticketForm.resultado !== "Red" &&
            ticketForm.resultado !== "Pendente" &&
            (Number.isNaN(returned) || returned < 0)
        ) {
            setTicketFeedback({ type: "error", message: "Informe um retorno válido." });
            return;
        }

        if (ticketForm.resultado === "Pendente") {
            returned = 0;
        }

        const breakdown = normalizeStakeBreakdown(ticketForm, stake);
        if (!breakdown.valid) {
            setTicketFeedback({ type: "error", message: breakdown.message });
            return;
        }

        if (
            normalizeStakeOrigin(ticketForm.origemStake) !== STAKE_ORIGINS.BONUS
        ) {
            const selectedHouse = housesWithCurrentBank.find(
                (house) => Number(house.id) === Number(ticketForm.casaId)
            );

            const currentBank = Number(selectedHouse?.bancaAtual || 0);

            const realStakeToUse = Number(breakdown.stakeSaldo || 0);

            let previousRealStake = 0;

            if (editingTicketId) {
                const previousTicket = tickets.find(
                    (ticket) => Number(ticket.id) === Number(editingTicketId)
                );

                if (
                    previousTicket &&
                    Number(previousTicket.casaId) === Number(ticketForm.casaId)
                ) {
                    previousRealStake = Number(previousTicket.stakeReal || 0);
                }
            }

            const availableBank = currentBank + previousRealStake;

            if (realStakeToUse > availableBank) {
                setTicketFeedback({
                    type: "error",
                    message: `Aposta nao permitida. A banca disponivel para esta casa e ${formatMoney(availableBank)}.`,
                });
                return;
            }
        }

        if (
            ticketForm.resultado !== "Pendente" &&
            ticketForm.resultado !== "Cash Out" &&
            returned === stake
        ) {
            setTicketFeedback({
                type: "error",
                message: "Quando o retorno e igual ao valor apostado, o resultado deve ser Aposta encerrada ou Pendente.",
            });
            return;
        }

        const profit = returned - stake;
        const stakeDetails = calculateStakeDetails({
            stake,
            returned,
            stakeSaldo: breakdown.stakeSaldo,
            stakeDeposito: breakdown.stakeDeposito,
            stakeBonus: breakdown.stakeBonus,
        });

        setIsSavingTicket(true);

        if (editingTicketId) {
            const updatedTicket = {
                ...ticketForm,
                casaId: Number(ticketForm.casaId),
                origemStake: normalizeStakeOrigin(ticketForm.origemStake),
                odd,
                stake,
                retorno: returned,
                lucro: profit,
                stakeSaldo: breakdown.stakeSaldo,
                stakeDeposito: breakdown.stakeDeposito,
                stakeBonus: breakdown.stakeBonus,
                ...stakeDetails,
            };

            const { error } = await supabase
                .from("tickets")
                .update({
                    data: updatedTicket.data,
                    casa_id: updatedTicket.casaId,
                    categoria: updatedTicket.categoria,
                    odd: updatedTicket.odd,
                    stake: updatedTicket.stake,
                    retorno: updatedTicket.retorno,
                    origem_stake: updatedTicket.origemStake,
                    stake_saldo: updatedTicket.stakeSaldo,
                    stake_deposito: updatedTicket.stakeDeposito,
                    stake_bonus: updatedTicket.stakeBonus,
                    resultado: updatedTicket.resultado,
                    observacoes: updatedTicket.observacoes,
                    lucro: updatedTicket.lucro,
                    stake_real: updatedTicket.stakeReal,
                    recovered_real: updatedTicket.recoveredReal,
                    recovered_bonus: updatedTicket.recoveredBonus,
                    perda_real: updatedTicket.perdaReal,
                    perda_bonus: updatedTicket.perdaBonus,
                    lucro_real: updatedTicket.lucroReal,
                })
                .eq("id", editingTicketId)
                .eq("user_id", userId);

            if (error) {
                console.error("Erro ao atualizar bilhete no Supabase:", error);
                if (isSupabaseAuthError(error)) {
                    handleAuthFailure();
                }
                setTicketFeedback({ type: "error", message: "Não foi possível atualizar o bilhete. Tente novamente." });
                setIsSavingTicket(false);
                return;
            }

            const updated = tickets.map((ticket) => {
                if (ticket.id !== editingTicketId) return ticket;

                return {
                    ...ticket,
                    ...updatedTicket,
                };
            });

            setTickets(reorderTickets(updated));
            resetTicketForm();
            setActiveNavItem("tickets");
            setActiveBottomPanel("ticketsDay");
            setIsSavingTicket(false);
            return;
        }

        const ticketNumber = getTicketNumberForDate(tickets, ticketForm.data);
        const ticketName = buildTicketName(ticketForm.data, ticketNumber);

        const newTicket = {
            id: createPersistentId(tickets.map((ticket) => ticket.id)),
            ...ticketForm,
            casaId: Number(ticketForm.casaId),
            origemStake: normalizeStakeOrigin(ticketForm.origemStake),
            odd,
            stake,
            retorno: returned,
            lucro: profit,
            stakeSaldo: breakdown.stakeSaldo,
            stakeDeposito: breakdown.stakeDeposito,
            stakeBonus: breakdown.stakeBonus,
            ...stakeDetails,
            numeroBilhete: ticketNumber,
            nomeBilhete: ticketName,
        };

        const { error } = await supabase.from("tickets").insert([
            {
                id: newTicket.id,
                data: newTicket.data,
                casa_id: newTicket.casaId,
                categoria: newTicket.categoria,
                odd: newTicket.odd,
                stake: newTicket.stake,
                retorno: newTicket.retorno,
                origem_stake: newTicket.origemStake,
                stake_saldo: newTicket.stakeSaldo,
                stake_deposito: newTicket.stakeDeposito,
                stake_bonus: newTicket.stakeBonus,
                resultado: newTicket.resultado,
                observacoes: newTicket.observacoes,
                lucro: newTicket.lucro,
                stake_real: newTicket.stakeReal,
                recovered_real: newTicket.recoveredReal,
                recovered_bonus: newTicket.recoveredBonus,
                perda_real: newTicket.perdaReal,
                perda_bonus: newTicket.perdaBonus,
                lucro_real: newTicket.lucroReal,
                numero_bilhete: newTicket.numeroBilhete,
                nome_bilhete: newTicket.nomeBilhete,
                user_id: userId,
            },
        ]);

        if (error) {
            console.error("Erro Supabase bilhete:", error);
            if (isSupabaseAuthError(error)) {
                handleAuthFailure();
            }
            setTicketFeedback({ type: "error", message: `Não foi possível salvar o bilhete. ${error.message || "Tente novamente."}` });
            setIsSavingTicket(false);
            return;
        }

        setTickets((prev) => reorderTickets([newTicket, ...prev]));
        resetTicketForm();
        setActiveNavItem("tickets");
        setActiveBottomPanel("ticketsDay");
        setIsSavingTicket(false);
    }

    async function handleSaveMovement(event) {
        event.preventDefault();
        if (isSavingMovement) return;
        setMovementFeedback({ type: "", message: "" });

        if (!userId) {
            setMovementFeedback({ type: "error", message: authRequiredMessage });
            handleAuthFailure();
            return;
        }

        const parsedValue = parseCurrencyTyping(movementForm.valor);

        if (!movementForm.casaId || !movementForm.tipo || Number.isNaN(parsedValue)) {
            setMovementFeedback({ type: "error", message: "Preencha casa, tipo e valor da movimentação." });
            return;
        }

        const payload = {
            ...movementForm,
            casaId: Number(movementForm.casaId),
            valor: parsedValue,
        };

        if (payload.tipo === "Saque") {
            const selectedHouse = housesWithCurrentBank.find(
                (house) => Number(house.id) === Number(payload.casaId)
            );

            const currentBank = Number(selectedHouse?.bancaAtual || 0);

            let previousMovementValue = 0;

            if (editingMovementId) {
                const previousMovement = movements.find(
                    (movement) => Number(movement.id) === Number(editingMovementId)
                );

                if (
                    previousMovement &&
                    previousMovement.tipo === "Saque" &&
                    Number(previousMovement.casaId) === Number(payload.casaId)
                ) {
                    previousMovementValue = Number(previousMovement.valor || 0);
                }
            }

            const availableBank = currentBank + previousMovementValue;

            if (payload.valor > availableBank) {
                setMovementFeedback({
                    type: "error",
                    message: `Saque não permitido. A banca disponível para esta casa é ${formatMoney(availableBank)}.`,
                });
                return;
            }
        }

        setIsSavingMovement(true);

        if (editingMovementId) {
            const { error } = await supabase
                .from("movements")
                .update({
                    data: payload.data,
                    casa_id: payload.casaId,
                    tipo: payload.tipo,
                    valor: payload.valor,
                    metodo: payload.metodo || "PIX",
                    observacoes: payload.observacoes,
                })
                .eq("id", editingMovementId)
                .eq("user_id", userId);

            if (error) {
                console.error("Erro ao atualizar movimentação no Supabase:", error);
                if (isSupabaseAuthError(error)) {
                    handleAuthFailure();
                }
                setMovementFeedback({ type: "error", message: "Não foi possível atualizar a movimentação. Tente novamente." });
                setIsSavingMovement(false);
                return;
            }

            setMovements((prev) =>
                prev.map((movement) =>
                    Number(movement.id) === Number(editingMovementId)
                        ? { ...movement, ...payload, id: movement.id }
                        : movement
                )
            );
            resetMovementForm();
            setActiveNavItem("movements");
            setActiveBottomPanel("extract");
            setIsSavingMovement(false);
            return;
        }

        const newMovement = {
            id: createPersistentId(movements.map((movement) => movement.id)),
            ...payload,
        };

        console.log("movimento que vou salvar:", newMovement);

        const { error } = await supabase.from("movements").insert([
            {
                id: newMovement.id,
                data: newMovement.data,
                casa_id: newMovement.casaId,
                tipo: newMovement.tipo,
                valor: newMovement.valor,
                metodo: newMovement.metodo || "PIX",
                observacoes: newMovement.observacoes,
                user_id: userId,
            },
        ]);

        console.log("erro movement:", error);

        if (error) {
            console.error("Erro Supabase movimentação completo:", error);
            if (isSupabaseAuthError(error)) {
                handleAuthFailure();
            }
            setMovementFeedback({ type: "error", message: `Não foi possível salvar a movimentação. ${error.message || "Tente novamente."}` });
            setIsSavingMovement(false);
            return;
        }

        setMovements((prev) => [newMovement, ...prev]);
        resetMovementForm();
        setActiveNavItem("movements");
        setActiveBottomPanel("extract");
        setIsSavingMovement(false);
    }

    function handleStartEditTicket(ticketId) {
        const ticket = tickets.find((item) => item.id === ticketId);
        if (!ticket) return;
        clearOperationFeedback();

        setTicketForm({
            data: ticket.data,
            casaId: String(ticket.casaId),
            categoria: ticket.categoria,
            odd: String(ticket.odd),
            stake: formatMoney(ticket.stake),
            retorno: formatMoney(ticket.retorno),
            origemStake: normalizeStakeOrigin(ticket.origemStake),
            stakeSaldo: ticket.stakeSaldo ? formatMoney(ticket.stakeSaldo) : "",
            stakeDeposito: ticket.stakeDeposito ? formatMoney(ticket.stakeDeposito) : "",
            stakeBonus: ticket.stakeBonus ? formatMoney(ticket.stakeBonus) : "",
            resultado: ticket.resultado,
            observacoes: ticket.observacoes || "",
        });

        setEditingTicketId(ticketId);
        setActiveBottomPanel("ticket");

    }

    async function handleDeleteTicket(ticketId) {
        if (deletingTicketId) return;
        setTicketFeedback({ type: "", message: "" });

        if (!userId) {
            setTicketFeedback({ type: "error", message: authRequiredMessage });
            handleAuthFailure();
            return;
        }

        const ticketToDelete = tickets.find((ticket) => Number(ticket.id) === Number(ticketId));
        if (!ticketToDelete) {
            setTicketFeedback({ type: "error", message: "Bilhete não encontrado." });
            return;
        }

        const ledgerValidation = validateHouseLedger(
            {
                houses,
                movements,
                tickets: tickets.filter((ticket) => Number(ticket.id) !== Number(ticketId)),
            },
            ticketToDelete.casaId,
            "esse bilhete"
        );

        if (!ledgerValidation.valid) {
            setTicketFeedback({
                type: "error",
                message: ledgerValidation.message,
            });
            return;
        }

        const confirmed = window.confirm("Deseja excluir este bilhete?");
        if (!confirmed) return;

        setDeletingTicketId(ticketId);

        const { error } = await supabase
            .from("tickets")
            .delete()
            .eq("id", ticketId)
            .eq("user_id", userId);

        if (error) {
            console.error("Erro ao excluir bilhete:", error);
            if (isSupabaseAuthError(error)) {
                handleAuthFailure();
            }
            setTicketFeedback({ type: "error", message: "Não foi possível excluir o bilhete. Tente novamente." });
            setDeletingTicketId(null);
            return;
        }

        setTickets((prev) => prev.filter((ticket) => ticket.id !== ticketId));
        setDeletingTicketId(null);

        if (editingTicketId === ticketId) {
            setEditingTicketId(null);
            setTicketForm(initialTicketForm);
        }

    }

    function handleStartEditMovement(movementId) {
        const movement = movements.find((item) => item.id === movementId);
        if (!movement) return;
        clearOperationFeedback();

        setMovementForm({
            data: movement.data,
            casaId: String(movement.casaId),
            tipo: movement.tipo,
            valor: formatMoney(movement.valor),
            metodo: movement.metodo || "PIX",
            observacoes: movement.observacoes || "",
        });

        setEditingMovementId(movementId);
        setActiveBottomPanel("movementForm");
    }

    async function handleDeleteMovement(movementId) {
        if (deletingMovementId) return;
        setMovementFeedback({ type: "", message: "" });

        if (!userId) {
            setMovementFeedback({ type: "error", message: authRequiredMessage });
            handleAuthFailure();
            return;
        }

        const movementToDelete = movements.find((movement) => Number(movement.id) === Number(movementId));
        if (!movementToDelete) {
            setMovementFeedback({ type: "error", message: "Movimentação não encontrada." });
            return;
        }

        const removedItemLabel = movementToDelete.tipo === "Depósito" ? "esse depósito" : "essa movimentação";
        const ledgerValidation = validateHouseLedger(
            {
                houses,
                movements: movements.filter((movement) => Number(movement.id) !== Number(movementId)),
                tickets,
            },
            movementToDelete.casaId,
            removedItemLabel
        );

        if (!ledgerValidation.valid) {
            setMovementFeedback({
                type: "error",
                message: ledgerValidation.message,
            });
            return;
        }

        const confirmed = window.confirm("Deseja excluir esta movimentação?");
        if (!confirmed) return;

        setDeletingMovementId(movementId);

        const { error } = await supabase
            .from("movements")
            .delete()
            .eq("id", movementId)
            .eq("user_id", userId);

        if (error) {
            console.error("Erro ao excluir movimentação:", error);
            if (isSupabaseAuthError(error)) {
                handleAuthFailure();
            }
            setMovementFeedback({ type: "error", message: "Não foi possível excluir a movimentação. Tente novamente." });
            setDeletingMovementId(null);
            return;
        }

        setMovements((prev) =>
            prev.filter((movement) => movement.id !== movementId)
        );
        setDeletingMovementId(null);

        if (editingMovementId === movementId) {
            setEditingMovementId(null);
            setMovementForm(initialMovementForm);
        }
    }

    const topMetricPages = useMemo(() => {
        const currentBankTone =
            topCurrentBank === null || topInitialBank === null
                ? "neutral"
                : topCurrentBank > topInitialBank
                    ? "positive"
                    : topCurrentBank < topInitialBank
                        ? "negative"
                        : "neutral";
        const currentBankCard = {
            title: "Banca Atual",
            icon: "BA",
            eyebrow: "Saldo",
            description: "Banca no fim do período",
            tooltip: KPI_TOOLTIP_TEXTS.currentBank,
            value: topCurrentBank,
            formatter: formatMoney,
            highlight: true,
            tone: currentBankTone,
        };

        const periodInitialBankCard = {
            title: "Banca Inicial",
            icon: "BI",
            eyebrow: "Início",
            description: "Banca no início do período",
            tooltip: KPI_TOOLTIP_TEXTS.initialBank,
            value: topInitialBank,
            formatter: formatMoney,
            highlight: true,
            tone: "neutral",
        };

        const periodFinalBankCard = {
            title: "Banca Final",
            icon: "BF",
            eyebrow: "Saldo",
            description: `Evolução: ${formatSignedPercent(topBankEvolutionPercent)}`,
            value: topCurrentBank,
            formatter: formatMoney,
            tone: "neutral",
        };

        const shortPeriodFinalBankCard = {
            ...periodFinalBankCard,
            description: "Banca no fim do período",
            tooltip: KPI_TOOLTIP_TEXTS.currentBank,
        };

        const resultCard = {
            title: periodType === "Mensal" ? "Resultado Mensal" : "Resultado",
            icon: "RS",
            eyebrow: "P&L",
            description: periodType === "Mensal" ? "Prejuízo no mês" : "Resultado do período",
            tooltip: KPI_TOOLTIP_TEXTS.result,
            value: finalResult,
            formatter: formatSignedMoney,
            tone:
                finalResult === null
                    ? "neutral"
                    : finalResult > 0
                        ? "positive"
                        : finalResult < 0
                            ? "negative"
                            : "neutral",
        };

        const wageredCard = {
            title: "Valor Apostado",
            icon: "VA",
            eyebrow: "Valor apostado",
            description: "Total apostado no período",
            tooltip: KPI_TOOLTIP_TEXTS.wagered,
            value: selectedHouseScope === null ? null : summaryStats.invested,
            formatter: formatMoney,
            tone: "neutral",
        };

        const periodWageredCard = {
            ...wageredCard,
            description: `Valor real apostado: ${formatMoney(summaryStats.investedReal)}`,
        };

        const roiCard = {
            title: "ROI (Retorno)",
            icon: "ROI",
            eyebrow: "Retorno",
            description: "Retorno sobre investimento",
            value: selectedHouseScope === null ? null : summaryStats.roi,
            formatter: formatSignedPercent,
            tone:
                selectedHouseScope === null
                    ? "neutral"
                    : summaryStats.roi > 0
                        ? "positive"
                        : summaryStats.roi < 0
                            ? "negative"
                            : "neutral",
        };

        const bankEvolutionCard = {
            title: "Evolução da Banca",
            icon: "EV",
            eyebrow: "Variação",
            description: "Variação da banca no período",
            value: selectedHouseScope === null ? null : topBankEvolutionPercent,
            formatter: formatSignedPercent,
            tone:
                selectedHouseScope === null
                    ? "neutral"
                    : topBankEvolutionPercent > 0
                        ? "positive"
                        : topBankEvolutionPercent < 0
                            ? "negative"
                            : "neutral",
        };

        if (periodType === "Diário") {
            return [
                [
                    periodInitialBankCard,
                    wageredCard,
                    resultCard,
                    shortPeriodFinalBankCard,
                ],
            ];
        }

        if (periodType === "Semanal") {
            return [
                [
                    periodInitialBankCard,
                    wageredCard,
                    resultCard,
                    shortPeriodFinalBankCard,
                ],
            ];
        }

        if (periodType === "Mensal" || periodType === "Anual" || periodType === "Geral") {
            return [
                [
                    periodInitialBankCard,
                    periodWageredCard,
                    resultCard,
                    periodFinalBankCard,
                    roiCard,
                ],
            ];
        }

        return [
            [
                periodInitialBankCard,
                periodWageredCard,
                resultCard,
                periodFinalBankCard,
                roiCard,
            ],
        ];
    }, [
        topCurrentBank,
        topInitialBank,
        topBankEvolutionPercent,
        summaryStats,
        finalResult,
        selectedHouseScope,
        periodType,
    ]);

    function renderTopValue(value, formatter = (v) => v) {
        if (value === null) return "--";
        return formatter(value);
    }

    const metadata = user?.user_metadata || {};
    const metadataFullNameParts = String(metadata.full_name || "").trim().split(/\s+/).filter(Boolean);
    const accountFirstName =
        metadata.first_name ||
        metadata.nome ||
        metadataFullNameParts[0] ||
        "";
    const accountLastName =
        metadata.last_name ||
        metadataFullNameParts.slice(1).join(" ") ||
        "";
    const accountName =
        `${accountFirstName} ${accountLastName}`.trim() ||
        metadata.full_name ||
        metadata.nome ||
        user?.email?.split("@")[0] ||
        "Usuário";
    const accountEmail = user?.email || "E-mail não disponível";
    const accountUsername = metadata.username || "";
    const accountPhone = formatBrazilianPhone(metadata.phone || "");
    const accountPlan = metadata.plan || metadata.plano || user?.plan || "Plano Free";
    const dashboardDayMarkers = buildDayMarkers(tickets, movements);
    const referenceMetrics = topMetricPages[0] || [];
    const referenceReferences =
        periodReference && !availableReferences.includes(periodReference)
            ? [periodReference, ...availableReferences]
            : availableReferences;
    const referenceActions = [
        {
            group: "tickets",
            label: "Bilhetes do dia",
            active: activeBottomPanel === "ticketsDay",
            onClick: () => {
                clearOperationFeedback();
                setActiveNavItem("tickets");
                setActiveBottomPanel("ticketsDay");
            },
        },
        {
            group: "tickets",
            label: "Novo bilhete",
            active: activeBottomPanel === "ticket",
            onClick: () => {
                clearOperationFeedback();
                resetTicketForm();
                setActiveNavItem("tickets");
                setActiveBottomPanel("ticket");
            },
        },
        {
            group: "movements",
            label: "Extrato",
            active: activeBottomPanel === "extract",
            onClick: () => {
                clearOperationFeedback();
                setActiveNavItem("movements");
                setActiveBottomPanel("extract");
            },
        },
        {
            group: "movements",
            label: "Nova movimentação",
            active: activeBottomPanel === "movementForm",
            onClick: () => {
                clearOperationFeedback();
                resetMovementForm();
                setActiveNavItem("movements");
                setActiveBottomPanel("movementForm");
            },
        },
        {
            group: "settings",
            label: "Minha conta",
            active: activeBottomPanel === "accountReal",
            onClick: () => {
                clearOperationFeedback();
                setActiveNavItem("settings");
                setActiveBottomPanel("accountReal");
            },
        },
        {
            group: "settings",
            label: "Editar perfil",
            active: activeBottomPanel === "profileReal",
            onClick: () => {
                clearOperationFeedback();
                setActiveNavItem("settings");
                setActiveBottomPanel("profileReal");
            },
        },
        {
            group: "settings",
            label: "Sistema",
            active: activeBottomPanel === "system",
            onClick: () => {
                clearOperationFeedback();
                setActiveNavItem("settings");
                setActiveBottomPanel("system");
            },
        },
        {
            group: "settings",
            label: "Sair",
            active: false,
            tone: "danger",
            onClick: () => {
                setIsLogoutDialogOpen(true);
            },
        },
    ];
    const placeholderPageTitle = {
        tickets: "Página Bilhetes",
        movements: "Página Movimentações",
        performance: "Página Desempenho",
        goals: "Página Metas",
        settings: "Página Configurações",
    }[activeNavItem];
    const navigationPageContent = (() => {
        if (activeNavItem === "tickets" && activeBottomPanel === "ticketsDay") {
            return (
                <TicketsTablePanel
                    deletingTicketId={deletingTicketId}
                    feedback={ticketFeedback}
                    tickets={tickets}
                    houses={houses}
                    onEdit={handleStartEditTicket}
                    onDelete={handleDeleteTicket}
                    onNewTicket={() => {
                        clearOperationFeedback();
                        resetTicketForm();
                        setActiveNavItem("tickets");
                        setActiveBottomPanel("ticket");
                    }}
                />
            );
        }

        if (activeNavItem === "tickets" && activeBottomPanel === "ticket") {
            return (
                <GuidedTicketFormPanel
                    feedback={ticketFeedback}
                    houses={houses}
                    isSaving={isSavingTicket}
                    ticketForm={ticketForm}
                    setTicketForm={setTicketForm}
                    onSubmit={handleSaveTicket}
                    editingTicketId={editingTicketId}
                />
            );
        }

        if (activeNavItem === "movements" && activeBottomPanel === "extract") {
            return (
                <RefinedStatementPanel
                    deletingMovementId={deletingMovementId}
                    feedback={movementFeedback}
                    movements={movements}
                    houses={houses}
                    onEdit={handleStartEditMovement}
                    onDelete={handleDeleteMovement}
                />
            );
        }

        if (activeNavItem === "movements" && activeBottomPanel === "movement") {
            return <NavigationPlaceholderPage title="Nova movimentação" />;
        }

        if (activeNavItem === "settings" && activeBottomPanel === "account") {
            return <NavigationPlaceholderPage title="Minha conta" />;
        }

        if (activeNavItem === "settings" && activeBottomPanel === "profile") {
            return <NavigationPlaceholderPage title="Editar perfil" />;
        }

        if (activeNavItem === "settings" && activeBottomPanel === "logout") {
            return <NavigationPlaceholderPage title="Sair" />;
        }

        if (activeNavItem === "movements" && activeBottomPanel === "movementForm") {
            return (
                <RefinedMovementPanel
                    feedback={movementFeedback}
                    houses={houses}
                    isSaving={isSavingMovement}
                    movementForm={movementForm}
                    setMovementForm={setMovementForm}
                    onSubmit={handleSaveMovement}
                    editingMovementId={editingMovementId}
                />
            );
        }

        if (activeNavItem === "settings" && activeBottomPanel === "accountReal") {
            return (
                <PremiumSettingsPanel
                    accountCreatedAt={user?.created_at}
                    accountEmail={accountEmail}
                    accountId={user?.id}
                    accountLastSignInAt={user?.last_sign_in_at}
                    accountName={accountName}
                    accountPhone={accountPhone}
                    accountPlan={accountPlan}
                    accountUsername={accountUsername}
                    onEditProfile={() => setActiveBottomPanel("profileReal")}
                    onToggleTheme={onToggleTheme}
                    session={session}
                    theme={landingTheme}
                />
            );
        }

        if (activeNavItem === "settings" && activeBottomPanel === "profileReal") {
            return (
                <ProfileEditPanel
                    accountEmail={accountEmail}
                    accountFirstName={accountFirstName}
                    accountLastName={accountLastName}
                    accountMetadata={metadata}
                    accountPhone={accountPhone}
                    accountUsername={accountUsername}
                    refreshSession={refreshSession}
                />
            );
        }

        if (activeNavItem === "settings" && activeBottomPanel === "system") {
            return (
                <SystemPanel
                    onToggleTheme={onToggleTheme}
                    theme={landingTheme}
                />
            );
        }

        return <NavigationPlaceholderPage title={placeholderPageTitle} />;
    })();
    const dashboardSelectedHouseLabel =
        selectedHouseScope === "all"
            ? "Todas as casas"
            : selectedHouseScope === null || selectedHouseScope === ""
                ? "Nenhuma casa selecionada"
                : selectedHouseData?.nome || houses.find((house) => Number(house.id) === Number(selectedHouseScope))?.nome || "Casa ativa";

    return (
        <div className="app">
            <DashboardShell
                accountFirstName={accountFirstName}
                activeNavItem={activeNavItem}
                activeSubItem={activeBottomPanel}
                monthlyResult={summaryStats.realProfit}
                onLogoutRequest={() => setIsLogoutDialogOpen(true)}
                onSidebarNavigate={handleSidebarNavigate}
                onToggleTheme={onToggleTheme}
                quickActions={referenceActions}
                selectedHouseLabel={dashboardSelectedHouseLabel}
                theme={landingTheme}
            >
                <LogoutConfirmDialog
                    isOpen={isLogoutDialogOpen}
                    isLoggingOut={isLoggingOut}
                    onCancel={() => {
                        if (!isLoggingOut) setIsLogoutDialogOpen(false);
                    }}
                    onConfirm={handleLogout}
                />
                {activeNavItem === "dashboard" ? (
                    <>
                        <DeleteHouseDialog
                            house={housePendingDelete}
                            isDeleting={Boolean(deletingHouseId)}
                            onCancel={() => {
                                if (!deletingHouseId) setHousePendingDelete(null);
                            }}
                            onConfirm={handleConfirmDeleteHouse}
                        />
                        <DashboardHeader />

                        {isDashboardLoading && (
                            <section className="reference-loading-panel" aria-live="polite">
                                Carregando dashboard...
                            </section>
                        )}

                        {dashboardLoadError && !isDashboardLoading && (
                            <section className="reference-load-error-panel" aria-live="polite">
                                <span>{dashboardLoadError}</span>
                                <button type="button" onClick={handleRetryDashboardLoad}>
                                    Tentar novamente
                                </button>
                            </section>
                        )}

                        <VisualDashboardHome
                            accountName={accountName}
                            accountPlan={accountPlan}
                            allHitRate={allHitRate}
                            analyticsPeriodType={analyticsPeriodType}
                            bankHistoryData={bankHistoryData}
                            chartMode={chartMode}
                            dayMarkers={dashboardDayMarkers}
                            houses={houses}
                            housesWithCurrentBank={housesWithCurrentBank}
                            houseForm={houseForm}
                            houseFeedback={houseFeedback}
                            isDashboardLoading={isDashboardLoading}
                            hasDashboardLoadError={Boolean(dashboardLoadError)}
                            isResultScrollable={analyticsPeriodType === "Mensal" && (resultChartData || []).length > 7}
                            isSavingHouse={isSavingHouse}
                            editingHouseId={editingHouseId}
                            onCancelEdit={handleCancelEditHouse}
                            onEditHouse={handleStartEditHouse}
                            onHouseChange={setHouseForm}
                            onPeriodReferenceChange={setPeriodReference}
                            onPeriodTypeChange={handleDashboardPeriodTypeChange}
                            onOpenReports={() => navigate("/relatorios")}
                            onOpenNewTicket={() => {
                                clearOperationFeedback();
                                resetTicketForm();
                                setActiveNavItem("tickets");
                                setActiveBottomPanel("ticket");
                            }}
                            onOpenTickets={() => {
                                clearOperationFeedback();
                                setActiveNavItem("tickets");
                                setActiveBottomPanel("ticketsDay");
                            }}
                            onOpenMovement={() => {
                                clearOperationFeedback();
                                setActiveNavItem("movements");
                                setActiveBottomPanel("movementForm");
                            }}
                            onOpenExtract={() => {
                                clearOperationFeedback();
                                setActiveNavItem("movements");
                                setActiveBottomPanel("extract");
                            }}
                            onLogoutRequest={() => setIsLogoutDialogOpen(true)}
                            onRequestDeleteHouse={setHousePendingDelete}
                            onSelectHouse={handleSelectDashboardHouse}
                            onSubmitHouse={handleAddOrEditHouse}
                            onToggleTheme={onToggleTheme}
                            periodReference={periodReference}
                            periodType={periodType}
                            periodTickets={ticketsForPeriod}
                            renderTopValue={renderTopValue}
                            resultChartData={resultChartData}
                            sectionRef={analyticsSectionRef}
                            selectedHouseScope={selectedHouseScope}
                            setChartMode={setChartMode}
                            summaryStats={summaryStats}
                            theme={landingTheme}
                            topCurrentBank={topCurrentBank}
                            topInitialBank={topInitialBank}
                            topMetricPages={topMetricPages}
                        />
                    </>
                ) : (
                    navigationPageContent
                )}
            </DashboardShell>


        </div>
    );
}


