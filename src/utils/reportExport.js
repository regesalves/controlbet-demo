import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

function getGeneratedAt() {
    return new Date().toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
    });
}

function getReferenceLabel(periodType, periodReference) {
    if (periodType === "Geral" || !periodReference) return "Geral";
    if (periodType === "Mensal") return periodReference.split("-").reverse().join("/");
    if (periodType === "Anual") return periodReference;
    if (periodType === "Semanal" || String(periodType || "").startsWith("Di")) {
        return periodReference.split("-").reverse().join("/");
    }
    return periodReference;
}

function formatFileToken(value) {
    const normalizedValue = String(value || "Geral").trim();
    if (/^todas\s+as\s+casas$/i.test(normalizedValue)) return "TodasAsCasas";

    return normalizedValue
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[\/\\]+/g, "-")
        .replace(/[<>:"|?*]/g, "")
        .replace(/\s+/g, "")
        .replace(/_+/g, "_")
        .replace(/-+/g, "-")
        .replace(/^[-_]+|[-_]+$/g, "") || "Geral";
}

function getKpiValue(kpi) {
    if (!kpi) return "-";
    return kpi.formatter ? kpi.formatter(kpi.value) : String(kpi.value ?? "-");
}

function mapKpis(kpis) {
    return kpis.map((kpi) => [kpi.title, getKpiValue(kpi)]);
}

function findKpi(kpis, title) {
    return kpis.find((kpi) => kpi.title === title);
}

const EXCEL_FORMATS = {
    money: '[$R$-416] #,##0.00;[Red]-[$R$-416] #,##0.00',
    percent: '0.00%',
    count: '#,##0',
};

function getReportFilename({ extension, houseLabel, periodReference, periodType }) {
    const referenceLabel = getReferenceLabel(periodType, periodReference);
    return `ControlBet_Relatorio_${formatFileToken(houseLabel)}_${formatFileToken(periodType)}_${formatFileToken(referenceLabel)}.${extension}`;
}

function buildExecutiveSummary({ bettingPerformanceKpis, financialKpis, performanceKpis }) {
    return [
        findKpi(financialKpis, "Resultado"),
        findKpi(performanceKpis, "ROI"),
        findKpi(bettingPerformanceKpis, "Taxa de Acerto"),
        findKpi(bettingPerformanceKpis, "Apostas Ganhas"),
        findKpi(bettingPerformanceKpis, "Apostas Perdidas"),
        findKpi(bettingPerformanceKpis, "Apostas Encerradas"),
    ]
        .filter(Boolean)
        .map((kpi) => [kpi.title, getKpiValue(kpi)]);
}

function buildExecutiveNarrative({ bettingPerformanceKpis, financialKpis, performanceKpis, reportStats }) {
    const result = getKpiValue(findKpi(financialKpis, "Resultado"));
    const roi = getKpiValue(findKpi(performanceKpis, "ROI"));
    const hitRate = getKpiValue(findKpi(bettingPerformanceKpis, "Taxa de Acerto"));
    const distribution = reportStats?.overviewDistribution || {};
    const won = Number(distribution.Ganhas || 0);
    const lost = Number(distribution.Perdidas || 0);
    const closed = Number(distribution.Encerradas || 0);
    const resolved = won + lost + closed;
    const formatCount = (value) => Number(value || 0).toLocaleString("pt-BR");

    return [
        `Resultado do período: ${result}.`,
        `ROI: ${roi}.`,
        `Taxa de acerto: ${hitRate}.`,
        `Foram registradas ${formatCount(resolved)} apostas resolvidas, sendo ${formatCount(won)} vencedoras, ${formatCount(lost)} perdedoras e ${formatCount(closed)} apostas encerradas.`,
    ];
}

function addReportTable(doc, title, rows, startY) {
    autoTable(doc, {
        body: rows,
        head: [[title, "Valor"]],
        margin: { left: 14, right: 14, bottom: 24 },
        startY,
        styles: {
            cellPadding: 3,
            font: "helvetica",
            fontSize: 9,
            lineColor: [224, 231, 240],
            lineWidth: 0.1,
            textColor: [36, 48, 67],
        },
        headStyles: {
            fillColor: [225, 29, 46],
            fontStyle: "bold",
            textColor: [255, 255, 255],
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252],
        },
        columnStyles: {
            0: { fontStyle: "bold" },
            1: { halign: "right" },
        },
    });

    return doc.lastAutoTable.finalY + 10;
}

function addHighlights(doc, { bettingPerformanceKpis, financialKpis, performanceKpis }, startY) {
    const highlights = [
        findKpi(financialKpis, "Resultado"),
        findKpi(performanceKpis, "ROI"),
        findKpi(bettingPerformanceKpis, "Taxa de Acerto"),
    ].filter(Boolean);

    if (highlights.length === 0) return startY;

    const pageWidth = doc.internal.pageSize.getWidth();
    const gap = 5;
    const cardWidth = (pageWidth - 28 - (gap * (highlights.length - 1))) / highlights.length;
    const cardHeight = 18;

    highlights.forEach((kpi, index) => {
        const x = 14 + ((cardWidth + gap) * index);
        const numericValue = Number(kpi.value || 0);
        const accent = numericValue > 0
            ? [16, 185, 129]
            : numericValue < 0
                ? [225, 29, 46]
                : [71, 85, 105];

        doc.setDrawColor(226, 232, 240);
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(x, startY, cardWidth, cardHeight, 2.5, 2.5, "FD");
        doc.setFillColor(...accent);
        doc.roundedRect(x, startY, 2.4, cardHeight, 1.2, 1.2, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(71, 85, 105);
        doc.text(kpi.title, x + 6, startY + 6);
        doc.setFontSize(11);
        doc.setTextColor(17, 24, 39);
        doc.text(getKpiValue(kpi), x + 6, startY + 13.5);
    });

    return startY + cardHeight + 9;
}

function addExecutiveNarrative(doc, lines, startY) {
    const pageWidth = doc.internal.pageSize.getWidth();
    const wrappedLines = doc.splitTextToSize(lines.join("\n\n"), pageWidth - 28);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(wrappedLines, 14, startY);

    return startY + (wrappedLines.length * 4.5) + 10;
}

function addFooter(doc, generatedAt) {
    const pageCount = doc.internal.getNumberOfPages();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
        doc.setPage(pageNumber);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.1);
        doc.line(14, pageHeight - 17, pageWidth - 14, pageHeight - 17);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text("Relatório gerado pelo ControlBet", 14, pageHeight - 10);
        doc.text(`Gerado em: ${generatedAt}`, pageWidth / 2, pageHeight - 10, { align: "center" });
        doc.text(`Página ${pageNumber} de ${pageCount}`, pageWidth - 14, pageHeight - 10, { align: "right" });
    }
}

function addLogo(doc, logoImage, { maxHeight = 15, maxWidth = 42, x = 14, y = 14 } = {}) {
    if (!logoImage?.dataUrl) return;

    const aspectRatio = logoImage.width > 0 && logoImage.height > 0
        ? logoImage.width / logoImage.height
        : maxWidth / maxHeight;
    const width = Math.min(maxWidth, maxHeight * aspectRatio);
    const height = width / aspectRatio;
    const imageY = y + ((maxHeight - height) / 2);

    try {
        doc.addImage(logoImage.dataUrl, "PNG", x, imageY, width, height, undefined, "FAST");
    } catch {
        // The report remains valid if the browser cannot decode the logo asset.
    }
}

function loadImageDimensions(dataUrl) {
    return new Promise((resolve) => {
        const image = new Image();
        image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
        image.onerror = () => resolve({ width: 0, height: 0 });
        image.src = dataUrl;
    });
}

async function getImageData(imageUrl) {
    const response = await fetch(imageUrl);
    const blob = await response.blob();

    const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
    const dimensions = await loadImageDimensions(dataUrl);

    return { dataUrl, ...dimensions };
}

function getExcelNumericValue(kpi, valueType) {
    const numericValue = Number(kpi?.value || 0);
    return valueType === "percent" ? numericValue / 100 : numericValue;
}

function pushSummaryKpiRows(rows, valueFormats, sectionTitle, kpis, getValueType, normalizeTitle = (title) => title) {
    rows.push([]);
    rows.push([sectionTitle, ""]);

    kpis.forEach((kpi) => {
        const valueType = getValueType(kpi);
        rows.push([normalizeTitle(kpi.title), getExcelNumericValue(kpi, valueType)]);
        valueFormats.push({
            format: EXCEL_FORMATS[valueType],
            rowIndex: rows.length - 1,
        });
    });
}

function buildSummarySheetData({
    bettingPerformanceKpis,
    financialKpis,
    generatedAt,
    houseLabel,
    performanceKpis,
    periodReference,
    periodType,
}) {
    const referenceLabel = getReferenceLabel(periodType, periodReference);
    const renamePerformanceLabel = (title) => title === "Evolução de Performance" ? "Evolução de Desempenho" : title;
    const rows = [
        ["Metadados", ""],
        ["Casa", houseLabel || "-"],
        ["Período", periodType || "-"],
        ["Referência", referenceLabel],
        ["Data de geração", generatedAt],
    ];
    const valueFormats = [];

    pushSummaryKpiRows(rows, valueFormats, "Resumo Financeiro", financialKpis, () => "money");
    pushSummaryKpiRows(
        rows,
        valueFormats,
        "Performance",
        performanceKpis,
        (kpi) => ["Evolução da Banca", "Evolução de Performance", "ROI"].includes(kpi.title) ? "percent" : "money",
        renamePerformanceLabel
    );
    pushSummaryKpiRows(
        rows,
        valueFormats,
        "Desempenho",
        bettingPerformanceKpis,
        (kpi) => kpi.title === "Taxa de Acerto" ? "percent" : "count"
    );

    return { rows, valueFormats };
}

function autosizeColumns(rows) {
    const columnCount = rows.reduce((max, row) => Math.max(max, row.length), 0);

    return Array.from({ length: columnCount }, (_, index) => ({
        wch: Math.min(
            42,
            Math.max(
                12,
                ...rows.map((row) => String(row[index] ?? "").length + 2)
            )
        ),
    }));
}

function getHouseNameById(houses, houseId) {
    return houses.find((house) => Number(house.id) === Number(houseId))?.nome || "Casa";
}

export function exportReportToExcel({
    bettingPerformanceKpis,
    filteredMovements = [],
    filteredTickets = [],
    financialKpis,
    houseLabel,
    houses = [],
    performanceKpis,
    periodReference,
    periodType,
}) {
    const generatedAt = getGeneratedAt();
    const workbook = XLSX.utils.book_new();
    const { rows: summaryRows, valueFormats: summaryValueFormats } = buildSummarySheetData({
        bettingPerformanceKpis,
        financialKpis,
        generatedAt,
        houseLabel,
        performanceKpis,
        periodReference,
        periodType,
    });
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
    summaryValueFormats.forEach(({ format, rowIndex }) => {
        const cellRef = XLSX.utils.encode_cell({ c: 1, r: rowIndex });
        if (summarySheet[cellRef]) {
            summarySheet[cellRef].z = format;
        }
    });
    summarySheet["!cols"] = autosizeColumns(summaryRows);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Resumo");

    const ticketsRows = filteredTickets.map((ticket) => ({
        Data: ticket.data || "",
        Casa: getHouseNameById(houses, ticket.casaId),
        "Número do Bilhete": ticket.numeroBilhete || "",
        "Nome do Bilhete": ticket.nomeBilhete || "",
        Categoria: ticket.categoria || "",
        Stake: Number(ticket.stake || 0),
        "Stake Real": Number(ticket.stakeReal || 0),
        Retorno: Number(ticket.retorno || 0),
        Resultado: ticket.resultado || "Pendente",
        Lucro: Number(ticket.lucro || 0),
        "Lucro Real": Number(ticket.lucroReal || 0),
        "Perda Real": Number(ticket.perdaReal || 0),
        Odd: Number(ticket.odd || 0),
    }));
    const ticketsSheet = XLSX.utils.json_to_sheet(ticketsRows, {
        header: [
            "Data",
            "Casa",
            "Número do Bilhete",
            "Nome do Bilhete",
            "Categoria",
            "Stake",
            "Stake Real",
            "Retorno",
            "Resultado",
            "Lucro",
            "Lucro Real",
            "Perda Real",
            "Odd",
        ],
    });
    ticketsSheet["!cols"] = autosizeColumns([
        Object.keys(ticketsRows[0] || {
            Data: "",
            Casa: "",
            "Número do Bilhete": "",
            "Nome do Bilhete": "",
            Categoria: "",
            Stake: "",
            "Stake Real": "",
            Retorno: "",
            Resultado: "",
            Lucro: "",
            "Lucro Real": "",
            "Perda Real": "",
            Odd: "",
        }),
        ...ticketsRows.map((row) => Object.values(row)),
    ]);
    XLSX.utils.book_append_sheet(workbook, ticketsSheet, "Bilhetes");

    const movementsRows = filteredMovements.map((movement) => ({
        Data: movement.data || "",
        Casa: getHouseNameById(houses, movement.casaId),
        Tipo: movement.tipo || "",
        Valor: Number(movement.valor || 0),
        "Observações": movement.observacoes || "",
    }));
    const movementsSheet = XLSX.utils.json_to_sheet(movementsRows, {
        header: ["Data", "Casa", "Tipo", "Valor", "Observações"],
    });
    movementsSheet["!cols"] = autosizeColumns([
        ["Data", "Casa", "Tipo", "Valor", "Observações"],
        ...movementsRows.map((row) => Object.values(row)),
    ]);
    XLSX.utils.book_append_sheet(workbook, movementsSheet, "Movimentações");

    XLSX.writeFile(workbook, getReportFilename({ extension: "xlsx", houseLabel, periodReference, periodType }));
}

export async function exportReportToPdf({
    bettingPerformanceKpis,
    financialKpis,
    houseLabel,
    logoUrl,
    performanceKpis,
    periodReference,
    periodType,
    reportStats,
    userName,
}) {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const generatedAt = getGeneratedAt();
    const referenceLabel = getReferenceLabel(periodType, periodReference);
    const logoImage = logoUrl ? await getImageData(logoUrl) : null;

    const pageWidth = doc.internal.pageSize.getWidth();
    const logoWidth = 54;
    const logoHeight = 19;
    const logoX = (pageWidth - logoWidth) / 2;

    addLogo(doc, logoImage, { maxHeight: logoHeight, maxWidth: logoWidth, x: logoX, y: 12 });

    doc.setTextColor(17, 24, 39);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Relatório de Desempenho", pageWidth / 2, 39, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(`Casa selecionada: ${houseLabel || "-"}`, 14, 52);
    doc.text(`Período: ${periodType || "-"}`, 14, 58);
    doc.text(`Referência: ${referenceLabel}`, 14, 64);
    let headerY = 70;
    if (userName) {
        doc.text(`Usuário: ${userName}`, 14, headerY);
        headerY += 6;
    }
    doc.text(`Data de geração: ${generatedAt}`, 14, headerY);

    let nextY = addHighlights(
        doc,
        { bettingPerformanceKpis, financialKpis, performanceKpis },
        headerY + 9
    );
    nextY = addReportTable(
        doc,
        "Resumo Executivo",
        buildExecutiveSummary({ bettingPerformanceKpis, financialKpis, performanceKpis }),
        nextY
    );
    nextY = addExecutiveNarrative(
        doc,
        buildExecutiveNarrative({ bettingPerformanceKpis, financialKpis, performanceKpis, reportStats }),
        nextY - 4
    );
    nextY = addReportTable(doc, "Resumo Financeiro", mapKpis(financialKpis), nextY);
    nextY = addReportTable(doc, "Performance", mapKpis(performanceKpis), nextY);
    addReportTable(doc, "Desempenho", mapKpis(bettingPerformanceKpis), nextY);

    addFooter(doc, generatedAt);

    doc.save(getReportFilename({ extension: "pdf", houseLabel, periodReference, periodType }));
}
