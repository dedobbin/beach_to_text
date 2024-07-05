import io
from google.cloud import speech
from google.api_core.exceptions import InvalidArgument
from mock import *

speech_client = None

mock = False

def speech_to_text_initialize():
    global speech_client
    if (mock):
        return True
    
    try:
        speech_client = speech.SpeechClient()
        return True
    except Exception as e:
        print(f"{type(e).__name__} happend: {str(e)}")
        return False

def audio_file_to_text(path):
    with io.open(path, "rb") as audio_file:
        content = audio_file.read()
        return to_text(content)

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
        return []

    for result in response.results:
        if not result.alternatives:
            continue

        texts.append(result.alternatives[0])
    
    return texts

def cut_subs(text, n_seconds):
    segments = []
    current_segment = ""
    current_n_seconds = n_seconds

    for word in text.words:
        word_start_time = to_seconds(word.start_time)
        word_end_time = to_seconds(word.end_time)

        if word_start_time > current_n_seconds:
            segments.append({
                "text": current_segment.strip(),
                "start_time": word_start_time,
                "end_time": word_end_time,
            })
            current_segment = ""
            current_n_seconds += word_end_time

        current_segment += word.word + " "

    if current_segment:
        segments.append({
            "text": current_segment.strip(),
            "start_time": word_start_time,
            "end_time": word_end_time,
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