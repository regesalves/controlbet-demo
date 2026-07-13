import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";
import { isDevAuthBypassEnabled } from "../auth/devAuth";
import logo from "../assets/logo.png";
import { supabase } from "../supabase";
import { exportReportToExcel, exportReportToPdf } from "../utils/reportExport";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  DashboardShell,
  KpiRow,
  PeriodFields,
  getPeriodInterval,
} from "./DashboardPage";

function formatMoney(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatSignedMoney(value) {
  const numericValue = Number(value || 0);

  if (numericValue === 0) {
    return formatMoney(0);
  }

  return `${numericValue > 0 ? "+" : "-"}${formatMoney(Math.abs(numericValue))}`;
}

function formatCount(value) {
  return Number(value || 0).toLocaleString("pt-BR");
}

function formatPercent(value) {
  return `${Number(value || 0).toFixed(2)}%`;
}

function formatSignedPercent(value) {
  const numericValue = Number(value || 0);
  const label = `${Math.abs(numericValue).toFixed(2)}%`;

  if (numericValue === 0) {
    return label;
  }

  return `${numericValue > 0 ? "+" : "-"}${label}`;
}

function todayISO() {
  const today = new Date();
  today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
  return today.toISOString().slice(0, 10);
}

function getReferenceForPeriod(periodType, dateISO) {
  if (periodType === "Geral") {
    return "";
  }

  if (periodType === "Mensal") {
    return dateISO.slice(0, 7);
  }

  if (periodType === "Anual") {
    return dateISO.slice(0, 4);
  }

  if (periodType === "Semanal") {
    const date = new Date(`${dateISO}T12:00:00`);
    const day = date.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    date.setDate(date.getDate() + diff);
    return date.toISOString().slice(0, 10);
  }

  return dateISO;
}

function getReportReferenceLabel(periodType, periodReference) {
  if (periodType === "Geral" || !periodReference) {
    return "Geral";
  }

  if (periodType === "Mensal") {
    return periodReference.split("-").reverse().join("/");
  }

  if (periodType === "Anual") {
    return periodReference;
  }

  if (periodType === "Semanal" || String(periodType || "").startsWith("Di")) {
    return periodReference.split("-").reverse().join("/");
  }

  return periodReference;
}

function formatDisplayDate(dateISO) {
  if (!dateISO) {
    return "";
  }

  return String(dateISO).split("-").reverse().join("/");
}

function getRealTicketImpact(ticket) {
  return Number(ticket?.lucroReal || 0) - Number(ticket?.perdaReal || 0);
}

function movementSignal(type) {
  return type === "Saque" ? -1 : 1;
}

function getTicketStatus(ticket) {
  if (ticket.resultado === "Green") {
    return "Ganhas";
  }

  if (ticket.resultado === "Red") {
    return "Perdidas";
  }

  if (ticket.resultado === "Cash Out") {
    return "Encerradas";
  }

  return "Pendentes";
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

function ReportsAdvancedCard({ detail, label, tone = "neutral", value }) {
  return (
    <article className={`reports-advanced-card ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {detail ? <small>{detail}</small> : null}
    </article>
  );
}

function ReportsChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="reports-chart-tooltip">
      <span>{label}</span>
      {payload.map((item) => (
        <strong key={item.dataKey || item.name}>
          {item.name}: {item.name === "Apostas" ? formatCount(item.value) : typeof item.value === "number" ? formatMoney(item.value) : item.value}
        </strong>
      ))}
    </div>
  );
}

export default function ReportsPage({ landingTheme = "dark" }) {
  const navigate = useNavigate();
  const { clearSession, user } = useAuth();
  const userId = user?.id;
  const metadata = user?.user_metadata || {};
  const accountFirstName =
    metadata.first_name ||
    metadata.nome ||
    metadata.full_name?.split(/\s+/)[0] ||
    user?.email?.split("@")[0] ||
    "";

  const [activeReportsTab, setActiveReportsTab] = useState("overview");
  const [houses, setHouses] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [movements, setMovements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [houseScope, setHouseScope] = useState("all");
  const [periodType, setPeriodType] = useState("Mensal");
  const [periodReference, setPeriodReference] = useState(() =>
    getReferenceForPeriod("Mensal", todayISO())
  );
  const exportMenuRef = useRef(null);
  const analyticsExportMenuRef = useRef(null);

  useEffect(() => {
    if (!isExportMenuOpen) {
      return undefined;
    }

    function handlePointerDown(event) {
      const exportMenu = analyticsExportMenuRef.current || exportMenuRef.current;

      if (exportMenu && !exportMenu.contains(event.target)) {
        setIsExportMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isExportMenuOpen]);

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    async function loadReportsData() {
      setIsLoading(true);
      setLoadError("");

      let effectiveUserId = userId;

      if (isDevAuthBypassEnabled) {
        const { data: currentAuthData } = await supabase.auth.getSession();
        effectiveUserId = currentAuthData?.session?.user?.id || userId;
      }

      let housesQuery = supabase.from("houses").select("*").order("id", { ascending: true });
      let ticketsQuery = supabase.from("tickets").select("*").order("id", { ascending: false });
      let movementsQuery = supabase.from("movements").select("*").order("id", { ascending: false });

      if (effectiveUserId) {
        housesQuery = housesQuery.eq("user_id", effectiveUserId);
        ticketsQuery = ticketsQuery.eq("user_id", effectiveUserId);
        movementsQuery = movementsQuery.eq("user_id", effectiveUserId);
      }

      const [housesResult, ticketsResult, movementsResult] = await Promise.all([
        housesQuery,
        ticketsQuery,
        movementsQuery,
      ]);

      if (housesResult.error || ticketsResult.error || movementsResult.error) {
        const error = housesResult.error || ticketsResult.error || movementsResult.error;

        if (isSupabaseAuthError(error)) {
          clearSession();
          setIsLoading(false);
          return;
        }

        setLoadError("Não foi possível carregar os dados dos relatórios.");
        setIsLoading(false);
        return;
      }

      setHouses(
        (housesResult.data || []).map((house) => ({
          id: house.id,
          nome: house.nome,
          bancaInicial: Number(house.banca_inicial || 0),
        }))
      );
      setTickets(
        (ticketsResult.data || []).map((ticket) => ({
          id: ticket.id,
          data: ticket.data,
          casaId: Number(ticket.casa_id),
          categoria: ticket.categoria || "",
          odd: Number(ticket.odd || 0),
          stake: Number(ticket.stake || 0),
          stakeReal: Number(ticket.stake_real || 0),
          retorno: Number(ticket.retorno || 0),
          resultado: ticket.resultado || "Pendente",
          lucro: Number(ticket.lucro || 0),
          lucroReal: Number(ticket.lucro_real || 0),
          perdaReal: Number(ticket.perda_real || 0),
          numeroBilhete: ticket.numero_bilhete || "",
          nomeBilhete: ticket.nome_bilhete || "",
          observacoes: ticket.observacoes || "",
        }))
      );
      setMovements(
        (movementsResult.data || []).map((movement) => ({
          id: movement.id,
          data: movement.data,
          casaId: Number(movement.casa_id),
          tipo: movement.tipo,
          valor: Number(movement.valor || 0),
          observacoes: movement.observacoes || "",
        }))
      );
      setIsLoading(false);
    }

    loadReportsData();
  }, [clearSession, userId]);

  const periodInterval = useMemo(
    () => getPeriodInterval(periodType, periodReference),
    [periodReference, periodType]
  );

  const periodTickets = useMemo(
    () =>
      tickets.filter((ticket) => {
        if (periodInterval.start && ticket.data < periodInterval.start) {
          return false;
        }

        if (periodInterval.end && ticket.data > periodInterval.end) {
          return false;
        }

        return true;
      }),
    [periodInterval, tickets]
  );

  const filteredTickets = useMemo(
    () =>
      tickets.filter((ticket) => {
        if (houseScope === null) {
          return false;
        }

        if (houseScope !== "all" && Number(ticket.casaId) !== Number(houseScope)) {
          return false;
        }

        if (periodInterval.start && ticket.data < periodInterval.start) {
          return false;
        }

        if (periodInterval.end && ticket.data > periodInterval.end) {
          return false;
        }

        return true;
      }),
    [houseScope, periodInterval, tickets]
  );

  const filteredMovements = useMemo(
    () =>
      movements.filter((movement) => {
        if (houseScope === null) {
          return false;
        }

        if (houseScope !== "all" && Number(movement.casaId) !== Number(houseScope)) {
          return false;
        }

        if (periodInterval.start && movement.data < periodInterval.start) {
          return false;
        }

        if (periodInterval.end && movement.data > periodInterval.end) {
          return false;
        }

        return true;
      }),
    [houseScope, movements, periodInterval]
  );

  const reportStats = useMemo(() => {
    const analysisTickets = houseScope === null ? periodTickets : filteredTickets;
    const resolvedOverviewTickets = filteredTickets.filter((ticket) => ticket.resultado !== "Pendente");
    const winningOverviewTickets = resolvedOverviewTickets.filter(
      (ticket) =>
        ticket.resultado === "Green" ||
        (ticket.resultado === "Cash Out" && getRealTicketImpact(ticket) > 0)
    );
    const overviewDistribution = filteredTickets.reduce(
      (acc, ticket) => {
        acc[getTicketStatus(ticket)] += 1;
        return acc;
      },
      { Ganhas: 0, Perdidas: 0, Encerradas: 0, Pendentes: 0 }
    );
    const analysisDistribution = analysisTickets.reduce(
      (acc, ticket) => {
        acc[getTicketStatus(ticket)] += 1;
        return acc;
      },
      { Ganhas: 0, Perdidas: 0, Encerradas: 0, Pendentes: 0 }
    );
    const houseStats = houses
      .map((house) => {
        const houseTickets = analysisTickets.filter(
          (ticket) => Number(ticket.casaId) === Number(house.id)
        );
        const result = houseTickets.reduce((sum, ticket) => sum + getRealTicketImpact(ticket), 0);
        return { house, result, tickets: houseTickets.length };
      })
      .filter((item) => item.tickets > 0);
    const sortedByResult = [...houseStats].sort((a, b) => b.result - a.result);
    const sortedByVolume = [...houseStats].sort((a, b) => b.tickets - a.tickets);
    const resultSortedTickets = [...analysisTickets].sort(
      (a, b) => getRealTicketImpact(b) - getRealTicketImpact(a)
    );
    const oddSortedTickets = [...analysisTickets].sort((a, b) => Number(b.odd || 0) - Number(a.odd || 0));
    const selectedHouses =
      houseScope === "all"
        ? houses
        : houseScope === null
          ? []
          : houses.filter((house) => Number(house.id) === Number(houseScope));
    const initialBank = selectedHouses.reduce((sum, house) => sum + Number(house.bancaInicial || 0), 0);
    const movementBalance = filteredMovements.reduce(
      (sum, movement) => sum + Number(movement.valor || 0) * movementSignal(movement.tipo),
      0
    );
    const result = resolvedOverviewTickets.reduce((sum, ticket) => sum + getRealTicketImpact(ticket), 0);
    const finalBank = initialBank + movementBalance + result;
    const wagered = filteredTickets.reduce((sum, ticket) => sum + Number(ticket.stake || 0), 0);
    const returnTotal = filteredTickets.reduce((sum, ticket) => sum + Number(ticket.retorno || 0), 0);
    const realWagered = filteredTickets.reduce((sum, ticket) => sum + Number(ticket.stakeReal || 0), 0);
    const averageWagered = filteredTickets.length > 0 ? wagered / filteredTickets.length : 0;
    const averageProfit = resolvedOverviewTickets.length > 0 ? result / resolvedOverviewTickets.length : 0;
    const roi = realWagered > 0 ? (result / realWagered) * 100 : 0;
    const bankEvolution = initialBank > 0 ? ((finalBank - initialBank) / initialBank) * 100 : 0;
    const performanceFinalBank = initialBank + result;
    const performanceEvolution =
      initialBank > 0 ? ((performanceFinalBank - initialBank) / initialBank) * 100 : 0;
    const hitRate =
      resolvedOverviewTickets.length > 0
        ? (winningOverviewTickets.length / resolvedOverviewTickets.length) * 100
        : 0;

    return {
      analysisDistribution,
      averageProfit,
      averageWagered,
      bankEvolution,
      bestHouse: sortedByResult[0],
      biggestLoss: resultSortedTickets[resultSortedTickets.length - 1],
      biggestOdd: oddSortedTickets[0],
      biggestWin: resultSortedTickets[0],
      finalBank,
      hitRate,
      initialBank,
      mostUsedHouse: sortedByVolume[0],
      movementBalance,
      overviewDistribution,
      performanceEvolution,
      realWagered,
      result,
      returnTotal,
      roi,
      wagered,
      worstHouse: sortedByResult[sortedByResult.length - 1],
    };
  }, [filteredMovements, filteredTickets, houseScope, houses, periodTickets]);

  const financialKpis = useMemo(
    () => [
      { title: "Banca Inicial", value: formatMoney(reportStats.initialBank), icon: "BI", tone: "neutral" },
      { title: "Banca Final", value: formatMoney(reportStats.finalBank), icon: "BF", tone: "neutral" },
      {
        title: "Resultado",
        value: formatSignedMoney(reportStats.result),
        icon: "TROPHY",
        tone: reportStats.result > 0 ? "positive" : reportStats.result < 0 ? "negative" : "neutral",
      },
      { title: "Valor Apostado", value: formatMoney(reportStats.wagered), icon: "VA", tone: "neutral" },
      {
        title: "Valor Real Apostado",
        value: formatMoney(reportStats.realWagered),
        icon: "LIFE",
        tone: "neutral",
      },
    ],
    [reportStats]
  );

  const performanceKpis = useMemo(
    () => [
      {
        title: "Evolução da Banca",
        value: formatSignedPercent(reportStats.bankEvolution),
        icon: "EV",
        tone: reportStats.bankEvolution > 0 ? "positive" : reportStats.bankEvolution < 0 ? "negative" : "neutral",
      },
      {
        title: "Evolução de Desempenho",
        value: formatSignedPercent(reportStats.performanceEvolution),
        icon: "GAUGE",
        tone:
          reportStats.performanceEvolution > 0
            ? "positive"
            : reportStats.performanceEvolution < 0
              ? "negative"
              : "neutral",
      },
      {
        title: "ROI",
        value: formatSignedPercent(reportStats.roi),
        icon: "TARGET",
        tone: reportStats.roi > 0 ? "positive" : reportStats.roi < 0 ? "negative" : "neutral",
      },
      {
        title: "Valor Médio por Aposta",
        value: formatMoney(reportStats.averageWagered),
        icon: "CALC",
        tone: "neutral",
      },
      {
        title: "Lucro Médio por Aposta",
        value: formatSignedMoney(reportStats.averageProfit),
        icon: "CASH",
        tone:
          reportStats.averageProfit > 0
            ? "positive"
            : reportStats.averageProfit < 0
              ? "negative"
              : "neutral",
      },
    ],
    [reportStats]
  );

  const bettingPerformanceKpis = useMemo(
    () => [
      {
        title: "Apostas Ganhas",
        value: formatCount(reportStats.overviewDistribution.Ganhas),
        icon: "TROPHY",
        tone: "positive",
        className: "reports-count-kpi",
      },
      {
        title: "Apostas Perdidas",
        value: formatCount(reportStats.overviewDistribution.Perdidas),
        icon: "CLOSE",
        tone: "negative",
        className: "reports-count-kpi",
      },
      {
        title: "Apostas Encerradas",
        value: formatCount(reportStats.overviewDistribution.Encerradas),
        icon: "CHECK",
        tone: "neutral",
        className: "reports-count-kpi",
      },
      {
        title: "Pendentes",
        value: formatCount(reportStats.overviewDistribution.Pendentes),
        icon: "HOUR",
        tone: "neutral",
        className: "reports-count-kpi",
      },
      {
        title: "Taxa de Acerto",
        value: formatPercent(reportStats.hitRate),
        icon: "TARGET",
        tone: reportStats.hitRate >= 50 ? "positive" : reportStats.hitRate > 0 ? "warning" : "neutral",
      },
    ],
    [reportStats]
  );

  const reportOverviewKpis = useMemo(
    () => [
      {
        detail: `${formatSignedPercent(reportStats.roi)} de ROI`,
        label: "Resultado líquido",
        tone: reportStats.result > 0 ? "positive" : reportStats.result < 0 ? "negative" : "neutral",
        value: formatSignedMoney(reportStats.result),
      },
      {
        detail: `${formatCount(filteredTickets.length)} apostas`,
        label: "Total apostado",
        tone: "blue",
        value: formatMoney(reportStats.wagered),
      },
      {
        detail: `${formatPercent(reportStats.wagered > 0 ? (reportStats.returnTotal / reportStats.wagered) * 100 : 0)} do apostado`,
        label: "Retorno total",
        tone: "purple",
        value: formatMoney(reportStats.returnTotal),
      },
      {
        detail: "Lucro sobre apostado",
        label: "ROI",
        tone: "orange",
        value: formatSignedPercent(reportStats.roi),
      },
      {
        detail: `${formatCount(reportStats.overviewDistribution.Ganhas)} de ${formatCount(filteredTickets.length)} apostas`,
        label: "Acerto",
        tone: "teal",
        value: formatPercent(reportStats.hitRate),
      },
    ],
    [filteredTickets.length, reportStats]
  );

  const dailyReportRows = useMemo(() => {
    const rows = new Map();

    filteredTickets.forEach((ticket) => {
      const key = ticket.data || "";
      rows.set(key, (rows.get(key) || 0) + getRealTicketImpact(ticket));
    });

    return [...rows.entries()]
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  }, [filteredTickets]);

  const houseReportRows = useMemo(
    () =>
      houses
        .map((house) => {
          const houseTickets = filteredTickets.filter(
            (ticket) => Number(ticket.casaId) === Number(house.id)
          );
          const wagered = houseTickets.reduce((sum, ticket) => sum + Number(ticket.stake || 0), 0);
          const realWagered = houseTickets.reduce((sum, ticket) => sum + Number(ticket.stakeReal || 0), 0);
          const profit = houseTickets.reduce((sum, ticket) => sum + getRealTicketImpact(ticket), 0);
          const returnValue = wagered + profit;
          const resolved = houseTickets.filter((ticket) => ticket.resultado !== "Pendente");
          const won = resolved.filter(
            (ticket) =>
              ticket.resultado === "Green" ||
              (ticket.resultado === "Cash Out" && getRealTicketImpact(ticket) > 0)
          );

          return {
            hitRate: resolved.length > 0 ? (won.length / resolved.length) * 100 : 0,
            house,
            profit,
            returnValue,
            roi: realWagered > 0 ? (profit / realWagered) * 100 : 0,
            tickets: houseTickets.length,
            wagered,
          };
        })
        .filter((row) => row.tickets > 0)
        .sort((a, b) => b.profit - a.profit),
    [filteredTickets, houses]
  );

  const bankEvolutionRows = useMemo(() => {
    const dailyTotals = new Map();

    filteredTickets
      .filter((ticket) => ticket.resultado !== "Pendente")
      .forEach((ticket) => {
        const key = ticket.data || "";
        dailyTotals.set(key, (dailyTotals.get(key) || 0) + getRealTicketImpact(ticket));
      });

    filteredMovements.forEach((movement) => {
      const key = movement.data || "";
      dailyTotals.set(key, (dailyTotals.get(key) || 0) + Number(movement.valor || 0) * movementSignal(movement.tipo));
    });

    let balance = reportStats.initialBank;

    return [...dailyTotals.entries()]
      .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
      .map(([date, change]) => {
        balance += change;
        return {
          banca: Number(balance.toFixed(2)),
          data: formatDisplayDate(date),
          resultado: Number(change.toFixed(2)),
        };
      });
  }, [filteredMovements, filteredTickets, reportStats.initialBank]);

  const resultDistributionRows = useMemo(
    () =>
      Object.entries(reportStats.overviewDistribution).map(([name, value]) => ({
        name,
        value,
      })),
    [reportStats.overviewDistribution]
  );

  const housePerformanceRows = useMemo(
    () =>
      houseReportRows.map((row) => ({
        acerto: Number(row.hitRate.toFixed(2)),
        casa: row.house.nome,
        lucro: Number(row.profit.toFixed(2)),
        roi: Number(row.roi.toFixed(2)),
      })),
    [houseReportRows]
  );

  const advancedStats = useMemo(() => {
    const resolvedTickets = filteredTickets
      .filter((ticket) => ticket.resultado !== "Pendente")
      .sort((a, b) => String(a.data || "").localeCompare(String(b.data || "")));
    let currentWinStreak = 0;
    let currentLossStreak = 0;
    let bestWinStreak = 0;
    let bestLossStreak = 0;

    resolvedTickets.forEach((ticket) => {
      const status = getTicketStatus(ticket);

      if (status === "Ganhas") {
        currentWinStreak += 1;
        currentLossStreak = 0;
      } else if (status === "Perdidas") {
        currentLossStreak += 1;
        currentWinStreak = 0;
      } else {
        currentWinStreak = 0;
        currentLossStreak = 0;
      }

      bestWinStreak = Math.max(bestWinStreak, currentWinStreak);
      bestLossStreak = Math.max(bestLossStreak, currentLossStreak);
    });

    const sortedByImpact = [...resolvedTickets].sort(
      (a, b) => getRealTicketImpact(b) - getRealTicketImpact(a)
    );
    const dailyResults = new Map();
    resolvedTickets.forEach((ticket) => {
      const key = ticket.data || "";
      dailyResults.set(key, (dailyResults.get(key) || 0) + getRealTicketImpact(ticket));
    });
    const dailyEntries = [...dailyResults.entries()].map(([date, result]) => ({ date, result }));
    const sortedDaily = [...dailyEntries].sort((a, b) => b.result - a.result);
    const houseAdvancedStats = houses
      .map((house) => {
        const houseTickets = filteredTickets.filter(
          (ticket) => Number(ticket.casaId) === Number(house.id)
        );
        const result = houseTickets.reduce((sum, ticket) => sum + getRealTicketImpact(ticket), 0);
        const realWagered = houseTickets.reduce((sum, ticket) => sum + Number(ticket.stakeReal || 0), 0);
        const roi = realWagered > 0 ? (result / realWagered) * 100 : 0;
        return { house, result, roi, tickets: houseTickets.length };
      })
      .filter((item) => item.tickets > 0);
    const sortedHouseResult = [...houseAdvancedStats].sort((a, b) => b.result - a.result);
    const sortedHouseRoi = [...houseAdvancedStats].sort((a, b) => b.roi - a.roi);

    return {
      bestDay: sortedDaily[0],
      bestLossStreak,
      bestRoiHouse: sortedHouseRoi[0],
      bestWinStreak,
      biggestLoss: sortedByImpact[sortedByImpact.length - 1],
      biggestProfit: sortedByImpact[0],
      leastProfitableHouse: sortedHouseResult[sortedHouseResult.length - 1],
      mostProfitableHouse: sortedHouseResult[0],
      negativeDays: dailyEntries.filter((item) => item.result < 0).length,
      neutralDays: dailyEntries.filter((item) => item.result === 0).length,
      positiveDays: dailyEntries.filter((item) => item.result > 0).length,
      worstDay: sortedDaily[sortedDaily.length - 1],
      worstRoiHouse: sortedHouseRoi[sortedHouseRoi.length - 1],
    };
  }, [filteredTickets, houses]);

  const advancedSections = useMemo(
    () => [
      {
        title: "Sequências",
        cards: [
          {
            label: "Maior sequência de ganhos",
            value: `${advancedStats.bestWinStreak} aposta${advancedStats.bestWinStreak === 1 ? "" : "s"}`,
            tone: "positive",
          },
          {
            label: "Maior sequência de perdas",
            value: `${advancedStats.bestLossStreak} aposta${advancedStats.bestLossStreak === 1 ? "" : "s"}`,
            tone: "negative",
          },
        ],
      },
      {
        title: "Resultados",
        cards: [
          {
            label: "Maior lucro",
            value: formatSignedMoney(getRealTicketImpact(advancedStats.biggestProfit)),
            detail: advancedStats.biggestProfit?.nomeBilhete || advancedStats.biggestProfit?.numeroBilhete || "-",
            tone: "positive",
          },
          {
            label: "Maior prejuízo",
            value: formatSignedMoney(getRealTicketImpact(advancedStats.biggestLoss)),
            detail: advancedStats.biggestLoss?.nomeBilhete || advancedStats.biggestLoss?.numeroBilhete || "-",
            tone: "negative",
          },
        ],
      },
      {
        title: "Consistência",
        cards: [
          { label: "Dias positivos", value: formatCount(advancedStats.positiveDays), tone: "positive" },
          { label: "Dias negativos", value: formatCount(advancedStats.negativeDays), tone: "negative" },
          { label: "Dias neutros", value: formatCount(advancedStats.neutralDays), tone: "neutral" },
          {
            label: "Melhor dia",
            value: formatSignedMoney(advancedStats.bestDay?.result),
            detail: getReportReferenceLabel("Diario", advancedStats.bestDay?.date),
            tone: "positive",
          },
          {
            label: "Pior dia",
            value: formatSignedMoney(advancedStats.worstDay?.result),
            detail: getReportReferenceLabel("Diario", advancedStats.worstDay?.date),
            tone: "negative",
          },
        ],
      },
      {
        title: "Casas",
        cards: [
          {
            label: "Casa mais lucrativa",
            value: advancedStats.mostProfitableHouse?.house?.nome || "-",
            detail: formatSignedMoney(advancedStats.mostProfitableHouse?.result),
            tone: "positive",
          },
          {
            label: "Casa menos lucrativa",
            value: advancedStats.leastProfitableHouse?.house?.nome || "-",
            detail: formatSignedMoney(advancedStats.leastProfitableHouse?.result),
            tone: "negative",
          },
          {
            label: "Melhor ROI",
            value: advancedStats.bestRoiHouse?.house?.nome || "-",
            detail: formatSignedPercent(advancedStats.bestRoiHouse?.roi),
            tone: "positive",
          },
          {
            label: "Pior ROI",
            value: advancedStats.worstRoiHouse?.house?.nome || "-",
            detail: formatSignedPercent(advancedStats.worstRoiHouse?.roi),
            tone: "negative",
          },
        ],
      },
    ],
    [advancedStats]
  );

  const canExport = houseScope !== null && !isExportingPdf && !isExportingExcel;

  function handleSidebarNavigate(item, sub = null) {
    if (item === "reports") {
      navigate("/relatorios");
      return;
    }

    navigate("/dashboard", {
      state: {
        activeBottomPanel: sub,
        activeNavItem: item,
        navigationIntent: true,
      },
    });
  }

  function getHouseName(houseId) {
    return houses.find((house) => Number(house.id) === Number(houseId))?.nome || "-";
  }

  function getSelectedHouseLabel() {
    if (houseScope === "all") {
      return "Todas as casas";
    }

    if (houseScope === null) {
      return "Selecione";
    }

    return getHouseName(houseScope);
  }

  function handleReportPeriodTypeChange(nextType) {
    setPeriodType(nextType);
    setPeriodReference(getReferenceForPeriod(nextType, todayISO()));
  }

  function handleAnalysisModeChange(nextMode) {
    setActiveReportsTab(nextMode);
    setIsExportMenuOpen(false);

    if (nextMode === "advanced") {
      setHouseScope("all");
    }
  }

  async function handleExportPdf() {
    if (houseScope === null) {
      return;
    }

    setIsExportMenuOpen(false);
    setIsExportingPdf(true);

    try {
      await exportReportToPdf({
        bettingPerformanceKpis,
        financialKpis,
        houseLabel: getSelectedHouseLabel(),
        logoUrl: logo,
        performanceKpis,
        periodReference,
        periodType,
        reportStats,
        userName: accountFirstName,
      });
    } finally {
      setIsExportingPdf(false);
    }
  }

  async function handleExportExcel() {
    if (houseScope === null) {
      return;
    }

    setIsExportMenuOpen(false);
    setIsExportingExcel(true);

    try {
      exportReportToExcel({
        bettingPerformanceKpis,
        filteredMovements,
        filteredTickets,
        financialKpis,
        houseLabel: getSelectedHouseLabel(),
        houses,
        performanceKpis,
        periodReference,
        periodType,
      });
    } finally {
      setIsExportingExcel(false);
    }
  }

  const reportsQuickActions = [
    {
      icon: "tickets",
      label: "Bilhetes do dia",
      onClick: () => handleSidebarNavigate("tickets", "ticketsDay"),
    },
    {
      icon: "tickets",
      label: "Novo bilhete",
      onClick: () => handleSidebarNavigate("tickets", "ticket"),
    },
    {
      icon: "movements",
      label: "Extrato",
      onClick: () => handleSidebarNavigate("movements", "extract"),
    },
    {
      icon: "movements",
      label: "Nova movimentação",
      onClick: () => handleSidebarNavigate("movements", "movementForm"),
    },
    {
      icon: "settings",
      label: "Minha conta",
      onClick: () => handleSidebarNavigate("settings", "accountReal"),
    },
    {
      icon: "settings",
      label: "Editar perfil",
      onClick: () => handleSidebarNavigate("settings", "profileReal"),
    },
    {
      icon: "settings",
      label: "Sistema",
      onClick: () => handleSidebarNavigate("settings", "system"),
    },
  ];

  return (
    <div className="app">
      <DashboardShell
        accountFirstName={accountFirstName}
        activeNavItem="reports"
        onSidebarNavigate={handleSidebarNavigate}
        quickActions={reportsQuickActions}
        theme={landingTheme}
      >
        <section className="reports-page">
          {isLoading ? <section className="reference-loading-panel">Carregando relatórios...</section> : null}
          {loadError ? <section className="reference-load-error-panel">{loadError}</section> : null}

          {!isLoading && !loadError ? (
            <section className="reports-section" aria-labelledby="reports-page-title">
              <header className="reports-page-heading">
                <div>
                  <h2 id="reports-page-title">Relatórios</h2>
                  <p className="reports-section-context">Análises completas do desempenho da sua banca.</p>
                </div>
              </header>

              <div className="reports-analytics-toolbar">
                <label className="reference-period reports-house-filter">
                  <span>Casa</span>
                  <select
                    value={houseScope === null ? "" : houseScope}
                    onChange={(event) =>
                      setHouseScope(event.target.value === "" ? null : event.target.value)
                    }
                  >
                    <option value="">Selecione</option>
                    <option value="all">Todas as casas</option>
                    {houses.map((house) => (
                      <option key={house.id} value={house.id}>
                        {house.nome}
                      </option>
                    ))}
                  </select>
                </label>

                <PeriodFields
                  dayMarkers={{}}
                  onPeriodReferenceChange={setPeriodReference}
                  onPeriodTypeChange={handleReportPeriodTypeChange}
                  periodReference={periodReference}
                  periodType={periodType}
                />

                <div className="reports-export-actions" ref={analyticsExportMenuRef}>
                  <button
                    className="reports-export-button"
                    disabled={!canExport}
                    type="button"
                    onClick={() => setIsExportMenuOpen((current) => !current)}
                  >
                    {isExportingPdf || isExportingExcel ? "Exportando..." : "Exportar"}
                  </button>

                  {isExportMenuOpen ? (
                    <div className="reports-export-menu" role="menu">
                      <button disabled={isExportingPdf} type="button" onClick={handleExportPdf}>
                        PDF
                      </button>
                      <button disabled={isExportingExcel} type="button" onClick={handleExportExcel}>
                        Excel
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>

              <section className="reports-analytics-hero">
                <article className={`reports-primary-metric ${reportStats.result > 0 ? "positive" : reportStats.result < 0 ? "negative" : "neutral"}`}>
                  <span>Resultado líquido do período</span>
                  <strong>{formatSignedMoney(reportStats.result)}</strong>
                  <small>{getSelectedHouseLabel()} · {getReportReferenceLabel(periodType, periodReference)}</small>
                </article>

                <div className="reports-secondary-metrics">
                  {reportOverviewKpis.slice(1).map((kpi) => (
                    <article className={`reports-secondary-metric ${kpi.tone}`} key={kpi.label}>
                      <span>{kpi.label}</span>
                      <strong>{kpi.value}</strong>
                      <small>{kpi.detail}</small>
                    </article>
                  ))}
                </div>
              </section>

              <article className="reports-analytics-panel reports-bank-evolution">
                <div className="reports-analytics-panel-heading">
                  <div>
                    <h3>Evolução da banca</h3>
                    <p>Saldo acumulado considerando bilhetes resolvidos e movimentações.</p>
                  </div>
                  <span>{formatMoney(reportStats.initialBank)} → {formatMoney(reportStats.finalBank)}</span>
                </div>
                <div className="reports-chart-large">
                  {bankEvolutionRows.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={bankEvolutionRows} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="reportsBankArea" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="#1769e8" stopOpacity={0.24} />
                            <stop offset="100%" stopColor="#1769e8" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="#e6edf5" vertical={false} />
                        <XAxis dataKey="data" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                        <YAxis tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} width={72} tickFormatter={(value) => formatMoney(value).replace(",00", "")} />
                        <Tooltip content={<ReportsChartTooltip />} />
                        <Area type="monotone" dataKey="banca" name="Banca" stroke="#1769e8" strokeWidth={3} fill="url(#reportsBankArea)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="reports-empty-chart">Nenhum dado encontrado para o período.</div>
                  )}
                </div>
              </article>

              <section className="reports-analytics-lower-grid">
                <article className="reports-analytics-panel">
                  <div className="reports-analytics-panel-heading">
                    <h3>Resultado por dia</h3>
                  </div>
                  <div className="reports-chart-medium">
                    {dailyReportRows.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dailyReportRows.slice(-14)} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                          <CartesianGrid stroke="#e6edf5" vertical={false} />
                          <XAxis dataKey="date" tickFormatter={formatDisplayDate} tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
                          <YAxis tickLine={false} axisLine={false} width={62} tick={{ fill: "#64748b", fontSize: 11 }} tickFormatter={(value) => formatMoney(value).replace(",00", "")} />
                          <Tooltip content={<ReportsChartTooltip />} />
                          <Bar dataKey="value" name="Resultado" radius={[5, 5, 0, 0]}>
                            {dailyReportRows.slice(-14).map((entry) => (
                              <Cell key={entry.date} fill={entry.value < 0 ? "#e11d2e" : "#08a64f"} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="reports-empty-chart">Nenhum resultado diário.</div>
                    )}
                  </div>
                </article>

                <article className="reports-analytics-panel">
                  <div className="reports-analytics-panel-heading">
                    <h3>Desempenho por casa</h3>
                  </div>
                  <div className="reports-chart-medium">
                    {housePerformanceRows.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={housePerformanceRows.slice(0, 7)} layout="vertical" margin={{ top: 8, right: 18, left: 12, bottom: 0 }}>
                          <CartesianGrid stroke="#e6edf5" horizontal={false} />
                          <XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 11 }} tickFormatter={(value) => formatMoney(value).replace(",00", "")} />
                          <YAxis type="category" dataKey="casa" tickLine={false} axisLine={false} width={92} tick={{ fill: "#071332", fontSize: 11, fontWeight: 800 }} />
                          <Tooltip content={<ReportsChartTooltip />} />
                          <Bar dataKey="lucro" name="Lucro" radius={[0, 5, 5, 0]}>
                            {housePerformanceRows.slice(0, 7).map((entry) => (
                              <Cell key={entry.casa} fill={entry.lucro < 0 ? "#e11d2e" : "#1769e8"} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="reports-empty-chart">Nenhuma casa com apostas.</div>
                    )}
                  </div>
                </article>

                <article className="reports-analytics-panel">
                  <div className="reports-analytics-panel-heading">
                    <h3>Distribuição de resultados</h3>
                  </div>
                  <div className="reports-chart-medium">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={resultDistributionRows} layout="vertical" margin={{ top: 8, right: 18, left: 12, bottom: 0 }}>
                        <CartesianGrid stroke="#e6edf5" horizontal={false} />
                        <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
                        <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={86} tick={{ fill: "#071332", fontSize: 11, fontWeight: 800 }} />
                        <Tooltip content={<ReportsChartTooltip />} />
                        <Bar dataKey="value" name="Apostas" radius={[0, 5, 5, 0]}>
                          {resultDistributionRows.map((entry) => (
                            <Cell
                              key={entry.name}
                              fill={entry.name === "Ganhas" ? "#08a64f" : entry.name === "Perdidas" ? "#e11d2e" : entry.name === "Pendentes" ? "#f59e0b" : "#1769e8"}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </article>
              </section>

              <article className="reports-analytics-panel reports-comparison-panel">
                <div className="reports-analytics-panel-heading">
                  <div>
                    <h3>Tabela comparativa por casa</h3>
                    <p>Comparação de volume, retorno e eficiência por operação.</p>
                  </div>
                </div>
                <div className="reports-comparison-table">
                  <div className="reports-comparison-head">
                    <span>Casa</span>
                    <span>Total apostado</span>
                    <span>Retorno total</span>
                    <span>Resultado</span>
                    <span>ROI</span>
                    <span>Acerto</span>
                  </div>
                  {houseReportRows.map((row) => (
                    <div className="reports-comparison-row" key={row.house.id}>
                      <strong>{row.house.nome}</strong>
                      <span>{formatMoney(row.wagered)}</span>
                      <span>{formatMoney(row.returnValue)}</span>
                      <span className={row.profit >= 0 ? "positive" : "negative"}>{formatSignedMoney(row.profit)}</span>
                      <span>{formatSignedPercent(row.roi)}</span>
                      <span>{formatPercent(row.hitRate)}</span>
                    </div>
                  ))}
                  {houseReportRows.length === 0 ? <p>Nenhuma casa com apostas no período.</p> : null}
                </div>
              </article>

              <footer className="reports-analytics-footer">
                <span>Exportação do relatório</span>
                <div>
                  <button disabled={!canExport || isExportingPdf} type="button" onClick={handleExportPdf}>
                    PDF
                  </button>
                  <button disabled={!canExport || isExportingExcel} type="button" onClick={handleExportExcel}>
                    Excel
                  </button>
                </div>
              </footer>

              <div className="reports-header-tools">
                <div className="reports-toolbar-primary">
                  <nav className="reports-tabs" aria-label="Modo de análise">
                    <button
                      className={activeReportsTab === "overview" ? "active" : ""}
                      type="button"
                      onClick={() => handleAnalysisModeChange("overview")}
                    >
                      Visão Geral
                    </button>
                    <button
                      className={activeReportsTab === "advanced" ? "active" : ""}
                      type="button"
                      onClick={() => handleAnalysisModeChange("advanced")}
                    >
                      Estatísticas Avançadas
                    </button>
                  </nav>
                </div>

                <div className="reports-filter-row">
                  <label className="reference-period reports-house-filter">
                    <span>Casa</span>
                    <select
                      value={houseScope === null ? "" : houseScope}
                      onChange={(event) =>
                        setHouseScope(event.target.value === "" ? null : event.target.value)
                      }
                    >
                      <option value="">Selecione</option>
                      <option value="all">Todas as casas</option>
                      {houses.map((house) => (
                        <option key={house.id} value={house.id}>
                          {house.nome}
                        </option>
                      ))}
                    </select>
                  </label>

                  <PeriodFields
                    dayMarkers={{}}
                    onPeriodReferenceChange={setPeriodReference}
                    onPeriodTypeChange={handleReportPeriodTypeChange}
                    periodReference={periodReference}
                    periodType={periodType}
                  />

                  <div className="reports-export-actions" ref={exportMenuRef}>
                    <button
                      className="reports-export-button"
                      disabled={!canExport}
                      type="button"
                      onClick={() => setIsExportMenuOpen((current) => !current)}
                    >
                      {isExportingPdf || isExportingExcel ? "Exportando..." : "Exportar"}
                    </button>

                    {isExportMenuOpen ? (
                      <div className="reports-export-menu" role="menu">
                        <button disabled={isExportingPdf} type="button" onClick={handleExportPdf}>
                          PDF
                        </button>
                        <button disabled={isExportingExcel} type="button" onClick={handleExportExcel}>
                          Excel
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              {activeReportsTab === "overview" ? (
                <>
                  <section className="reports-metric-group">
                    <div className="reports-group-heading">
                      <h3>Resumo Financeiro</h3>
                    </div>
                    <KpiRow metrics={financialKpis} renderValue={(value) => value} />
                  </section>

                  <section className="reports-metric-group">
                    <div className="reports-group-heading">
                      <h3>Performance</h3>
                    </div>
                    <KpiRow metrics={performanceKpis} renderValue={(value) => value} />
                  </section>

                  <section className="reports-metric-group">
                    <div className="reports-group-heading">
                      <h3>Desempenho das Apostas</h3>
                    </div>
                    <KpiRow metrics={bettingPerformanceKpis} renderValue={(value) => value} />
                  </section>
                </>
              ) : (
                <div className="reports-advanced-section">
                  <div className="reports-advanced-heading">
                    <h3>Estatísticas Avançadas</h3>
                  </div>

                  {advancedSections.map((section) => (
                    <section className="reports-advanced-group" key={section.title}>
                      <h4>{section.title}</h4>
                      <div className="reports-advanced-grid">
                        {section.cards.map((card) => (
                          <ReportsAdvancedCard key={`${section.title}-${card.label}`} {...card} />
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              )}

              <section className="reports-reference-kpis" aria-label="Indicadores dos relatórios">
                {reportOverviewKpis.map((kpi) => (
                  <article className={`reports-reference-kpi ${kpi.tone}`} key={kpi.label}>
                    <span className="reports-reference-kpi-icon" aria-hidden="true" />
                    <div>
                      <small>{kpi.label}</small>
                      <strong>{kpi.value}</strong>
                      <em>{kpi.detail}</em>
                    </div>
                  </article>
                ))}
              </section>

              <section className="reports-reference-main-grid">
                <article className="reports-reference-panel reports-evolution-panel">
                  <div className="reports-reference-panel-heading">
                    <h3>Evolução da banca</h3>
                    <span>{periodType}</span>
                  </div>
                  <div className="reports-line-chart" aria-hidden="true">
                    {dailyReportRows.length > 0 ? (
                      dailyReportRows.slice(-12).map((row) => (
                        <i
                          className={row.value < 0 ? "negative" : "positive"}
                          key={row.date}
                          style={{ height: `${Math.max(12, Math.min(82, Math.abs(row.value) / 8 + 16))}%` }}
                        />
                      ))
                    ) : (
                      <span>Nenhum dado no período</span>
                    )}
                  </div>
                </article>

                <article className="reports-reference-panel reports-period-summary">
                  <h3>Resumo do período</h3>
                  <dl>
                    <div>
                      <dt>Saldo inicial</dt>
                      <dd>{formatMoney(reportStats.initialBank)}</dd>
                    </div>
                    <div>
                      <dt>Saldo final</dt>
                      <dd className={reportStats.finalBank >= 0 ? "positive" : "negative"}>
                        {formatMoney(reportStats.finalBank)}
                      </dd>
                    </div>
                    <div>
                      <dt>Maior lucro diário</dt>
                      <dd className="positive">{formatSignedMoney(Math.max(0, ...dailyReportRows.map((row) => row.value)))}</dd>
                    </div>
                    <div>
                      <dt>Maior prejuízo diário</dt>
                      <dd className="negative">{formatSignedMoney(Math.min(0, ...dailyReportRows.map((row) => row.value)))}</dd>
                    </div>
                    <div>
                      <dt>Melhor casa</dt>
                      <dd>{reportStats.bestHouse?.house?.nome || "-"}</dd>
                    </div>
                    <div>
                      <dt>Pior casa</dt>
                      <dd>{reportStats.worstHouse?.house?.nome || "-"}</dd>
                    </div>
                  </dl>
                </article>
              </section>

              <section className="reports-reference-lower-grid">
                <article className="reports-reference-panel reports-day-result">
                  <div className="reports-reference-panel-heading">
                    <h3>Resultado por dia</h3>
                    <span>{periodType}</span>
                  </div>
                  <div className="reports-bar-chart" aria-hidden="true">
                    {dailyReportRows.length > 0 ? (
                      dailyReportRows.slice(-10).map((row) => (
                        <i
                          className={row.value < 0 ? "negative" : "positive"}
                          key={row.date}
                          style={{ height: `${Math.max(12, Math.min(88, Math.abs(row.value) / 6 + 18))}%` }}
                        />
                      ))
                    ) : (
                      <span>Nenhum resultado encontrado</span>
                    )}
                  </div>
                </article>

                <article className="reports-reference-panel reports-house-performance">
                  <h3>Desempenho por casa</h3>
                  <div className="reports-house-table">
                    <div className="reports-house-table-head">
                      <span>Casa</span>
                      <span>Total apostado</span>
                      <span>Retorno</span>
                      <span>Lucro</span>
                      <span>ROI</span>
                      <span>Acerto</span>
                    </div>
                    {houseReportRows.slice(0, 5).map((row) => (
                      <div className="reports-house-table-row" key={row.house.id}>
                        <strong>{row.house.nome}</strong>
                        <span>{formatMoney(row.wagered)}</span>
                        <span>{formatMoney(row.returnValue)}</span>
                        <span className={row.profit >= 0 ? "positive" : "negative"}>{formatSignedMoney(row.profit)}</span>
                        <span>{formatSignedPercent(row.roi)}</span>
                        <span>{formatPercent(row.hitRate)}</span>
                      </div>
                    ))}
                    {houseReportRows.length === 0 ? <p>Nenhuma casa com apostas no período.</p> : null}
                  </div>
                </article>
              </section>

              <aside className="reports-info-notice reports-reference-info">
                <span aria-hidden="true">i</span>
                <div>
                  <strong>Informações importantes</strong>
                  <small>Os relatórios são baseados nos bilhetes e movimentações registrados no período selecionado.</small>
                </div>
                <div className="reports-reference-actions">
                  <button disabled={!canExport || isExportingPdf} type="button" onClick={handleExportPdf}>
                    Exportar PDF
                  </button>
                  <button disabled={!canExport || isExportingExcel} type="button" onClick={handleExportExcel}>
                    Exportar Excel
                  </button>
                  <button type="button">Compartilhar relatório</button>
                </div>
              </aside>
            </section>
          ) : null}
        </section>
      </DashboardShell>
    </div>
  );
}
