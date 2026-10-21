import logging
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.database import get_db

logger = logging.getLogger(__name__)

app = FastAPI(title="SchoolMoney")


@app.get("/api/health")
def health(db: Annotated[Session, Depends(get_db)]) -> dict[str, str]:
    try:
        db.execute(text("SELECT 1"))
    except SQLAlchemyError:
        logger.exception("Database health check failed")
        raise HTTPException(status_code=503, detail="Database unavailable") from None
    return {"status": "ok"}
