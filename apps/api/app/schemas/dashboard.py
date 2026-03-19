from pydantic import BaseModel


class DashboardStats(BaseModel):
    total_trainings: int
    total_procedures: int
    resolved_incidents: int
    pending_incidents: int
    total_roles: int
    total_assignments: int
    completion_rate: float
    average_score: float | None
    overdue_count: int
    compliance_gap_count: int
    open_change_events: int
    top_incidents: list[dict] = []
