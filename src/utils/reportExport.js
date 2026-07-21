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
        .replace(/[/\\]+/g, "-")
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
    odd: '0.00',
};

function formatMoney(value) {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) return "-";
    return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatPercent(value) {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) return "-";
    return `${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

function formatOdd(value) {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) return "-";
    return Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatCount(value) {
    return Number(value || 0).toLocaleString("pt-BR");
}

function formatDate(value) {
    if (!value) return "-";
    return String(value).split("-").reverse().join("/");
}

function formatAdvancedValue(item) {
    if (!item) return "-";
    if (item.type === "money") return formatMoney(item.value);
    if (item.type === "percent") return formatPercent(item.value);
    if (item.type === "odd") return formatOdd(item.value);
    if (item.type === "count") return formatCount(item.value);
    return String(item.value ?? "-");
}

function getReportFilename({ analysisMode, extension, houseLabel, periodReference, periodType }) {
    const referenceLabel = getReferenceLabel(periodType, periodReference);
    const analysisToken = analysisMode === "advanced" ? "_EstatisticasAvancadas" : "";
    return `ControlBet_Relatorio${analysisToken}_${formatFileToken(houseLabel)}_${formatFileToken(periodType)}_${formatFileToken(referenceLabel)}.${extension}`;
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

function addAdvancedPdfTable(doc, { body, head, startY, title }) {
    const pageHeight = doc.internal.pageSize.getHeight();
    let resolvedY = startY;

    if (resolvedY > pageHeight - 42) {
        doc.addPage();
        resolvedY = 20;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(7, 19, 50);
    doc.text(title, 14, resolvedY);

    autoTable(doc, {
        body: body.length > 0 ? body : [["Sem dados no período", ...Array(Math.max(0, head.length - 1)).fill("")]],
        head: [head],
        margin: { left: 14, right: 14, bottom: 24 },
        pageBreak: "auto",
        rowPageBreak: "avoid",
        startY: resolvedY + 4,
        styles: {
            cellPadding: 2.5,
            font: "helvetica",
            fontSize: 8,
            lineColor: [224, 231, 240],
            lineWidth: 0.1,
            overflow: "linebreak",
            textColor: [36, 48, 67],
            valign: "middle",
        },
        headStyles: {
            fillColor: [225, 29, 46],
            fontStyle: "bold",
            textColor: [255, 255, 255],
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252],
        },
        didParseCell(data) {
            if (data.section !== "body") return;
            const raw = String(data.cell.raw ?? "");
            if (raw.startsWith("+")) data.cell.styles.textColor = [8, 166, 79];
            if (raw.startsWith("-")) data.cell.styles.textColor = [239, 23, 52];
            if (data.column.index === 0) data.cell.styles.fontStyle = "bold";
        },
    });

    return doc.lastAutoTable.finalY + 9;
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

const ADVANCED_EXCEL_COLORS = {
    border: "DCE5EF",
    green: "08A64F",
    header: "E11D2E",
    navy: "071332",
    red: "EF1734",
    soft: "F8FAFC",
    white: "FFFFFF",
};

function applyAdvancedExcelStyles(sheet, rows, { headerRows = [], sectionRows = [], titleRows = [0] } = {}) {
    const range = XLSX.utils.decode_range(sheet["!ref"] || "A1:A1");

    for (let row = range.s.r; row <= range.e.r; row += 1) {
        for (let column = range.s.c; column <= range.e.c; column += 1) {
            const cell = sheet[XLSX.utils.encode_cell({ r: row, c: column })];
            if (!cell) continue;

            cell.s = {
                alignment: { vertical: "center", wrapText: false },
                border: {
                    bottom: { color: { rgb: ADVANCED_EXCEL_COLORS.border }, style: "thin" },
                },
                font: { color: { rgb: ADVANCED_EXCEL_COLORS.navy }, name: "Aptos", sz: 10 },
            };

            if (titleRows.includes(row)) {
                cell.s = {
                    alignment: { vertical: "center" },
                    fill: { fgColor: { rgb: ADVANCED_EXCEL_COLORS.navy }, patternType: "solid" },
                    font: { bold: true, color: { rgb: ADVANCED_EXCEL_COLORS.white }, name: "Aptos Display", sz: 16 },
                };
            } else if (sectionRows.includes(row)) {
                cell.s = {
                    alignment: { vertical: "center" },
                    fill: { fgColor: { rgb: "E9EFF7" }, patternType: "solid" },
                    font: { bold: true, color: { rgb: ADVANCED_EXCEL_COLORS.navy }, name: "Aptos", sz: 11 },
                };
            } else if (headerRows.includes(row)) {
                cell.s = {
                    alignment: { horizontal: column === 0 ? "left" : "center", vertical: "center" },
                    fill: { fgColor: { rgb: ADVANCED_EXCEL_COLORS.header }, patternType: "solid" },
                    font: { bold: true, color: { rgb: ADVANCED_EXCEL_COLORS.white }, name: "Aptos", sz: 10 },
                };
            } else if (row % 2 === 0) {
                cell.s.fill = { fgColor: { rgb: ADVANCED_EXCEL_COLORS.soft }, patternType: "solid" };
            }
        }
    }

    sheet["!rows"] = rows.map((_, index) => ({ hpt: titleRows.includes(index) ? 26 : headerRows.includes(index) ? 22 : 19 }));
}

function setExcelFormats(sheet, formats) {
    formats.forEach(({ column, format, row }) => {
        const cell = sheet[XLSX.utils.encode_cell({ c: column, r: row })];
        if (cell) cell.z = EXCEL_FORMATS[format] || format;
    });
}

function createAdvancedSummarySheet({ advancedData, generatedAt, houseLabel, periodReference, periodType }) {
    const rows = [
        ["ESTATÍSTICAS AVANÇADAS", "", "", "", ""],
        ["Casa", houseLabel || "-"],
        ["Período", periodType || "-"],
        ["Referência", getReferenceLabel(periodType, periodReference)],
        ["Gerado em", generatedAt],
    ];
    const merges = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }];
    const headerRows = [];
    const sectionRows = [];
    const formats = [];
    const addSection = (title, headers, dataRows) => {
        rows.push([]);
        const sectionRow = rows.length;
        rows.push([title, "", "", "", ""]);
        sectionRows.push(sectionRow);
        merges.push({ s: { r: sectionRow, c: 0 }, e: { r: sectionRow, c: 4 } });
        const headerRow = rows.length;
        rows.push(headers);
        headerRows.push(headerRow);
        dataRows.forEach(({ formats: rowFormats = [], values }) => {
            const row = rows.length;
            rows.push(values);
            rowFormats.forEach(({ column, format }) => formats.push({ column, format, row }));
        });
    };

    addSection(
        "SEQUÊNCIAS",
        ["Indicador", "Resultado", "", "", ""],
        (advancedData?.sequences || []).map((item) => ({
            formats: [{ column: 1, format: item.type }],
            values: [item.label, item.value ?? null, "", "", ""],
        }))
    );
    addSection(
        "MELHORES E PIORES RESULTADOS",
        ["Resultado", "Valor", "Casa", "Odd", "Data"],
        (advancedData?.results || []).map((item) => ({
            formats: [{ column: 1, format: "money" }, { column: 3, format: "odd" }],
            values: [item.label, item.value ?? null, item.house || "-", item.odd ?? null, item.date || "-"],
        }))
    );
    addSection(
        "CONSISTÊNCIA",
        ["Indicador", "Resultado", "Data", "", ""],
        (advancedData?.consistency || []).map((item) => ({
            formats: [{ column: 1, format: item.type }],
            values: [item.label, item.value ?? null, item.date || "-", "", ""],
        }))
    );
    addSection(
        "MÉTRICAS AVANÇADAS",
        ["Métrica", "Resultado", "Detalhe", "", ""],
        (advancedData?.metrics || []).map((item) => ({
            formats: [{ column: 1, format: item.type }],
            values: [item.label, item.value ?? null, item.detail || "", "", ""],
        }))
    );

    const sheet = XLSX.utils.aoa_to_sheet(rows);
    sheet["!merges"] = merges;
    sheet["!cols"] = [{ wch: 32 }, { wch: 20 }, { wch: 28 }, { wch: 15 }, { wch: 16 }];
    sheet["!freeze"] = { xSplit: 0, ySplit: 5, topLeftCell: "A6", activePane: "bottomLeft", state: "frozen" };
    applyAdvancedExcelStyles(sheet, rows, { headerRows, sectionRows });
    setExcelFormats(sheet, formats);
    return sheet;
}

function createAdvancedTableSheet({ formatsByColumn = {}, rows: dataRows, subtitle, title }) {
    const headers = Object.keys(dataRows[0] || {});
    const rows = [
        [title, ...Array(Math.max(0, headers.length - 1)).fill("")],
        [subtitle, ...Array(Math.max(0, headers.length - 1)).fill("")],
        [],
        headers,
        ...dataRows.map((row) => headers.map((header) => row[header])),
    ];
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    const lastColumn = Math.max(0, headers.length - 1);
    sheet["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: lastColumn } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: lastColumn } },
    ];
    sheet["!cols"] = autosizeColumns([headers, ...dataRows.map((row) => Object.values(row))]);
    sheet["!freeze"] = { xSplit: 0, ySplit: 4, topLeftCell: "A5", activePane: "bottomLeft", state: "frozen" };
    if (headers.length > 0 && dataRows.length > 0) {
        sheet["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 3, c: 0 }, e: { r: rows.length - 1, c: lastColumn } }) };
    }
    applyAdvancedExcelStyles(sheet, rows, { headerRows: [3] });
    dataRows.forEach((_, dataIndex) => {
        Object.entries(formatsByColumn).forEach(([column, format]) => {
            const cell = sheet[XLSX.utils.encode_cell({ r: dataIndex + 4, c: Number(column) })];
            if (cell) cell.z = EXCEL_FORMATS[format] || format;
        });
    });
    return sheet;
}

export function exportReportToExcel({
    advancedData,
    analysisMode = "overview",
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
    const isAdvanced = analysisMode === "advanced";

    if (isAdvanced) {
        XLSX.utils.book_append_sheet(
            workbook,
            createAdvancedSummarySheet({ advancedData, generatedAt, houseLabel, periodReference, periodType }),
            "Resumo Avançado"
        );

        const oddRangeRows = (advancedData?.oddRanges || []).map((range) => ({
            "Faixa de Odd": range.label,
            Apostas: Number(range.tickets || 0),
            Lucro: Number(range.profit || 0),
            ROI: Number(range.roi || 0) / 100,
            Acerto: Number(range.hitRate || 0) / 100,
        }));
        XLSX.utils.book_append_sheet(
            workbook,
            createAdvancedTableSheet({
                formatsByColumn: { 1: "count", 2: "money", 3: "percent", 4: "percent" },
                rows: oddRangeRows.length > 0
                    ? oddRangeRows
                    : [{ "Faixa de Odd": "Sem dados", Apostas: 0, Lucro: 0, ROI: 0, Acerto: 0 }],
                subtitle: "Faixas ordenadas do maior para o menor ROI.",
                title: "DESEMPENHO POR FAIXA DE ODD",
            }),
            "Faixas de Odd"
        );

        const houseRows = (advancedData?.houses || []).map((house) => ({
            Casa: house.house,
            Bilhetes: Number(house.tickets || 0),
            Lucro: Number(house.profit || 0),
            ROI: Number(house.roi || 0) / 100,
            Acerto: Number(house.hitRate || 0) / 100,
        }));
        XLSX.utils.book_append_sheet(
            workbook,
            createAdvancedTableSheet({
                formatsByColumn: { 1: "count", 2: "money", 3: "percent", 4: "percent" },
                rows: houseRows.length > 0
                    ? houseRows
                    : [{ Casa: "Sem dados", Bilhetes: 0, Lucro: 0, ROI: 0, Acerto: 0 }],
                subtitle: "Casas ordenadas do maior para o menor ROI.",
                title: "DESEMPENHO POR CASA",
            }),
            "Casas"
        );
    } else {
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
    }

    const ticketsRows = filteredTickets.map((ticket) => ({
        Data: ticket.data || "",
        Casa: getHouseNameById(houses, ticket.casaId),
        "Número do Bilhete": ticket.numeroBilhete || "",
        "Nome do Bilhete": ticket.nomeBilhete || "",
        Categoria: ticket.categoria || "",
        "Valor Apostado": Number(ticket.stake || 0),
        "Valor Real Apostado": Number(ticket.stakeReal || 0),
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
            "Valor Apostado",
            "Valor Real Apostado",
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
            "Valor Apostado": "",
            "Valor Real Apostado": "",
            Retorno: "",
            Resultado: "",
            Lucro: "",
            "Lucro Real": "",
            "Perda Real": "",
            Odd: "",
        }),
        ...ticketsRows.map((row) => Object.values(row)),
    ]);
    if (isAdvanced) {
        const ticketHeaders = [
            "Data", "Casa", "Número do Bilhete", "Nome do Bilhete", "Categoria",
            "Valor Apostado", "Valor Real Apostado", "Retorno", "Resultado",
            "Lucro", "Lucro Real", "Perda Real", "Odd",
        ];
        const ticketMatrix = [ticketHeaders, ...ticketsRows.map((row) => ticketHeaders.map((header) => row[header]))];
        ticketsSheet["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft", state: "frozen" };
        if (ticketsRows.length > 0) {
            ticketsSheet["!autofilter"] = { ref: `A1:M${ticketsRows.length + 1}` };
        }
        applyAdvancedExcelStyles(ticketsSheet, ticketMatrix, { headerRows: [0], titleRows: [] });
        ticketsRows.forEach((_, index) => {
            [5, 6, 7, 9, 10, 11].forEach((column) => {
                const cell = ticketsSheet[XLSX.utils.encode_cell({ r: index + 1, c: column })];
                if (cell) cell.z = EXCEL_FORMATS.money;
            });
            const oddCell = ticketsSheet[XLSX.utils.encode_cell({ r: index + 1, c: 12 })];
            if (oddCell) oddCell.z = EXCEL_FORMATS.odd;
        });
    }
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
    if (isAdvanced) {
        const movementHeaders = ["Data", "Casa", "Tipo", "Valor", "Observações"];
        const movementMatrix = [movementHeaders, ...movementsRows.map((row) => movementHeaders.map((header) => row[header]))];
        movementsSheet["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft", state: "frozen" };
        if (movementsRows.length > 0) {
            movementsSheet["!autofilter"] = { ref: `A1:E${movementsRows.length + 1}` };
        }
        applyAdvancedExcelStyles(movementsSheet, movementMatrix, { headerRows: [0], titleRows: [] });
        movementsRows.forEach((_, index) => {
            const cell = movementsSheet[XLSX.utils.encode_cell({ r: index + 1, c: 3 })];
            if (cell) cell.z = EXCEL_FORMATS.money;
        });
    }
    XLSX.utils.book_append_sheet(workbook, movementsSheet, "Movimentações");

    XLSX.writeFile(workbook, getReportFilename({ analysisMode, extension: "xlsx", houseLabel, periodReference, periodType }));
}

export async function exportReportToPdf({
    advancedData,
    analysisMode = "overview",
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
    doc.text(
        analysisMode === "advanced" ? "Relatório de Estatísticas Avançadas" : "Relatório de Desempenho",
        pageWidth / 2,
        39,
        { align: "center" }
    );

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

    let nextY;

    if (analysisMode === "advanced") {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        const intro = doc.splitTextToSize(
            "Análise detalhada de sequências, resultados, consistência, odds, valores e desempenho por casa.",
            pageWidth - 28
        );
        doc.text(intro, 14, headerY + 9);
        nextY = headerY + 9 + (intro.length * 4.5) + 6;

        nextY = addAdvancedPdfTable(doc, {
            body: (advancedData?.sequences || []).map((item) => [item.label, formatAdvancedValue(item)]),
            head: ["Indicador", "Resultado"],
            startY: nextY,
            title: "Sequências",
        });
        nextY = addAdvancedPdfTable(doc, {
            body: (advancedData?.results || []).map((item) => [
                item.label,
                formatMoney(item.value),
                item.house || "-",
                formatOdd(item.odd),
                formatDate(item.date),
            ]),
            head: ["Resultado", "Valor", "Casa", "Odd", "Data"],
            startY: nextY,
            title: "Melhores e piores resultados",
        });
        nextY = addAdvancedPdfTable(doc, {
            body: (advancedData?.consistency || []).map((item) => [
                item.label,
                formatAdvancedValue(item),
                item.date ? formatDate(item.date) : "-",
            ]),
            head: ["Indicador", "Resultado", "Data"],
            startY: nextY,
            title: "Consistência",
        });
        nextY = addAdvancedPdfTable(doc, {
            body: (advancedData?.metrics || []).map((item) => [
                item.label,
                formatAdvancedValue(item),
                item.detail || "-",
            ]),
            head: ["Métrica", "Resultado", "Detalhe"],
            startY: nextY,
            title: "Estatísticas avançadas",
        });
        nextY = addAdvancedPdfTable(doc, {
            body: (advancedData?.oddRanges || []).map((range) => [
                range.label,
                formatCount(range.tickets),
                formatMoney(range.profit),
                formatPercent(range.roi),
                formatPercent(range.hitRate),
            ]),
            head: ["Faixa de odd", "Apostas", "Lucro", "ROI", "Acerto"],
            startY: nextY,
            title: "Desempenho por faixa de odd",
        });
        addAdvancedPdfTable(doc, {
            body: (advancedData?.houses || []).map((house) => [
                house.house,
                formatCount(house.tickets),
                formatMoney(house.profit),
                formatPercent(house.roi),
                formatPercent(house.hitRate),
            ]),
            head: ["Casa", "Bilhetes", "Lucro", "ROI", "Acerto"],
            startY: nextY,
            title: "Desempenho por casa",
        });
    } else {
        nextY = addHighlights(
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
    }

    addFooter(doc, generatedAt);

    doc.save(getReportFilename({ analysisMode, extension: "pdf", houseLabel, periodReference, periodType }));
}
