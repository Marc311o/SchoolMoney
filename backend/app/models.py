"""Common model index used by main, migrations/env.py and scripts"""

from app.modules.accounts.models import (  # noqa: F401
    Account,
    ExternalBankAccount,
    ExternalTransfer,
    Transaction,
)
from app.modules.chat.models import Chat, ChatParticipant, Message  # noqa: F401
from app.modules.children.models import Child  # noqa: F401
from app.modules.classrooms.models import (  # noqa: F401
    ChildClassMembership,
    ClassAccessCode,
    SchoolClass,
)
from app.modules.fundraisers.models import (  # noqa: F401
    Fundraiser,
    FundraiserObligation,
    FundraiserPayment,
    Invoice,
    TreasurerOperation,
)
from app.modules.users.models import User  # noqa: F401
