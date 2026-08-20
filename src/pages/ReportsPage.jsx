import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";
import { isDevAuthBypassEnabled } from "../auth/devAuth";
import logo from "../assets/logo.png";
import { supabase } from "../supabase";
import { exportReportToExcel, exportReportToPdf } from "../utils/reportExport";
import { loadBankingData, readCachedBankingData } from "../utils/bankingDataCache";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  DashboardShell,
  PeriodFields,
  getCompactResultLabel,
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

function formatOdd(value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return "-";
  }

  return numericValue.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPercent(value) {
  return `${Number(value || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
}

function formatSignedPercent(value) {
  const numericValue = Number(value || 0);
  const label = `${Math.abs(numericValue).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;

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

function addDays(dateISO, amount) {
  const date = new Date(`${dateISO}T12:00:00`);
  date.setDate(date.getDate() + amount);
  return date.toISOString().slice(0, 10);
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

function formatDisplayDate(dateISO) {
  if (!dateISO) {
    return "";
  }

  return String(dateISO).split("-").reverse().join("/");
}

const REPORT_WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function getBankChartDateLabel(dateISO, periodType) {
  if (periodType !== "Semanal") {
    return getCompactResultLabel(dateISO, periodType);
  }

  const date = new Date(`${dateISO}T12:00:00`);
  return REPORT_WEEKDAY_LABELS[date.getDay()];
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

function formatReportsBankingData(data) {
  return {
    houses: (data?.houses || []).map((house) => ({
      id: house.id,
      nome: house.nome,
      bancaInicial: Number(house.banca_inicial || 0),
      logoDataUrl: house.logo_url || "",
    })),
    tickets: (data?.tickets || []).map((ticket) => ({
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
    })),
    movements: (data?.movements || []).map((movement) => ({
      id: movement.id,
      data: movement.data,
      casaId: Number(movement.casa_id),
      tipo: movement.tipo,
      valor: Number(movement.valor || 0),
      observacoes: movement.observacoes || "",
    })),
  };
}

function ReportsAdvancedResultCard({ houseName, ticket, title, tone }) {
  return (
    <article className={`reports-advanced-result-card ${tone}`}>
      <span>{title}</span>
      <strong>{ticket ? formatSignedMoney(getRealTicketImpact(ticket)) : "-"}</strong>
      <dl>
        <div><dt>Casa</dt><dd>{ticket ? houseName : "-"}</dd></div>
        <div><dt>Odd</dt><dd>{formatOdd(ticket?.odd)}</dd></div>
        <div><dt>Data</dt><dd>{ticket?.data ? formatDisplayDate(ticket.data) : "-"}</dd></div>
      </dl>
    </article>
  );
}

function ReportsChartTooltip({ active, payload, label, labelFormatter = (value) => value }) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="reports-chart-tooltip">
      <span>{labelFormatter(label)}</span>
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
  const initialReportsData = useMemo(() => {
    const initialBankingData = readCachedBankingData(userId);
    return initialBankingData
      ? formatReportsBankingData(initialBankingData)
      : null;
  }, [userId]);
  const metadata = user?.user_metadata || {};
  const accountFirstName =
    metadata.first_name ||
    metadata.nome ||
    metadata.full_name?.split(/\s+/)[0] ||
    user?.email?.split("@")[0] ||
    "";

  const [activeReportsTab, setActiveReportsTab] = useState("overview");
  const [houses, setHouses] = useState(() => initialReportsData?.houses || []);
  const [tickets, setTickets] = useState(() => initialReportsData?.tickets || []);
  const [movements, setMovements] = useState(() => initialReportsData?.movements || []);
  const [isLoading, setIsLoading] = useState(() => !initialReportsData);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [loadRetryToken, setLoadRetryToken] = useState(0);
  const [houseScope, setHouseScope] = useState(null);
  const [periodType, setPeriodType] = useState("Mensal");
  const bankChartScrollRef = useRef(null);
  const bankChartDragRef = useRef({
    isDragging: false,
    pointerId: null,
    startX: 0,
    startScrollLeft: 0,
  });
  const [periodReference, setPeriodReference] = useState(() =>
    getReferenceForPeriod("Mensal", todayISO())
  );

  function handleRetryLoadReports() {
    if (isLoading) {
      return;
    }

    setIsLoading(true);
    setLoadError("");
    setLoadRetryToken((currentValue) => currentValue + 1);
  }

  useEffect(() => {
    let isCancelled = false;

    if (!userId) {
      return undefined;
    }

    async function loadReportsData() {
      setLoadError("");

      let effectiveUserId = userId;

      if (isDevAuthBypassEnabled) {
        const { data: currentAuthData } = await supabase.auth.getSession();
        effectiveUserId = currentAuthData?.session?.user?.id || userId;
      }

      const cachedData = readCachedBankingData(effectiveUserId);
      if (cachedData) {
        if (!isCancelled) {
          const formattedData = formatReportsBankingData(cachedData);
          setHouses(formattedData.houses);
          setTickets(formattedData.tickets);
          setMovements(formattedData.movements);
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);

      try {
        const data = await loadBankingData(effectiveUserId);
        if (isCancelled) return;

        const formattedData = formatReportsBankingData(data);
        setHouses(formattedData.houses);
        setTickets(formattedData.tickets);
        setMovements(formattedData.movements);
      } catch (error) {
        if (isCancelled) return;

        if (isSupabaseAuthError(error)) {
          clearSession();
          return;
        }

        setLoadError("Não foi possível carregar os dados dos relatórios.");
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    loadReportsData();

    return () => {
      isCancelled = true;
    };
  }, [clearSession, loadRetryToken, userId]);

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
      (ticket) => getRealTicketImpact(ticket) > 0
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
          const won = resolved.filter((ticket) => getRealTicketImpact(ticket) > 0);

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

  const bankChartPeriodType = String(periodType || "").startsWith("Di")
    ? "Semanal"
    : periodType;
  const bankChartPeriodReference = String(periodType || "").startsWith("Di")
    ? getReferenceForPeriod("Semanal", periodReference || todayISO())
    : periodReference;
  const bankChartInterval = useMemo(
    () => getPeriodInterval(bankChartPeriodType, bankChartPeriodReference),
    [bankChartPeriodReference, bankChartPeriodType]
  );

  const bankChartInitialBalance = useMemo(() => {
    if (houseScope === null) return 0;

    const selectedHouses = houseScope === "all"
      ? houses
      : houses.filter((house) => Number(house.id) === Number(houseScope));
    const selectedHouseIds = new Set(selectedHouses.map((house) => Number(house.id)));
    const baseBalance = selectedHouses.reduce(
      (sum, house) => sum + Number(house.bancaInicial || 0),
      0
    );

    if (!bankChartInterval.start) return baseBalance;

    const previousTicketBalance = tickets
      .filter(
        (ticket) =>
          selectedHouseIds.has(Number(ticket.casaId)) &&
          ticket.resultado !== "Pendente" &&
          ticket.data < bankChartInterval.start
      )
      .reduce((sum, ticket) => sum + getRealTicketImpact(ticket), 0);
    const previousMovementBalance = movements
      .filter(
        (movement) =>
          selectedHouseIds.has(Number(movement.casaId)) &&
          movement.data < bankChartInterval.start
      )
      .reduce(
        (sum, movement) => sum + Number(movement.valor || 0) * movementSignal(movement.tipo),
        0
      );

    return baseBalance + previousTicketBalance + previousMovementBalance;
  }, [bankChartInterval.start, houseScope, houses, movements, tickets]);

  const bankEvolutionRows = useMemo(() => {
    if (houseScope === null) return [];

    const dailyTotals = new Map();

    const selectedHouseIds = new Set(
      (houseScope === "all"
        ? houses
        : houses.filter((house) => Number(house.id) === Number(houseScope)))
        .map((house) => Number(house.id))
    );
    const isInsideBankChartPeriod = (date) =>
      (!bankChartInterval.start || date >= bankChartInterval.start) &&
      (!bankChartInterval.end || date <= bankChartInterval.end);

    tickets
      .filter((ticket) => ticket.resultado !== "Pendente")
      .filter((ticket) => selectedHouseIds.has(Number(ticket.casaId)))
      .filter((ticket) => isInsideBankChartPeriod(ticket.data))
      .forEach((ticket) => {
        const key = ticket.data || "";
        dailyTotals.set(key, (dailyTotals.get(key) || 0) + getRealTicketImpact(ticket));
      });

    movements
      .filter((movement) => selectedHouseIds.has(Number(movement.casaId)))
      .filter((movement) => isInsideBankChartPeriod(movement.data))
      .forEach((movement) => {
      const key = movement.data || "";
      dailyTotals.set(key, (dailyTotals.get(key) || 0) + Number(movement.valor || 0) * movementSignal(movement.tipo));
      });

    let timelineDates;

    if (bankChartPeriodType === "Anual" && bankChartInterval.start) {
      const year = bankChartInterval.start.slice(0, 4);
      const monthlyTotals = new Map();

      dailyTotals.forEach((value, date) => {
        const monthKey = String(date).slice(0, 7);
        monthlyTotals.set(monthKey, (monthlyTotals.get(monthKey) || 0) + value);
      });

      dailyTotals.clear();
      timelineDates = Array.from({ length: 12 }, (_, index) => {
        const month = String(index + 1).padStart(2, "0");
        const monthKey = `${year}-${month}`;
        const date = `${monthKey}-01`;
        dailyTotals.set(date, monthlyTotals.get(monthKey) || 0);
        return date;
      });
    } else if (
      bankChartInterval.start &&
      bankChartInterval.end &&
      ["Semanal", "Mensal"].includes(bankChartPeriodType)
    ) {
      const today = todayISO();
      const endDate =
        bankChartPeriodType !== "Semanal" &&
        bankChartInterval.start <= today &&
        bankChartInterval.end > today
          ? today
          : bankChartInterval.end;
      timelineDates = [];

      for (let date = bankChartInterval.start; date <= endDate; date = addDays(date, 1)) {
        timelineDates.push(date);
      }
    } else {
      timelineDates = [...dailyTotals.keys()].sort((a, b) => String(a).localeCompare(String(b)));

      if (timelineDates.length === 0 && bankChartInterval.start) {
        timelineDates = [bankChartInterval.start];
      }
    }

    let balance = bankChartInitialBalance;
    const rows = timelineDates.map((date) => {
        const change = dailyTotals.get(date) || 0;
        balance += change;
        return {
          banca: Number(balance.toFixed(2)),
          bancaLinha:
            bankChartPeriodType === "Semanal" && date > todayISO()
              ? undefined
              : Number(balance.toFixed(2)),
          data: date,
          resultado: Number(change.toFixed(2)),
        };
      });

    if (rows.length === 1) {
      return [
        {
          banca: Number(bankChartInitialBalance.toFixed(2)),
          bancaLinha: Number(bankChartInitialBalance.toFixed(2)),
          data: addDays(rows[0].data, -1),
          resultado: 0,
        },
        rows[0],
      ];
    }

    return rows;
  }, [bankChartInitialBalance, bankChartInterval, bankChartPeriodType, houseScope, houses, movements, tickets]);

  const bankChartTicks = useMemo(
    () => bankEvolutionRows.map((point) => point.data),
    [bankEvolutionRows]
  );
  const shouldScrollBankDates = bankEvolutionRows.length > 7;
  const bankChartCanvasWidth = shouldScrollBankDates
    ? `${(bankEvolutionRows.length / 7) * 100}%`
    : "100%";

  useEffect(() => {
    const scrollElement = bankChartScrollRef.current;
    if (!scrollElement || !shouldScrollBankDates) return;

    window.requestAnimationFrame(() => {
      scrollElement.scrollLeft = scrollElement.scrollWidth;
    });
  }, [bankEvolutionRows.length, periodReference, periodType, shouldScrollBankDates]);

  function handleBankChartPointerDown(event) {
    if (!shouldScrollBankDates || event.button !== 0) return;

    const scrollElement = bankChartScrollRef.current;
    if (!scrollElement) return;

    bankChartDragRef.current = {
      isDragging: true,
      pointerId: event.pointerId,
      startX: event.clientX,
      startScrollLeft: scrollElement.scrollLeft,
    };
    scrollElement.classList.add("is-dragging");
    scrollElement.setPointerCapture?.(event.pointerId);
  }

  function handleBankChartPointerMove(event) {
    const dragState = bankChartDragRef.current;
    const scrollElement = bankChartScrollRef.current;
    if (!dragState.isDragging || !scrollElement) return;

    event.preventDefault();
    scrollElement.scrollLeft = dragState.startScrollLeft - (event.clientX - dragState.startX);
  }

  function finishBankChartDrag() {
    const scrollElement = bankChartScrollRef.current;
    const dragState = bankChartDragRef.current;
    if (!dragState.isDragging) return;

    scrollElement?.classList.remove("is-dragging");
    if (scrollElement && dragState.pointerId !== null) {
      scrollElement.releasePointerCapture?.(dragState.pointerId);
    }
    bankChartDragRef.current.isDragging = false;
    bankChartDragRef.current.pointerId = null;
  }

  const advancedStats = useMemo(() => {
    const resolvedTickets = filteredTickets
      .filter((ticket) => ticket.resultado !== "Pendente")
      .sort((a, b) => String(a.data || "").localeCompare(String(b.data || "")));
    let currentWinStreak = 0;
    let currentLossStreak = 0;
    let currentPositiveSequence = 0;
    let currentNegativeSequence = 0;
    let bestWinStreak = 0;
    let bestLossStreak = 0;
    let biggestPositiveSequence = 0;
    let biggestNegativeSequence = 0;

    resolvedTickets.forEach((ticket) => {
      const status = getTicketStatus(ticket);
      const impact = getRealTicketImpact(ticket);

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

      if (impact > 0) {
        currentPositiveSequence += impact;
        currentNegativeSequence = 0;
        biggestPositiveSequence = Math.max(biggestPositiveSequence, currentPositiveSequence);
      } else if (impact < 0) {
        currentNegativeSequence += impact;
        currentPositiveSequence = 0;
        biggestNegativeSequence = Math.min(biggestNegativeSequence, currentNegativeSequence);
      } else {
        currentPositiveSequence = 0;
        currentNegativeSequence = 0;
      }
    });

    const winningTickets = resolvedTickets.filter((ticket) => getTicketStatus(ticket) === "Ganhas");
    const losingTickets = resolvedTickets.filter((ticket) => getTicketStatus(ticket) === "Perdidas");
    const sortedWinningTickets = [...winningTickets].sort(
      (a, b) => getRealTicketImpact(b) - getRealTicketImpact(a)
    );
    const sortedLosingTickets = [...losingTickets].sort(
      (a, b) => getRealTicketImpact(a) - getRealTicketImpact(b)
    );
    const dailyResults = new Map();
    resolvedTickets.forEach((ticket) => {
      const key = ticket.data || "";
      dailyResults.set(key, (dailyResults.get(key) || 0) + getRealTicketImpact(ticket));
    });
    const dailyEntries = [...dailyResults.entries()].map(([date, result]) => ({ date, result }));
    const positiveDaily = dailyEntries.filter((item) => item.result > 0);
    const negativeDaily = dailyEntries.filter((item) => item.result < 0);
    const sortedPositiveDaily = [...positiveDaily].sort((a, b) => b.result - a.result);
    const sortedNegativeDaily = [...negativeDaily].sort((a, b) => a.result - b.result);
    const ticketsWithOdd = resolvedTickets.filter((ticket) => Number(ticket.odd || 0) > 0);
    const ticketsWithStake = resolvedTickets
      .map((ticket) => ({ ticket, value: Number(ticket.stakeReal ?? ticket.stake ?? 0) }))
      .filter((item) => item.value > 0);
    const highestWinningOddTicket = [...winningTickets]
      .filter((ticket) => Number(ticket.odd || 0) > 0)
      .sort((a, b) => Number(b.odd || 0) - Number(a.odd || 0))[0];
    const highestLosingOddTicket = [...losingTickets]
      .filter((ticket) => Number(ticket.odd || 0) > 0)
      .sort((a, b) => Number(b.odd || 0) - Number(a.odd || 0))[0];
    const sortedStakes = [...ticketsWithStake].sort((a, b) => b.value - a.value);
    const oddRanges = [
      { label: "1,00 – 1,49", min: 1, max: 1.5 },
      { label: "1,50 – 1,99", min: 1.5, max: 2 },
      { label: "2,00 – 2,99", min: 2, max: 3 },
      { label: "3,00 – 4,99", min: 3, max: 5 },
      { label: "5,00 ou mais", min: 5, max: Number.POSITIVE_INFINITY },
    ];
    const oddRangeStats = oddRanges
      .map((range) => {
        const rangeTickets = ticketsWithOdd.filter((ticket) => {
          const odd = Number(ticket.odd || 0);
          return odd >= range.min && odd < range.max;
        });
        const profit = rangeTickets.reduce((sum, ticket) => sum + getRealTicketImpact(ticket), 0);
        const stake = rangeTickets.reduce(
          (sum, ticket) => sum + Number(ticket.stakeReal ?? ticket.stake ?? 0),
          0
        );
        const wins = rangeTickets.filter((ticket) => getRealTicketImpact(ticket) > 0).length;

        return {
          hitRate: rangeTickets.length > 0 ? (wins / rangeTickets.length) * 100 : 0,
          label: range.label,
          profit,
          roi: stake > 0 ? (profit / stake) * 100 : 0,
          tickets: rangeTickets.length,
        };
      })
      .filter((range) => range.tickets > 0)
      .sort((a, b) => b.roi - a.roi);

    return {
      averageOdd:
        ticketsWithOdd.length > 0
          ? ticketsWithOdd.reduce((sum, ticket) => sum + Number(ticket.odd || 0), 0) / ticketsWithOdd.length
          : null,
      averageStake:
        ticketsWithStake.length > 0
          ? ticketsWithStake.reduce((sum, item) => sum + item.value, 0) / ticketsWithStake.length
          : null,
      bestDay: sortedPositiveDaily[0] || null,
      bestLossStreak,
      bestWinStreak,
      biggestLoss: sortedLosingTickets[0],
      biggestNegativeSequence,
      biggestPositiveSequence,
      biggestProfit: sortedWinningTickets[0],
      closedTickets: resolvedTickets.length,
      greenTickets: winningTickets.length,
      highestLosingOddTicket,
      highestWinningOddTicket,
      largestStake: sortedStakes[0],
      lowestStake: sortedStakes[sortedStakes.length - 1],
      negativeDays: dailyEntries.filter((item) => item.result < 0).length,
      neutralDays: dailyEntries.filter((item) => item.result === 0).length,
      positiveDays: dailyEntries.filter((item) => item.result > 0).length,
      redTickets: losingTickets.length,
      oddRangeStats,
      worstDay: sortedNegativeDaily[0] || null,
    };
  }, [filteredTickets]);

  const advancedSequenceMetrics = [
    {
      label: "Maior sequência de ganhos",
      tone: "positive",
      value: `${advancedStats.bestWinStreak} aposta${advancedStats.bestWinStreak === 1 ? "" : "s"}`,
    },
    {
      label: "Maior sequência de perdas",
      tone: "negative",
      value: `${advancedStats.bestLossStreak} aposta${advancedStats.bestLossStreak === 1 ? "" : "s"}`,
    },
    {
      label: "Maior sequência lucrativa",
      tone: "positive",
      value: formatSignedMoney(advancedStats.biggestPositiveSequence),
    },
    {
      label: "Maior sequência negativa",
      tone: "negative",
      value: formatSignedMoney(advancedStats.biggestNegativeSequence),
    },
  ];
  const advancedBehaviorMetrics = [
    { label: "Odd média", value: formatOdd(advancedStats.averageOdd) },
    {
      detail: advancedStats.highestWinningOddTicket
        ? `${getHouseName(advancedStats.highestWinningOddTicket.casaId)} · ${formatDisplayDate(advancedStats.highestWinningOddTicket.data)}`
        : "Sem dados no período",
      label: "Maior odd vencedora",
      tone: "positive",
      value: formatOdd(advancedStats.highestWinningOddTicket?.odd),
    },
    {
      detail: advancedStats.highestLosingOddTicket
        ? `${getHouseName(advancedStats.highestLosingOddTicket.casaId)} · ${formatDisplayDate(advancedStats.highestLosingOddTicket.data)}`
        : "Sem dados no período",
      label: "Maior odd perdida",
      tone: "negative",
      value: formatOdd(advancedStats.highestLosingOddTicket?.odd),
    },
    {
      label: "Valor médio",
      value: advancedStats.averageStake === null ? "-" : formatMoney(advancedStats.averageStake),
    },
    {
      detail: advancedStats.largestStake?.ticket?.data
        ? formatDisplayDate(advancedStats.largestStake.ticket.data)
        : "Sem dados no período",
      label: "Maior valor",
      value: advancedStats.largestStake ? formatMoney(advancedStats.largestStake.value) : "-",
    },
    {
      detail: advancedStats.lowestStake?.ticket?.data
        ? formatDisplayDate(advancedStats.lowestStake.ticket.data)
        : "Sem dados no período",
      label: "Menor valor",
      value: advancedStats.lowestStake ? formatMoney(advancedStats.lowestStake.value) : "-",
    },
    { label: "Apostas ganhas", tone: "positive", value: formatCount(advancedStats.greenTickets) },
    { label: "Apostas perdidas", tone: "negative", value: formatCount(advancedStats.redTickets) },
    { label: "Apostas encerradas", value: formatCount(advancedStats.closedTickets) },
  ];
  const advancedHouseRows = [...houseReportRows].sort((a, b) => b.roi - a.roi);
  const advancedExportData = {
    consistency: [
      { label: "Dias positivos", type: "count", value: advancedStats.positiveDays },
      { label: "Dias negativos", type: "count", value: advancedStats.negativeDays },
      { label: "Dias neutros", type: "count", value: advancedStats.neutralDays },
      {
        date: advancedStats.bestDay?.date || "",
        label: "Melhor dia",
        type: "money",
        value: advancedStats.bestDay?.result ?? null,
      },
      {
        date: advancedStats.worstDay?.date || "",
        label: "Pior dia",
        type: "money",
        value: advancedStats.worstDay?.result ?? null,
      },
    ],
    houses: advancedHouseRows.map((row) => ({
      hitRate: row.hitRate,
      house: row.house.nome,
      profit: row.profit,
      roi: row.roi,
      tickets: row.tickets,
    })),
    metrics: [
      { label: "Odd média", type: "odd", value: advancedStats.averageOdd },
      {
        detail: advancedStats.highestWinningOddTicket
          ? `${getHouseName(advancedStats.highestWinningOddTicket.casaId)} · ${formatDisplayDate(advancedStats.highestWinningOddTicket.data)}`
          : "",
        label: "Maior odd vencedora",
        type: "odd",
        value: advancedStats.highestWinningOddTicket?.odd ?? null,
      },
      {
        detail: advancedStats.highestLosingOddTicket
          ? `${getHouseName(advancedStats.highestLosingOddTicket.casaId)} · ${formatDisplayDate(advancedStats.highestLosingOddTicket.data)}`
          : "",
        label: "Maior odd perdida",
        type: "odd",
        value: advancedStats.highestLosingOddTicket?.odd ?? null,
      },
      { label: "Valor médio", type: "money", value: advancedStats.averageStake },
      {
        detail: advancedStats.largestStake?.ticket?.data
          ? formatDisplayDate(advancedStats.largestStake.ticket.data)
          : "",
        label: "Maior valor",
        type: "money",
        value: advancedStats.largestStake?.value ?? null,
      },
      {
        detail: advancedStats.lowestStake?.ticket?.data
          ? formatDisplayDate(advancedStats.lowestStake.ticket.data)
          : "",
        label: "Menor valor",
        type: "money",
        value: advancedStats.lowestStake?.value ?? null,
      },
      { label: "Apostas ganhas", type: "count", value: advancedStats.greenTickets },
      { label: "Apostas perdidas", type: "count", value: advancedStats.redTickets },
      { label: "Apostas encerradas", type: "count", value: advancedStats.closedTickets },
    ],
    oddRanges: advancedStats.oddRangeStats,
    results: [
      {
        date: advancedStats.biggestProfit?.data || "",
        house: getHouseName(advancedStats.biggestProfit?.casaId),
        label: "Maior Green",
        odd: advancedStats.biggestProfit?.odd ?? null,
        tone: "positive",
        value: advancedStats.biggestProfit ? getRealTicketImpact(advancedStats.biggestProfit) : null,
      },
      {
        date: advancedStats.biggestLoss?.data || "",
        house: getHouseName(advancedStats.biggestLoss?.casaId),
        label: "Maior Red",
        odd: advancedStats.biggestLoss?.odd ?? null,
        tone: "negative",
        value: advancedStats.biggestLoss ? getRealTicketImpact(advancedStats.biggestLoss) : null,
      },
    ],
    sequences: [
      { label: "Maior sequência de ganhos", type: "count", value: advancedStats.bestWinStreak },
      { label: "Maior sequência de perdas", type: "count", value: advancedStats.bestLossStreak },
      { label: "Maior sequência lucrativa", type: "money", value: advancedStats.biggestPositiveSequence },
      { label: "Maior sequência negativa", type: "money", value: advancedStats.biggestNegativeSequence },
    ],
  };

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

    if (nextMode === "advanced") {
      setHouseScope("all");
    }
  }

  async function handleExportPdf() {
    if (houseScope === null) {
      return;
    }

    setIsExportingPdf(true);

    try {
      await exportReportToPdf({
        advancedData: advancedExportData,
        analysisMode: activeReportsTab,
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

    setIsExportingExcel(true);

    try {
      exportReportToExcel({
        advancedData: advancedExportData,
        analysisMode: activeReportsTab,
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
          {loadError ? (
            <section className="reference-load-error-panel" role="alert">
              <span>{loadError}</span>
              <button type="button" onClick={handleRetryLoadReports} disabled={isLoading}>
                Tentar novamente
              </button>
            </section>
          ) : null}

          {!isLoading && !loadError ? (
            <section className="reports-section" aria-labelledby="reports-page-title">
              <header className="reports-page-heading">
                <div>
                  <h2 id="reports-page-title">Relatórios</h2>
                  <p className="reports-section-context">Análises completas do desempenho da sua banca.</p>
                </div>
              </header>

              <div className="reports-top-row">
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

                  <label className="reference-period reports-analysis-filter">
                    <span>Análise</span>
                    <select
                      value={activeReportsTab}
                      onChange={(event) => handleAnalysisModeChange(event.target.value)}
                    >
                      <option value="overview">Visão Geral</option>
                      <option value="advanced">Estatísticas Avançadas</option>
                    </select>
                  </label>
                </div>

                <aside className="reports-quick-actions cb-ticket-day-sidebar">
                  <section className="cb-ticket-side-card cb-ticket-quick-actions">
                    <h3><span aria-hidden="true">ϟ</span>Ações rápidas</h3>
                    <div>
                      <button disabled={!canExport || isExportingPdf} type="button" onClick={handleExportPdf}>
                        Exportar PDF
                      </button>
                      <button disabled={!canExport || isExportingExcel} type="button" onClick={handleExportExcel}>
                        Exportar Excel
                      </button>
                    </div>
                  </section>
                </aside>
              </div>

              {activeReportsTab === "overview" ? (
                <>
              <section className="reports-reference-kpis" aria-label="Indicadores dos relatórios">
                {reportOverviewKpis.map((kpi) => (
                  <article className={`reports-reference-kpi ${kpi.tone}`} key={kpi.label}>
                    <span
                      className="reports-reference-kpi-icon"
                      data-icon={
                        kpi.label === "Resultado líquido"
                          ? "money"
                          : kpi.label === "Total apostado"
                            ? "trend"
                            : kpi.label === "Retorno total"
                              ? "trophy"
                              : "target"
                      }
                      aria-hidden="true"
                    />
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
                    <span>{periodType === "Diario" ? "Diário" : periodType}</span>
                  </div>
                  <div
                    className={`reports-reference-chart reports-reference-chart--evolution ${shouldScrollBankDates ? "scrollable-dates" : ""}`}
                    ref={bankChartScrollRef}
                    onPointerDown={handleBankChartPointerDown}
                    onPointerMove={handleBankChartPointerMove}
                    onPointerUp={finishBankChartDrag}
                    onPointerCancel={finishBankChartDrag}
                    onPointerLeave={finishBankChartDrag}
                  >
                    {bankEvolutionRows.length > 0 ? (
                      <div
                        className="reports-reference-chart-canvas"
                        style={{ "--reports-bank-chart-width": bankChartCanvasWidth }}
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={bankEvolutionRows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                            <defs>
                              <linearGradient id="reportsReferenceBankArea" x1="0" x2="0" y1="0" y2="1">
                                <stop offset="0%" stopColor="#08a64f" stopOpacity={0.22} />
                                <stop offset="100%" stopColor="#08a64f" stopOpacity={0.02} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid stroke="#e6edf5" vertical={false} strokeDasharray="4 4" />
                            <XAxis
                              dataKey="data"
                              type="category"
                              ticks={bankChartTicks}
                              allowDuplicatedCategory={false}
                              interval={0}
                              padding={{ left: 16 }}
                              tickFormatter={(value) => getBankChartDateLabel(value, bankChartPeriodType)}
                              tickLine={false}
                              axisLine={false}
                              tick={{ fill: "#425675", fontSize: 11, fontWeight: 700 }}
                            />
                            <YAxis tickLine={false} axisLine={false} width={66} tick={{ fill: "#425675", fontSize: 11, fontWeight: 700 }} tickFormatter={(value) => formatMoney(value).replace(",00", "")} />
                            <Tooltip content={<ReportsChartTooltip labelFormatter={formatDisplayDate} />} />
                            <Area type="monotone" dataKey="bancaLinha" name="Banca" stroke="#08a64f" strokeWidth={2.5} fill="url(#reportsReferenceBankArea)" dot={{ r: 3, fill: "#08a64f", stroke: "#ffffff", strokeWidth: 1.5 }} activeDot={{ r: 5 }} connectNulls />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="reports-empty-chart">Nenhum dado no período.</div>
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
                      <dt>Maior lucro</dt>
                      <dd className="positive">{formatSignedMoney(Math.max(0, ...dailyReportRows.map((row) => row.value)))}</dd>
                    </div>
                    <div>
                      <dt>Maior prejuízo</dt>
                      <dd className="negative">{formatSignedMoney(Math.min(0, ...dailyReportRows.map((row) => row.value)))}</dd>
                    </div>
                    <div>
                      <dt>Acerto</dt>
                      <dd>{formatPercent(reportStats.hitRate)}</dd>
                    </div>
                    <div>
                      <dt>Maior sequência de vitórias</dt>
                      <dd>{advancedStats.bestWinStreak}</dd>
                    </div>
                    <div>
                      <dt>Maior sequência de derrotas</dt>
                      <dd>{advancedStats.bestLossStreak}</dd>
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
                    <span>{periodType === "Diario" ? "Diário" : periodType}</span>
                  </div>
                  <div
                    className={`reports-daily-results-list ${dailyReportRows.length > 5 ? "scrollable" : ""}`}
                    aria-label="Resultados diários do período"
                  >
                    {dailyReportRows.length > 0 ? (
                      dailyReportRows.map((row) => {
                        const tone = row.value > 0 ? "positive" : row.value < 0 ? "negative" : "neutral";

                        return (
                          <div className="reports-daily-result-row" key={row.date}>
                            <span>{formatDisplayDate(row.date)}</span>
                            <strong className={tone}>{formatSignedMoney(row.value)}</strong>
                            <i className={tone} aria-hidden="true">
                              {row.value > 0 ? "↑" : row.value < 0 ? "↓" : "•"}
                            </i>
                          </div>
                        );
                      })
                    ) : (
                      <div className="reports-empty-chart">Nenhum resultado encontrado.</div>
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
                    {houseReportRows.map((row) => (
                      <div className="reports-house-table-row" key={row.house.id}>
                        <strong>
                          <i aria-hidden="true">
                            {row.house.logoDataUrl ? (
                              <img src={row.house.logoDataUrl} alt="" loading="lazy" />
                            ) : (
                              String(row.house.nome || "?").slice(0, 1)
                            )}
                          </i>
                          {row.house.nome}
                        </strong>
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
                </>
              ) : (
                <div className="reports-analysis-advanced">
                  <header>
                    <h3>Estatísticas Avançadas</h3>
                    <p>Inteligência sobre o comportamento das apostas no período selecionado.</p>
                  </header>

                  <section className="reports-advanced-panel reports-advanced-sequences">
                    <div className="reports-advanced-panel-heading">
                      <div>
                        <h4>Sequências</h4>
                        <p>Frequência e impacto financeiro das séries consecutivas.</p>
                      </div>
                    </div>
                    <div className="reports-advanced-sequence-grid">
                      {advancedSequenceMetrics.map((metric) => (
                        <div className={`reports-advanced-metric ${metric.tone}`} key={metric.label}>
                          <span>{metric.label}</span>
                          <strong>{metric.value}</strong>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="reports-advanced-results">
                    <div className="reports-advanced-panel-heading">
                      <div>
                        <h4>Melhores e piores resultados</h4>
                        <p>Identificação direta das apostas com maior impacto.</p>
                      </div>
                    </div>
                    <div className="reports-advanced-results-grid">
                      <ReportsAdvancedResultCard
                        houseName={getHouseName(advancedStats.biggestProfit?.casaId)}
                        ticket={advancedStats.biggestProfit}
                        title="Maior Green"
                        tone="positive"
                      />
                      <ReportsAdvancedResultCard
                        houseName={getHouseName(advancedStats.biggestLoss?.casaId)}
                        ticket={advancedStats.biggestLoss}
                        title="Maior Red"
                        tone="negative"
                      />
                    </div>
                  </section>

                  <div className="reports-advanced-insights-grid">
                    <section className="reports-advanced-panel reports-advanced-consistency">
                      <div className="reports-advanced-panel-heading">
                        <div>
                          <h4>Consistência</h4>
                          <p>Distribuição diária dos resultados.</p>
                        </div>
                      </div>
                      <dl className="reports-advanced-consistency-list">
                        <div><dt>Dias positivos</dt><dd className="positive">{formatCount(advancedStats.positiveDays)}</dd></div>
                        <div><dt>Dias negativos</dt><dd className="negative">{formatCount(advancedStats.negativeDays)}</dd></div>
                        <div><dt>Dias neutros</dt><dd>{formatCount(advancedStats.neutralDays)}</dd></div>
                        <div>
                          <dt>Melhor dia</dt>
                          <dd className="positive">
                            {advancedStats.bestDay ? formatSignedMoney(advancedStats.bestDay.result) : "-"}
                            <small>{advancedStats.bestDay?.date ? formatDisplayDate(advancedStats.bestDay.date) : "Sem dados"}</small>
                          </dd>
                        </div>
                        <div>
                          <dt>Pior dia</dt>
                          <dd className="negative">
                            {advancedStats.worstDay ? formatSignedMoney(advancedStats.worstDay.result) : "-"}
                            <small>{advancedStats.worstDay?.date ? formatDisplayDate(advancedStats.worstDay.date) : "Sem dados"}</small>
                          </dd>
                        </div>
                      </dl>
                    </section>

                    <section className="reports-advanced-panel reports-advanced-behavior">
                      <div className="reports-advanced-panel-heading">
                        <div>
                          <h4>Estatísticas avançadas</h4>
                          <p>Odds, valores e volume das apostas encerradas.</p>
                        </div>
                      </div>
                      <dl className="reports-advanced-behavior-grid">
                        {advancedBehaviorMetrics.map((metric) => (
                          <div className={metric.tone || "neutral"} key={metric.label}>
                            <dt>{metric.label}</dt>
                            <dd>{metric.value}</dd>
                            {metric.detail ? <small>{metric.detail}</small> : null}
                          </div>
                        ))}
                      </dl>
                    </section>
                  </div>

                  <section className="reports-advanced-panel reports-advanced-odds">
                    <div className="reports-advanced-panel-heading">
                      <div>
                        <h4>Desempenho por faixa de odd</h4>
                        <p>Rentabilidade e acerto agrupados pela cotação das apostas.</p>
                      </div>
                    </div>
                    <div className="reports-advanced-odd-table">
                      <div className="reports-advanced-odd-head">
                        <span>Faixa de odd</span>
                        <span>Apostas</span>
                        <span>Lucro</span>
                        <span>ROI</span>
                        <span>Acerto</span>
                      </div>
                      {advancedStats.oddRangeStats.map((range) => (
                        <div className="reports-advanced-odd-row" key={range.label}>
                          <strong>{range.label}</strong>
                          <span>{formatCount(range.tickets)}</span>
                          <span className={range.profit > 0 ? "positive" : range.profit < 0 ? "negative" : ""}>{formatSignedMoney(range.profit)}</span>
                          <span className={range.roi > 0 ? "positive" : range.roi < 0 ? "negative" : ""}>{formatSignedPercent(range.roi)}</span>
                          <span>{formatPercent(range.hitRate)}</span>
                        </div>
                      ))}
                      {advancedStats.oddRangeStats.length === 0 ? <p>Nenhuma odd disponível no período.</p> : null}
                    </div>
                  </section>

                  <section className="reports-advanced-panel reports-advanced-houses">
                    <div className="reports-advanced-panel-heading">
                      <div>
                        <h4>Desempenho por casa</h4>
                        <p>Comparação de volume, rentabilidade e taxa de acerto.</p>
                      </div>
                    </div>
                    <div className="reports-advanced-house-table">
                      <div className="reports-advanced-house-head">
                        <span>Casa</span>
                        <span>Bilhetes</span>
                        <span>Lucro</span>
                        <span>ROI</span>
                        <span>Acerto</span>
                      </div>
                      {advancedHouseRows.map((row) => (
                        <div className="reports-advanced-house-row" key={row.house.id}>
                          <strong>
                            <i aria-hidden="true">
                              {row.house.logoDataUrl ? (
                                <img src={row.house.logoDataUrl} alt="" loading="lazy" />
                              ) : (
                                String(row.house.nome || "?").slice(0, 1)
                              )}
                            </i>
                            {row.house.nome}
                          </strong>
                          <span>{formatCount(row.tickets)}</span>
                          <span className={row.profit > 0 ? "positive" : row.profit < 0 ? "negative" : ""}>{formatSignedMoney(row.profit)}</span>
                          <span className={row.roi > 0 ? "positive" : row.roi < 0 ? "negative" : ""}>{formatSignedPercent(row.roi)}</span>
                          <span>{formatPercent(row.hitRate)}</span>
                        </div>
                      ))}
                      {advancedHouseRows.length === 0 ? <p>Nenhuma casa com apostas no período.</p> : null}
                    </div>
                  </section>
                </div>
              )}
            </section>
          ) : null}
        </section>
      </DashboardShell>
    </div>
  );
}
