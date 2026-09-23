"""
Authentication dependency for FastAPI.
Derives authenticated user identity exclusively by validating
the caller's HTTP-only session with the Express auth authority.
"""
from fastapi import Request, HTTPException, status
import requests

from app.config import settings


def get_current_user(request: Request) -> dict:
    """
    Validates incoming request cookies/authorization against the existing
    Express authentication service (GET /api/auth/me).
    Never trusts client-supplied user metadata.
    """
    cookie_header = request.headers.get("cookie", "")
    auth_header = request.headers.get("authorization", "")

    if not cookie_header and not auth_header:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. No session credentials provided.",
        )

    headers = {}
    if cookie_header:
        headers["cookie"] = cookie_header
    if auth_header:
        headers["authorization"] = auth_header

    auth_url = f"{settings.auth_api_url.rstrip('/')}/api/auth/me"

    try:
        response = requests.get(auth_url, headers=headers, timeout=5.0)
    except requests.RequestException:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service is temporarily unavailable.",
        )

    if response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication session.",
        )

    data = response.json()
    if not data or not data.get("success") or not data.get("user"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session validation failed.",
        )

    user = data["user"]
    if not user.get("id"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authenticated user identity missing from session.",
        )

    return {
        "id": user["id"],
        "name": user.get("name") or "",
        "email": user.get("email") or "",
    }
