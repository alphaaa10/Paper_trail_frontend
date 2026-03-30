from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import StreamingResponse

router = APIRouter(prefix="/logs", tags=["logs"])

LOGS_DIR = Path("logs")


def _to_iso_utc(ts: float) -> str:
    return datetime.fromtimestamp(ts, tz=timezone.utc).isoformat()


def _resolve_log_path(file_name: str) -> Path:
    if not file_name or "/" in file_name or "\\" in file_name or ".." in file_name:
        raise HTTPException(status_code=400, detail="Invalid file_name")

    file_path = LOGS_DIR / file_name
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail=f"Log file not found: {file_name}")

    return file_path


def _tail_lines(file_path: Path, tail: int) -> tuple[list[str], int, bool]:
    # Read as text with replacement to avoid decode failures from mixed log bytes.
    lines = file_path.read_text(encoding="utf-8", errors="replace").splitlines()
    total = len(lines)
    if tail <= 0:
        return lines, total, False

    truncated = total > tail
    return lines[-tail:], total, truncated


@router.get("/files")
def list_log_files() -> dict:
    if not LOGS_DIR.exists():
        return {"files": [], "latest": None}

    files = [p for p in LOGS_DIR.iterdir() if p.is_file()]
    files.sort(key=lambda p: p.stat().st_mtime, reverse=True)

    payload = [
        {
            "file_name": p.name,
            "size_bytes": p.stat().st_size,
            "modified_at": _to_iso_utc(p.stat().st_mtime),
        }
        for p in files
    ]

    latest = payload[0]["file_name"] if payload else None
    return {"files": payload, "latest": latest}


@router.get("/file/{file_name}")
def get_log_file(file_name: str, tail: int = Query(300, ge=1, le=5000)) -> dict:
    file_path = _resolve_log_path(file_name)
    lines, total_lines, truncated = _tail_lines(file_path, tail)

    return {
        "file_name": file_name,
        "tail": tail,
        "total_lines": total_lines,
        "truncated": truncated,
        "content": "\n".join(lines),
    }


@router.get("/stream")
async def stream_log_file(
    request: Request,
    file_name: str = Query("latest.log"),
    follow: bool = Query(True),
    tail: int = Query(300, ge=1, le=5000),
):
    file_path = _resolve_log_path(file_name)

    async def sse_generator():
        # Send a recent tail snapshot first so clients get immediate context.
        lines, _, _ = _tail_lines(file_path, tail)
        for line in lines:
            if await request.is_disconnected():
                return
            yield f"data: {line}\n\n"

        if not follow:
            yield "event: done\ndata: [DONE]\n\n"
            return

        with file_path.open("r", encoding="utf-8", errors="replace") as fh:
            fh.seek(0, 2)
            while True:
                if await request.is_disconnected():
                    return

                line = fh.readline()
                if line:
                    yield f"data: {line.rstrip()}\n\n"
                else:
                    await asyncio.sleep(0.5)

    return StreamingResponse(sse_generator(), media_type="text/event-stream")
