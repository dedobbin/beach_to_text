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

def file_to_speech(path):
    with io.open(path, "rb") as audio_file:
        content = audio_file.read()
        return to_text(content)

def to_text(raw_audio):
    global speech_client
    if mock:
        return mock_to_text()
    
    if (speech_client is None):
        print("Cannot convert to text, no speech client is initialized")
        return None
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