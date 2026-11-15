from codecs import BOM_UTF8
from csv import reader
from io import StringIO

import pytest
from reportlab.pdfgen.canvas import Canvas
from reportlab.platypus import Paragraph

from tests.fundraisers.helpers import (
    create_school_setup,
    create_test_fundraiser,
    pay_for_child_helper,
    refund_payment_helper,
    top_up_wallet,
)

REPORTS_URL = "/api/reports"
FUNDRAISER_NAME = "=Łódź, zoo & <park>"


@pytest.fixture
def export_setup(client, db, auth_headers):
    school = create_school_setup(db, auth_headers)
    school.payload.update(name=FUNDRAISER_NAME, required_amount_per_child="50.25")
    fundraiser_id = create_test_fundraiser(client, school)
    return school, fundraiser_id


def _export_targets(school, fundraiser_id):
    return (
        ("fundraiser", fundraiser_id, school.headers["parent"]),
        ("child", school.own_child_id, school.headers["parent"]),
        ("class", school.class_id, school.headers["treasurer"]),
    )


def _download(client, scope, subject_id, headers, file_format, lang):
    params = {"format": file_format}
    if lang is not None:
        params["lang"] = lang

    response = client.get(
        f"{REPORTS_URL}/{scope}/{subject_id}/export", headers=headers, params=params
    )
    assert response.status_code == 200, response.text
    assert response.headers["content-disposition"] == (
        f'attachment; filename="{scope}-{subject_id}.{file_format}"'
    )
    assert response.headers["content-language"] == (lang or "pl")
    assert response.headers["cache-control"] == "no-store"
    return response


@pytest.fixture
def drawn_pdf_text(monkeypatch):
    texts = []
    original_draw = Paragraph.draw
    original_draw_right = Canvas.drawRightString

    def draw_paragraph(paragraph):
        original_draw(paragraph)
        texts.append(paragraph.getPlainText())

    def draw_right(canvas, x, y, value, *args, **kwargs):
        original_draw_right(canvas, x, y, value, *args, **kwargs)
        texts.append(value)

    monkeypatch.setattr(Paragraph, "draw", draw_paragraph)
    monkeypatch.setattr(Canvas, "drawRightString", draw_right)
    return texts


@pytest.mark.parametrize("lang", [None, "en"], ids=["pl-default", "en"])
def test_csv_exports_translated_rows_and_financial_totals(client, export_setup, lang):
    school, fundraiser_id = export_setup
    parent = school.headers["parent"]
    treasurer = school.headers["treasurer"]
    top_up_wallet(client, parent)

    payment = pay_for_child_helper(client, fundraiser_id, school.own_child_id, parent)
    refund_payment_helper(client, fundraiser_id, payment["id"], parent)
    pay_for_child_helper(client, fundraiser_id, school.own_child_id, parent)

    for operation, amount in (("withdrawals", "20.00"), ("deposits", "5.00")):
        response = client.post(
            f"/api/fundraisers/{fundraiser_id}/{operation}",
            headers=treasurer,
            json={"amount": amount},
        )
        assert response.status_code == 201, response.text

    if lang == "en":
        child, fundraiser, total = "Child", "Fundraiser", "Total"
        contribution_columns = [
            "Amount due PLN",
            "Payments PLN",
            "Refunds PLN",
            "Paid after refunds PLN",
        ]
        account_columns = ["Treasurer deposits", "Treasurer withdrawals", "Balance"]
        account_heading = ["Fundraiser account", "Amount PLN"]
    else:
        child, fundraiser, total = "Dziecko", "Zbiórka", "Razem"
        contribution_columns = [
            "Należne PLN",
            "Wpłaty PLN",
            "Zwroty PLN",
            "Wpłaty po zwrotach PLN",
        ]
        account_columns = ["Wpłaty skarbnika", "Wypłaty skarbnika", "Saldo"]
        account_heading = ["Konto zbiórki", "Kwota PLN"]

    escaped_name = f"'{FUNDRAISER_NAME}"
    fundraiser_amounts = ["100.50", "100.50", "50.25", "50.25"]
    child_amounts = ["50.25", "100.50", "50.25", "50.25"]
    account_amounts = ["5.00", "20.00", "35.25"]
    account_rows = [
        [label, amount, "", "", ""]
        for label, amount in zip(account_columns, account_amounts, strict=True)
    ]

    expected_rows = {
        "fundraiser": [
            [child, *contribution_columns],
            ["Jan Kot", "50.25", "0.00", "0.00", "0.00"],
            ["Ola Kot", *child_amounts],
            [f"{total} - {FUNDRAISER_NAME}", *fundraiser_amounts],
            ["", "", "", "", ""],
            [*account_heading, "", "", ""],
            *account_rows,
        ],
        "child": [
            [fundraiser, *contribution_columns],
            [escaped_name, *child_amounts],
            [f"{total} - Ola Kot", *child_amounts],
        ],
        "class": [
            [fundraiser, *contribution_columns, *(f"{label} PLN" for label in account_columns)],
            [escaped_name, *fundraiser_amounts, *account_amounts],
            [f"{total} - 1A", *fundraiser_amounts, *account_amounts],
        ],
    }

    for scope, subject_id, headers in _export_targets(school, fundraiser_id):
        response = _download(client, scope, subject_id, headers, "csv", lang)
        assert response.headers["content-type"] == "application/octet-stream"
        assert response.content.startswith(BOM_UTF8)
        rows = list(reader(StringIO(response.content.decode("utf-8-sig"))))
        assert rows == expected_rows[scope], scope


@pytest.mark.parametrize("lang", ["pl", "en"])
def test_pdf_exports_translated_text_and_amounts(client, export_setup, drawn_pdf_text, lang):
    school, fundraiser_id = export_setup
    if lang == "pl":
        titles = {
            "fundraiser": "Raport zbiórki",
            "child": "Raport dziecka",
            "class": "Raport klasy",
        }
        account_labels = {"fundraiser": "Konto zbiórki", "class": "Saldo"}
        common_text = {"Wpłaty po zwrotach", "Razem", "Kwoty w PLN", "Strona 1"}
        per_child, class_total = "50,25", "100,50"
    else:
        titles = {
            "fundraiser": "Fundraiser report",
            "child": "Child report",
            "class": "Class report",
        }
        account_labels = {"fundraiser": "Fundraiser account", "class": "Balance"}
        common_text = {"Paid after refunds", "Total", "Amounts in PLN", "Page 1"}
        per_child, class_total = "50.25", "100.50"

    for scope, subject_id, headers in _export_targets(school, fundraiser_id):
        drawn_pdf_text.clear()
        response = _download(client, scope, subject_id, headers, "pdf", lang)
        assert response.headers["content-type"] == "application/pdf"
        assert response.content.startswith(b"%PDF-")
        assert response.content.rstrip().endswith(b"%%EOF")

        due = class_total if scope == "class" else per_child
        expected_text = common_text | {titles[scope], FUNDRAISER_NAME, due}
        if scope in account_labels:
            expected_text.add(account_labels[scope])
        assert expected_text <= set(drawn_pdf_text), scope


@pytest.mark.parametrize("file_format", ["csv", "pdf"])
def test_export_requires_access_to_report(client, export_setup, auth_headers, file_format):
    school, fundraiser_id = export_setup
    outsider = auth_headers("outsider@example.com")
    params = {"format": file_format, "lang": "en"}

    for scope, subject_id, _ in _export_targets(school, fundraiser_id):
        url = f"{REPORTS_URL}/{scope}/{subject_id}/export"
        assert client.get(url, params=params).status_code == 401
        assert client.get(url, params=params, headers=outsider).status_code == 404


@pytest.mark.parametrize(("field", "value"), [("lang", "de"), ("format", "xlsx")])
def test_export_rejects_unsupported_query_value(client, export_setup, field, value):
    school, fundraiser_id = export_setup
    params = {"format": "csv", "lang": "en"}
    params[field] = value

    response = client.get(
        f"{REPORTS_URL}/fundraiser/{fundraiser_id}/export",
        headers=school.headers["parent"],
        params=params,
    )

    assert response.status_code == 422, response.text
    assert response.json()["detail"][0]["loc"] == ["query", field]
