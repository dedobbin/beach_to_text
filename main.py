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
    texts = file_to_speech(file_name)
    for e in texts:
        #print(e)
        subs = cut_subs(e, 2)
        print(subs)

def cut_subs(text, n_seconds):
    segments = []
    current_segment = ""
    current_n_seconds = n_seconds

    for word in text.words:
        # Convert word start_time and end_time to seconds
        word_start_time = to_seconds(word.start_time)
        word_end_time = to_seconds(word.end_time)

        if word_start_time > current_n_seconds:
            # Append the current segment to segments list and reset current_segment
            segments.append(current_segment.strip())
            current_segment = ""
            # Increase n_seconds
            current_n_seconds += word_end_time

        # Add the word to the current segment
        current_segment += word.word + " "

    # Add the last segment if it's not empty
    if current_segment:
        segments.append(current_segment.strip())

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

if __name__ == '__main__':
    main()