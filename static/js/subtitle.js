class Subtitle {
    constructor(start_time, end_time, text){
        this.id = -1;
        this.start_time = start_time;
        this.end_time = end_time;
        this.text = text;
        this.unique_id = rand();
    }

    get_time_in_perc(total_time){
        let start = (convert_to_seconds(this.start_time)  / total_time) * 100;
        let end = (convert_to_seconds(this.end_time) / total_time) * 100;
        return [start, end]
    }

    toString() {
        return `${this.start_time} -> ${this.end_time}`;
    }
}


function convert_to_seconds(time_string) {
    const time_parts = time_string.split(":");
    const hours = parseInt(time_parts[0], 10);
    const minutes = parseInt(time_parts[1], 10);
    const seconds_and_millis = time_parts[2].split(",");
    const seconds = parseInt(seconds_and_millis[0], 10);
    const milliseconds = parseInt(seconds_and_millis[1], 10);
  
    const total_milliseconds = (hours * 3600 + minutes * 60 + seconds) * 1000 + milliseconds;
  
    return total_milliseconds / 1000;
}

function format_time(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remaining_seconds = Math.floor(seconds % 60);
    const milliseconds = Math.round((seconds - Math.floor(seconds)) * 1000);

    const formatted_hours = String(hours).padStart(2, '0');
    const formatted_minutes = String(minutes).padStart(2, '0');
    const formatted_seconds = String(remaining_seconds).padStart(2, '0');
    const formatted_milliseconds = String(milliseconds).padStart(3, '0');

    return `${formatted_hours}:${formatted_minutes}:${formatted_seconds},${formatted_milliseconds}`;
}

function srt_to_subtitles(srt)
{
    let segments = srt.split('\n\n');
    let result = [];
    segments.forEach(e => {
        if (e != "") {
            const [id, times, ...rest] = e.split("\n");
            const [start_time, end_time] = times.split("-->").map(e=>e.trim());
            const text = rest.join("\n");
            let s = new Subtitle(start_time, end_time, text);
            s.id = id;
            result.push(s);
        }
    });
    return result;
}