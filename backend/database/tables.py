from datetime import date, datetime, time

from sqlalchemy import BigInteger, Date, DateTime, Identity, Text, Time, text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class CallRecord(Base):
    __tablename__ = "call_records"

    id: Mapped[int] = mapped_column(
        BigInteger, Identity(always=True), primary_key=True, nullable=False
    )
    date: Mapped[date] = mapped_column(Date, nullable=False)
    time: Mapped[time] = mapped_column(Time(timezone=False), nullable=False)
    country_code: Mapped[str] = mapped_column(Text, nullable=False)
    caller_number: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP"),
    )