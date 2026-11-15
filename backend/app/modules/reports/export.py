import csv
from io import BytesIO, StringIO
from threading import Lock
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_RIGHT
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import LongTable, Paragraph, SimpleDocTemplate, Spacer

from app.modules.reports.schemas import FinancialReport, ReportRow

PDF_FONT = "DejaVuSans"
PDF_FONT_BOLD = "DejaVuSans-Bold"
PDF_FONT_LOCK = Lock()


def _amounts(row: ReportRow) -> list[str]:
    contributions = row.contributions
    account = row.account
    values = (
        contributions.expected_total,
        contributions.paid_total,
        contributions.refunded_total,
        contributions.net_paid_total,
        account.treasurer_deposited_total if account else None,
        account.treasurer_withdrawn_total if account else None,
        account.current_balance if account else None,
    )
    return [f"{value:.2f}" if value is not None else "" for value in values]


def export_csv(report: FinancialReport) -> bytes:
    output = StringIO(newline="")
    writer = csv.writer(output)
    writer.writerow(
        (
            "row_type",
            "scope",
            "id",
            "name",
            "currency",
            "expected_total",
            "paid_total",
            "refunded_total",
            "net_paid_total",
            "treasurer_deposited_total",
            "treasurer_withdrawn_total",
            "current_balance",
        )
    )
    for index, row in enumerate([report, *report.rows]):
        name = row.name
        # Prevent spreadsheet applications from interpreting names as formulas.
        if name.lstrip().startswith(("=", "+", "-", "@")) or name.startswith(("\t", "\r", "\n")):
            name = "'" + name
        writer.writerow(
            (
                "summary" if index == 0 else "detail",
                report.scope,
                row.id,
                name,
                report.currency,
                *_amounts(row),
            )
        )
    return output.getvalue().encode("utf-8-sig")


def _pdf_amounts(row: ReportRow, widths: list[int], style: ParagraphStyle) -> list[Paragraph]:
    cells = []
    for value, width in zip(_amounts(row)[: len(widths)], widths, strict=True):
        available = width - 12  # Default cell padding is six points on each side.
        text_width = pdfmetrics.stringWidth(value, style.fontName, style.fontSize)
        cell_style = style
        if text_width > available:
            cell_style = ParagraphStyle(
                "ReportWideAmount", parent=style, fontSize=style.fontSize * available / text_width
            )
        cells.append(Paragraph(value, cell_style))
    return cells


def export_pdf(report: FinancialReport) -> bytes:
    with PDF_FONT_LOCK:
        if PDF_FONT_BOLD not in pdfmetrics.getRegisteredFontNames():
            font_dir = "/usr/share/fonts/truetype/dejavu"
            pdfmetrics.registerFont(TTFont(PDF_FONT, f"{font_dir}/{PDF_FONT}.ttf"))
            pdfmetrics.registerFont(TTFont(PDF_FONT_BOLD, f"{font_dir}/{PDF_FONT_BOLD}.ttf"))

    output = BytesIO()
    title = f"SchoolMoney - {report.scope.capitalize()} report"
    document = SimpleDocTemplate(
        output,
        pagesize=landscape(A4),
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36,
        title=title,
    )
    text_style = ParagraphStyle("ReportText", fontName=PDF_FONT, fontSize=9, leading=13)
    amount_style = ParagraphStyle("ReportAmount", parent=text_style, alignment=TA_RIGHT)
    total_style = ParagraphStyle("ReportTotal", parent=amount_style, fontName=PDF_FONT_BOLD)
    title_style = ParagraphStyle(
        "ReportTitle",
        parent=text_style,
        fontName=PDF_FONT_BOLD,
        fontSize=22,
        leading=28,
        textColor=colors.HexColor("#18324A"),
    )
    columns = [
        "Child" if report.scope == "fundraiser" else "Fundraiser",
        "Expected",
        "Paid",
        "Refunded",
        "Net paid",
        "Deposits",
        "Withdrawals",
        "Balance",
    ]
    widths = [160, 84, 84, 84, 84, 84, 84, 84]
    if report.scope == "child":
        columns, widths = columns[:5], [300, 110, 110, 110, 110]

    amount_widths = widths[1:]
    table_data = [columns, ["Total", *_pdf_amounts(report, amount_widths, total_style)]]
    for row in report.rows:
        table_data.append(
            [
                Paragraph(escape(row.name), text_style),
                *_pdf_amounts(row, amount_widths, amount_style),
            ]
        )
    table = LongTable(
        table_data,
        colWidths=widths,
        repeatRows=1,
        hAlign="LEFT",
        style=[
            ("FONTNAME", (0, 0), (-1, -1), PDF_FONT),
            ("FONTNAME", (0, 0), (-1, 1), PDF_FONT_BOLD),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#18324A")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("BACKGROUND", (0, 1), (-1, 1), colors.HexColor("#E8F1F6")),
            ("LINEBELOW", (0, 1), (-1, -1), 0.35, colors.HexColor("#D4DEE6")),
            ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 7),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ],
    )
    document.build(
        [
            Paragraph(title, title_style),
            Spacer(1, 6),
            Paragraph(escape(report.name), text_style),
            Paragraph(f"Amounts in {report.currency}", text_style),
            Spacer(1, 14),
            table,
        ]
    )
    return output.getvalue()
