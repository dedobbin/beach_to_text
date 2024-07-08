import os, sys, json, argparse, math
from dotenv import load_dotenv
from speech_to_text import *

def main():
    load_dotenv()
    file_path, n_seconds = parse_arguments()

    speech_to_text_initialize()

    texts = audio_file_to_text(file_path)

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
    
    print(result)

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
        n_seconds = float('inf')
    
    return file_path, n_seconds

if __name__ == '__main__':
    main()