import ExcelJS from "exceljs";
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

function movementImpact(movement) {
    const signal = movement.tipo === "Saque" ? -1 : 1;
    return Number(movement.valor || 0) * signal;
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
    return periodType === "Anual" ? String(reference) : dateLabel(reference);
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

function summarize(movements) {
    return movements.reduce((summary, movement) => {
        const impact = movementImpact(movement);
        if (impact >= 0) {
            summary.entries += Number(movement.valor || 0);
            summary.entryCount += 1;
        } else {
            summary.exits += Number(movement.valor || 0);
            summary.exitCount += 1;
        }
        summary.balance += impact;
        return summary;
    }, { entries: 0, exits: 0, balance: 0, entryCount: 0, exitCount: 0 });
}

export async function exportMovementsToPdf({ movements = [], houses = [], filters = {} }) {
    const generatedAt = new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
    const houseMap = new Map(houses.map((house) => [Number(house.id), house.nome]));
    const totals = summarize(movements);
    const logoDataUrl = await loadImageDataUrl(controlBetLogoUrl);
    const doc = createCorporatePdf({ orientation: "landscape" });
    let y = addCorporateHeader(doc, {
        logoDataUrl,
        title: "Extrato de Movimentações",
        generatedAt,
        metadata: [
            { label: "Casa selecionada", value: filters.houseLabel || "Todas as casas" },
            { label: "Tipo", value: filters.typeLabel || "Todos os tipos" },
            { label: "Período", value: filters.periodType || "Geral" },
            { label: "Referência", value: referenceLabel(filters.periodType, filters.reference) },
        ],
    });

    y = addMetricStrip(doc, {
        title: "",
        startY: y + 4,
        metrics: [
            { label: "Movimentações", value: movements.length },
            { label: "Total de entradas", value: money(totals.entries), color: PDF_COLORS.green },
            { label: "Total de saídas", value: money(totals.exits), color: PDF_COLORS.red },
            { label: "Saldo líquido", value: signedMoney(totals.balance), color: totals.balance < 0 ? PDF_COLORS.red : PDF_COLORS.green },
        ],
    });

    const rows = movements.map((movement) => ({
        date: dateLabel(movement.data),
        type: movement.tipo || "-",
        house: houseMap.get(Number(movement.casaId)) || "Casa não identificada",
        method: movement.metodo || "PIX",
        value: signedMoney(movementImpact(movement)),
        balance: money(movement.balanceAfter || 0),
        notes: movement.observacoes || "-",
    }));
    y = addCorporateTable(doc, {
        startY: y,
        columns: [
            { key: "date", label: "Data", width: 22 },
            { key: "type", label: "Tipo", width: 25, badges: {
                Depósito: { fill: [229, 247, 237], text: [7, 112, 58] },
                Saque: { fill: [254, 235, 238], text: [176, 24, 43] },
                Ajuste: { fill: [231, 241, 255], text: [28, 88, 160] },
            } },
            { key: "house", label: "Casa", width: 38 },
            { key: "method", label: "Método", width: 28 },
            { key: "value", label: "Valor", width: 32, align: "right" },
            { key: "balance", label: "Saldo após", width: 34, align: "right" },
            { key: "notes", label: "Descrição" },
        ],
        rows,
    });
    addFinalSummary(doc, {
        title: "Resumo final",
        startY: y,
        metrics: [
            { label: "Entradas", value: `${totals.entryCount} • ${money(totals.entries)}`, color: PDF_COLORS.green },
            { label: "Saídas", value: `${totals.exitCount} • ${money(totals.exits)}`, color: PDF_COLORS.red },
            { label: "Saldo líquido", value: signedMoney(totals.balance), color: totals.balance < 0 ? PDF_COLORS.red : PDF_COLORS.green },
        ],
    });
    addCorporateFooters(doc, { generatedAt });
    doc.save(`ControlBet_Movimentacoes_${safeFilenameToken(filters.periodType)}_${safeFilenameToken(referenceLabel(filters.periodType, filters.reference))}.pdf`);
}

function toLocalDate(isoDate) {
    const [year, month, day] = String(isoDate || "").split("-").map(Number);
    return year && month && day ? new Date(year, month - 1, day, 12, 0, 0) : null;
}

function applyCellBorder(cell) {
    const border = { style: "thin", color: { argb: "FFDDE3EC" } };
    cell.border = { top: border, left: border, bottom: border, right: border };
}

export async function exportMovementsToExcel({ movements = [], houses = [], filters = {} }) {
    const generatedAt = new Date();
    const houseMap = new Map(houses.map((house) => [Number(house.id), house.nome]));
    const totals = summarize(movements);
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "ControlBet";
    workbook.created = generatedAt;
    const worksheet = workbook.addWorksheet("Movimentações", {
        properties: { defaultRowHeight: 20 },
        pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    });

    worksheet.mergeCells("A1:G1");
    worksheet.getCell("A1").value = "ControlBet — Extrato de Movimentações";
    worksheet.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE81D34" } };
    worksheet.getCell("A1").font = { name: "Aptos Display", size: 17, bold: true, color: { argb: "FFFFFFFF" } };
    worksheet.getCell("A1").alignment = { vertical: "middle", horizontal: "left" };
    worksheet.getRow(1).height = 28;

    const metadata = [
        ["Casa selecionada", filters.houseLabel || "Todas as casas"],
        ["Tipo", filters.typeLabel || "Todos os tipos"],
        ["Período", filters.periodType || "Geral"],
        ["Referência", referenceLabel(filters.periodType, filters.reference)],
    ];
    metadata.forEach(([label, value], index) => {
        const row = 3 + index;
        worksheet.getCell(row, 1).value = label;
        worksheet.getCell(row, 1).font = { name: "Aptos", size: 9, bold: true, color: { argb: "FF667085" } };
        worksheet.mergeCells(row, 2, row, 4);
        worksheet.getCell(row, 2).value = value;
        worksheet.getCell(row, 2).font = { name: "Aptos", size: 10, color: { argb: "FF0F1F3D" } };
    });

    const summaryRow = 8;
    const summaryValues = [
        ["Movimentações", movements.length],
        ["Entradas", totals.entries],
        ["Saídas", totals.exits],
        ["Saldo líquido", totals.balance],
    ];
    summaryValues.forEach(([label, value], index) => {
        const column = 1 + (index * 2);
        worksheet.getCell(summaryRow, column).value = label;
        worksheet.getCell(summaryRow + 1, column).value = value;
        worksheet.getCell(summaryRow, column).font = { name: "Aptos", size: 8.5, color: { argb: "FF667085" } };
        worksheet.getCell(summaryRow + 1, column).font = { name: "Aptos", size: 11, bold: true, color: { argb: index === 2 ? "FFE81D34" : index > 0 ? "FF079447" : "FF0F1F3D" } };
        if (index > 0) worksheet.getCell(summaryRow + 1, column).numFmt = 'R$ #,##0.00;[Red]-R$ #,##0.00';
    });

    const headerRow = 12;
    const headers = ["Data", "Tipo", "Casa", "Método", "Valor", "Saldo após", "Descrição"];
    headers.forEach((header, index) => {
        const cell = worksheet.getCell(headerRow, index + 1);
        cell.value = header;
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F1F3D" } };
        cell.font = { name: "Aptos", size: 9, bold: true, color: { argb: "FFFFFFFF" } };
        cell.alignment = { vertical: "middle", horizontal: index >= 4 && index <= 5 ? "right" : "left" };
        applyCellBorder(cell);
    });

    movements.forEach((movement, index) => {
        const row = worksheet.addRow([
            toLocalDate(movement.data),
            movement.tipo || "-",
            houseMap.get(Number(movement.casaId)) || "Casa não identificada",
            movement.metodo || "PIX",
            movementImpact(movement),
            Number(movement.balanceAfter || 0),
            movement.observacoes || "-",
        ]);
        row.height = 24;
        row.eachCell((cell) => {
            cell.font = { name: "Aptos", size: 10, color: { argb: "FF0F1F3D" } };
            cell.alignment = { vertical: "middle", wrapText: true };
            if (index % 2 === 1) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFAFBFC" } };
            applyCellBorder(cell);
        });
        row.getCell(1).numFmt = "dd/mm/yyyy";
        row.getCell(5).numFmt = 'R$ #,##0.00;[Red]-R$ #,##0.00';
        row.getCell(6).numFmt = 'R$ #,##0.00;[Red]-R$ #,##0.00';
        row.getCell(5).alignment = { vertical: "middle", horizontal: "right" };
        row.getCell(6).alignment = { vertical: "middle", horizontal: "right" };
    });

    worksheet.autoFilter = { from: { row: headerRow, column: 1 }, to: { row: headerRow, column: headers.length } };
    worksheet.views = [{ state: "frozen", ySplit: headerRow }];
    [13, 16, 22, 16, 18, 18, 38].forEach((width, index) => { worksheet.getColumn(index + 1).width = width; });
    worksheet.pageSetup.printTitlesRow = `${headerRow}:${headerRow}`;

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `ControlBet_Movimentacoes_${safeFilenameToken(filters.periodType)}_${safeFilenameToken(referenceLabel(filters.periodType, filters.reference))}.xlsx`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
}
