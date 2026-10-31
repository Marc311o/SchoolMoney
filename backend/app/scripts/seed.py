import argparse
import random
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from pathlib import Path
from uuid import uuid4

from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

import app.models  # noqa: F401  (registers all tables on Base.metadata)
from app.core.database import Base, SessionLocal
from app.core.security import hash_password
from app.modules.accounts.enums import AccountType, TransactionType
from app.modules.accounts.models import (
    Account,
    ExternalBankAccount,
    ExternalTransfer,
    Transaction,
)
from app.modules.accounts.utils import generate_fake_iban
from app.modules.chat.models import Chat, ChatParticipant, Message
from app.modules.children.models import Child
from app.modules.classrooms.enums import MembershipStatus
from app.modules.classrooms.models import ChildClassMembership, ClassAccessCode, SchoolClass
from app.modules.fundraisers.enums import FundraiserStatus, TreasurerOperationDirection
from app.modules.fundraisers.models import (
    Fundraiser,
    FundraiserObligation,
    FundraiserPayment,
    Invoice,
    TreasurerOperation,
)
from app.modules.users.enums import UserRole, UserStatus
from app.modules.users.models import User

EMAIL_DOMAIN = "example.com"
SCHOOL_NAME = "SP nr 67, Łódź"
CLASS_NAMES = ["1A", "2B", "3C", "4D", "5E", "6F", "7G", "8H"]

FIRST_NAMES = [
    "Anna",
    "Piotr",
    "Marta",
    "Tomasz",
    "Ewa",
    "Paweł",
    "Kasia",
    "Michał",
    "Agnieszka",
    "Krzysztof",
    "Magda",
    "Jakub",
    "Ola",
    "Marcin",
    "Joanna",
    "Adam",
]
LAST_NAMES = [
    "Nowak",
    "Kowalski",
    "Wiśniewski",
    "Wójcik",
    "Kamiński",
    "Lewandowski",
    "Zieliński",
    "Szymański",
    "Woźniak",
    "Dąbrowski",
    "Kozłowski",
    "Mazur",
]
CHILD_NAMES = [
    "Zosia",
    "Kuba",
    "Hania",
    "Antek",
    "Lena",
    "Franek",
    "Maja",
    "Staś",
    "Julia",
    "Filip",
    "Ola",
    "Janek",
    "Pola",
    "Tymek",
    "Ala",
    "Igor",
]

# (name, description, amount per child); the first N are used per class
FUNDRAISER_TEMPLATES = [
    ("Theatre trip", "Tickets and coach for the matinee.", Decimal("45.00")),
    ("Christmas gifts", "Gifts for the teachers.", Decimal("30.00")),
    ("Book fair", "Books for the class library.", Decimal("20.00")),
    ("Swimming lessons", "Pool entry for the first term.", Decimal("60.00")),
]


@dataclass
class SeedConfig:
    classes: int = 2
    parents_per_class: int = 4
    children_per_parent: int = 1
    fundraisers_per_class: int = 3
    top_up: Decimal = Decimal("500.00")
    password: str = "password"
    random_seed: int = 42


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def now() -> datetime:
    return datetime.now(UTC)


def make_user(
    db: Session,
    email: str,
    first_name: str,
    last_name: str,
    password_hash: str,
    role: UserRole = UserRole.PARENT,
    status: UserStatus = UserStatus.ACTIVE,
) -> User:
    """Same steps as users.service.register_user: user + wallet, in this session."""
    user = User(
        id=uuid4(),
        email=email,
        password_hash=password_hash,
        first_name=first_name,
        last_name=last_name,
        role=role,
        status=status,
    )
    db.add(user)
    db.flush()
    db.add(
        Account(
            id=uuid4(),
            user_id=user.id,
            iban=generate_fake_iban(),
            account_type=AccountType.USER,
            balance=Decimal("0.00"),
        )
    )
    db.flush()
    return user


def wallet(db: Session, user: User) -> Account:
    return db.scalars(select(Account).where(Account.user_id == user.id)).one()


def move_money(
    db: Session,
    *,
    amount: Decimal,
    type_: TransactionType,
    created_by: User,
    from_account: Account | None = None,
    to_account: Account | None = None,
    description: str | None = None,
) -> Transaction:
    """The only place that changes balances: one transaction row per movement."""
    if from_account is not None:
        if from_account.balance < amount:
            raise ValueError(f"Not enough money on {from_account.iban} for {amount}")
        from_account.balance -= amount
    if to_account is not None:
        to_account.balance += amount

    transaction = Transaction(
        id=uuid4(),
        from_account_id=from_account.id if from_account else None,
        to_account_id=to_account.id if to_account else None,
        type=type_,
        amount=amount,
        created_by=created_by.id,
        created_at=now(),  # set here - keeps the real order within one commit
        description=description,
    )
    db.add(transaction)
    db.flush()
    return transaction


def pay_for_child(
    db: Session, fundraiser: Fundraiser, child: Child, payer: User, amount: Decimal
) -> FundraiserPayment:
    transaction = move_money(
        db,
        amount=amount,
        type_=TransactionType.FUNDRAISER_PAYMENT,
        created_by=payer,
        from_account=wallet(db, payer),
        to_account=fundraiser.account,
        description=f"{fundraiser.name} – {child.first_name} {child.last_name}",
    )
    payment = FundraiserPayment(
        id=uuid4(),
        fundraiser_id=fundraiser.id,
        child_id=child.id,
        payer_id=payer.id,
        transaction_id=transaction.id,
        amount=amount,
        paid_at=now(),
    )
    db.add(payment)
    db.flush()
    return payment


def create_chat(db: Session, users: list[User], school_class: SchoolClass | None = None) -> Chat:
    chat = Chat(id=uuid4(), class_id=school_class.id if school_class else None)
    db.add(chat)
    db.flush()
    for user in users:
        db.add(ChatParticipant(chat_id=chat.id, user_id=user.id))
    db.flush()
    return chat


def post(db: Session, chat: Chat, sender: User, content: str, minutes_ago: int) -> None:
    db.add(
        Message(
            id=uuid4(),
            chat_id=chat.id,
            sender_id=sender.id,
            content=content,
            created_at=now() - timedelta(minutes=minutes_ago),
        )
    )


# ---------------------------------------------------------------------------
# Seeding steps
# ---------------------------------------------------------------------------


@dataclass
class ClassData:
    school_class: SchoolClass
    treasurer: User
    parents: list[User]
    children: list[tuple[Child, User]]  # (child, parent)


def seed_class(
    db: Session,
    index: int,
    config: SeedConfig,
    password_hash: str,
    rng: random.Random,
) -> ClassData:
    name = CLASS_NAMES[index]
    slug = name.lower()

    parents: list[User] = []
    for n in range(1, config.parents_per_class + 1):
        email = f"treasurer.{slug}@{EMAIL_DOMAIN}" if n == 1 else f"parent{n}.{slug}@{EMAIL_DOMAIN}"
        parent = make_user(
            db, email, rng.choice(FIRST_NAMES), rng.choice(LAST_NAMES), password_hash
        )
        move_money(
            db,
            amount=config.top_up,
            type_=TransactionType.TOP_UP,
            created_by=parent,
            to_account=wallet(db, parent),
            description="Initial top-up",
        )
        parents.append(parent)

    treasurer = parents[0]
    school_class = SchoolClass(
        id=uuid4(), name=name, school_name=SCHOOL_NAME, treasurer_id=treasurer.id
    )
    db.add(school_class)
    db.flush()

    db.add(
        ClassAccessCode(
            id=uuid4(),
            class_id=school_class.id,
            code=f"JOIN-{name}",
            valid_until=now() + timedelta(days=30),
            active=True,
        )
    )

    children: list[tuple[Child, User]] = []
    for parent in parents:
        for _ in range(config.children_per_parent):
            child = Child(
                id=uuid4(),
                parent_id=parent.id,
                first_name=rng.choice(CHILD_NAMES),
                last_name=parent.last_name,
                birth_date=date(2026 - 7 - index, rng.randint(1, 12), rng.randint(1, 28)),
            )
            db.add(child)
            db.flush()
            db.add(
                ChildClassMembership(
                    id=uuid4(),
                    child_id=child.id,
                    class_id=school_class.id,
                    status=MembershipStatus.ACTIVE,
                    requested_at=now() - timedelta(days=60),
                    joined_at=now() - timedelta(days=59),
                )
            )
            children.append((child, parent))

    # One parent who joined with the code and waits for the treasurer's approval
    newcomer = make_user(
        db,
        f"pending.{slug}@{EMAIL_DOMAIN}",
        rng.choice(FIRST_NAMES),
        rng.choice(LAST_NAMES),
        password_hash,
    )
    pending_child = Child(
        id=uuid4(),
        parent_id=newcomer.id,
        first_name=rng.choice(CHILD_NAMES),
        last_name=newcomer.last_name,
        birth_date=date(2026 - 7 - index, rng.randint(1, 12), rng.randint(1, 28)),
    )
    db.add(pending_child)
    db.flush()
    db.add(
        ChildClassMembership(
            id=uuid4(),
            child_id=pending_child.id,
            class_id=school_class.id,
            status=MembershipStatus.PENDING,
            requested_at=now() - timedelta(hours=2),
        )
    )
    db.flush()

    return ClassData(school_class, treasurer, parents, children)


def seed_fundraisers(db: Session, data: ClassData, config: SeedConfig) -> list[Fundraiser]:
    """Per class, in this order: active (with a withdrawal and an invoice),
    active (partly paid), closed (with refunds), draft."""
    today = date.today()
    plans = [
        (FundraiserStatus.ACTIVE, today - timedelta(days=14), today + timedelta(days=14)),
        (FundraiserStatus.ACTIVE, today - timedelta(days=3), today + timedelta(days=30)),
        (FundraiserStatus.CLOSED, today - timedelta(days=60), today - timedelta(days=30)),
        (FundraiserStatus.DRAFT, today + timedelta(days=7), today + timedelta(days=37)),
    ]
    treasurer = data.treasurer
    fundraisers: list[Fundraiser] = []

    for i in range(config.fundraisers_per_class):
        name, description, amount = FUNDRAISER_TEMPLATES[i % len(FUNDRAISER_TEMPLATES)]
        status, start, end = plans[i % len(plans)]

        fundraiser = Fundraiser(
            id=uuid4(),
            class_id=data.school_class.id,
            author_id=treasurer.id,
            name=f"{name} · {data.school_class.name}",
            description=description,
            required_amount=amount,
            start_date=start,
            end_date=end,
            status=status,
        )
        db.add(fundraiser)
        db.flush()
        fundraiser.account = Account(
            id=uuid4(),
            fundraiser_id=fundraiser.id,
            iban=generate_fake_iban(),
            account_type=AccountType.FUNDRAISER,
            balance=Decimal("0.00"),
        )
        db.add(fundraiser.account)
        db.flush()

        if status == FundraiserStatus.DRAFT:
            fundraisers.append(fundraiser)
            continue

        for child, _ in data.children:
            db.add(
                FundraiserObligation(
                    id=uuid4(),
                    fundraiser_id=fundraiser.id,
                    child_id=child.id,
                    required_amount_per_child=amount,
                )
            )

        # Who pays: everyone in closed and the first fundraiser, half in the second
        to_pay = data.children if i != 1 else data.children[: len(data.children) // 2]
        payments: list[FundraiserPayment] = []
        for n, (child, parent) in enumerate(to_pay):
            # The treasurer pays for the last paying child: "paid for someone else's child"
            payer = treasurer if (n == len(to_pay) - 1 and parent is not treasurer) else parent
            payments.append(pay_for_child(db, fundraiser, child, payer, amount))

        if i == 0 and payments:
            # Advance taken out mid-fundraiser + the invoice for it
            advance = (fundraiser.account.balance / 2).quantize(Decimal("0.01"))
            transaction = move_money(
                db,
                amount=advance,
                type_=TransactionType.TREASURER_WITHDRAWAL,
                created_by=treasurer,
                from_account=fundraiser.account,
                to_account=wallet(db, treasurer),
                description=f"Advance – {fundraiser.name}",
            )
            db.add(
                TreasurerOperation(
                    id=uuid4(),
                    fundraiser_id=fundraiser.id,
                    author_id=treasurer.id,
                    transaction_id=transaction.id,
                    direction=TreasurerOperationDirection.WITHDRAWAL,
                    amount=advance,
                    description="Advance for tickets",
                )
            )
            db.add(
                Invoice(
                    id=uuid4(),
                    fundraiser_id=fundraiser.id,
                    added_by=treasurer.id,
                    title="Invoice FV/10/2026 – tickets",
                    amount=advance,
                    file_url="/uploads/invoices/sample-invoice.pdf",
                )
            )

        if status == FundraiserStatus.CLOSED:
            # Nothing was spent, so every payer gets the full amount back
            for payment in payments:
                refund = move_money(
                    db,
                    amount=payment.amount,
                    type_=TransactionType.CLOSE_REFUND,
                    created_by=treasurer,
                    from_account=fundraiser.account,
                    to_account=wallet(db, db.get(User, payment.payer_id)),
                    description=f"Refund – {fundraiser.name}",
                )
                payment.refunded_at = now()
                payment.refund_transaction_id = refund.id
            fundraiser.closed_at = now()

        db.flush()
        fundraisers.append(fundraiser)

    return fundraisers


def seed_chats(db: Session, data: ClassData) -> None:
    chat = create_chat(db, data.parents, data.school_class)
    first_fundraiser = FUNDRAISER_TEMPLATES[0][0].lower()
    post(db, chat, data.treasurer, f"Hi all, the {first_fundraiser} fundraiser is open.", 120)
    if len(data.parents) > 1:
        post(db, chat, data.parents[1], "Thanks, paid already!", 90)
    if len(data.parents) > 2:
        direct = create_chat(db, data.parents[1:3])
        post(db, direct, data.parents[1], "Can you pick up the kids on Friday?", 30)
        post(db, direct, data.parents[2], "Sure, no problem.", 25)


def seed_external_transfer(db: Session, parent: User) -> None:
    external = ExternalBankAccount(
        id=uuid4(),
        user_id=parent.id,
        iban="PL10105000997603123456789123",
        account_name=f"{parent.first_name}'s bank account",
    )
    db.add(external)
    db.flush()
    transaction = move_money(
        db,
        amount=Decimal("50.00"),
        type_=TransactionType.EXTERNAL_TRANSFER,
        created_by=parent,
        from_account=wallet(db, parent),
        description="Transfer to own bank account",
    )
    db.add(
        ExternalTransfer(id=uuid4(), transaction_id=transaction.id, external_account_id=external.id)
    )


def check_balances(db: Session) -> None:
    """Every balance must equal incoming minus outgoing transactions."""
    incoming = dict(
        db.execute(
            select(Transaction.to_account_id, func.sum(Transaction.amount)).group_by(
                Transaction.to_account_id
            )
        ).all()
    )
    outgoing = dict(
        db.execute(
            select(Transaction.from_account_id, func.sum(Transaction.amount)).group_by(
                Transaction.from_account_id
            )
        ).all()
    )
    for account in db.scalars(select(Account)):
        expected = incoming.get(account.id, Decimal(0)) - outgoing.get(account.id, Decimal(0))
        if account.balance != expected:
            raise RuntimeError(
                f"Balance mismatch on {account.iban}: {account.balance} != {expected}"
            )


def reset(db: Session) -> None:
    tables = ", ".join(f'"{table.name}"' for table in Base.metadata.sorted_tables)
    db.execute(text(f"TRUNCATE {tables} CASCADE"))


def seed(db: Session, config: SeedConfig) -> list[tuple[str, str]]:
    rng = random.Random(config.random_seed)
    password_hash = hash_password(config.password)  # hashed once, Argon2 is slow on purpose
    logins: list[tuple[str, str]] = []

    admin = make_user(
        db, f"admin@{EMAIL_DOMAIN}", "Admin", "SchoolMoney", password_hash, role=UserRole.ADMIN
    )
    logins.append((admin.email, "admin"))

    classes = [seed_class(db, i, config, password_hash, rng) for i in range(config.classes)]
    for data in classes:
        seed_fundraisers(db, data, config)
        seed_chats(db, data)
        name = data.school_class.name
        logins.append((data.treasurer.email, f"treasurer + parent, class {name}"))
        logins.extend((p.email, f"parent, class {name}") for p in data.parents[1:])
        logins.append((f"pending.{name.lower()}@{EMAIL_DOMAIN}", f"waiting to join {name}"))

    # Parent with children in two classes
    if len(classes) > 1:
        multi = classes[0].parents[-1]
        second = Child(
            id=uuid4(),
            parent_id=multi.id,
            first_name=rng.choice(CHILD_NAMES),
            last_name=multi.last_name,
            birth_date=date(2026 - 8, rng.randint(1, 12), rng.randint(1, 28)),
        )
        db.add(second)
        db.flush()
        db.add(
            ChildClassMembership(
                id=uuid4(),
                child_id=second.id,
                class_id=classes[1].school_class.id,
                status=MembershipStatus.ACTIVE,
                joined_at=now() - timedelta(days=30),
            )
        )
        logins = [
            (email, f"{role}, also has a child in {classes[1].school_class.name}")
            if email == multi.email
            else (email, role)
            for email, role in logins
        ]

    # Admin <-> treasurer conversation
    admin_chat = create_chat(db, [admin, classes[0].treasurer])
    post(db, admin_chat, admin, "Please add invoices to the theatre fundraiser.", 60)

    if classes[0].parents[1:]:
        seed_external_transfer(db, classes[0].parents[1])

    blocked = make_user(
        db,
        f"blocked@{EMAIL_DOMAIN}",
        "Blocked",
        "User",
        password_hash,
        status=UserStatus.BLOCKED,
    )
    logins.append((blocked.email, "blocked (login returns 403)"))

    db.flush()
    check_balances(db)
    return logins


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


DEFAULT_XLSX = Path(__file__).resolve().parent / "seed_data.xlsx"


def parse_args() -> tuple[SeedConfig, bool, Path | None]:
    defaults = SeedConfig()
    parser = argparse.ArgumentParser(description="Fill the database with test data.")
    parser.add_argument("--reset", action="store_true", help="wipe ALL tables first")
    parser.add_argument(
        "--classes",
        type=int,
        default=defaults.classes,
        help=f"number of classes, 1-{len(CLASS_NAMES)} (default: %(default)s)",
    )
    parser.add_argument(
        "--parents",
        type=int,
        default=defaults.parents_per_class,
        help="parents per class, incl. the treasurer (default: %(default)s)",
    )
    parser.add_argument(
        "--children",
        type=int,
        default=defaults.children_per_parent,
        help="children per parent (default: %(default)s)",
    )
    parser.add_argument(
        "--fundraisers",
        type=int,
        default=defaults.fundraisers_per_class,
        help="fundraisers per class; the 4th is a draft (default: %(default)s)",
    )
    parser.add_argument(
        "--top-up",
        type=Decimal,
        default=defaults.top_up,
        help="initial wallet top-up in PLN (default: %(default)s)",
    )
    parser.add_argument(
        "--password",
        default=defaults.password,
        help="password for every account (default: %(default)s)",
    )
    parser.add_argument(
        "--random-seed",
        type=int,
        default=defaults.random_seed,
        help="same seed = same names (default: %(default)s)",
    )
    parser.add_argument(
        "--xlsx",
        nargs="?",
        type=Path,
        const=DEFAULT_XLSX,
        metavar="PATH",
        help=f"also save the seeded data to an .xlsx file (default path: {DEFAULT_XLSX})",
    )
    args = parser.parse_args()

    if not 1 <= args.classes <= len(CLASS_NAMES):
        parser.error(f"--classes must be between 1 and {len(CLASS_NAMES)}")
    if args.parents < 1 or args.children < 1 or args.fundraisers < 0:
        parser.error("--parents and --children must be at least 1")
    if args.xlsx is not None and args.xlsx.suffix.lower() != ".xlsx":
        parser.error("--xlsx path must end with .xlsx")

    config = SeedConfig(
        classes=args.classes,
        parents_per_class=args.parents,
        children_per_parent=args.children,
        fundraisers_per_class=args.fundraisers,
        top_up=args.top_up,
        password=args.password,
        random_seed=args.random_seed,
    )
    return config, args.reset, args.xlsx


def main() -> None:
    config, should_reset, xlsx_path = parse_args()

    with SessionLocal() as db:
        if should_reset:
            reset(db)
        elif db.scalar(select(func.count()).select_from(User)):
            raise SystemExit("Database is not empty. Run again with --reset to wipe it first.")

        try:
            logins = seed(db, config)
        except ValueError as error:
            raise SystemExit(f"{error}. Try a bigger --top-up.") from None
        db.commit()

        if xlsx_path is not None:
            from app.scripts.seed_export import export_xlsx

            export_xlsx(db, xlsx_path, config.password, logins)

    width = max(len(email) for email, _ in logins)
    print(f"\nSeeded {config.classes} class(es). Password for every account: {config.password}\n")
    for email, role in logins:
        print(f"  {email.ljust(width)}  {role}")
    if xlsx_path is not None:
        print(f"\nSaved to {xlsx_path.resolve()}")
    print()


if __name__ == "__main__":
    main()
