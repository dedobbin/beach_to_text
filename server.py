# uvicorn server:app --reload

import os
import hashlib
import json
import uuid
from typing import Optional
from fastapi import FastAPI, UploadFile, Form, File, HTTPException
from fastapi.responses import FileResponse 
from starlette.staticfiles import StaticFiles
from dotenv import load_dotenv
from speech_to_text import *

VIDEO_DIR = "static/media"

load_dotenv()
app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")
if not speech_to_text_initialize():
    print("Failed to init speech to text API")

allowed_extensions = ["mp4", "webm"]

@app.get("/")
async def server_root():
    return FileResponse("static/index.html")

@app.post("/beach_to_text/")
async def beach_to_text(
    audio: UploadFile = File(...), 
    n_seconds: Optional[int] = Form(float('inf'))
):
    hash_md5 = hashlib.md5(audio.filename.encode()).hexdigest()
    save_path = os.path.join("uploads", f"{hash_md5}.wav")
    content = await audio.read() 
    
    # os.makedirs(os.path.dirname(save_path), exist_ok=True)
    # with open(save_path, "wb") as buffer:
    #     buffer.write(await audio.read())
    
    texts = to_text(content)

    result = []
    for e in texts:
        #print(e)
        if len(e.words) == 0:
            print("Got no words")
            #TODO: error
            break
        if n_seconds < to_seconds(e.words[-1].end_time):
            for f in cut_subs(e, n_seconds):
                result.append(f)
        else:
            result.append({
                "text": e.transcript,
                "start_time": to_seconds(e.words[0].start_time),
                "end_time": to_seconds(e.words[-1].end_time),
            })
    
    res = result
    print("res", res)
    return res

@app.get("/video_list")
async def server_root():
    files = [
        {
            "name": f,
            "path": os.path.join(VIDEO_DIR, f)
        }
        for f in os.listdir(VIDEO_DIR)
        if os.path.isfile(os.path.join(VIDEO_DIR, f))
        and f.split('.')[-1].lower() in allowed_extensions
    ]
    return files

@app.post("/upload_video/")
async def beach_to_text(
    file: UploadFile = File(...), 
):
    file_path = os.path.join(VIDEO_DIR, file.filename)

    base, extension = os.path.splitext(file_path)
    extension=extension.lower().lstrip(".")

    if not extension in allowed_extensions:
        raise HTTPException(status_code=400, detail=f"Invalid file type. Allowed: {','.join(allowed_extensions)}")

    new_filename = file_path
    while os.path.exists(new_filename):
        random_string = uuid.uuid4().hex[:8]
        new_filename = f"{base}_{random_string}.{extension}"

    with open(new_filename, "wb") as buffer:
        buffer.write(await file.read())

    return {"filename": file.filename, "file_path": new_filename}
    