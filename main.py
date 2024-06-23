#pip3 install google-cloud-speech
#pip3 install python-dotenv

from google.cloud import speech
import io, os
from dotenv import load_dotenv

def main():
    load_dotenv()
    client = None
    try:
        client = speech.SpeechClient()
    except Exception as e:
        print(f"{type(e).__name__} happend: {str(e)}")
        exit(1)
    
    file_name = os.getenv("INPUT_FILE")
    with io.open(file_name, "rb") as audio_file:
        content = audio_file.read()
        audio = speech.RecognitionAudio(content=content)
    
    config = speech.RecognitionConfig(
        encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
        enable_automatic_punctuation=True,
        audio_channel_count=2,
        language_code="nl-NL",
    )
    response = client.recognize(request={"config": config, "audio": audio})# Reads the response
    for result in response.results:
        print("Transcript: {}".format(result.alternatives[0].transcript))

if __name__ == '__main__':
    main()