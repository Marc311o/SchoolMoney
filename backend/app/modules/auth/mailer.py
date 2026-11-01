import logging
import smtplib
import ssl
from email.message import EmailMessage

from app.modules.auth.config import settings

logger = logging.getLogger(__name__)


class EmailDeliveryError(Exception):
    pass


def send_password_reset_email(
    recipient: str,
    reset_url: str,
) -> None:
    message = EmailMessage()
    message["Subject"] = "SchoolMoney: change your password"
    message["From"] = str(settings.SMTP_FROM)
    message["To"] = recipient

    message.set_content(
        "SchoolMoney: change your password\n\n"
        f"Set your new password: {reset_url}\n\n"
        f"Link is valid for {settings.PASSWORD_RESET_EXPIRE_MINUTES} minutes "
        "and can be used only once.\n"
        "Receiving this message alone does not change your password.\n"
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
            "SMTP delivery failed: %s (code=%s)",
            type(exc).__name__,
            getattr(exc, "smtp_code", None),
        )
        raise EmailDeliveryError("SMTP delivery failed") from exc