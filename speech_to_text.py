import io
from google.cloud import speech
speech_client = None

def speech_to_text_initialize():
    global speech_client
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

    if (speech_client is None):
        print("Cannot convert to text, no speech client is initialized")
        return None
    audio = speech.RecognitionAudio(content=raw_audio)
    config = speech.RecognitionConfig(
        encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
        enable_automatic_punctuation=True,
        audio_channel_count=2,
        language_code="nl-NL",
    )

    transcripts = []

    response = speech_client.recognize(request={"config": config, "audio": audio})# Reads the response
    for result in response.results:
        if not result.alternatives:
            continue

        transcripts.append(result.alternatives[0].transcript)

        # print(f"Result: {result}")
        # print(f"Transcript: {result.alternatives[0].transcript}")
        # print(f"Confidence: {result.alternatives[0].confidence}") 
        # print(f"End time: {result.result_end_time}") 
        # if result.alternatives[0].words:
        #     for word_info in result.alternatives[0].words:
        #         start_time = word_info.start_time.seconds + word_info.start_time.nanos * 1e-9
        #         end_time = word_info.end_time.seconds + word_info.end_time.nanos * 1e-9
        #         word = word_info.word
        #         print(f"Word: {word}, Start Time: {start_time:.2f}, End Time: {end_time:.2f}")
        # else:
        #     print("No word-level timestamp information available for this alternative.")
    
    return transcripts