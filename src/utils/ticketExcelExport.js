import ExcelJS from "exceljs";

const COLORS = {
    red: "FFE81D34",
    dark: "FF0F1F3D",
    muted: "FF667085",
    green: "FF079447",
    lightGreen: "FFEAF8F0",
    lightRed: "FFFFEEF1",
    lightYellow: "FFFFF6D8",
    darkYellow: "FF8A5A08",
    lightBlue: "FFE8F2FF",
    darkBlue: "FF1D5A9E",
    lightGray: "FFF3F5F8",
    border: "FFDDE3EC",
    white: "FFFFFFFF",
};

const moneyFormat = 'R$ #,##0.00;[Red]-R$ #,##0.00';

function getGeneratedAt() {
    return new Date();
}

function formatReference(periodType, reference) {
    if (periodType === "Geral" || !reference) return "Geral";
    if (periodType === "Mensal") {
        const [year, month] = String(reference).split("-");
        return month && year ? `${month}/${year}` : reference;
    }
    if (periodType === "Anual") return String(reference);
    const [year, month, day] = String(reference).split("-");
    return year && month && day ? `${day}/${month}/${year}` : String(reference);
}

function toLocalDate(isoDate) {
    const [year, month, day] = String(isoDate || "").split("-").map(Number);
    return year && month && day ? new Date(year, month - 1, day, 12, 0, 0) : null;
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

function applyBorder(cell) {
    cell.border = {
        top: { style: "thin", color: { argb: COLORS.border } },
        left: { style: "thin", color: { argb: COLORS.border } },
        bottom: { style: "thin", color: { argb: COLORS.border } },
        right: { style: "thin", color: { argb: COLORS.border } },
    };
}

function mergeMetric(worksheet, startColumn, endColumn, label, value, valueColor = COLORS.dark, labelRow = 8, valueRow = 9) {
    worksheet.mergeCells(labelRow, startColumn, labelRow, endColumn);
    worksheet.mergeCells(valueRow, startColumn, valueRow, endColumn);
    const labelCell = worksheet.getCell(labelRow, startColumn);
    const valueCell = worksheet.getCell(valueRow, startColumn);
    labelCell.value = label;
    valueCell.value = value;
    labelCell.font = { name: "Aptos", size: 8.5, color: { argb: COLORS.muted } };
    valueCell.font = { name: "Aptos", size: 12, bold: true, color: { argb: valueColor } };
    [labelCell, valueCell].forEach((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.lightGray } };
        cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
        applyBorder(cell);
    });
}

export async function buildTicketsWorkbook({ tickets = [], houses = [], filters = {}, generatedAt = getGeneratedAt() }) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "ControlBet";
    workbook.created = generatedAt;
    workbook.modified = generatedAt;
    const worksheet = workbook.addWorksheet("Bilhetes", {
        properties: { defaultRowHeight: 20 },
        pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    });
    const houseMap = new Map(houses.map((house) => [Number(house.id), house.nome]));
    const totalStake = tickets.reduce((total, ticket) => total + Number(ticket.stakeReal ?? ticket.stake ?? 0), 0);
    const totalReturn = tickets.reduce((total, ticket) => total + Number(ticket.retorno || 0), 0);
    const netResult = tickets.reduce((total, ticket) => total + ticketNetResult(ticket), 0);
    const roi = totalStake > 0 ? netResult / totalStake : 0;

    worksheet.mergeCells("A1:I1");
    worksheet.getCell("A1").value = "ControlBet";
    worksheet.mergeCells("A2:I2");
    worksheet.getCell("A2").value = "Relatório de Bilhetes";
    ["A1", "A2"].forEach((address, index) => {
        const cell = worksheet.getCell(address);
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.red } };
        cell.font = { name: "Aptos Display", size: index === 0 ? 18 : 13, bold: true, color: { argb: COLORS.white } };
        cell.alignment = { vertical: "middle", horizontal: "left" };
    });
    worksheet.getRow(1).height = 24;
    worksheet.getRow(2).height = 20;

    const metadata = [
        ["Casa selecionada", filters.houseLabel || "Todas as casas"],
        ["Período", filters.periodType || "Geral"],
        ["Referência", formatReference(filters.periodType, filters.reference)],
        ["Data da exportação", generatedAt],
    ];
    metadata.forEach(([label, value], index) => {
        const row = 4 + Math.floor(index / 2);
        const labelColumn = index % 2 === 0 ? 1 : 5;
        const labelEndColumn = labelColumn + 1;
        const valueStartColumn = index % 2 === 0 ? 3 : 7;
        const valueEndColumn = index % 2 === 0 ? 4 : 9;
        worksheet.mergeCells(row, labelColumn, row, labelEndColumn);
        worksheet.getCell(row, labelColumn).value = `${label}:`;
        worksheet.getCell(row, labelColumn).font = { name: "Aptos", bold: true, color: { argb: COLORS.muted } };
        worksheet.getCell(row, labelColumn).alignment = { vertical: "middle", horizontal: "left" };
        worksheet.mergeCells(row, valueStartColumn, row, valueEndColumn);
        worksheet.getCell(row, valueStartColumn).value = value;
        worksheet.getCell(row, valueStartColumn).font = { name: "Aptos", color: { argb: COLORS.dark } };
        worksheet.getCell(row, valueStartColumn).alignment = { vertical: "middle", horizontal: "left" };
        if (value instanceof Date) worksheet.getCell(row, valueStartColumn).numFmt = "dd/mm/yyyy hh:mm";
    });
    worksheet.getRow(4).height = 20;
    worksheet.getRow(5).height = 20;

    worksheet.mergeCells("A7:I7");
    worksheet.getCell("A7").value = "RESUMO DO PERÍODO";
    worksheet.getCell("A7").font = { name: "Aptos", size: 10.5, bold: true, color: { argb: COLORS.dark } };
    mergeMetric(worksheet, 1, 2, "Total de bilhetes", tickets.length);
    mergeMetric(worksheet, 3, 4, "Valor apostado", totalStake);
    mergeMetric(worksheet, 5, 6, "Retorno", totalReturn, totalReturn < 0 ? COLORS.red : totalReturn > 0 ? COLORS.green : COLORS.dark);
    mergeMetric(worksheet, 7, 8, "Resultado líquido", netResult, netResult < 0 ? COLORS.red : netResult > 0 ? COLORS.green : COLORS.dark);
    mergeMetric(worksheet, 9, 9, "ROI", roi, roi < 0 ? COLORS.red : roi > 0 ? COLORS.green : COLORS.dark);
    [worksheet.getCell("C9"), worksheet.getCell("E9"), worksheet.getCell("G9")].forEach((cell) => { cell.numFmt = moneyFormat; });
    worksheet.getCell("I9").numFmt = "0.00%";
    worksheet.getRow(8).height = 22;
    worksheet.getRow(9).height = 27;

    const tableHeaderRow = 13;
    worksheet.mergeCells("A11:I11");
    worksheet.getCell("A11").value = "Tabela de Bilhetes";
    worksheet.getCell("A11").font = { name: "Aptos Display", size: 12, bold: true, color: { argb: COLORS.dark } };
    worksheet.getCell("A11").alignment = { vertical: "middle", horizontal: "left" };
    worksheet.getRow(11).height = 22;
    const headers = ["Data", "Casa", "Categoria", "Odd", "Valor Apostado", "Retorno Esperado", "Origem", "Resultado", "Observação"];
    worksheet.getRow(tableHeaderRow).values = headers;
    worksheet.getRow(tableHeaderRow).height = 26;
    worksheet.getRow(tableHeaderRow).eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.red } };
        cell.font = { name: "Aptos", bold: true, color: { argb: COLORS.white } };
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        applyBorder(cell);
    });

    tickets.forEach((ticket, index) => {
        const row = worksheet.getRow(tableHeaderRow + index + 1);
        row.values = [
            toLocalDate(ticket.data),
            houseMap.get(Number(ticket.casaId)) || "Casa não identificada",
            ticket.categoria || "-",
            Number(ticket.odd || 0),
            Number(ticket.stakeReal ?? ticket.stake ?? 0),
            Number(ticket.retorno || 0),
            ticket.origemStake || "Saldo",
            ticketStatus(ticket),
            ticket.observacoes || "-",
        ];
        row.height = 24;
        row.eachCell((cell) => {
            cell.font = { name: "Aptos", size: 10, color: { argb: COLORS.dark } };
            cell.alignment = { vertical: "middle", wrapText: true };
            if (index % 2 === 1) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFAFBFC" } };
            applyBorder(cell);
        });
        row.getCell(1).numFmt = "dd/mm/yyyy";
        row.getCell(1).alignment = { vertical: "middle", horizontal: "center" };
        row.getCell(4).numFmt = "0.00";
        row.getCell(4).alignment = { vertical: "middle", horizontal: "center" };
        row.getCell(5).numFmt = moneyFormat;
        row.getCell(5).alignment = { vertical: "middle", horizontal: "right" };
        row.getCell(6).numFmt = moneyFormat;
        row.getCell(6).alignment = { vertical: "middle", horizontal: "right" };
        row.getCell(8).alignment = { vertical: "middle", horizontal: "center" };
        const statusStyles = {
            Ganho: { fill: COLORS.lightGreen, text: COLORS.green },
            Perda: { fill: COLORS.lightRed, text: COLORS.red },
            Pendente: { fill: COLORS.lightYellow, text: COLORS.darkYellow },
            Encerrado: { fill: COLORS.lightBlue, text: COLORS.darkBlue },
        };
        const statusStyle = statusStyles[row.getCell(8).value];
        if (statusStyle) {
            row.getCell(8).fill = { type: "pattern", pattern: "solid", fgColor: { argb: statusStyle.fill } };
            row.getCell(8).font = { name: "Aptos", size: 10, bold: true, color: { argb: statusStyle.text } };
        }
    });

    worksheet.autoFilter = { from: { row: tableHeaderRow, column: 1 }, to: { row: tableHeaderRow, column: headers.length } };
    worksheet.views = [{ state: "frozen", ySplit: tableHeaderRow, activeCell: `A${tableHeaderRow + 1}` }];
    const columnWidths = [12, 18, 18, 12, 15, 15, 14, 16, 30];
    worksheet.columns.forEach((column, index) => { column.width = columnWidths[index]; });

    const footerRow = tableHeaderRow + tickets.length + 2;
    worksheet.mergeCells(footerRow, 1, footerRow, 9);
    worksheet.getCell(footerRow, 1).value = "Relatório gerado automaticamente pelo ControlBet.";
    worksheet.getCell(footerRow, 1).font = { name: "Aptos", size: 8.5, italic: true, color: { argb: COLORS.muted } };
    worksheet.getCell(footerRow, 1).alignment = { horizontal: "left", vertical: "middle" };
    worksheet.getRow(footerRow).height = 20;

    worksheet.pageSetup.printTitlesRow = `${tableHeaderRow}:${tableHeaderRow}`;
    worksheet.pageSetup.margins = { left: 0.3, right: 0.3, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 };
    return workbook;
}

function exportFilename(date = new Date()) {
    const pad = (value) => String(value).padStart(2, "0");
    return `Bilhetes_${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}.xlsx`;
}

export async function exportTicketsToExcel(options) {
    const generatedAt = getGeneratedAt();
    const workbook = await buildTicketsWorkbook({ ...options, generatedAt });
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = exportFilename(generatedAt);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
}
