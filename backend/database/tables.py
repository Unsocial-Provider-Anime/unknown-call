from sqlalchemy import BigInteger, Column, Date, DateTime, Identity, MetaData, Table, Text, Time, text


metadata = MetaData()

call_records = Table(
    "call_records",
    metadata,
    Column("id", BigInteger, Identity(always=True), primary_key=True, nullable=False),
    Column("date", Date, nullable=False),
    Column("time", Time(timezone=False), nullable=False),
    Column("country_code", Text, nullable=False),
    Column("caller_number", Text, nullable=False),
    Column(
        "created_at",
        DateTime(timezone=True),
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP"),
    ),
)