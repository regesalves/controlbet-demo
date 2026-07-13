import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export const PDF_COLORS = {
    ink: [15, 31, 61],
    muted: [91, 105, 128],
    line: [219, 225, 234],
    soft: [244, 246, 249],
    stripe: [249, 250, 252],
    red: [232, 29, 52],
    green: [11, 158, 78],
};

export function createCorporatePdf({ orientation = "landscape" } = {}) {
    return new jsPDF({ orientation, unit: "mm", format: "a4", compress: true });
}

export function addCorporateHeader(doc, { brand = "ControlBet", logoDataUrl, title, generatedAt, metadata = [] }) {
    const pageWidth = doc.internal.pageSize.getWidth();
    const left = 12;
    const right = pageWidth - 12;

    doc.setFillColor(...PDF_COLORS.red);
    doc.rect(left, 12, 3, 18, "F");
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...PDF_COLORS.ink);
    if (logoDataUrl) {
        try {
            doc.addImage(logoDataUrl, "PNG", 20, 14.5, 41, 11.5, undefined, "FAST");
        } catch {
            doc.setFontSize(17);
            doc.text(brand, 20, 20);
        }
        doc.setFontSize(14);
        doc.text(title, 68, 22.8);
    } else {
        doc.setFontSize(17);
        doc.text(brand, 20, 20);
        doc.setFontSize(11);
        doc.text(title, 20, 27);
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.2);
    doc.setTextColor(...PDF_COLORS.muted);
    doc.text(`Gerado em ${generatedAt}`, right, 17.5, { align: "right" });

    const metadataText = metadata
        .filter((item) => item?.label)
        .map((item) => `${item.label}: ${item.value || "-"}`)
        .join("   |   ");
    const wrappedMetadata = doc.splitTextToSize(metadataText, pageWidth - 32);
    doc.text(wrappedMetadata, right, 24.5, { align: "right" });

    doc.setDrawColor(...PDF_COLORS.line);
    doc.setLineWidth(0.2);
    doc.line(left, 35, right, 35);
    return 41;
}

export function addMetricStrip(doc, { title, metrics, startY }) {
    const pageWidth = doc.internal.pageSize.getWidth();
    const left = 12;
    const right = 12;
    const gap = 2.5;
    const hasInlineTitle = Boolean(String(title || "").trim());
    const headingWidth = hasInlineTitle ? 31 : 0;
    const gapCount = Math.max(0, metrics.length - 1) + (hasInlineTitle ? 1 : 0);
    const metricWidth = (pageWidth - left - right - headingWidth - (gap * gapCount)) / metrics.length;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...PDF_COLORS.ink);
    doc.text(title.toUpperCase(), left, startY + 9);

    metrics.forEach((metric, index) => {
        const x = left + headingWidth + (hasInlineTitle ? gap : 0) + (index * (metricWidth + gap));
        doc.setFillColor(...PDF_COLORS.soft);
        doc.setDrawColor(...PDF_COLORS.line);
        doc.setLineWidth(0.12);
        doc.roundedRect(x, startY, metricWidth, 16, 1.8, 1.8, "FD");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.1);
        doc.setTextColor(...PDF_COLORS.muted);
        doc.text(metric.label, x + 3, startY + 5);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10.5);
        doc.setTextColor(...(metric.color || PDF_COLORS.ink));
        doc.text(String(metric.value ?? "-"), x + 3, startY + 12.5);
    });

    return startY + 21;
}

export function addCorporateTable(doc, { columns, rows, startY }) {
    autoTable(doc, {
        startY,
        head: [columns.map((column) => column.label)],
        body: rows.map((row) => columns.map((column) => row[column.key] ?? "-")),
        margin: { top: 14, right: 12, bottom: 20, left: 12 },
        theme: "grid",
        showHead: "everyPage",
        rowPageBreak: "avoid",
        pageBreak: "auto",
        styles: {
            font: "helvetica",
            fontSize: 6.7,
            cellPadding: 2.55,
            lineColor: PDF_COLORS.line,
            lineWidth: 0.12,
            textColor: PDF_COLORS.ink,
            valign: "middle",
            overflow: "linebreak",
        },
        headStyles: {
            fillColor: [232, 236, 242],
            textColor: PDF_COLORS.ink,
            fontStyle: "bold",
            lineColor: PDF_COLORS.line,
            minCellHeight: 9,
        },
        alternateRowStyles: { fillColor: PDF_COLORS.stripe },
        columnStyles: Object.fromEntries(columns.map((column, index) => [index, {
            cellWidth: column.width || "auto",
            halign: column.align || "left",
        }])),
        didParseCell: (data) => {
            if (data.section !== "body") return;
            const column = columns[data.column.index];
            const badge = column?.badges?.[String(data.cell.raw || "")];
            if (!badge) return;
            data.cell._corporateBadge = { ...badge, label: String(data.cell.raw) };
            data.cell.text = [];
        },
        didDrawCell: (data) => {
            const badge = data.cell?._corporateBadge;
            if (!badge) return;
            const label = badge.label;
            doc.setFont("helvetica", "bold");
            doc.setFontSize(6.3);
            const badgeWidth = Math.min(data.cell.width - 3, doc.getTextWidth(label) + 6);
            const badgeHeight = 5.5;
            const x = data.cell.x + ((data.cell.width - badgeWidth) / 2);
            const y = data.cell.y + ((data.cell.height - badgeHeight) / 2);
            doc.setFillColor(...badge.fill);
            doc.roundedRect(x, y, badgeWidth, badgeHeight, 1.6, 1.6, "F");
            doc.setTextColor(...badge.text);
            doc.text(label, data.cell.x + (data.cell.width / 2), y + 3.8, { align: "center" });
        },
    });

    return doc.lastAutoTable.finalY;
}

export function addFinalSummary(doc, { title, metrics, startY }) {
    const pageHeight = doc.internal.pageSize.getHeight();
    const requiredHeight = 27;
    let y = startY + 7;
    if (y + requiredHeight > pageHeight - 20) {
        doc.addPage();
        y = 17;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...PDF_COLORS.ink);
    doc.text(title.toUpperCase(), 12, y);
    return addMetricStrip(doc, { title: "", metrics, startY: y + 4 });
}

export function addCorporateFooters(doc, { brand = "ControlBet", generatedAt }) {
    const pageCount = doc.internal.getNumberOfPages();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    for (let page = 1; page <= pageCount; page += 1) {
        doc.setPage(page);
        doc.setDrawColor(...PDF_COLORS.line);
        doc.line(12, pageHeight - 14, pageWidth - 12, pageHeight - 14);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(...PDF_COLORS.muted);
        doc.setFont("helvetica", "bold");
        doc.text(brand, 12, pageHeight - 8);
        doc.setFont("helvetica", "normal");
        doc.text("Relatório gerado automaticamente pelo ControlBet.", 28, pageHeight - 8);
        doc.text(generatedAt, pageWidth / 2, pageHeight - 8, { align: "center" });
        doc.text(`Página ${page} de ${pageCount}`, pageWidth - 12, pageHeight - 8, { align: "right" });
    }
}
