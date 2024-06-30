# uvicorn server:app --reload

from fastapi import FastAPI
from fastapi.responses import FileResponse 
from starlette.staticfiles import StaticFiles

app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
async def read_root():
    return FileResponse("static/index.html")