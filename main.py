import os, sys, json
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

    segment_n_seconds = 2 # TODO: get as cmdline arg
    file_name = os.getenv("INPUT_FILE")
    texts = file_to_speech(file_name)

    result = []
    for e in texts:
        #print(e)
        for f in cut_subs(e, segment_n_seconds):
            result.append(f)
    print(json.dumps(result))
    
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

if __name__ == '__main__':
    main()