import secrets
import string


def generate_fake_iban(country_code: str = "PL") -> str:
    """Generates a 28-character synthetic IBAN (PL + 26 digits)."""
    random_digits = "".join(secrets.choice(string.digits) for _ in range(26))
    return f"{country_code}{random_digits}"
