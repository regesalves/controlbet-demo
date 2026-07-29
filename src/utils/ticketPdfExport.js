import {
    PDF_COLORS,
    addCorporateFooters,
    addCorporateHeader,
    addCorporateTable,
    addFinalSummary,
    addMetricStrip,
    createCorporatePdf,
} from "./corporatePdf";
import controlBetLogoUrl from "../assets/logo.png";

const moneyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function money(value) {
    return moneyFormatter.format(Number(value || 0));
}

function signedMoney(value) {
    const number = Number(value || 0);
    return `${number > 0 ? "+" : ""}${money(number)}`;
}

function dateLabel(value) {
    if (!value) return "-";
    const [year, month, day] = String(value).split("-");
    return year && month && day ? `${day}/${month}/${year}` : String(value);
}

function referenceLabel(periodType, reference) {
    if (periodType === "Geral" || !reference) return "Geral";
    if (periodType === "Mensal") {
        const [year, month] = String(reference).split("-");
        return month && year ? `${month}/${year}` : reference;
    }
    return periodType === "Anual" ? reference : dateLabel(reference);
}

function ticketStatus(ticket) {
    if (ticket.resultado === "Green") return "Ganho";
    if (ticket.resultado === "Red") return "Perda";
    if (ticket.resultado === "Cash Out") return "Encerrado";
    return "Pendente";
}

function ticketNetResult(ticket) {
    const stake = Number(ticket.stakeReal ?? ticket.stake ?? 0);
    const returned = Number(ticket.retorno || 0);
    if (ticket.resultado === "Red") return -Math.abs(stake);
    if (ticket.resultado === "Pendente") return 0;
    return returned - stake;
}

function safeFilenameToken(value) {
    return String(value || "Geral")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9_-]+/g, "-")
        .replace(/^-+|-+$/g, "") || "Geral";
}

async function loadImageDataUrl(url) {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        return await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch {
        return null;
    }
}

export async function exportTicketsToPdf({ tickets = [], houses = [], filters = {} }) {
    const generatedAt = new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
    const houseMap = new Map(houses.map((house) => [Number(house.id), house.nome]));
    const totalStake = tickets.reduce((total, ticket) => total + Number(ticket.stakeReal ?? ticket.stake ?? 0), 0);
    const totalReturn = tickets.reduce((total, ticket) => total + Number(ticket.retorno || 0), 0);
    const netResult = tickets.reduce((total, ticket) => total + ticketNetResult(ticket), 0);
    const roi = totalStake > 0 ? (netResult / totalStake) * 100 : 0;
    const counts = tickets.reduce((summary, ticket) => {
        if (ticket.resultado === "Green") summary.won += 1;
        else if (ticket.resultado === "Red") summary.lost += 1;
        else if (ticket.resultado === "Cash Out") summary.closed += 1;
        else summary.pending += 1;
        return summary;
    }, { won: 0, lost: 0, pending: 0, closed: 0 });

    const logoDataUrl = await loadImageDataUrl(controlBetLogoUrl);
    const doc = createCorporatePdf({ orientation: "landscape" });
    let y = addCorporateHeader(doc, {
        logoDataUrl,
        title: "Relatório de Bilhetes",
        generatedAt,
        metadata: [
            { label: "Casa selecionada", value: filters.houseLabel || "Todas as casas" },
            { label: "Período", value: filters.periodType || "Geral" },
            { label: "Referência", value: referenceLabel(filters.periodType, filters.reference) },
            { label: "Resultado filtrado", value: filters.resultLabel || "Todos" },
        ],
    });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...PDF_COLORS.ink);
    doc.text("RESUMO DO PERÍODO", 12, y + 4);
    y = addMetricStrip(doc, {
        title: "",
        startY: y + 8,
        metrics: [
            { label: "Total de bilhetes", value: tickets.length },
            { label: "Valor apostado", value: money(totalStake) },
            { label: "Retorno", value: money(totalReturn), color: totalReturn < 0 ? PDF_COLORS.red : totalReturn > 0 ? PDF_COLORS.green : PDF_COLORS.ink },
            { label: "Resultado líquido", value: signedMoney(netResult), color: netResult < 0 ? PDF_COLORS.red : PDF_COLORS.green },
            { label: "ROI", value: `${roi.toFixed(2).replace(".", ",")}%`, color: roi < 0 ? PDF_COLORS.red : PDF_COLORS.green },
        ],
    });

    const columns = [
        { key: "date", label: "Data", width: 20 },
        { key: "house", label: "Casa", width: 27 },
        { key: "odd", label: "Odd", width: 15, align: "right" },
        { key: "stake", label: "Valor apostado", width: 28, align: "right" },
        { key: "return", label: "Retorno", width: 30, align: "right" },
        { key: "result", label: "Resultado", width: 26, align: "right" },
        { key: "origin", label: "Origem", width: 23 },
        { key: "status", label: "Status", width: 22, align: "center", badges: {
            Ganho: { fill: [229, 247, 237], text: [7, 112, 58] },
            Perda: { fill: [254, 235, 238], text: [176, 24, 43] },
            Pendente: { fill: [255, 247, 219], text: [143, 93, 8] },
            Encerrado: { fill: [231, 241, 255], text: [28, 88, 160] },
        } },
        { key: "notes", label: "Observação" },
    ];
    const rows = tickets.map((ticket) => ({
        date: dateLabel(ticket.data),
        house: houseMap.get(Number(ticket.casaId)) || "Casa não identificada",
        odd: Number(ticket.odd || 0).toFixed(2),
        stake: money(ticket.stakeReal ?? ticket.stake ?? 0),
        return: money(ticket.retorno || 0),
        result: signedMoney(ticketNetResult(ticket)),
        origin: ticket.origemStake || "Saldo",
        status: ticketStatus(ticket),
        notes: ticket.observacoes || "-",
    }));

    y = addCorporateTable(doc, { columns, rows, startY: y });
    addFinalSummary(doc, {
        title: "Resumo final",
        startY: y,
        metrics: [
            { label: "Ganhos", value: counts.won, color: PDF_COLORS.green },
            { label: "Perdas", value: counts.lost, color: PDF_COLORS.red },
            { label: "Pendentes", value: counts.pending },
            { label: "Encerrados", value: counts.closed },
            { label: "Total apostado", value: money(totalStake) },
            { label: "Total retornado", value: money(totalReturn), color: totalReturn < 0 ? PDF_COLORS.red : totalReturn > 0 ? PDF_COLORS.green : PDF_COLORS.ink },
            { label: "Resultado líquido", value: signedMoney(netResult), color: netResult < 0 ? PDF_COLORS.red : PDF_COLORS.green },
            { label: "ROI", value: `${roi.toFixed(2).replace(".", ",")}%`, color: roi < 0 ? PDF_COLORS.red : roi > 0 ? PDF_COLORS.green : PDF_COLORS.ink },
        ],
    });
    addCorporateFooters(doc, { generatedAt });

    doc.save(`ControlBet_Bilhetes_${safeFilenameToken(filters.periodType)}_${safeFilenameToken(referenceLabel(filters.periodType, filters.reference))}.pdf`);
}
