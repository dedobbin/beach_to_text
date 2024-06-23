#pip3 install google-cloud-speech
#pip3 install python-dotenv

import os, sys
from dotenv import load_dotenv
from speech_to_text import *

def main():
    load_dotenv()
    if len(sys.argv) > 1:
        file_path = sys.argv[1]
    else:
        file_path = os.getenv("INPUT_FILE")
        if not file_path:
            raise ValueError("No input file path provided. Please specify either as an argument or set INPUT_FILE environment variable.")

    speech_to_text_initialize()

    file_name = os.getenv("INPUT_FILE")
    transcripts = file_to_speech(file_name)
    for e in transcripts:
        print(e)

if __name__ == '__main__':
    main()