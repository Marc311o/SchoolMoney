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
from reportlab.pdfgen.canvas import Canvas
from reportlab.platypus import LongTable, Paragraph, SimpleDocTemplate, Spacer

from app.modules.reports.schemas import FinancialReport, ReportRow

REPORT_TITLES = {
    "fundraiser": "Raport zbiórki",
    "child": "Raport dziecka",
    "class": "Raport klasy",
}
CONTRIBUTION_COLUMNS = ("Należne", "Wpłaty", "Zwroty", "Wpłaty po zwrotach")
ACCOUNT_COLUMNS = ("Wpłaty skarbnika", "Wypłaty skarbnika", "Saldo")
PDF_FONT = "DejaVuSans"
PDF_FONT_BOLD = "DejaVuSans-Bold"
PDF_FONT_LOCK = Lock()
INK = colors.HexColor("#18324A")
MUTED = colors.HexColor("#52697F")


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


def _report_table(
    report: FinancialReport, total_label: str
) -> tuple[tuple[str, ...], list[list[str]]]:
    label = "Dziecko" if report.scope == "fundraiser" else "Zbiórka"
    columns = (label, *CONTRIBUTION_COLUMNS)
    if report.scope == "class":
        columns += ACCOUNT_COLUMNS

    amount_count = len(columns) - 1
    rows = [[row.name, *_amounts(row)[:amount_count]] for row in report.rows]
    rows.append([total_label, *_amounts(report)[:amount_count]])
    return columns, rows


def _fundraiser_account_rows(report: FinancialReport) -> list[list[str]]:
    if report.scope != "fundraiser" or report.account is None:
        return []
    amounts = _amounts(report)[len(CONTRIBUTION_COLUMNS) :]
    return [[name, amount] for name, amount in zip(ACCOUNT_COLUMNS, amounts, strict=True)]


def _csv_name(name: str) -> str:
    # Prevent spreadsheet applications from interpreting names as formulas.
    if name.lstrip().startswith(("=", "+", "-", "@")) or name.startswith(("\t", "\r", "\n")):
        return "'" + name
    return name


def export_csv(report: FinancialReport) -> bytes:
    output = StringIO(newline="")
    writer = csv.writer(output)
    columns, rows = _report_table(report, f"Razem - {report.name}")
    writer.writerow((columns[0], *(f"{label} {report.currency}" for label in columns[1:])))
    for name, *amounts in rows:
        writer.writerow((_csv_name(name), *amounts))

    account_rows = _fundraiser_account_rows(report)
    if account_rows:
        padding = [""] * (len(columns) - 2)
        writer.writerow([""] * len(columns))
        writer.writerow(("Konto zbiórki", f"Kwota {report.currency}", *padding))
        for row in account_rows:
            writer.writerow((*row, *padding))

    return output.getvalue().encode("utf-8-sig")


def _pdf_amount(value: str, width: int, style: ParagraphStyle) -> Paragraph:
    value = value.replace(".", ",")
    available = width - 12
    text_width = pdfmetrics.stringWidth(value, style.fontName, style.fontSize)
    if text_width > available:
        style = ParagraphStyle(
            "ReportWideAmount", parent=style, fontSize=style.fontSize * available / text_width
        )
    return Paragraph(value, style)


def _pdf_table(
    columns: tuple[str, ...],
    rows: list[list[str]],
    widths: list[int],
    *,
    highlight_total: bool,
) -> LongTable:
    text = ParagraphStyle("ReportText", fontName=PDF_FONT, fontSize=9, leading=13, textColor=INK)
    amount = ParagraphStyle("ReportAmount", parent=text, alignment=TA_RIGHT)
    bold = ParagraphStyle("ReportBold", parent=text, fontName=PDF_FONT_BOLD)
    bold_amount = ParagraphStyle("ReportBoldAmount", parent=bold, alignment=TA_RIGHT)
    header = ParagraphStyle("ReportHeader", parent=bold, textColor=colors.white)
    header_amount = ParagraphStyle("ReportHeaderAmount", parent=header, alignment=TA_RIGHT)

    data = [
        [Paragraph(escape(columns[0]), header)]
        + [Paragraph(escape(label), header_amount) for label in columns[1:]]
    ]
    for index, (name, *amounts) in enumerate(rows):
        is_total = highlight_total and index == len(rows) - 1
        name_style = bold if is_total else text
        amount_style = bold_amount if is_total else amount
        data.append(
            [
                Paragraph(escape(name), name_style),
                *(
                    _pdf_amount(value, width, amount_style)
                    for value, width in zip(amounts, widths[1:], strict=True)
                ),
            ]
        )

    style = [
        ("BACKGROUND", (0, 0), (-1, 0), INK),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F4F7FA")]),
        ("LINEBELOW", (0, 1), (-1, -1), 0.3, colors.HexColor("#DCE5ED")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]
    if highlight_total:
        style.append(("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#E3EDF5")))
    return LongTable(data, colWidths=widths, repeatRows=1, hAlign="LEFT", style=style)


def _pdf_footer(canvas: Canvas, document: SimpleDocTemplate) -> None:
    canvas.saveState()
    canvas.setFont(PDF_FONT, 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(document.leftMargin + 6, 22, "SchoolMoney")
    canvas.drawRightString(
        document.pagesize[0] - document.rightMargin - 6, 22, f"Strona {document.page}"
    )
    canvas.restoreState()


def export_pdf(report: FinancialReport) -> bytes:
    with PDF_FONT_LOCK:
        if PDF_FONT_BOLD not in pdfmetrics.getRegisteredFontNames():
            font_dir = "/usr/share/fonts/truetype/dejavu"
            pdfmetrics.registerFont(TTFont(PDF_FONT, f"{font_dir}/{PDF_FONT}.ttf"))
            pdfmetrics.registerFont(TTFont(PDF_FONT_BOLD, f"{font_dir}/{PDF_FONT_BOLD}.ttf"))

    output = BytesIO()
    title = REPORT_TITLES[report.scope]
    is_class = report.scope == "class"
    document = SimpleDocTemplate(
        output,
        pagesize=landscape(A4) if is_class else A4,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36,
        title=f"{title} - SchoolMoney",
    )
    title_style = ParagraphStyle(
        "ReportTitle", fontName=PDF_FONT_BOLD, fontSize=23, leading=29, textColor=INK
    )
    name_style = ParagraphStyle(
        "ReportName", fontName=PDF_FONT, fontSize=12, leading=17, textColor=INK
    )
    note_style = ParagraphStyle(
        "ReportNote", fontName=PDF_FONT, fontSize=9, leading=13, textColor=MUTED
    )
    story = [
        Paragraph(title, title_style),
        Spacer(1, 4),
        Paragraph(escape(report.name), name_style),
        Paragraph(f"Kwoty w {report.currency}", note_style),
        Spacer(1, 16),
    ]

    account_rows = _fundraiser_account_rows(report)
    if account_rows:
        story.append(
            _pdf_table(("Konto zbiórki", "Kwota"), account_rows, [360, 144], highlight_total=False)
        )
        story.append(Spacer(1, 16))

    columns, rows = _report_table(report, "Razem")
    widths = [174, 74, 74, 74, 74, 102, 102, 74] if is_class else [208, 74, 74, 74, 74]
    story.append(_pdf_table(columns, rows, widths, highlight_total=True))
    document.build(story, onFirstPage=_pdf_footer, onLaterPages=_pdf_footer)
    return output.getvalue()
