from __future__ import annotations

from fastapi import FastAPI
from fastapi.responses import RedirectResponse

from app.api import router as api_router
from app.auth_api import router as auth_router
from app.logging_setup import configure_logging
from app.otel import try_init_otel
from app.ui import router as ui_router

configure_logging()
try_init_otel()

app = FastAPI(title="Current-State Documentation Tool", version="0.1.0")
app.include_router(auth_router)
app.include_router(api_router)
app.include_router(ui_router)


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/docs-redirect")
def docs_redirect() -> RedirectResponse:
    return RedirectResponse(url="/docs")
