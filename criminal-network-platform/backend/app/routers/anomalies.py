from fastapi import APIRouter, Depends

from app.models.schemas import AnomalyAlert
from app.services.graph_service import graph_service
from app.services.anomaly_rules import run_all_rules, RULES
from app.services import supabase_cases
from app.dependencies.auth import get_current_user

router = APIRouter(prefix="/api/anomalies", tags=["anomalies"])


@router.get("", response_model=list[AnomalyAlert])
def get_anomalies(user: dict = Depends(get_current_user)):
    """Run anomaly rules against relationships belonging to the authenticated investigator's cases."""
    user_cases = supabase_cases.get_user_cases(user["id"])
    if not user_cases:
        return []

    user_fir_set = {c["fir_number"].strip() for c in user_cases if c.get("fir_number")}
    all_rows = graph_service.get_all_relationships_raw()
    user_rows = [r for r in all_rows if r.get("case_id") in user_fir_set]

    return run_all_rules(user_rows)


@router.get("/rules")
def list_rules():
    """List the anomaly rules currently registered in the engine."""
    return [{"index": i + 1, "function": r.__name__} for i, r in enumerate(RULES)]

