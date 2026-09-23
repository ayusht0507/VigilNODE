"""
Authoritative Supabase Case & FIR Persistence Service.
Strictly persists structured case records to public.cases in Supabase PostgreSQL.
No graceful offline fallback: raises explicit exceptions on database failure.
"""
from typing import Optional, List, Dict, Any
import requests
from fastapi import HTTPException, status

from app.config import settings


def _get_headers() -> Dict[str, str]:
    if not settings.supabase_url or not settings.supabase_secret_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Supabase storage is not configured on the server.",
        )
    return {
        "apikey": settings.supabase_secret_key,
        "Authorization": f"Bearer {settings.supabase_secret_key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=representation",
    }


def save_case(
    profile_id: str,
    fir_number: str,
    case_title: Optional[str],
    narrative: str,
    owner_name: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Upserts or inserts a structured case into public.cases.
    Associates the FIR with profile_id (the authenticated user) and owner_name.
    Raises an explicit HTTPException if persistence fails.
    """
    if not profile_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Investigator profile ID is required for case storage.",
        )
    if not fir_number or not fir_number.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="FIR / Case Number is required.",
        )

    headers = _get_headers()
    url = f"{settings.supabase_url.rstrip('/')}/rest/v1/cases"

    # Verify that this FIR does NOT belong to another investigator
    if check_fir_belongs_to_other(profile_id, fir_number.strip()):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied: FIR '{fir_number.strip()}' belongs to another investigator.",
        )

    # Check if a case with this fir_number already exists for this profile
    check_url = f"{url}?profile_id=eq.{profile_id}&fir_number=eq.{fir_number.strip()}&select=id,owner_name"
    try:
        check_resp = requests.get(check_url, headers=headers, timeout=5.0)
    except requests.RequestException:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase database service is unreachable.",
        )

    if check_resp.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to check existing case in Supabase: {check_resp.text}",
        )

    existing = check_resp.json()
    clean_fir = fir_number.strip()
    clean_title = (case_title or clean_fir).strip()
    clean_narrative = (narrative or "").strip()
    clean_owner = (owner_name or "").strip() or None

    if existing and len(existing) > 0:
        # Update existing case record
        case_id = existing[0]["id"]
        update_url = f"{url}?id=eq.{case_id}"
        payload = {
            "case_title": clean_title,
            "case_study": clean_narrative,
            "updated_at": "now()",
        }
        # If owner_name is supplied, update it or backfill if missing in existing
        if clean_owner:
            payload["owner_name"] = clean_owner
        try:
            resp = requests.patch(update_url, json=payload, headers=headers, timeout=5.0)
        except requests.RequestException:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Supabase database service is unreachable during case update.",
            )

        if resp.status_code not in (200, 204):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Supabase case update failed: {resp.text}",
            )
        data = resp.json() if resp.status_code == 200 else existing
        return data[0] if isinstance(data, list) and data else {"id": case_id, "fir_number": clean_fir}
    else:
        # Insert new case record
        payload = {
            "profile_id": profile_id,
            "fir_number": clean_fir,
            "case_title": clean_title,
            "case_study": clean_narrative,
        }
        if clean_owner:
            payload["owner_name"] = clean_owner
        try:
            resp = requests.post(url, json=payload, headers=headers, timeout=5.0)
        except requests.RequestException:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Supabase database service is unreachable during case insertion.",
            )

        if resp.status_code not in (200, 201):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Supabase case insertion failed: {resp.text}",
            )
        data = resp.json()
        return data[0] if isinstance(data, list) and data else payload


def get_user_cases(profile_id: str) -> List[Dict[str, Any]]:
    """
    Returns all cases owned by the authenticated investigator.
    Strictly isolated: User A cannot see User B's cases.
    """
    if not profile_id:
        return []

    headers = _get_headers()
    url = f"{settings.supabase_url.rstrip('/')}/rest/v1/cases?profile_id=eq.{profile_id}&order=created_at.desc&select=*"

    try:
        resp = requests.get(url, headers=headers, timeout=5.0)
    except requests.RequestException:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase database service is unreachable.",
        )

    if resp.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch investigator cases: {resp.text}",
        )

    return resp.json() or []


def verify_case_ownership(profile_id: str, fir_number: str) -> bool:
    """
    Verifies that the given FIR belongs to the authenticated user.
    """
    if not profile_id or not fir_number:
        return False

    headers = _get_headers()
    clean_fir = fir_number.strip()
    url = f"{settings.supabase_url.rstrip('/')}/rest/v1/cases?profile_id=eq.{profile_id}&fir_number=eq.{clean_fir}&select=id"

    try:
        resp = requests.get(url, headers=headers, timeout=5.0)
        if resp.status_code == 200:
            rows = resp.json()
            return bool(rows and len(rows) > 0)
    except requests.RequestException:
        return False

    return False


def get_case_by_fir(profile_id: str, fir_number: str) -> Optional[Dict[str, Any]]:
    """
    Returns the case record for the given FIR if owned by profile_id.
    Returns None if not found or not owned.
    """
    if not profile_id or not fir_number:
        return None

    headers = _get_headers()
    clean_fir = fir_number.strip()
    url = f"{settings.supabase_url.rstrip('/')}/rest/v1/cases?profile_id=eq.{profile_id}&fir_number=eq.{clean_fir}&select=*"

    try:
        resp = requests.get(url, headers=headers, timeout=5.0)
        if resp.status_code == 200:
            rows = resp.json()
            if rows and len(rows) > 0:
                return rows[0]
    except requests.RequestException:
        return None

    return None


def check_fir_belongs_to_other(profile_id: str, fir_number: str) -> bool:
    """
    Checks whether this fir_number already belongs to a different profile.
    Prevents cross-account FIR overwrites or collisions.
    """
    if not profile_id or not fir_number:
        return False

    headers = _get_headers()
    clean_fir = fir_number.strip()
    url = f"{settings.supabase_url.rstrip('/')}/rest/v1/cases?fir_number=eq.{clean_fir}&profile_id=neq.{profile_id}&select=id"

    try:
        resp = requests.get(url, headers=headers, timeout=5.0)
        if resp.status_code == 200:
            rows = resp.json()
            return bool(rows and len(rows) > 0)
    except requests.RequestException:
        return False

    return False

