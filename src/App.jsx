import { useEffect, useMemo, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import "./App.css";
import logo from "./assets/logo.png";
import { supabase } from "./supabase";

const STORAGE_KEY = "gerenciador_banca_v10";
const DESKTOP_HOUSES_PER_PAGE = 4;
const MOBILE_HOUSES_PER_PAGE = 2;

const isMobile = window.innerWidth <= 768;
const housesPerPage = isMobile
    ? MOBILE_HOUSES_PER_PAGE
    : DESKTOP_HOUSES_PER_PAGE;
const ANIMATION_MS = 220;

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

function formatPercent(value) {
    return `${Number(value || 0).toFixed(2)}%`;
}

function formatDateBR(dateISO) {
    if (!dateISO) return "";
    const [year, month, day] = dateISO.split("-");
    return `${day}/${month}/${year}`;
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

function formatMonthRef(ref) {
    const [year, month] = ref.split("-");
    return `${month}/${year}`;
}

function formatWeekRef(ref) {
    const start = new Date(`${ref}T12:00:00`);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    const formatDayMonth = (date) => {
        const d = String(date.getDate()).padStart(2, "0");
        const m = String(date.getMonth() + 1).padStart(2, "0");
        return `${d}/${m}`;
    };

    const year = String(end.getFullYear()).slice(-2);

    return `${formatDayMonth(start)} a ${formatDayMonth(end)}/${year}`;
}

function formatQuarterRef(ref) {
    const [year, quarter] = ref.split("-T");
    return `${quarter}º tri/${year}`;
}

function formatSemesterRef(ref) {
    const [year, semester] = ref.split("-S");
    return `${semester}º sem/${year}`;
}

function lastDayOfMonth(year, month) {
    return new Date(year, month, 0).getDate();
}

function getPeriodInterval(periodType, reference) {
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

function formatPeriodLabel(periodType, reference) {
    if (periodType === "Geral") return "Geral";
    if (!reference) return "";

    if (periodType === "Diário") return `Diário de ${formatDateBR(reference)}`;
    if (periodType === "Mensal") return `Mensal de ${formatMonthRef(reference)}`;
    if (periodType === "Trimestral") return `Trimestral de ${formatQuarterRef(reference)}`;
    if (periodType === "Semestral") return `Semestral de ${formatSemesterRef(reference)}`;
    if (periodType === "Anual") return `Anual de ${reference}`;

    return "";
}

function getTicketNumberForDate(tickets, dateISO, currentId = null) {
    return (
        tickets.filter((ticket) => ticket.data === dateISO && ticket.id !== currentId)
            .length + 1
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

function calculateEvolution(initialValue, currentValue) {
    const initial = Number(initialValue || 0);
    const current = Number(currentValue || 0);

    if (initial <= 0) return 0;
    return ((current - initial) / initial) * 100;
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

function getStakeSourceFields(origemStake) {
    switch (origemStake) {
        case "Saldo + Bônus":
            return [
                { key: "stakeSaldo", label: "Valor do saldo" },
                { key: "stakeBonus", label: "Valor do bônus" },
            ];
        case "Saldo + Depósito":
            return [
                { key: "stakeSaldo", label: "Valor do saldo" },
                { key: "stakeDeposito", label: "Valor do depósito" },
            ];
        case "Depósito + Bônus":
            return [
                { key: "stakeDeposito", label: "Valor do depósito" },
                { key: "stakeBonus", label: "Valor do bônus" },
            ];
        default:
            return [];
    }
}

function normalizeStakeBreakdown(form, stake) {
    let stakeSaldo = 0;
    let stakeDeposito = 0;
    let stakeBonus = 0;

    if (form.origemStake === "Saldo") {
        stakeSaldo = stake;
    } else if (form.origemStake === "Depósito") {
        stakeDeposito = stake;
    } else if (form.origemStake === "Bônus") {
        stakeBonus = stake;
    } else {
        stakeSaldo = parseCurrencyTyping(form.stakeSaldo) || 0;
        stakeDeposito = parseCurrencyTyping(form.stakeDeposito) || 0;
        stakeBonus = parseCurrencyTyping(form.stakeBonus) || 0;

        const sum = stakeSaldo + stakeDeposito + stakeBonus;
        const diff = Math.abs(sum - stake);

        if (diff > 0.009) {
            return {
                valid: false,
                message: "A soma das origens da stake precisa ser igual ao valor total da stake.",
            };
        }
    }

    return {
        valid: true,
        stakeSaldo,
        stakeDeposito,
        stakeBonus,
    };
}

function calculateStakeDetails({ stake, returned, stakeSaldo, stakeDeposito, stakeBonus }) {
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

const initialTicketForm = {
    data: hojeISO(),
    casaId: "",
    categoria: "",
    odd: "",
    stake: "",
    retorno: "",
    origemStake: "Saldo",
    stakeSaldo: "",
    stakeDeposito: "",
    stakeBonus: "",
    resultado: "Pendente",
    observacoes: "",
};

const initialHouseForm = {
    nome: "",
    bancaInicial: "",
};

const initialMovementForm = {
    data: hojeISO(),
    casaId: "",
    tipo: "Depósito",
    valor: "",
    observacoes: "",
};

export default function App() {
    const [houses, setHouses] = useState([]);
    const [tickets, setTickets] = useState([]);
    const ticketDates = tickets.map(t => t.date);
    const [movements, setMovements] = useState([]);

    const [ticketForm, setTicketForm] = useState(initialTicketForm);
    const [houseForm, setHouseForm] = useState(initialHouseForm);
    const [movementForm, setMovementForm] = useState(initialMovementForm);
    const [storageLoaded, setStorageLoaded] = useState(false);

    const [viewDate, setViewDate] = useState(hojeISO());
    const [movementViewDate, setMovementViewDate] = useState(hojeISO());

    const [editingTicketId, setEditingTicketId] = useState(null);
    const [editingHouseId, setEditingHouseId] = useState(null);
    const [editingMovementId, setEditingMovementId] = useState(null);

    const [periodType, setPeriodType] = useState("Diário");
    const [periodReference, setPeriodReference] = useState(hojeISO());

    const [selectedHouseScope, setSelectedHouseScope] = useState(null);
    const [menuHouseId, setMenuHouseId] = useState(null);
    const [housePageStart, setHousePageStart] = useState(0);
    const houseTouchStartXRef = useRef(0);
    const houseTouchEndXRef = useRef(0);

    const [isSliding, setIsSliding] = useState(false);
    const [slideDirection, setSlideDirection] = useState("next");

    const houseTouchStartX = useRef(0);
    const houseTouchStartY = useRef(0);
    const houseTouchCurrentX = useRef(0);
    const houseIsSwiping = useRef(false);

    const [topMetricIndex, setTopMetricIndex] = useState(0);
    const [isStatsSliding, setIsStatsSliding] = useState(false);
    const [statsSlideDirection, setStatsSlideDirection] = useState("next");

    const [isTicketPanelOpen, setIsTicketPanelOpen] = useState(false);
    const [isMovementPanelOpen, setIsMovementPanelOpen] = useState(false);
    const [isMovementDayPanelOpen, setIsMovementDayPanelOpen] = useState(false);
    const [isTicketsDayPanelOpen, setIsTicketsDayPanelOpen] = useState(!isMobile);
    const [openedCollapsedTicketId, setOpenedCollapsedTicketId] = useState(null);
    const [isTicketsCalendarOpen, setIsTicketsCalendarOpen] = useState(false);
    const ticketsCalendarRef = useRef(null);
    const [isMovementsCalendarOpen, setIsMovementsCalendarOpen] = useState(false);
    const movementsCalendarRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (
                ticketsCalendarRef.current &&
                !ticketsCalendarRef.current.contains(event.target)
            ) {
                setIsTicketsCalendarOpen(false);
            }
        }

        if (isTicketsCalendarOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isTicketsCalendarOpen]);

    useEffect(() => {
        function handleEsc(event) {
            if (event.key === "Escape") {
                setIsTicketsCalendarOpen(false);
            }
        }

        if (isTicketsCalendarOpen) {
            document.addEventListener("keydown", handleEsc);
        }

        return () => {
            document.removeEventListener("keydown", handleEsc);
        };
    }, [isTicketsCalendarOpen]);

    useEffect(() => {
        function handleClickOutside(event) {
            if (
                movementsCalendarRef.current &&
                !movementsCalendarRef.current.contains(event.target)
            ) {
                setIsMovementsCalendarOpen(false);
            }
        }

        if (isMovementsCalendarOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isMovementsCalendarOpen]);

    useEffect(() => {
        function handleEsc(event) {
            if (event.key === "Escape") {
                setIsMovementsCalendarOpen(false);
            }
        }

        if (isMovementsCalendarOpen) {
            document.addEventListener("keydown", handleEsc);
        }

        return () => {
            document.removeEventListener("keydown", handleEsc);
        };
    }, [isMovementsCalendarOpen]);

    useEffect(() => {
        if (editingMovementId) {
            setIsMovementPanelOpen(true);

            requestAnimationFrame(() => {
                movementPanelRef.current?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                });
            });
        }
    }, [editingMovementId]);

    const menuRef = useRef(null);
    const animationTimeoutRef = useRef(null);
    const movementPanelRef = useRef(null);
    const ticketPanelRef = useRef(null);
    const ticketsDayPanelRef = useRef(null);
    const movementDayPanelRef = useRef(null);

    useEffect(() => {
        async function loadInitialData() {
            try {
                const saved = localStorage.getItem(STORAGE_KEY);

                if (saved) {
                    const parsed = JSON.parse(saved);
                    setTickets(Array.isArray(parsed.tickets) ? parsed.tickets : []);
                } else {
                    setTickets([]);
                }

                const { data: ticketsData, error: ticketsError } = await supabase
                    .from("tickets")
                    .select("*")
                    .order("id", { ascending: false });

                console.log("ticketsData:", ticketsData);
                console.log("ticketsError:", ticketsError);

                if (ticketsError) {
                    console.error("Erro ao carregar bilhetes do Supabase:", ticketsError);
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
                        origemStake: ticket.origem_stake || "Saldo",
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
                    setTickets(formattedTickets);
                }

                const { data, error } = await supabase
                    .from("houses")
                    .select("*")
                    .order("id", { ascending: true });

                const { data: movementsData, error: movementsError } = await supabase
                    .from("movements")
                    .select("*")
                    .order("id", { ascending: false });

                if (movementsError) {
                    console.error("Erro ao carregar movimentações:", movementsError);
                    setMovements([]);
                } else {
                    const formattedMovements = (movementsData || []).map((movement) => ({
                        id: movement.id,
                        data: movement.data,
                        casaId: Number(movement.casa_id),
                        tipo: movement.tipo,
                        valor: Number(movement.valor || 0),
                        observacoes: movement.observacoes || "",
                    }));

                    setMovements(formattedMovements);
                }

                if (error) {
                    console.error("Erro ao carregar casas do Supabase:", error);
                    setHouses([]);
                } else {
                    const formattedHouses = (data || []).map((house) => ({
                        id: house.id,
                        nome: house.nome,
                        bancaInicial: Number(house.banca_inicial || 0),
                    }));

                    setHouses(formattedHouses);
                }
            } catch (error) {
                console.error("Erro ao carregar dados iniciais:", error);
                setHouses([]);
                setTickets([]);
                setMovements([]);
            } finally {
                setStorageLoaded(true);
            }
        }

        loadInitialData();
    }, []);

    useEffect(() => {
        if (!storageLoaded) return;

        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({
                    version: 1,
                    houses,
                    tickets,
                    movements,
                })
            );
        } catch (error) {
            console.error("Erro ao salvar dados no localStorage:", error);
        }
    }, [houses, tickets, movements, storageLoaded]);

    useEffect(() => {
        function handleClickOutside(event) {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setMenuHouseId(null);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        return () => {
            if (animationTimeoutRef.current) {
                clearTimeout(animationTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        const totalHouseCards = houses.length + 1;
        const maxStart = Math.max(0, totalHouseCards - housesPerPage);

        if (housePageStart > maxStart) {
            setHousePageStart(maxStart);
        }
    }, [houses.length, housePageStart, housesPerPage]);

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
        return [...new Set([...ticketMonths, ...movementMonths])]
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
        return [...new Set([...ticketRefs, ...movementRefs])]
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

    const periodInterval = useMemo(() => {
        return getPeriodInterval(periodType, periodReference);
    }, [periodType, periodReference]);

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
                bancaAtual:
                    Number(house.bancaInicial || 0) + totalProfit + movementBalance,
                quantidadeApostas: periodHouseTickets.length,
                taxaAcerto: hitRate,
            };
        });
    }, [houses, baseTicketsForPeriod, baseMovementsForPeriod]);

    const visibleHouses = useMemo(() => {
        return housesWithCurrentBank.slice(
            housePageStart,
            housePageStart + housesPerPage
        );
    }, [housesWithCurrentBank, housePageStart]);

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

    const totalCurrentBank = useMemo(() => {
        return housesWithCurrentBank.reduce(
            (acc, house) => acc + Number(house.bancaAtual || 0),
            0
        );
    }, [housesWithCurrentBank]);

    const totalInitialBank = useMemo(() => {
        return housesWithCurrentBank.reduce(
            (acc, house) => acc + Number(house.bancaInicial || 0),
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
                : selectedHouseData?.bancaInicial ?? 0;

    const topCurrentBank =
        selectedHouseScope === null
            ? null
            : selectedHouseScope === "all"
                ? totalCurrentBank
                : selectedHouseData?.bancaAtual ?? 0;

    const bankEvolution =
        topInitialBank === null || topCurrentBank === null
            ? null
            : calculateEvolution(topInitialBank, topCurrentBank);

    const finalResult =
        topInitialBank === null || topCurrentBank === null
            ? null
            : topCurrentBank - topInitialBank;

    const bankUsagePercent =
        selectedHouseScope === null ||
            topInitialBank === null ||
            topInitialBank <= 0
            ? null
            : (summaryStats.investedReal / topInitialBank) * 100;

    const ticketMarkedDays = useMemo(() => {
        return [...new Set(tickets.map((ticket) => ticket.data))]
            .filter(Boolean)
            .map((dateISO) => {
                const [year, month, day] = dateISO.split("-").map(Number);
                return new Date(year, month - 1, day);
            });
    }, [tickets]);

    const ticketsOfDay = useMemo(() => {
        let base = tickets.filter((ticket) => ticket.data === viewDate);

        if (typeof selectedHouseScope === "number") {
            base = base.filter(
                (ticket) => Number(ticket.casaId) === Number(selectedHouseScope)
            );
        }

        return base;
    }, [tickets, viewDate, selectedHouseScope]);

    const movementMarkedDays = useMemo(() => {
        return [...new Set(movements.map((movement) => movement.data))]
            .filter(Boolean)
            .map((dateISO) => {
                const [year, month, day] = dateISO.split("-").map(Number);
                return new Date(year, month - 1, day);
            });
    }, [movements]);

    const movementsOfDay = useMemo(() => {
        let base = movements
            .filter((movement) => movement.data === movementViewDate)
            .sort((a, b) => b.id - a.id);

        if (typeof selectedHouseScope === "number") {
            base = base.filter(
                (movement) => Number(movement.casaId) === Number(selectedHouseScope)
            );
        }

        return base;
    }, [movements, movementViewDate, selectedHouseScope]);

    async function handleAddOrEditHouse(event) {
        event.preventDefault();

        const name = houseForm.nome.trim();
        const initialBank = parseCurrencyTyping(houseForm.bancaInicial);

        if (!name) {
            alert("Informe o nome da casa.");
            return;
        }

        if (Number.isNaN(initialBank)) {
            alert("Informe a banca inicial. Pode ser R$ 0,00.");
            return;
        }

        const exists = houses.some(
            (house) =>
                house.nome.toLowerCase() === name.toLowerCase() &&
                house.id !== editingHouseId
        );

        if (exists) {
            alert("Essa casa já foi cadastrada.");
            return;
        }

        if (editingHouseId) {
            setHouses((prev) =>
                prev.map((house) =>
                    house.id === editingHouseId
                        ? { ...house, nome: name, bancaInicial: initialBank }
                        : house
                )
            );

            setEditingHouseId(null);
            setHouseForm(initialHouseForm);
            return;
        }

        const newHouse = {
            id: Date.now(),
            nome: name,
            bancaInicial: initialBank,
        };

        setHouses((prev) => [...prev, newHouse]);

        const { error } = await supabase.from("houses").insert([
            {
                id: newHouse.id,
                nome: newHouse.nome,
                banca_inicial: newHouse.bancaInicial,
            },
        ]);

        if (error) {
            console.error("Erro ao salvar casa no Supabase:", error);
        }

        setHouseForm(initialHouseForm);
    }

    function handleStartEditHouse(houseId) {
        const house = houses.find((item) => item.id === houseId);
        if (!house) return;

        setHouseForm({
            nome: house.nome,
            bancaInicial: formatMoney(house.bancaInicial),
        });
        setEditingHouseId(houseId);
        setMenuHouseId(null);
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function handleDeleteHouse(houseId) {
        const houseTickets = tickets.filter((ticket) => Number(ticket.casaId) === houseId);
        const houseMovements = movements.filter(
            (movement) => Number(movement.casaId) === houseId
        );

        if (houseTickets.length > 0 || houseMovements.length > 0) {
            const confirmedWithData = window.confirm(
                "Essa casa possui bilhetes ou movimentações vinculadas. Deseja excluir a casa e remover esses registros?"
            );

            if (!confirmedWithData) return;

            setTickets((prev) => prev.filter((ticket) => Number(ticket.casaId) !== houseId));
            setMovements((prev) =>
                prev.filter((movement) => Number(movement.casaId) !== houseId)
            );
        } else {
            const confirmed = window.confirm("Deseja excluir esta casa?");
            if (!confirmed) return;
        }

        setHouses((prev) => prev.filter((house) => house.id !== houseId));

        if (selectedHouseScope === houseId) {
            setSelectedHouseScope(null);
        }

        if (editingHouseId === houseId) {
            setEditingHouseId(null);
            setHouseForm(initialHouseForm);
        }

        setMenuHouseId(null);
    }

    function resetTicketForm() {
        setTicketForm({
            ...initialTicketForm,
            data: hojeISO(),
        });
        setEditingTicketId(null);
    }

    function resetMovementForm() {
        setMovementForm({
            ...initialMovementForm,
            data: hojeISO(),
        });
        setEditingMovementId(null);
    }

    async function handleSaveTicket(event) {
        event.preventDefault();

        if (!ticketForm.casaId || !ticketForm.categoria || !ticketForm.odd || !ticketForm.stake) {
            alert("Preencha casa, categoria, odd e stake.");
            return;
        }

        const odd = Number(String(ticketForm.odd || "").replace(",", "."));
        if (Number.isNaN(odd) || odd <= 0) {
            alert("Informe uma odd válida.");
            return;
        }

        const stake = parseCurrencyTyping(ticketForm.stake);
        if (Number.isNaN(stake) || stake <= 0) {
            alert("Informe uma stake válida.");
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
            alert("Informe um retorno válido.");
            return;
        }

        if (ticketForm.resultado === "Pendente") {
            returned = 0;
        }

        const breakdown = normalizeStakeBreakdown(ticketForm, stake);
        if (!breakdown.valid) {
            alert(breakdown.message);
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

        if (editingTicketId) {
            const updated = tickets.map((ticket) => {
                if (ticket.id !== editingTicketId) return ticket;

                return {
                    ...ticket,
                    ...ticketForm,
                    casaId: Number(ticketForm.casaId),
                    odd,
                    stake,
                    retorno: returned,
                    lucro: profit,
                    stakeSaldo: breakdown.stakeSaldo,
                    stakeDeposito: breakdown.stakeDeposito,
                    stakeBonus: breakdown.stakeBonus,
                    ...stakeDetails,
                };
            });

            setTickets(reorderTickets(updated));
            setViewDate(ticketForm.data);
            setOpenedCollapsedTicketId(null);
            resetTicketForm();
            setIsTicketPanelOpen(false);
            return;
        }

        const ticketNumber = getTicketNumberForDate(tickets, ticketForm.data);
        const ticketName = buildTicketName(ticketForm.data, ticketNumber);

        const newTicket = {
            id: Date.now(),
            ...ticketForm,
            casaId: Number(ticketForm.casaId),
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
            },
        ]);

        if (error) {
            console.error("Erro Supabase bilhete:", error);
            alert(`Erro ao salvar bilhete no Supabase: ${error.message}`);
            return;
        }

        setTickets((prev) => [newTicket, ...prev]);
        setViewDate(ticketForm.data);
        setOpenedCollapsedTicketId(null);
        resetTicketForm();
        setIsTicketPanelOpen(false);
    }

    async function handleSaveMovement(event) {
        event.preventDefault();

        const parsedValue = parseCurrencyTyping(movementForm.valor);

        if (!movementForm.casaId || !movementForm.tipo || Number.isNaN(parsedValue)) {
            alert("Preencha casa, tipo e valor da movimentação.");
            return;
        }

        const payload = {
            ...movementForm,
            casaId: Number(movementForm.casaId),
            valor: parsedValue,
        };

        if (editingMovementId) {
            setMovements((prev) =>
                prev.map((movement) =>
                    movement.id === editingMovementId
                        ? { ...movement, ...payload }
                        : movement
                )
            );
            setMovementViewDate(movementForm.data);
            resetMovementForm();
            setIsMovementPanelOpen(false);
            setIsMovementDayPanelOpen(false);
            return;
        }

        const newMovement = {
            id: Date.now(),
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
                observacoes: newMovement.observacoes,
            },
        ]);

        console.log("erro movement:", error);

        if (error) {
            console.error("Erro Supabase movimentação completo:", error);
            alert(`Erro ao salvar movimentação no Supabase: ${error.message}`);
            return;
        }

        setMovements((prev) => [newMovement, ...prev]);
        setMovementViewDate(movementForm.data);
        resetMovementForm();
        setIsMovementPanelOpen(false);
        setIsMovementDayPanelOpen(false);
    }

    function handleStartEditTicket(ticketId) {
        const ticket = tickets.find((item) => item.id === ticketId);
        if (!ticket) return;

        setTicketForm({
            data: ticket.data,
            casaId: String(ticket.casaId),
            categoria: ticket.categoria,
            odd: String(ticket.odd),
            stake: formatMoney(ticket.stake),
            retorno: formatMoney(ticket.retorno),
            origemStake: ticket.origemStake || "Saldo",
            stakeSaldo: ticket.stakeSaldo ? formatMoney(ticket.stakeSaldo) : "",
            stakeDeposito: ticket.stakeDeposito ? formatMoney(ticket.stakeDeposito) : "",
            stakeBonus: ticket.stakeBonus ? formatMoney(ticket.stakeBonus) : "",
            resultado: ticket.resultado,
            observacoes: ticket.observacoes || "",
        });

        setEditingTicketId(ticketId);
        setIsTicketPanelOpen(true);
        setOpenedCollapsedTicketId(null);

        requestAnimationFrame(() => {
            ticketPanelRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "start",
            });
        });
    }

    function handleDeleteTicket(ticketId) {
        const confirmed = window.confirm("Deseja excluir este bilhete?");
        if (!confirmed) return;

        setTickets((prev) => reorderTickets(prev.filter((ticket) => ticket.id !== ticketId)));

        if (editingTicketId === ticketId) {
            resetTicketForm();
        }
    }

    function handleStartEditMovement(movementId) {
        const movement = movements.find((item) => item.id === movementId);
        if (!movement) return;

        setMovementForm({
            data: movement.data,
            casaId: String(movement.casaId),
            tipo: movement.tipo,
            valor: formatMoney(movement.valor),
            observacoes: movement.observacoes || "",
        });

        setEditingMovementId(movementId);
        setIsMovementPanelOpen(true);
        setIsMovementDayPanelOpen(false);

        requestAnimationFrame(() => {
            movementPanelRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "start",
            });
        });
    }

    function handleDeleteMovement(movementId) {
        const confirmed = window.confirm("Deseja excluir esta movimentação?");
        if (!confirmed) return;

        setMovements((prev) => prev.filter((movement) => movement.id !== movementId));

        if (editingMovementId === movementId) {
            resetMovementForm();
        }
    }

    function selectAllHousesScope() {
        setSelectedHouseScope((prev) => (prev === "all" ? null : "all"));
        setTopMetricIndex(0);
    }

    function selectHouseScope(houseId) {
        setSelectedHouseScope((prev) => (prev === houseId ? null : houseId));
        setTopMetricIndex(0);
    }

    function clearHouseScope() {
        setSelectedHouseScope(null);
        setTopMetricIndex(0);
    }

    function goToPreviousDay() {
        setViewDate((prev) => addDays(prev, -1));
    }

    function goToNextDay() {
        setViewDate((prev) => addDays(prev, 1));
    }

    function goToPreviousMovementDay() {
        setMovementViewDate((prev) => addDays(prev, -1));
    }

    function goToNextMovementDay() {
        setMovementViewDate((prev) => addDays(prev, 1));
    }

    function handleHousePage(direction) {
        if (isSliding) return;

        const totalHouseCards = houses.length + 1;
        const maxStart = Math.max(0, totalHouseCards - housesPerPage);

        const nextStart =
            direction === "next"
                ? Math.min(maxStart, housePageStart + housesPerPage)
                : Math.max(0, housePageStart - housesPerPage);

        if (nextStart === housePageStart) return;

        setSlideDirection(direction);
        setIsSliding(true);

        if (animationTimeoutRef.current) {
            clearTimeout(animationTimeoutRef.current);
        }

        animationTimeoutRef.current = setTimeout(() => {
            setHousePageStart(nextStart);
            setIsSliding(false);
        }, ANIMATION_MS);
    }

    function handleHouseTouchStart(e) {
        const touch = e.touches[0];
        houseTouchStartX.current = touch.clientX;
        houseTouchStartY.current = touch.clientY;
        houseTouchCurrentX.current = touch.clientX;
        houseIsSwiping.current = false;
    }

    function handleHouseTouchMove(e) {
        const touch = e.touches[0];
        houseTouchCurrentX.current = touch.clientX;

        const deltaX = touch.clientX - houseTouchStartX.current;
        const deltaY = touch.clientY - houseTouchStartY.current;

        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
            houseIsSwiping.current = true;
        }
    }

    function handleHouseTouchEnd() {
        if (!houseIsSwiping.current) return;

        const deltaX = houseTouchCurrentX.current - houseTouchStartX.current;

        if (Math.abs(deltaX) < 50) return;

        if (deltaX < 0) {
            handleHousePage("next");
        } else {
            handleHousePage("prev");
        }
    }

    const topMetricPages = useMemo(() => {
        return [
            [
                {
                    title: "Banca inicial",
                    value: topInitialBank,
                    formatter: formatMoney,
                    highlight: true,
                    tone: "neutral",
                },
                {
                    title: "Valor apostado",
                    value: selectedHouseScope === null ? null : summaryStats.invested,
                    formatter: formatMoney,
                    tone: "neutral",
                },
                {
                    title: "Banca atual",
                    value: topCurrentBank,
                    formatter: formatMoney,
                    highlight: true,
                    tone: "neutral",
                },
                {
                    title: "Resultado",
                    value: finalResult,
                    formatter: formatMoney,
                    tone:
                        finalResult === null
                            ? "neutral"
                            : finalResult > 0
                                ? "positive"
                                : finalResult < 0
                                    ? "negative"
                                    : "neutral",
                },
            ],
            [
                {
                    title: "Evolução da banca",
                    value: selectedHouseScope === null ? null : bankEvolution,
                    formatter: formatPercent,
                    tone:
                        bankEvolution === null
                            ? "neutral"
                            : bankEvolution > 0
                                ? "positive"
                                : bankEvolution < 0
                                    ? "negative"
                                    : "neutral",
                },
                {
                    title: "Valor real apostado",
                    value: selectedHouseScope === null ? null : summaryStats.investedReal,
                    formatter: formatMoney,
                    tone: "neutral",
                },
                {
                    title: "% da banca utilizada",
                    value: bankUsagePercent,
                    formatter: formatPercent,
                    tone: "neutral",
                },
                {
                    title: "ROI",
                    value: selectedHouseScope === null ? null : summaryStats.roi,
                    formatter: formatPercent,
                    tone:
                        selectedHouseScope === null
                            ? "neutral"
                            : summaryStats.roi > 0
                                ? "positive"
                                : summaryStats.roi < 0
                                    ? "negative"
                                    : "neutral",
                },
            ]
        ];
    }, [
        topCurrentBank,
        summaryStats,
        bankEvolution,
        topInitialBank,
        finalResult,
        selectedHouseScope,
    ]);

    const canPrevMetric = topMetricIndex > 0;
    const canNextMetric = topMetricIndex < topMetricPages.length - 1;

    function prevMetric() {
        if (isStatsSliding || !canPrevMetric) return;

        setStatsSlideDirection("prev");
        setIsStatsSliding(true);

        setTimeout(() => {
            setTopMetricIndex((prev) => Math.max(0, prev - 1));
            setIsStatsSliding(false);
        }, 180);
    }

    function nextMetric() {
        if (isStatsSliding || !canNextMetric) return;

        setStatsSlideDirection("next");
        setIsStatsSliding(true);

        setTimeout(() => {
            setTopMetricIndex((prev) => Math.min(topMetricPages.length - 1, prev + 1));
            setIsStatsSliding(false);
        }, 180);
    }

    const canGoPrev = housePageStart > 0;
    const canGoNext = housePageStart + housesPerPage < housesWithCurrentBank.length;
    const selectedStakeFields = getStakeSourceFields(ticketForm.origemStake);

    function renderTopValue(value, formatter = (v) => v) {
        if (value === null) return "—";
        return formatter(value);
    }

    return (
        <div className="app">
            <div className="container">
                <header className="page-header">
                    <div className="header-left">
                        <div className="brand-block">
                            <img src={logo} alt="Alves Tech" className="logo" />
                        </div>

                    </div>
                </header>

                <section className="panel top-panel">
                    <div className="top-desktop-layout">
                        <div className="top-house-form-row">
                            <form className="top-house-form-inline" onSubmit={handleAddOrEditHouse}>
                                <div className="field-group top-house-field">
                                    <label>Casa de aposta</label>
                                    <input
                                        type="text"
                                        placeholder="Ex.: Superbet"
                                        value={houseForm.nome}
                                        onChange={(e) =>
                                            setHouseForm((prev) => ({ ...prev, nome: e.target.value }))
                                        }
                                    />
                                </div>

                                <div className="field-group top-house-field top-house-bank-field">
                                    <label>Banca inicial</label>
                                    <input
                                        type="text"
                                        placeholder="R$ 0,00"
                                        value={houseForm.bancaInicial}
                                        onChange={(e) =>
                                            setHouseForm((prev) => ({
                                                ...prev,
                                                bancaInicial: formatCurrencyTyping(e.target.value),
                                            }))
                                        }
                                    />
                                </div>

                                <button type="submit" className="primary-button top-house-add-button">
                                    <span className="btn-text">
                                        {editingHouseId ? "Salvar casa" : "Adicionar casa"}
                                    </span>
                                    <span className="btn-icon">
                                        {editingHouseId ? "✓" : "+"}
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
                            </form>

                            {!isMobile && (
                                <div className="top-houses-arrows">
                                    <button
                                        type="button"
                                        className="arrow-btn"
                                        onClick={() => handleHousePage("prev")}
                                        disabled={!canGoPrev}
                                    >
                                        ‹
                                    </button>

                                    <button
                                        type="button"
                                        className="arrow-btn"
                                        onClick={() => handleHousePage("next")}
                                        disabled={!canGoNext}
                                    >
                                        ›
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="top-houses-row">
                            <div className="top-houses-scroll">
                                <div
                                    className={`top-houses-grid ${isSliding
                                        ? `is-sliding ${slideDirection === "next" ? "slide-next" : "slide-prev"}`
                                        : ""
                                        }`}
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
                                        .slice(housePageStart, housePageStart + housesPerPage)
                                        .map((house) => {
                                            if (house.isAll) {
                                                return (
                                                    <div className="top-house-card-wrap" key="all-houses-card">
                                                        <button
                                                            type="button"
                                                            className={`top-house-card top-house-general-card ${selectedHouseScope === "all" ? "selected-house-card" : ""
                                                                }`}
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
                                                        className={`top-house-card ${selectedHouseScope === house.id ? "selected-house-card" : ""
                                                            }`}
                                                    >
                                                        <button
                                                            type="button"
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
                                                                    ⋮
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
                                                        </button>

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

                        {isMobile && (
                            <div className="top-houses-arrows bottom-arrows">
                                <button
                                    type="button"
                                    className="arrow-btn"
                                    onClick={() => handleHousePage("prev")}
                                    disabled={!canGoPrev}
                                >
                                    ‹
                                </button>

                                <button
                                    type="button"
                                    className="arrow-btn"
                                    onClick={() => handleHousePage("next")}
                                    disabled={!canGoNext}
                                >
                                    ›
                                </button>
                            </div>
                        )}

                        <div className="top-filter-summary-row">
                            <div className="top-filter-group">
                                <div className="field-group period-field">
                                    <label>Período</label>
                                    <select
                                        value={periodType}
                                        onChange={(e) => setPeriodType(e.target.value)}
                                    >
                                        <option value="Diário">Diário</option>
                                        <option value="Semanal">Semanal</option>
                                        <option value="Mensal">Mensal</option>
                                        <option value="Trimestral">Trimestral</option>
                                        <option value="Semestral">Semestral</option>
                                        <option value="Anual">Anual</option>
                                        <option value="Geral">Geral</option>
                                    </select>
                                </div>

                                {periodType !== "Geral" && (
                                    <div className="field-group period-field">
                                        <label>Data</label>
                                        <select
                                            value={periodReference}
                                            onChange={(e) => setPeriodReference(e.target.value)}
                                        >
                                            {availableReferences.map((reference) => (
                                                <option key={reference} value={reference}>
                                                    {periodType === "Diário" && formatDateBR(reference)}
                                                    {periodType === "Semanal" && formatWeekRef(reference)}
                                                    {periodType === "Mensal" && formatMonthRef(reference)}
                                                    {periodType === "Trimestral" && formatQuarterRef(reference)}
                                                    {periodType === "Semestral" && formatSemesterRef(reference)}
                                                    {periodType === "Anual" && reference}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                            </div>

                            {!isMobile && <div className="stats-top-arrows-inline">
                                <button
                                    type="button"
                                    className="arrow-btn"
                                    onClick={prevMetric}
                                    disabled={!canPrevMetric}
                                >
                                    ‹
                                </button>

                                <button
                                    type="button"
                                    className="arrow-btn"
                                    onClick={nextMetric}
                                    disabled={!canNextMetric}
                                >
                                    ›
                                </button>
                            </div>}
                        </div>

                        <div className="stats-top-section">
                            <div
                                className={`stats-top-grid ${isStatsSliding ? `is-sliding ${statsSlideDirection === "next" ? "slide-next" : "slide-prev"}` : ""}`}
                            >
                                {topMetricPages[topMetricIndex].map((item) => (
                                    <div
                                        key={item.title}
                                        className={`stats-top-card ${item.tone === "positive" ? "positive" : item.tone === "negative" ? "negative" : ""}`}
                                    >
                                        <span>{item.title}</span>
                                        <strong className={`metric-value ${item.tone || "neutral"}`}>
                                            {renderTopValue(item.value, item.formatter)}
                                        </strong>
                                    </div>
                                ))}
                            </div>

                            {isMobile && (
                                <div className="stats-bottom-arrows">
                                    <button
                                        type="button"
                                        className="arrow-btn"
                                        onClick={() => setTopMetricIndex((prev) => Math.max(0, prev - 1))}
                                        disabled={topMetricIndex === 0}
                                    >
                                        ‹
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
                                        ›
                                    </button>
                                </div>
                            )}
                        </div>

                    </div>
                </section>

                <section className="main-grid">
                    <div className="left-column">
                        <section className="panel ticket-panel" ref={ticketPanelRef}>
                            <div
                                className="section-header"
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
                                style={{ cursor: "pointer" }}
                            >
                                <h2 style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span>
                                        {editingTicketId ? "Editar bilhete" : "Novo bilhete"}
                                    </span>

                                    <span style={{ fontWeight: "bold", fontSize: "18px" }}>
                                        {isTicketPanelOpen ? "−" : "+"}
                                    </span>
                                </h2>
                            </div>

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

                        <section className="panel movement-panel" ref={movementPanelRef}>
                            <div
                                className="section-header"
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
                                style={{ cursor: "pointer" }}
                            >
                                <h2 style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span>
                                        {editingMovementId ? "Editar movimentação" : "Nova movimentação"}
                                    </span>

                                    <span style={{ fontWeight: "bold", fontSize: "18px" }}>
                                        {isMovementPanelOpen ? "−" : "+"}
                                    </span>
                                </h2>
                            </div>

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
                            <div
                                className="section-header"
                                onClick={() => {
                                    const nextOpen = !isMovementDayPanelOpen;
                                    setIsMovementDayPanelOpen(nextOpen);

                                    requestAnimationFrame(() => {
                                        movementDayPanelRef.current?.scrollIntoView({
                                            behavior: "smooth",
                                            block: "start",
                                        });
                                    });
                                }}
                                style={{ cursor: "pointer" }}
                            >
                                <h2 style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span>Extrato de movimentações</span>

                                    <span style={{ fontWeight: "bold", fontSize: "18px" }}>
                                        {isMovementDayPanelOpen ? "−" : "+"}
                                    </span>
                                </h2>
                            </div>

                            {isMovementDayPanelOpen && (
                                <>
                                    <div className="day-nav-center">
                                        <button
                                            type="button"
                                            className="arrow-btn"
                                            onClick={goToPreviousMovementDay}
                                        >
                                            ‹
                                        </button>

                                        <div className="tickets-calendar-field" ref={movementsCalendarRef}>
                                            <button
                                                type="button"
                                                className="tickets-calendar-button"
                                                onClick={() => setIsMovementsCalendarOpen((prev) => !prev)}
                                            >
                                                {formatDateBR(movementViewDate)}
                                            </button>

                                            {isMovementsCalendarOpen && (
                                                <div className="tickets-calendar-popover">
                                                    <DayPicker
                                                        mode="single"
                                                        selected={(() => {
                                                            const [year, month, day] = movementViewDate.split("-").map(Number);
                                                            return new Date(year, month - 1, day);
                                                        })()}
                                                        onSelect={(date) => {
                                                            if (!date) return;

                                                            const year = date.getFullYear();
                                                            const month = String(date.getMonth() + 1).padStart(2, "0");
                                                            const day = String(date.getDate()).padStart(2, "0");

                                                            setMovementViewDate(`${year}-${month}-${day}`);
                                                            setIsMovementsCalendarOpen(false);
                                                        }}
                                                        modifiers={{ hasMovements: movementMarkedDays }}
                                                        modifiersClassNames={{ hasMovements: "day-has-movements" }}
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        <button
                                            type="button"
                                            className="arrow-btn"
                                            onClick={goToNextMovementDay}
                                        >
                                            ›
                                        </button>
                                    </div>

                                    <div className="movement-list scrollable-list">
                                        {movementsOfDay.length === 0 && (
                                            <div className="empty-state">
                                                Nenhuma movimentação para a data selecionada.
                                            </div>
                                        )}

                                        {movementsOfDay.map((movement) => {
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
                                </>
                            )}
                        </section>

                    </div>

                    <div className="right-column">
                        <section className="panel tickets-day-panel" ref={ticketsDayPanelRef}>
                            {isMobile ? (
                                <>
                                    <div
                                        className="section-header"
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
                                        style={{ cursor: "pointer", marginBottom: 0 }}
                                    >
                                        <h2
                                            style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                                margin: 0,
                                            }}
                                        >
                                            <span>Bilhetes do dia</span>
                                            <span className="toggle-icon">
                                                {isTicketsDayPanelOpen ? "−" : "+"}
                                            </span>
                                        </h2>
                                    </div>

                                    {isTicketsDayPanelOpen && (
                                        <>
                                            <div className="tickets-topbar">
                                                <div className="tickets-title-wrap"></div>

                                                <div className="tickets-date-nav">
                                                    <button
                                                        type="button"
                                                        className="nav-mini-button arrow-btn"
                                                        onClick={() => setViewDate(addDays(viewDate, -1))}
                                                        aria-label="Dia anterior"
                                                    >
                                                        &#8249;
                                                    </button>

                                                    <div ref={ticketsCalendarRef} className="tickets-calendar-field">

                                                        <button
                                                            type="button"
                                                            className="tickets-calendar-button"
                                                            onClick={() => setIsTicketsCalendarOpen((prev) => !prev)}
                                                        >
                                                            {formatDateBR(viewDate)}
                                                        </button>

                                                        {isTicketsCalendarOpen && (
                                                            <div className="tickets-calendar-popover">
                                                                <DayPicker
                                                                    mode="single"
                                                                    selected={(() => {
                                                                        const [year, month, day] = viewDate.split("-").map(Number);
                                                                        return new Date(year, month - 1, day);
                                                                    })()}
                                                                    onSelect={(date) => {
                                                                        if (!date) return;

                                                                        const year = date.getFullYear();
                                                                        const month = String(date.getMonth() + 1).padStart(2, "0");
                                                                        const day = String(date.getDate()).padStart(2, "0");

                                                                        setViewDate(`${year}-${month}-${day}`);
                                                                        setIsTicketsCalendarOpen(false);
                                                                    }}
                                                                    modifiers={{ hasTickets: ticketMarkedDays }}
                                                                    modifiersClassNames={{ hasTickets: "day-has-tickets" }}
                                                                />
                                                            </div>
                                                        )}
                                                    </div>

                                                    <button
                                                        type="button"
                                                        className="nav-mini-button arrow-btn"
                                                        onClick={() => setViewDate(addDays(viewDate, 1))}
                                                        aria-label="Próximo dia"
                                                    >
                                                        &#8250;
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="collapsed-ticket-list">
                                                {ticketsOfDay.length === 0 ? (
                                                    <div className="empty-state">
                                                        Nenhum bilhete encontrado para este dia.
                                                    </div>
                                                ) : (
                                                    ticketsOfDay.map((ticket) => {
                                                        const house = houses.find((item) => item.id === Number(ticket.casaId));

                                                        return (
                                                            <div
                                                                id={`collapsed-ticket-${ticket.id}`}
                                                                key={ticket.id}
                                                                className={`collapsed-ticket-card ${openedCollapsedTicketId === ticket.id ? "open" : ""}`}
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
                                                                                    document.getElementById(`collapsed-ticket-${ticket.id}`)?.scrollIntoView({
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
                                                                        className={`collapsed-ticket-status ${ticket.resultado === "Cash Out"
                                                                            ? (Number(ticket.retorno || 0) >= Number(ticket.stake || 0)
                                                                                ? "green"
                                                                                : "red")
                                                                            : String(ticket.resultado || "").toLowerCase()
                                                                            }`}
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
                                </>
                            ) : (
                                <>
                                    <div className="tickets-topbar">
                                        <div className="section-header tickets-title-wrap">
                                            <h2>Bilhetes do dia</h2>
                                        </div>

                                        <div className="tickets-date-nav">
                                            <button
                                                type="button"
                                                className="nav-mini-button arrow-btn"
                                                onClick={() => setViewDate(addDays(viewDate, -1))}
                                                aria-label="Dia anterior"
                                            >
                                                &#8249;
                                            </button>

                                            <div ref={ticketsCalendarRef} className="tickets-calendar-field">

                                                <button
                                                    type="button"
                                                    className="tickets-calendar-button"
                                                    onClick={() => setIsTicketsCalendarOpen((prev) => !prev)}
                                                >
                                                    {formatDateBR(viewDate)}
                                                </button>

                                                {isTicketsCalendarOpen && (
                                                    <div className="tickets-calendar-popover">
                                                        <DayPicker
                                                            mode="single"
                                                            selected={(() => {
                                                                const [year, month, day] = viewDate.split("-").map(Number);
                                                                return new Date(year, month - 1, day);
                                                            })()}
                                                            onSelect={(date) => {
                                                                if (!date) return;

                                                                const year = date.getFullYear();
                                                                const month = String(date.getMonth() + 1).padStart(2, "0");
                                                                const day = String(date.getDate()).padStart(2, "0");

                                                                setViewDate(`${year}-${month}-${day}`);
                                                                setIsTicketsCalendarOpen(false);
                                                            }}
                                                            modifiers={{ hasTickets: ticketMarkedDays }}
                                                            modifiersClassNames={{ hasTickets: "day-has-tickets" }}
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            <button
                                                type="button"
                                                className="nav-mini-button arrow-btn"
                                                onClick={() => setViewDate(addDays(viewDate, 1))}
                                                aria-label="Próximo dia"
                                            >
                                                &#8250;
                                            </button>
                                        </div>
                                    </div>

                                    <div className="collapsed-ticket-list">
                                        {ticketsOfDay.length === 0 ? (
                                            <div className="empty-state">
                                                Nenhum bilhete encontrado para este dia.
                                            </div>
                                        ) : (
                                            ticketsOfDay.map((ticket) => {
                                                const house = houses.find((item) => item.id === Number(ticket.casaId));

                                                return (
                                                    <div
                                                        id={`collapsed-ticket-${ticket.id}`}
                                                        key={ticket.id}
                                                        className={`collapsed-ticket-card ${openedCollapsedTicketId === ticket.id ? "open" : ""}`}
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
                                                                            document.getElementById(`collapsed-ticket-${ticket.id}`)?.scrollIntoView({
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
                                                                className={`collapsed-ticket-status ${ticket.resultado === "Cash Out"
                                                                    ? (Number(ticket.retorno || 0) >= Number(ticket.stake || 0)
                                                                        ? "green"
                                                                        : "red")
                                                                    : String(ticket.resultado || "").toLowerCase()
                                                                    }`}
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
                </section>
            </div>
        </div>
    );
}