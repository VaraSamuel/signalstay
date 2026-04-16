from sqlalchemy import Column, DateTime, Float, Integer, String, Text, UniqueConstraint
from sqlalchemy.sql import func

from app.core.database import Base


class PropertyInsight(Base):
    __tablename__ = "property_insights"

    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(String, index=True, nullable=False)
    topic = Column(String, index=True, nullable=False)
    status = Column(String, nullable=False)
    confidence = Column(Float, default=0.5)
    last_verified = Column(String, nullable=True)
    fact_value = Column(Text, nullable=True)
    source = Column(String, default="review")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ReviewAnswerLog(Base):
    __tablename__ = "review_answer_logs"

    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(String, index=True, nullable=False)
    review_text = Column(Text, nullable=True)
    asked_questions = Column(Text, nullable=True)
    user_answer = Column(Text, nullable=True)
    parsed_json = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class PropertyTruthRecordDB(Base):
    __tablename__ = "property_truth_records"

    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(String, unique=True, index=True, nullable=False)
    property_name = Column(String, nullable=True)
    confidence_score = Column(Integer, default=0, nullable=False)
    summary = Column(Text, default="", nullable=False)
    audit_log_json = Column(Text, default="[]", nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )


class PropertyAttributeStateDB(Base):
    __tablename__ = "property_attribute_states"
    __table_args__ = (
        UniqueConstraint("property_id", "attribute", name="uq_property_attribute"),
    )

    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(String, index=True, nullable=False)
    attribute = Column(String, index=True, nullable=False)
    label = Column(String, nullable=False)
    current_status = Column(String, default="unknown", nullable=False)
    freshness = Column(String, default="unresolved", nullable=False)
    confidence = Column(Float, default=0.0, nullable=False)
    source = Column(String, nullable=True)
    sentiment = Column(String, nullable=True)
    last_evidence = Column(Text, nullable=True)
    last_updated_at = Column(String, nullable=True)
    history_json = Column(Text, default="[]", nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )


class ReviewSessionDB(Base):
    __tablename__ = "review_sessions"

    session_id = Column(String, primary_key=True, index=True)
    property_id = Column(String, index=True, nullable=False)
    session_json = Column(Text, nullable=False)  # full session dict as JSON
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )


class PropertyInteractionEventDB(Base):
    __tablename__ = "property_interaction_events"

    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(String, index=True, nullable=False)
    event_type = Column(String, index=True, nullable=False)
    attribute = Column(String, nullable=True)
    content = Column(Text, nullable=True)
    payload_json = Column(Text, default="{}", nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())