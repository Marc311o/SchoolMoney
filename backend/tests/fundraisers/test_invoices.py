from decimal import Decimal
from unittest.mock import MagicMock, patch

from tests.fundraisers.helpers import (
    URL,
    create_school_setup,
    create_test_fundraiser,
)


def test_treasurer_adds_and_lists_invoices(client, db, auth_headers):
    school = create_school_setup(db, auth_headers)
    fundraiser_id = create_test_fundraiser(client, school)
    treasurer = school.headers["treasurer"]
    parent = school.headers["parent"]

    payload = {
        "title": "FV 123/2026 - Bus rental",
        "amount": "250.00",
        "file_url": "/uploads/invoices/bus.pdf",
    }

    res = client.post(f"{URL}/{fundraiser_id}/invoices", headers=treasurer, json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["title"] == payload["title"]
    assert Decimal(data["amount"]) == Decimal("250.00")

    res_list = client.get(f"{URL}/{fundraiser_id}/invoices", headers=parent)
    assert res_list.status_code == 200
    invoices = res_list.json()
    assert len(invoices) == 1
    assert invoices[0]["title"] == payload["title"]


def test_parent_cannot_create_invoice(client, db, auth_headers):
    school = create_school_setup(db, auth_headers)
    fundraiser_id = create_test_fundraiser(client, school)
    parent = school.headers["parent"]

    payload = {
        "title": "FV Fake",
        "amount": "100.00",
        "file_url": "/uploads/invoices/fake.pdf",
    }
    res = client.post(f"{URL}/{fundraiser_id}/invoices", headers=parent, json=payload)
    assert res.status_code == 404


def test_treasurer_uploads_invoice_file_and_creates_invoice(client, db, auth_headers):
    school = create_school_setup(db, auth_headers)
    fundraiser_id = create_test_fundraiser(client, school)
    treasurer = school.headers["treasurer"]
    parent = school.headers["parent"]

    mock_s3 = MagicMock()
    mock_public_s3 = MagicMock()
    mock_public_s3.generate_presigned_url.side_effect = lambda _op, Params, ExpiresIn: (
        f"http://localhost:3900/{Params['Bucket']}/{Params['Key']}?X-Amz-Signature=mock"
    )
    pdf_bytes = b"%PDF-1.4 fake invoice content"

    with (
        patch("app.core.storage.get_s3_client", return_value=mock_s3),
        patch("app.core.storage.get_public_s3_client", return_value=mock_public_s3),
    ):
        upload_res = client.post(
            f"{URL}/{fundraiser_id}/invoices/upload",
            headers=treasurer,
            files={"file": ("faktura_autokar.pdf", pdf_bytes, "application/pdf")},
        )

    assert upload_res.status_code == 201
    file_url = upload_res.json()["file_url"]
    assert f"/invoices/{fundraiser_id}/" in file_url
    assert "_faktura_autokar.pdf" in file_url
    assert "X-Amz-Signature=" in file_url

    mock_s3.put_object.assert_called_once()
    call_kwargs = mock_s3.put_object.call_args.kwargs
    assert call_kwargs["Body"] == pdf_bytes
    assert call_kwargs["ContentType"] == "application/pdf"
    assert call_kwargs["Key"].startswith(f"invoices/{fundraiser_id}/")

    create_res = client.post(
        f"{URL}/{fundraiser_id}/invoices",
        headers=treasurer,
        json={
            "title": "FV 123/2026 - Autokar",
            "amount": "450.00",
            "file_url": file_url,
        },
    )
    assert create_res.status_code == 201
    assert create_res.json()["file_url"] == file_url

    list_res = client.get(f"{URL}/{fundraiser_id}/invoices", headers=parent)
    assert list_res.status_code == 200
    assert len(list_res.json()) == 1
    assert list_res.json()[0]["file_url"] == file_url


def test_treasurer_uploads_image_invoice(client, db, auth_headers):
    school = create_school_setup(db, auth_headers)
    fundraiser_id = create_test_fundraiser(client, school)
    treasurer = school.headers["treasurer"]

    mock_s3 = MagicMock()
    mock_public_s3 = MagicMock()
    mock_public_s3.generate_presigned_url.side_effect = lambda _op, Params, ExpiresIn: (
        f"http://localhost:3900/{Params['Bucket']}/{Params['Key']}?X-Amz-Signature=mock"
    )

    with (
        patch("app.core.storage.get_s3_client", return_value=mock_s3),
        patch("app.core.storage.get_public_s3_client", return_value=mock_public_s3),
    ):
        res = client.post(
            f"{URL}/{fundraiser_id}/invoices/upload",
            headers=treasurer,
            files={"file": ("paragon.png", b"\x89PNG\r\n\x1a\nfake", "image/png")},
        )

    assert res.status_code == 201
    assert "_paragon.png" in res.json()["file_url"]


def test_parent_cannot_upload_invoice_file(client, db, auth_headers):
    school = create_school_setup(db, auth_headers)
    fundraiser_id = create_test_fundraiser(client, school)
    parent = school.headers["parent"]

    with patch("app.core.storage.get_s3_client") as mock_get_s3:
        res = client.post(
            f"{URL}/{fundraiser_id}/invoices/upload",
            headers=parent,
            files={"file": ("faktura.pdf", b"%PDF-1.4", "application/pdf")},
        )

    assert res.status_code == 404
    mock_get_s3.assert_not_called()


def test_upload_invoice_rejects_unsupported_file_type(client, db, auth_headers):
    school = create_school_setup(db, auth_headers)
    fundraiser_id = create_test_fundraiser(client, school)
    treasurer = school.headers["treasurer"]

    with patch("app.core.storage.get_s3_client") as mock_get_s3:
        res = client.post(
            f"{URL}/{fundraiser_id}/invoices/upload",
            headers=treasurer,
            files={"file": ("virus.exe", b"MZ...", "application/x-msdownload")},
        )

    assert res.status_code == 422
    mock_get_s3.assert_not_called()


def test_upload_invoice_rejects_empty_file(client, db, auth_headers):
    school = create_school_setup(db, auth_headers)
    fundraiser_id = create_test_fundraiser(client, school)
    treasurer = school.headers["treasurer"]

    with patch("app.core.storage.get_s3_client") as mock_get_s3:
        res = client.post(
            f"{URL}/{fundraiser_id}/invoices/upload",
            headers=treasurer,
            files={"file": ("pusty.pdf", b"", "application/pdf")},
        )

    assert res.status_code == 422
    mock_get_s3.assert_not_called()


def test_upload_invoice_rejects_oversized_file(client, db, auth_headers):
    school = create_school_setup(db, auth_headers)
    fundraiser_id = create_test_fundraiser(client, school)
    treasurer = school.headers["treasurer"]

    oversized = b"x" * (10 * 1024 * 1024 + 1)
    with patch("app.core.storage.get_s3_client") as mock_get_s3:
        res = client.post(
            f"{URL}/{fundraiser_id}/invoices/upload",
            headers=treasurer,
            files={"file": ("duza_faktura.pdf", oversized, "application/pdf")},
        )

    assert res.status_code == 413
    mock_get_s3.assert_not_called()


def test_upload_invoice_rejected_on_closed_fundraiser(client, db, auth_headers):
    school = create_school_setup(db, auth_headers)
    fundraiser_id = create_test_fundraiser(client, school)
    treasurer = school.headers["treasurer"]

    close_res = client.post(f"{URL}/{fundraiser_id}/close", headers=treasurer)
    assert close_res.status_code == 200

    with patch("app.core.storage.get_s3_client") as mock_get_s3:
        res = client.post(
            f"{URL}/{fundraiser_id}/invoices/upload",
            headers=treasurer,
            files={"file": ("po_zamknieciu.pdf", b"%PDF-1.4", "application/pdf")},
        )

    assert res.status_code == 409
    mock_get_s3.assert_not_called()
