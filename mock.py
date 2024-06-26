import json

class SpeechRecognitionAlternativeMock:
    def __init__(self, transcript, confidence, words):
        self.transcript = transcript
        self.confidence = confidence
        self.words = words

    def __str__(self):
        result = ""
        result += f"{type(self)}\n";
        result += f"transcript: {self.transcript}\n"
        result += f"confidence: {self.confidence}\n"
        for w in self.words:
            result += "words {"
            result += str(w)
            result += "\n}\n"
        return result

class WordMock:
    def __init__(self, start_time, end_time, word):
        self.start_time = start_time    
        self.end_time = end_time
        self.word = word
        self.print_prefix = "  "
    
    def __str__(self):
        result = "\n" + self.print_prefix + "start_time {"
        result += self.print_prefix + str(self.start_time)
        result += "\n" + self.print_prefix + "}"
        result += "\n" + self.print_prefix + "end_time {"
        result += self.print_prefix + str(self.end_time)
        result += "\n" + self.print_prefix + "}"
        result += f"\n{self.print_prefix}word: {self.word}"
        return result

class WordTsMock:
    def __init__(self, json):
        self.nanos = 0.0
        self.seconds = 0.0
        self.minutes = 0.0
        self.hours = 0.0
        self.print_prefix = "    "

        if 'seconds' in json: 
            self.seconds = json['seconds']
        if 'nanos' in json:
            self.nanos = json['nanos']
        if 'minutes' in json:
            self.minutes = json['minutes']
        if 'hours' in json:
            self.hours = json['hours']
    
    def __str__(self):
        result = ""
        if self.hours > 0:
            result += f"\n{self.print_prefix}hours: {self.hours}"
        if self.minutes > 0:
            result += f"\n{self.print_prefix}minutes: {self.minutes}"
        if self.seconds > 0:
            result += f"\n{self.print_prefix}seconds: {self.seconds}"
        if self.nanos > 0:
            result += f"\n{self.print_prefix}nanos: {self.nanos}"
        return result

    def to_seconds(self):
        res = 0.0;
        res += self.seconds
        res += self.nanos / 1_000_000_000
        res += self.minutes * 60
        res += self.hours * 3600  
        return res

def mock_to_text():
    result = []
    with open("mock/to_text.json", 'r') as file:
        data = json.load(file)
    for e in data:
        # print(e)
        words = e["words"]
        mock_words = []
        for w in words:
            start_ts = WordTsMock(w["start_time"])
            end_ts = WordTsMock(w["end_time"])
            mock_w = WordMock(start_ts, end_ts, w["word"]);
            mock_words.append(mock_w)

        alternative = SpeechRecognitionAlternativeMock(
            e["transcript"], 
            e["confidence"],
            mock_words
        )
        result.append(alternative)

    return result