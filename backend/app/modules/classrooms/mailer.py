import smtplib
import ssl
from email.message import EmailMessage

from app.modules.auth.config import settings
from app.modules.auth.mailer import EmailDeliveryError, logger


def send_class_invite_email(
    recipient: str,
    class_name: str,
    school_name: str | None,
    treasurer_name: str,
    access_code: str,
) -> None:
    message = EmailMessage()
    message["Subject"] = f"SchoolMoney: invitation to {class_name}"
    message["From"] = str(settings.SMTP_FROM)
    message["To"] = recipient

    school_text = f"School: {school_name}\n" if school_name else ""

    message.set_content(
        "SchoolMoney: You have been invited to a class!\n\n"
        f"Class: {class_name}\n"
        f"{school_text}"
        f"Treasurer: {treasurer_name}\n\n"
        "Enter access code and request to join:\n"
        f"{access_code}\n\n"
        "Your child will join the class only after the treasurer "
        "approves your request.\n"
    )

    try:
        if settings.SMTP_USE_SSL:
            connection = smtplib.SMTP_SSL(
                settings.SMTP_HOST,
                settings.SMTP_PORT,
                timeout=10,
                context=ssl.create_default_context(),
            )
        else:
            connection = smtplib.SMTP(
                settings.SMTP_HOST,
                settings.SMTP_PORT,
                timeout=10,
            )

        with connection as smtp:
            if settings.SMTP_USE_TLS:
                smtp.starttls(context=ssl.create_default_context())

            if settings.SMTP_USERNAME:
                smtp.login(
                    settings.SMTP_USERNAME,
                    settings.SMTP_PASSWORD.get_secret_value(),
                )

            refused = smtp.send_message(message)

            if refused:
                raise EmailDeliveryError("SMTP rejected the recipient")

    except (OSError, smtplib.SMTPException) as exc:
        logger.error(
            "Class invitation email delivery failed: %s (code=%s)",
            type(exc).__name__,
            getattr(exc, "smtp_code", None),
        )
        raise EmailDeliveryError("SMTP delivery failed") from exc
