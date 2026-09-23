from fastapi import APIRouter, Query, Depends, HTTPException, status

from app.models.schemas import GraphData
from app.services.graph_service import graph_service
from app.services import supabase_cases
from app.dependencies.auth import get_current_user

router = APIRouter(prefix="/api/graph", tags=["graph"])


@router.get("", response_model=GraphData)
def get_graph(
    case_id: str | None = Query(None, description="Filter to a single case"),
    user: dict = Depends(get_current_user),
):
    """Return the stored graph scoped to the authenticated investigator and case."""
    if case_id:
        clean_case = case_id.strip()
        # If the case belongs to another user, explicitly return 403 Forbidden
        if supabase_cases.check_fir_belongs_to_other(user["id"], clean_case):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Case '{clean_case}' is not owned by your account.",
            )
        # Verify that this case belongs to the authenticated user
        owned = supabase_cases.verify_case_ownership(user["id"], clean_case)
        if not owned:
            return GraphData(nodes=[], edges=[])
        return graph_service.get_full_graph(clean_case)

    # When no case_id is passed, retrieve all cases owned by this user
    user_cases = supabase_cases.get_user_cases(user["id"])
    if not user_cases:
        return GraphData(nodes=[], edges=[])

    # Aggregate nodes and edges only for cases owned by this user
    combined_nodes = {}
    combined_edges = {}
    for c in user_cases:
        fir = c.get("fir_number")
        if not fir:
            continue
        sub = graph_service.get_full_graph(fir)
        for n in sub.nodes:
            combined_nodes[n.id] = n
        for e in sub.edges:
            combined_edges[e.id] = e

    return GraphData(nodes=list(combined_nodes.values()), edges=list(combined_edges.values()))


@router.get("/neighborhood/{node_id}", response_model=GraphData)
def get_neighborhood(
    node_id: str,
    depth: int = Query(3, ge=1, le=6, description="Hops from the node"),
    user: dict = Depends(get_current_user),
):
    """Return a node's indirect relations up to `depth` levels away (default 3)."""
    return graph_service.get_neighborhood(node_id, depth)
