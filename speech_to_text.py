import io
from google.cloud import speech
from google.api_core.exceptions import InvalidArgument
from mock import *

speech_client = None
gcloud_connection = False

mock = False

def speech_to_text_initialize():
    global speech_client, gcloud_connection
    if (mock):
        gcloud_connection = True
        return True
    
    try:
        speech_client = speech.SpeechClient()
        gcloud_connection = True
        return True
    except Exception as e:
        print(f"{type(e).__name__} happend: {str(e)}")
        return False

def audio_file_to_text(path):
    with io.open(path, "rb") as audio_file:
        content = audio_file.read()
        return to_text(content)
    
def is_connected_to_gcloud():
    return gcloud_connection

def to_text(raw_audio):
    global speech_client
    if mock:
        return mock_to_text()
    
    if (speech_client is None):
        print("Cannot convert to text, no speech client is initialized")
        return []
    audio = speech.RecognitionAudio(content=raw_audio)
    config = speech.RecognitionConfig(
        encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
        enable_automatic_punctuation=True,
        audio_channel_count=2,
        language_code="nl-NL",
        enable_word_time_offsets=True
    )

    texts = []

    try:
        response = speech_client.recognize(request={"config": config, "audio": audio})# Reads the response
    
    except InvalidArgument as e:
        print("InvalidArgument error occurred:", e)
        # TODO: signal back through API an error happend
        return []

    for result in response.results:
        if not result.alternatives:
            continue

        texts.append(result.alternatives[0])
    
    return texts

def cut_subs(text, n_seconds):
    if len(text.words) == 0:
        return []
    
    segments = []
    cur_seg = ""
    cur_start_time = to_seconds(text.words[0].start_time);
    cur_lim = n_seconds
    i = 0;
    for w in text.words:
        end_time = to_seconds(w.end_time)
        cur_seg += w.word + " "
        if end_time > cur_lim:
            cur_lim += end_time
            segments.append({
                "text": cur_seg.strip(),
                "start_time": cur_start_time,
                "end_time": end_time,
            })
            cur_seg = ""
            cur_start_time = to_seconds(w.start_time)

    segments.append({
        "text": cur_seg.strip(),
        "start_time": cur_start_time,
        "end_time": end_time,
    })

    return segments

def to_seconds(ts):
    res = 0.0;
    if hasattr(ts, 'seconds'):
        res += ts.seconds
    if hasattr(ts, 'nanos'):
        res += ts.nanos / 1_000_000_000
    if hasattr(ts, 'minutes'):
        res += ts.minutes * 60
    if hasattr(ts, 'hours'):
        res += ts.hours * 3600  
    return res