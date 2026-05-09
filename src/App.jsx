import { useEffect, useMemo, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import { ptBR } from "date-fns/locale";
import "react-day-picker/dist/style.css";
import "./App.css";
import logo from "./assets/logo.png";
import { supabase } from "./supabase";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
    ReferenceLine,
    ReferenceDot,
} from "recharts";

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

function dateToISO(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
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

function formatWeekRefShort(ref) {
    const start = new Date(`${ref}T12:00:00`);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    const formatDayMonth = (date) => {
        const d = String(date.getDate()).padStart(2, "0");
        const m = String(date.getMonth() + 1).padStart(2, "0");
        return `${d}/${m}`;
    };

    return `${formatDayMonth(start)} a ${formatDayMonth(end)}`;
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
    const [isAddingHouse, setIsAddingHouse] = useState(false);
    const [tickets, setTickets] = useState([]);

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
    const [isStatsCalendarOpen, setIsStatsCalendarOpen] = useState(false);
    const statsCalendarRef = useRef(null);
    const statsFieldRef = useRef(null);
    const [openStatsCalendarUp, setOpenStatsCalendarUp] = useState(false);
    const statsButtonRef = useRef(null);

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

    const [isSavingHouse, setIsSavingHouse] = useState(false);
    const [houseFeedback, setHouseFeedback] = useState({
        type: "",
        message: "",
    });

    const [isTicketPanelOpen, setIsTicketPanelOpen] = useState(false);
    const [isMovementPanelOpen, setIsMovementPanelOpen] = useState(false);
    const [isMovementDayPanelOpen, setIsMovementDayPanelOpen] = useState(false);
    const [activeMovementExtractTab, setActiveMovementExtractTab] = useState(null);
    const [movementExtractHouseScope, setMovementExtractHouseScope] = useState("");
    const [movementExtractPeriodType, setMovementExtractPeriodType] = useState("Geral");
    const [movementExtractPeriodReference, setMovementExtractPeriodReference] = useState("");

    const [isMovementExtractCalendarOpen, setIsMovementExtractCalendarOpen] = useState(false);
    const movementExtractCalendarRef = useRef(null);

    const [isTicketsDayPanelOpen, setIsTicketsDayPanelOpen] = useState(false);
    const [openedCollapsedTicketId, setOpenedCollapsedTicketId] = useState(null);
    const [ticketsDayHouseScope, setTicketsDayHouseScope] = useState("all");
    const [ticketsDayPeriodType, setTicketsDayPeriodType] = useState("Diário");
    const [ticketsDayPeriodReference, setTicketsDayPeriodReference] = useState(hojeISO());
    const [isTicketsCalendarOpen, setIsTicketsCalendarOpen] = useState(false);
    const ticketsCalendarRef = useRef(null);
    const [isMovementsCalendarOpen, setIsMovementsCalendarOpen] = useState(false);
    const movementsCalendarRef = useRef(null);
    const [chartPeriodType, setChartPeriodType] = useState("Mensal");
    const [chartMode, setChartMode] = useState("Banca");
    const [chartPeriodReference, setChartPeriodReference] = useState(getMonthRef(hojeISO()));
    const [statsCalendarPosition, setStatsCalendarPosition] = useState({
        top: 0,
        left: 0,
    });

    const [isBankChartOpen, setIsBankChartOpen] = useState(false);
    const bankChartRef = useRef(null);
    const movementExtractListRef = useRef(null);

    const [activeBottomPanel, setActiveBottomPanel] = useState(null);
    const [isTicketFormCalendarOpen, setIsTicketFormCalendarOpen] = useState(false);
    const ticketFormCalendarRef = useRef(null);
    const [isMovementFormCalendarOpen, setIsMovementFormCalendarOpen] = useState(false);
    const movementFormCalendarRef = useRef(null);
    const leftPanelRef = useRef(null);
    const rightPanelRef = useRef(null);
    const showStatsBottomArrows =
        periodType !== "Diário" && periodType !== "Semanal";


    useEffect(() => {
        const initialScrollY = window.scrollY;

        function handleClickOutside(event) {
            if (
                ticketsCalendarRef.current &&
                !ticketsCalendarRef.current.contains(event.target)
            ) {
                setIsTicketsCalendarOpen(false);
            }
        }

        function handleKeyDown(event) {
            if (event.key === "Escape") {
                setIsTicketsCalendarOpen(false);
            }
        }

        function handleScroll() {
            const scrollDistance = Math.abs(window.scrollY - initialScrollY);

            if (scrollDistance > 80) {
                setIsTicketsCalendarOpen(false);
            }
        }

        if (isTicketsCalendarOpen) {
            document.addEventListener("mousedown", handleClickOutside);
            document.addEventListener("keydown", handleKeyDown);
            window.addEventListener("scroll", handleScroll, { passive: true });
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("scroll", handleScroll);
        };
    }, [isTicketsCalendarOpen]);



    useEffect(() => {
        const initialScrollY = window.scrollY;

        function handleClickOutside(event) {
            if (
                statsCalendarRef.current &&
                !statsCalendarRef.current.contains(event.target)
            ) {
                setIsStatsCalendarOpen(false);
            }
        }

        function handleKeyDown(event) {
            if (event.key === "Escape") {
                setIsStatsCalendarOpen(false);
            }
        }

        function handleScroll() {
            const scrollDistance = Math.abs(window.scrollY - initialScrollY);

            if (scrollDistance > 80) {
                setIsStatsCalendarOpen(false);
            }
        }

        if (isStatsCalendarOpen) {
            document.addEventListener("mousedown", handleClickOutside);
            document.addEventListener("keydown", handleKeyDown);
            window.addEventListener("scroll", handleScroll, { passive: true });
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("scroll", handleScroll);
        };
    }, [isStatsCalendarOpen]);

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
        const initialScrollY = window.scrollY;

        function handleClickOutside(event) {
            if (
                movementExtractCalendarRef.current &&
                !movementExtractCalendarRef.current.contains(event.target)
            ) {
                setIsMovementExtractCalendarOpen(false);
            }
        }

        function handleKeyDown(event) {
            if (event.key === "Escape") {
                setIsMovementExtractCalendarOpen(false);
            }
        }

        function handleScroll() {
            const scrollDistance = Math.abs(window.scrollY - initialScrollY);

            if (scrollDistance > 80) {
                setIsMovementExtractCalendarOpen(false);
            }
        }

        if (isMovementExtractCalendarOpen) {
            document.addEventListener("mousedown", handleClickOutside);
            document.addEventListener("keydown", handleKeyDown);
            window.addEventListener("scroll", handleScroll, { passive: true });
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("scroll", handleScroll);
        };
    }, [isMovementExtractCalendarOpen]);


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

                console.log("movementsData:", movementsData);
                console.log("movementsError:", movementsError);

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
                    console.log("formattedMovements:", formattedMovements);
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
        if (activeBottomPanel !== "extract") {
            setActiveMovementExtractTab(null);
            setMovementExtractHouseScope("");
            setMovementExtractPeriodType("Geral");
            setMovementExtractPeriodReference("");
            setIsMovementExtractCalendarOpen(false);
        }
    }, [activeBottomPanel]);

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

    const bankHistoryData = useMemo(() => {
        if (selectedHouseScope === null) return [];

        const chartTickets = baseTicketsForPeriod.filter((ticket) => {
            if (selectedHouseScope === "all") return true;
            return Number(ticket.casaId) === Number(selectedHouseScope);
        });

        const chartMovements = baseMovementsForPeriod.filter((movement) => {
            if (selectedHouseScope === "all") return true;
            return Number(movement.casaId) === Number(selectedHouseScope);
        });

        const initialBank = houses
            .filter((house) => {
                if (selectedHouseScope === "all") return true;
                return Number(house.id) === Number(selectedHouseScope);
            })
            .reduce((acc, house) => acc + Number(house.bancaInicial || 0), 0);

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

        const orderedDates = Object.keys(dailyTotals).sort((a, b) =>
            a.localeCompare(b)
        );

        const startDate =
            periodType === "Geral"
                ? orderedDates[0] || hojeISO()
                : periodInterval.start;

        const endDate =
            periodType === "Geral"
                ? orderedDates[orderedDates.length - 1] || hojeISO()
                : periodInterval.end;

        if (!startDate || !endDate) return [];

        let banca = initialBank;

        const result = [];

        orderedDates.forEach((date) => {
            if (date < startDate || date > endDate) return;

            banca += dailyTotals[date];

            result.push({
                data: date,
                banca: Number(banca.toFixed(2)),
                deposito: dailyMovements[date]?.deposito || 0,
                saque: dailyMovements[date]?.saque || 0,
            });
        });

        if (result.length === 0) {
            return [
                {
                    data: startDate,
                    banca: Number(initialBank.toFixed(2)),
                    deposito: 0,
                    saque: 0,
                },
            ];
        }

        return result;
    }, [
        baseTicketsForPeriod,
        baseMovementsForPeriod,
        houses,
        selectedHouseScope,
        periodType,
        periodInterval,
        chartMode,
    ]);
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
        selectedHouseScope === null ? null : summaryStats.realProfit;

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
        let base = tickets;

        if (ticketsDayHouseScope !== "all") {
            base = base.filter(
                (ticket) => Number(ticket.casaId) === Number(ticketsDayHouseScope)
            );
        }

        if (ticketsDayPeriodType !== "Geral") {
            const interval = getPeriodInterval(
                ticketsDayPeriodType,
                ticketsDayPeriodReference
            );

            if (!interval.start || !interval.end) return [];

            base = base.filter(
                (ticket) =>
                    ticket.data >= interval.start &&
                    ticket.data <= interval.end
            );
        }

        return base.sort((a, b) => b.data.localeCompare(a.data) || b.id - a.id);
    }, [
        tickets,
        ticketsDayHouseScope,
        ticketsDayPeriodType,
        ticketsDayPeriodReference,
    ]);

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

    const movementExtractBase = useMemo(() => {
        let base = movements;

        if (movementExtractHouseScope !== "all") {
            base = base.filter(
                (movement) => Number(movement.casaId) === Number(movementExtractHouseScope)
            );
        }

        if (movementExtractPeriodType !== "Geral") {
            const interval = getPeriodInterval(
                movementExtractPeriodType,
                movementExtractPeriodReference
            );

            if (!interval.start || !interval.end) return [];

            base = base.filter(
                (movement) =>
                    movement.data >= interval.start &&
                    movement.data <= interval.end
            );
        }

        return base;
    }, [
        movements,
        movementExtractHouseScope,
        movementExtractPeriodType,
        movementExtractPeriodReference,
    ]);

    const totalDeposits = useMemo(() => {
        return movementExtractBase
            .filter((movement) => movement.tipo === "Depósito")
            .reduce((acc, movement) => acc + Number(movement.valor || 0), 0);
    }, [movementExtractBase]);

    const totalWithdrawals = useMemo(() => {
        return movementExtractBase
            .filter((movement) => movement.tipo === "Saque")
            .reduce((acc, movement) => acc + Number(movement.valor || 0), 0);
    }, [movementExtractBase]);

    const depositMovements = useMemo(() => {
        return movementExtractBase
            .filter((movement) => movement.tipo === "Depósito")
            .sort((a, b) => b.data.localeCompare(a.data) || b.id - a.id);
    }, [movementExtractBase]);

    const movementExtractReferences = useMemo(() => {
        const dates = movementExtractBase.map((movement) => movement.data);

        if (movementExtractPeriodType === "Diário") {
            return [...new Set([hojeISO(), ...dates])]
                .filter(Boolean)
                .sort((a, b) => b.localeCompare(a));
        }

        if (movementExtractPeriodType === "Semanal") {
            return [...new Set([getWeekRef(hojeISO()), ...dates.map(getWeekRef)])]
                .filter(Boolean)
                .sort((a, b) => b.localeCompare(a));
        }

        if (movementExtractPeriodType === "Mensal") {
            return [...new Set([getMonthRef(hojeISO()), ...dates.map(getMonthRef)])]
                .filter(Boolean)
                .sort((a, b) => b.localeCompare(a));
        }

        if (movementExtractPeriodType === "Anual") {
            return [...new Set([getYearRef(hojeISO()), ...dates.map(getYearRef)])]
                .filter(Boolean)
                .sort((a, b) => b.localeCompare(a));
        }

        return [];
    }, [movementExtractBase, movementExtractPeriodType]);

    const movementExtractPeriodInterval = useMemo(() => {
        return getPeriodInterval(
            movementExtractPeriodType,
            movementExtractPeriodReference
        );
    }, [movementExtractPeriodType, movementExtractPeriodReference]);

    const withdrawalMovements = useMemo(() => {
        return movementExtractBase
            .filter((movement) => movement.tipo === "Saque")
            .sort((a, b) => b.data.localeCompare(a.data) || b.id - a.id);
    }, [movementExtractBase]);
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

            if (editingHouseId) {
                const { error } = await supabase
                    .from("houses")
                    .update({
                        nome: name,
                        banca_inicial: initialBank,
                    })
                    .eq("id", editingHouseId);

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
                            ? { ...house, nome: name, bancaInicial: initialBank }
                            : house
                    )
                );

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

    async function handleDeleteHouse(houseId) {
        const houseTickets = tickets.filter((ticket) => Number(ticket.casaId) === houseId);
        const houseMovements = movements.filter(
            (movement) => Number(movement.casaId) === houseId
        );

        if (houseTickets.length > 0 || houseMovements.length > 0) {
            const confirmedWithData = window.confirm(
                "Essa casa possui bilhetes ou movimentações vinculadas. Deseja excluir a casa e remover esses registros?"
            );

            if (!confirmedWithData) return;

            const { error: ticketsError } = await supabase
                .from("tickets")
                .delete()
                .eq("casa_id", houseId);

            if (ticketsError) {
                console.error("Erro ao excluir bilhetes da casa:", ticketsError);
                alert("Não foi possível excluir os bilhetes vinculados.");
                return;
            }

            const { error: movementsError } = await supabase
                .from("movements")
                .delete()
                .eq("casa_id", houseId);

            if (movementsError) {
                console.error("Erro ao excluir movimentações da casa:", movementsError);
                alert("Não foi possível excluir as movimentações vinculadas.");
                return;
            }

            setTickets((prev) => prev.filter((ticket) => Number(ticket.casaId) !== houseId));
            setMovements((prev) =>
                prev.filter((movement) => Number(movement.casaId) !== houseId)
            );
        } else {
            const confirmed = window.confirm("Deseja excluir esta casa?");
            if (!confirmed) return;
        }

        const { error: houseError } = await supabase
            .from("houses")
            .delete()
            .eq("id", houseId);

        if (houseError) {
            console.error("Erro ao excluir casa:", houseError);
            alert("Não foi possível excluir a casa.");
            return;
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
            const updatedTicket = {
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
                .eq("id", editingTicketId);

            if (error) {
                console.error("Erro ao atualizar bilhete no Supabase:", error);
                alert("Não foi possível atualizar o bilhete.");
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
            setViewDate(ticketForm.data);
            setOpenedCollapsedTicketId(null);
            resetTicketForm();
            setIsTicketPanelOpen(false);
            setActiveBottomPanel(null);
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
        setActiveBottomPanel(null);
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
            const { error } = await supabase
                .from("movements")
                .update({
                    data: payload.data,
                    casa_id: payload.casaId,
                    tipo: payload.tipo,
                    valor: payload.valor,
                    observacoes: payload.observacoes,
                })
                .eq("id", editingMovementId);

            if (error) {
                console.error("Erro ao atualizar movimentação no Supabase:", error);
                alert("Não foi possível atualizar a movimentação.");
                return;
            }

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
            setActiveBottomPanel(null);
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
        setActiveBottomPanel(null);
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
        setActiveBottomPanel("ticket");
        setOpenedCollapsedTicketId(null);

        setTimeout(() => {
            leftPanelRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "start",
            });
        }, 120);
    }

    async function handleDeleteTicket(ticketId) {
        const confirmed = window.confirm("Deseja excluir este bilhete?");
        if (!confirmed) return;

        const { error } = await supabase
            .from("tickets")
            .delete()
            .eq("id", ticketId);

        if (error) {
            console.error("Erro ao excluir bilhete:", error);
            alert("Não foi possível excluir o bilhete.");
            return;
        }

        setTickets((prev) => prev.filter((ticket) => ticket.id !== ticketId));

        if (editingTicketId === ticketId) {
            setEditingTicketId(null);
            setTicketForm(initialTicketForm);
        }

        if (openedCollapsedTicketId === ticketId) {
            setOpenedCollapsedTicketId(null);
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
        setActiveBottomPanel("movement");
        setIsMovementDayPanelOpen(false);

        setTimeout(() => {
            rightPanelRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "start",
            });
        }, 120);
    }

    async function handleDeleteMovement(movementId) {
        const confirmed = window.confirm("Deseja excluir esta movimentação?");
        if (!confirmed) return;

        const { error } = await supabase
            .from("movements")
            .delete()
            .eq("id", movementId);

        if (error) {
            console.error("Erro ao excluir movimentação:", error);
            alert("Não foi possível excluir a movimentação.");
            return;
        }

        setMovements((prev) =>
            prev.filter((movement) => movement.id !== movementId)
        );

        if (editingMovementId === movementId) {
            setEditingMovementId(null);
            setMovementForm(initialMovementForm);
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
        setHousePageStart(nextStart);
        setIsSliding(true);

        if (animationTimeoutRef.current) {
            clearTimeout(animationTimeoutRef.current);
        }

        animationTimeoutRef.current = setTimeout(() => {
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
        const evolutionCard = {
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
            onClick: () => {
                setIsBankChartOpen((prev) => !prev);

                setTimeout(() => {
                    bankChartRef.current?.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                    });
                }, 100);
            },
        };

        const initialBankCard = {
            title: "Banca inicial",
            value: topInitialBank,
            formatter: formatMoney,
            highlight: true,
            tone: "neutral",
        };

        const currentBankCard = {
            title: periodType === "Diário" || periodType === "Semanal" ? "Banca atual" : "Banca final",
            value: topCurrentBank,
            formatter: formatMoney,
            highlight: true,
            tone: "neutral",
        };

        const investedCard = {
            title: "Valor apostado",
            value: selectedHouseScope === null ? null : summaryStats.invested,
            formatter: formatMoney,
            tone: "neutral",
        };

        const realInvestedCard = {
            title: "Valor real apostado",
            value: selectedHouseScope === null ? null : summaryStats.investedReal,
            formatter: formatMoney,
            tone: "neutral",
        };

        const resultCard = {
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
        };

        const bankUsageCard = {
            title: "Uso da banca",
            value: bankUsagePercent,
            formatter: formatPercent,
            tone: "neutral",
        };

        const roiCard = {
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
        };

        if (periodType === "Diário") {
            return [
                [
                    initialBankCard,
                    investedCard,
                    currentBankCard,
                    resultCard,
                ],
            ];
        }

        if (periodType === "Semanal") {
            return [
                [
                    initialBankCard,
                    currentBankCard,
                    resultCard,
                    evolutionCard,
                ],
            ];
        }

        return [
            [
                initialBankCard,
                currentBankCard,
                resultCard,
                evolutionCard,
            ],
            [
                investedCard,
                realInvestedCard,
                bankUsageCard,
                roiCard,
            ],
        ];
    }, [
        topInitialBank,
        topCurrentBank,
        summaryStats,
        finalResult,
        bankEvolution,
        selectedHouseScope,
        bankUsagePercent,
        periodType,
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
    const canGoNext = housePageStart + housesPerPage < housesWithCurrentBank.length + 1;
    const selectedStakeFields = getStakeSourceFields(ticketForm.origemStake);

    function renderTopValue(value, formatter = (v) => v) {
        if (value === null) return "—";
        return formatter(value);
    }

    const isBankChartPositive =
        bankHistoryData.length > 1 &&
        bankHistoryData[bankHistoryData.length - 1]?.banca >= bankHistoryData[0]?.banca;

    useEffect(() => {
        const initialScrollY = window.scrollY;

        function handleClickOutside(event) {
            if (
                ticketFormCalendarRef.current &&
                !ticketFormCalendarRef.current.contains(event.target)
            ) {
                setIsTicketFormCalendarOpen(false);
            }

            if (
                movementFormCalendarRef.current &&
                !movementFormCalendarRef.current.contains(event.target)
            ) {
                setIsMovementFormCalendarOpen(false);
            }
        }

        function handleKeyDown(event) {
            if (event.key === "Escape") {
                setIsTicketFormCalendarOpen(false);
                setIsMovementFormCalendarOpen(false);
            }
        }

        function handleWheel(event) {
            const calendarIsTarget =
                ticketFormCalendarRef.current?.contains(event.target) ||
                movementFormCalendarRef.current?.contains(event.target);

            if (!calendarIsTarget) {
                setIsTicketFormCalendarOpen(false);
                setIsMovementFormCalendarOpen(false);
            }
        }

        function handleScroll() {
            const scrollDistance = Math.abs(window.scrollY - initialScrollY);

            if (scrollDistance > 40) {
                setIsTicketFormCalendarOpen(false);
                setIsMovementFormCalendarOpen(false);
            }
        }

        if (isTicketFormCalendarOpen || isMovementFormCalendarOpen) {
            document.addEventListener("mousedown", handleClickOutside);
            document.addEventListener("keydown", handleKeyDown);
            window.addEventListener("wheel", handleWheel, { passive: true });
            window.addEventListener("scroll", handleScroll, { passive: true });
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("wheel", handleWheel);
            window.removeEventListener("scroll", handleScroll);
        };
    }, [isTicketFormCalendarOpen, isMovementFormCalendarOpen]);

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

                <section className={`panel top-panel ${isStatsCalendarOpen ? "calendar-open" : ""}`}>
                    <div className="top-desktop-layout">
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

                                {houseFeedback.message && (
                                    <div className={`house-feedback ${houseFeedback.type}`}>
                                        {houseFeedback.message}
                                    </div>
                                )}
                            </form>

                            {!isMobile && houses.length + 1 > DESKTOP_HOUSES_PER_PAGE && (
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
                                                            className={`top-house-card top-house-general-card ${selectedHouseScope === "all"
                                                                ? "selected-house-card"
                                                                : ""
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
                                                        className={`top-house-card ${Number(selectedHouseScope) === Number(house.id) ? "selected-house-card" : ""
                                                            }`}
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

                        {isMobile && (periodType === "Diário" || periodType === "Semanal") && (
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
                                                            🗓️
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
                                                                        ? new Date(`${periodReference}T12:00:00`)
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

                            {!isMobile && topMetricPages.length > 1 && (
                                <div className="stats-top-arrows-inline">
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
                                </div>
                            )}
                        </div>

                        <div className="stats-top-section">
                            <div
                                className={`stats-top-grid ${isStatsSliding ? `is-sliding ${statsSlideDirection === "next" ? "slide-next" : "slide-prev"}` : ""}`}
                            >
                                {topMetricPages[topMetricIndex].map((item) => (
                                    <div
                                        key={item.title}
                                        className={`stats-top-card ${item.onClick ? "clickable" : ""} ${item.tone === "positive" ? "positive" : item.tone === "negative" ? "negative" : ""}`}
                                        onClick={item.onClick}
                                    >
                                        <span>
                                            {item.title}
                                            {item.title === "Evolução da banca" && (
                                                <strong className="metric-toggle-indicator">
                                                    {isBankChartOpen ? "−" : "+"}
                                                </strong>
                                            )}
                                        </span>
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

                {isBankChartOpen && bankHistoryData.length > 0 && (
                    <section ref={bankChartRef} className="panel bank-chart-panel">
                        <div className="bank-chart-header">
                            <h2>Evolução da banca</h2>

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
                                            const date = new Date(`${value}T12:00:00`);
                                            return `${date.getDate()}/${date.getMonth() + 1}`;
                                        }}
                                    />
                                    <YAxis
                                        domain={["dataMin - 50", "dataMax + 50"]}
                                        axisLine={false}
                                        tickLine={false}
                                        width={64}
                                        tick={{ fontSize: 11, fill: "#64748b" }}
                                        tickFormatter={(value) =>
                                            `R$ ${Number(value).toLocaleString("pt-BR")}`
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
                    </section>
                )}

                <div className="bottom-action-grid">
                    <button
                        type="button"
                        className={`bottom-action-card ${activeBottomPanel === "ticket" ? "active" : ""}`}
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
                        <span>Novo bilhete</span>
                        <strong>{activeBottomPanel === "ticket" ? "−" : "+"}</strong>
                    </button>

                    <button
                        type="button"
                        className={`bottom-action-card ${activeBottomPanel === "ticketsDay" ? "active" : ""}`}
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
                        <span>Bilhetes do dia</span>
                        <strong>{activeBottomPanel === "ticketsDay" ? "−" : "+"}</strong>
                    </button>

                    <button
                        type="button"
                        className={`bottom-action-card ${activeBottomPanel === "movement" ? "active" : ""}`}
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
                        <span>
                            {window.innerWidth <= 375
                                ? "Movimentação"
                                : "Nova movimentação"}
                        </span>
                        <strong>{activeBottomPanel === "movement" ? "−" : "+"}</strong>
                    </button>

                    <button
                        type="button"
                        className={`bottom-action-card ${activeBottomPanel === "extract" ? "active" : ""}`}
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
                        <span>Extrato</span>
                        <strong>{activeBottomPanel === "extract" ? "−" : "+"}</strong>
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
                                                    ? new Date(`${ticketForm.data}T12:00:00`)
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
                                                            ? new Date(`${ticketsDayPeriodReference}T12:00:00`)
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
                                    Nenhum bilhete encontrado para este período.
                                </div>
                            ) : (
                                ticketsOfDay.map((ticket) => {
                                    const house = houses.find(
                                        (item) => Number(item.id) === Number(ticket.casaId)
                                    );

                                    return (
                                        <div
                                            key={ticket.id}
                                            id={`collapsed-ticket-${ticket.id}`}
                                            id={`collapsed-ticket-${ticket.id}`}
                                            className={`collapsed-ticket-card ${openedCollapsedTicketId === ticket.id ? "open" : ""
                                                }`}
                                        >
                                            <button
                                                type="button"
                                                className="collapsed-ticket-item"
                                                onClick={() => {
                                                    const nextOpenId = openedCollapsedTicketId === ticket.id ? null : ticket.id;
                                                    setOpenedCollapsedTicketId(nextOpenId);

                                                    if (nextOpenId === ticket.id) {
                                                        setTimeout(() => {
                                                            document.getElementById(`collapsed-ticket-${ticket.id}`)?.scrollIntoView({
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
                                                    className={`collapsed-ticket-status ${ticket.resultado === "Cash Out"
                                                        ? Number(ticket.retorno || 0) >= Number(ticket.stake || 0)
                                                            ? "green"
                                                            : "red"
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
                                                    ? new Date(`${movementForm.data}T12:00:00`)
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
                                                            ? new Date(`${movementExtractPeriodReference}T12:00:00`)
                                                            : new Date(`${hojeISO()}T12:00:00`)
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
                                className={`movement-summary-card ${activeMovementExtractTab === "deposits" ? "active" : ""}`}
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
                                        {activeMovementExtractTab === "deposits" ? "−" : "+"}
                                    </span>
                                </div>
                                <strong className="movement-positive">
                                    {movementExtractHouseScope ? formatMoney(totalDeposits) : "—"}
                                </strong>
                            </button>

                            <button
                                type="button"
                                className={`movement-summary-card ${activeMovementExtractTab === "withdrawals" ? "active" : ""}`}
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
                                        {activeMovementExtractTab === "withdrawals" ? "−" : "+"}
                                    </span>
                                </div>
                                <strong className="movement-negative">
                                    {movementExtractHouseScope ? formatMoney(totalWithdrawals) : "—"}
                                </strong>
                            </button>
                        </div>

                        {activeMovementExtractTab === "deposits" && (
                            <div className="movement-extract-list" ref={movementExtractListRef}>
                                {depositMovements.length === 0 ? (
                                    <div className="empty-state">Nenhum depósito encontrado.</div>
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
                                    <div className="empty-state">Nenhum saque encontrado.</div>
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
                            className={`panel ticket-panel ${!isTicketPanelOpen ? "panel-closed-compact" : ""}`}
                            ref={ticketPanelRef}
                        >
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
                                <h2 className="movement-header">
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

                        <section
                            className={`panel tickets-day-panel ${!isTicketsDayPanelOpen ? "tickets-day-panel-closed" : ""}`}
                            ref={ticketsDayPanelRef}
                        >
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

                                </>
                            ) : (
                                <>
                                    <div
                                        className="movement-extract-title-row"
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
                                        <h2>Bilhetes do dia</h2>

                                        <span className="extract-toggle-icon">
                                            {isTicketsDayPanelOpen ? "−" : "+"}
                                        </span>
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
                                                                                ? `${ticketsDayPeriodReference}-01T12:00:00`
                                                                                : ticketsDayPeriodType === "Anual"
                                                                                    ? `${ticketsDayPeriodReference}-01-01T12:00:00`
                                                                                    : `${ticketsDayPeriodReference}T12:00:00`
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

                    <div className="right-column">

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
                                style={{ cursor: "pointer" }}
                            >
                                <h2 className="movement-extract-title-row">
                                    <span>Extrato de movimentações</span>

                                    <span className="extract-toggle-icon">
                                        {isMovementDayPanelOpen ? "−" : "+"}
                                    </span>
                                </h2>
                            </div>

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
                                                                            ? new Date(`${movementExtractPeriodReference}T12:00:00`)
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
                                                className={`movement-summary-card ${activeMovementExtractTab === "depositos" ? "active" : ""}`}
                                                onClick={() =>
                                                    setActiveMovementExtractTab((prev) =>
                                                        prev === "depositos" ? null : "depositos"
                                                    )
                                                }
                                            >
                                                <div className="movement-summary-card-header">
                                                    <span>Total depositado</span>

                                                    <span className="card-action-icon">
                                                        {activeMovementExtractTab === "depositos" ? "−" : "+"}
                                                    </span>
                                                </div>

                                                <strong className="movement-positive">
                                                    {formatMoney(totalDeposits)}
                                                </strong>
                                            </button>

                                            <button
                                                type="button"
                                                className={`movement-summary-card ${activeMovementExtractTab === "saques" ? "active" : ""}`}
                                                onClick={() =>
                                                    setActiveMovementExtractTab((prev) =>
                                                        prev === "saques" ? null : "saques"
                                                    )
                                                }
                                            >
                                                <div className="movement-summary-card-header">
                                                    <span>Total sacado</span>

                                                    <span className="card-action-icon">
                                                        {activeMovementExtractTab === "saques" ? "−" : "+"}
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
                                                        Nenhuma movimentação encontrada.
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
        </div>
    );
}