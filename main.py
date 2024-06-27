import os, sys, json, argparse, math
from dotenv import load_dotenv
from speech_to_text import *

def main():
    load_dotenv()
    file_path, n_seconds = parse_arguments()

    speech_to_text_initialize()

    texts = file_to_speech(file_path)

    result = []
    for e in texts:
        #print(e)
        for f in cut_subs(e, n_seconds):
            result.append(f)
    print(json.dumps(result))

def parse_arguments():
    parser = argparse.ArgumentParser(description="beach to text jajajaj")
    parser.add_argument('-f', '--file_path', type=str, help="Path to input file.")
    parser.add_argument('-s', '--n_seconds', type=float, help="Number of seconds per segment")

    args = parser.parse_args()

    file_path = args.file_path
    if not file_path:
        file_path = os.getenv("INPUT_FILE")
    if not file_path:
        raise ValueError("No input file path provided. Please specify either as an argument (-f) or set INPUT_FILE environment variable.")

    n_seconds = args.n_seconds
    if not n_seconds:
        #TODO: make it optional to cut segments instead of this hack
        n_seconds = float('inf')
    
    return file_path, n_seconds


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