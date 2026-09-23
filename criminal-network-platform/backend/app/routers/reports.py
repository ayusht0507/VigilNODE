from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends

from app.models.schemas import ReportIn, ExtractionResult, TranscriptionOut
from app.services import extraction, stt_service
from app.services.graph_service import graph_service
from app.services import supabase_cases
from app.dependencies.auth import get_current_user

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.post("/text", response_model=ExtractionResult)
def submit_text_report(payload: ReportIn, user: dict = Depends(get_current_user)):
    """Submit a typed crime report; persist in Supabase, extract entities/relationships and store them in the graph."""
    text = payload.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Report text cannot be empty.")
    case_id = payload.case_id.strip()
    if not case_id:
        raise HTTPException(status_code=400, detail="Case / FIR Number cannot be empty.")

    # 1. Authoritative structured persistence in Supabase PostgreSQL under authenticated user
    supabase_cases.save_case(
        profile_id=user["id"],
        fir_number=case_id,
        case_title=case_id,
        narrative=text,
        owner_name=user.get("name") or user.get("email") or "Investigator",
    )

    # 2. Case-scoped graph update: clear prior graph for this case only, never touch other cases
    graph_service.clear_case_graph(case_id)
    result = extraction.extract(case_id, text)
    graph_service.save_extraction(result)
    return result


@router.post("/voice", response_model=ExtractionResult)
async def submit_voice_report(
    case_id: str = Form(...),
    audio: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    """Submit a spoken crime report as an audio file; transcribe, persist in Supabase, extract, and store."""
    clean_case_id = case_id.strip()
    if not clean_case_id:
        raise HTTPException(status_code=400, detail="Case / FIR Number cannot be empty.")

    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Uploaded audio file is empty.")
    suffix = "." + (audio.filename.rsplit(".", 1)[-1] if audio.filename and "." in audio.filename else "webm")
    text = stt_service.transcribe(audio_bytes, filename_suffix=suffix)
    if not text or not text.strip():
        raise HTTPException(status_code=422, detail="Could not transcribe any speech from the audio.")

    # 1. Authoritative structured persistence in Supabase PostgreSQL under authenticated user
    supabase_cases.save_case(
        profile_id=user["id"],
        fir_number=clean_case_id,
        case_title=clean_case_id,
        narrative=text.strip(),
        owner_name=user.get("name") or user.get("email") or "Investigator",
    )

    # 2. Case-scoped graph update: clear prior graph for this case only, never touch other cases
    graph_service.clear_case_graph(clean_case_id)
    result = extraction.extract(clean_case_id, text.strip())
    graph_service.save_extraction(result)
    return result


@router.post("/transcribe", response_model=TranscriptionOut)
async def transcribe_only(
    audio: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    """Transcribe audio to text without extraction/storage -- lets the UI show text for editing first."""
    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Uploaded audio file is empty.")
    suffix = "." + (audio.filename.rsplit(".", 1)[-1] if audio.filename and "." in audio.filename else "webm")
    text = stt_service.transcribe(audio_bytes, filename_suffix=suffix)
    return TranscriptionOut(text=text)
