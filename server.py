# uvicorn server:app --reload

import os
import hashlib
import json
from typing import Optional
from fastapi import FastAPI, UploadFile, Form, File
from fastapi.responses import FileResponse 
from starlette.staticfiles import StaticFiles
from dotenv import load_dotenv
from speech_to_text import *

load_dotenv()
app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")
if not speech_to_text_initialize():
    print("Failed to init speech to text API")



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