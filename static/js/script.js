const Mode = {
    FREE_PLAY : "free play",
    INPUT : "input"
};

let mode = Mode.FREE_PLAY;

let selected_sub_index = -1;
let last_selected_sub_index = -1;
let subtitles = []

let dragged_sub = null;

function set_overlay(yes=true)
{
    if (yes){
        document.getElementById("overlay").style.visibility = "initial";
    } else {
        document.getElementById("overlay").style.visibility = "hidden";
    }
}

function change_mode(new_mode){
    if (mode == new_mode) return; 

    console.log(`[debug] Mode set to ${new_mode}`)
    mode = new_mode;
}

function add_subtitle(subtitle){
    // if (subtitle.start_time > subtitle.end_time){
    //     console.error(`Tfried to add subtitle with bogus timestamps, rejecting ${subtitle}`);
    //     return;
    // }
    console.log(`[debug] Adding new sub ${subtitle}`);
    subtitles.push(subtitle);
    subtitles.sort((a, b)=> a.start_time > b.start_time);
}

function delete_subtitle(i)
{
    if (subtitles[i]){
        if (selected_sub_index == i){
            deselect_sub();
        }
        subtitles.splice(i, 1);
        render_subtitles_on_timeline(subtitles);
    }
    document.activeElement.blur();
    change_mode(Mode.FREE_PLAY);
}

function render_subtitles_on_timeline(subtitles)
{
    let parent = document.querySelector('.horizontal-bar');
    const video_player = document.getElementById('video-player');

    video_player.addEventListener('play', e => {
        // Check if user is not creating new sub, if not we can switch to FREE_PLAY
        let elem_start_time = document.getElementById("subtitle-start-time");
        let elem_text = document.getElementById("text-start-time");
        if (!(selected_sub_index == -1 && elem_start_time.value)){
            change_mode(Mode.FREE_PLAY);
        }
    });

    // Clean all first
    document.querySelectorAll('.subtitle').forEach(function(subtitle) {
        subtitle.parentNode.removeChild(subtitle);
    });

    let z_index = subtitles.length+20;
    subtitles.forEach(e=> {
        //console.log(`[debug] Rendering subtitle ${e}`);
        const [start, end] = e.get_time_in_perc(video_player.duration);
        let sub = document.createElement("div");
        sub.classList.add("vertical-bar");
        sub.classList.add("subtitle");
        sub.setAttribute("data-unique-id", e.unique_id);
        sub.style.zIndex = z_index --;
        
        const parent_bar_w = parent.clientWidth;
        const position = (start / 100) * parent_bar_w;
        sub.style.left = `${position}px`;

        const end_position = (end / 100) * parent_bar_w;
        sub.style.width = `${end_position - position}px`;

        sub.addEventListener('mousedown', e=>{
            let stretch = 0;
            const mouse_x = e.clientX;
            let target_rect =  e.target.getBoundingClientRect();
            let scroll_left = document.getElementById("time-line-wrapper").scrollLeft;
            const target_x = target_rect.left;
            const mouse_offset_x = mouse_x - target_x;
            const target_w = target_rect.width;

            if (e.ctrlKey){
                const left_boundary = target_rect.left + (0.3 * target_w);
                const right_boundary = target_rect.right - (0.3 * target_w);
                if (mouse_x <= left_boundary){
                    stretch =-1;
                } else if (mouse_x >= right_boundary){
                    stretch = 1;
                }
            }

            dragged_sub = {element: e.target, mouse_offset_x, stretch, original_x: target_x + scroll_left, original_w: target_w};
            console.log(`[debug] Dragging ${dragged_sub.element.getAttribute("data-unique-id")}`)
        });

        parent.appendChild(sub);
    });

    let ts = document.getElementById("video-player").currentTime;
    select_sub_on_time(ts);
}

function subtitles_to_disk(subtitles)
{
    let content = "";
    subtitles.forEach(e=>{
        content += `${e.id}\n`;
        content += `${e.start_time} --> ${e.end_time}\n`;
        content += `${e.text ? e.text : " "}\n\n`;
    });
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('download', 'subs.srt');
    a.href = url;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function fix_subtitles(subtitles, fix_ids = true, pass = 0){
    console.log("[debug] Fixing subtitles");
    subtitles.sort((a, b)=> a.start_time > b.start_time);
    if (fix_ids){
        for (var i=0; i<subtitles.length; i++){
            subtitles[i].id = i+1;
        }
    }
    let tainted = false;
    for (let i=0; i<subtitles.length; i ++){
        if (subtitles[i].start_time > subtitles[i].end_time){
            console.log(`Subtitle has messed up times ${subtitles[i].start_time} --> ${subtitles[i].end_time}`);
            tainted = true;
            const tmp = subtitles[i].start_time;
            subtitles[i].start_time = subtitles[i].end_time
            subtitles[i].end_time = tmp;
        } 
        if (subtitles[i].start_time == subtitles[i].end_time){
            tainted = true;
            let seconds = convert_to_seconds(subtitles[i].end_time);
            subtitles[i].end_time = format_time(seconds+2);
        }
    } 

    subtitles.sort((a, b)=> a.start_time > b.start_time);
    for (let i=0; i<subtitles.length-1; i ++){
        if (subtitles[i].end_time >= subtitles[i+1].start_time){
            console.log(`[debug] Subtitle has overlap ${subtitles[i].end_time} and ${subtitles[i+1].start_time}`);
            tainted = true;
            let new_start_time_seconds = convert_to_seconds(subtitles[i].end_time);
            new_start_time_seconds += 0.1;
            subtitles[i+1].start_time = format_time(new_start_time_seconds);

            // TODO: test;
            if (subtitles[i+1].start_time > subtitles[i+1].end_time){
                let new_time = convert_to_seconds(subtitles[i+1].end_time);
                new_time += 10;
                new_time = format_time(new_time);

                subtitles[i+1].end_time = new_time;
            }
        }
    }
    // Dirty brute force lazy..
    if (tainted){
        if (pass > 5){
            console.error("Subtitles seem broken beyond repair");
            return;
        }
        console.log("[debug] Another fix pass could be required..");
        fix_subtitles(subtitles, fix_ids, pass+1);
        return;
    }
    subtitles.sort((a, b)=> a.start_time > b.start_time);
    render_subtitles_on_timeline(subtitles);
    console.log("[debug] Fixing subtitles done");
}

function display_selected_subtitle()
{
    const subtitle = subtitles[selected_sub_index];
    if (!subtitle){
        return;
    }
    let elem_wrapper = document.getElementById("sub-info");
    elem_wrapper.setAttribute("unique-id", subtitle.unique_id);
    let elem_id = document.getElementById("subtitle-id");
    let elem_start_time = document.getElementById("subtitle-start-time");
    let elem_end_time = document.getElementById("subtitle-end-time");
    let elem_text = document.getElementById("subtitle-text");
    elem_id.value = subtitle.id;
    elem_start_time.value = subtitle.start_time;
    elem_end_time.value = subtitle.end_time;
    elem_text.value = subtitle.text;
}

function generate_selected_subtitle()
{
    const sub = subtitles[selected_sub_index]
    if (!sub){
        alert("Please select a sub");
        return;
    }

    if (document.querySelector("#sub-info #subtitle-text").value){
        if (!confirm("This will delete current selected sub"))
            return;
    }

    make_clip(convert_to_seconds(sub.start_time), convert_to_seconds(sub.end_time)).then(new_subs=>{
        if (!new_subs){
            alert("Failed to get subtitles from server");
            return;
        }                
        let original_start = convert_to_seconds(subtitles[selected_sub_index].start_time);
        delete_subtitle(selected_sub_index);
        new_subs.forEach(raw=>{
            let sub = new Subtitle(format_time(original_start + raw.start_time), format_time(original_start + raw.end_time), raw.text)
            add_subtitle(sub)
        });
        fix_subtitles(subtitles)
    })
}

function save_displayed_to_selected_subtitle()
{
    let elem_wrapper = document.getElementById("sub-info");
    let elem_id = document.getElementById("subtitle-id");
    let elem_start_time = document.getElementById("subtitle-start-time");
    let elem_end_time = document.getElementById("subtitle-end-time");
    let elem_text = document.getElementById("subtitle-text");
    const unique_id = elem_wrapper.getAttribute("unique-id")
    
    if (elem_start_time.value == "" && elem_end_time.value == "" && elem_text.value == ""){
        console.log("[debug] No valid entry, not saving");
        return;
    }

    // const start_time = elem_start_time.value;
    // const end_time = elem_end_time.value;
    // if (start_time > end_time){
    //     console.error(`Tried to updating subtitle with bogus timestamps, rejecting ${subtitle}`);
    //     return;
    // }

    if (subtitles[selected_sub_index] == undefined){
        const video_player = document.getElementById("video-player");
        let new_sub = new Subtitle();
        new_sub.unique_id = unique_id ?? rand(); 
        new_sub.id = elem_id.value != "" ? parseInt(elem_id.value) : -1;
        new_sub.start_time = elem_start_time.value != "" ? elem_start_time.value : format_time(video_player.currentTime);
        new_sub.end_time = elem_end_time.value != "" ? elem_end_time.value : format_time(video_player.currentTime);
        new_sub.text = elem_text.value;
        if (new_sub.start_time > new_sub.end_time){
            const tmp = new_sub.start_time;
            new_sub.start_time = new_sub.end_time;
            new_sub.end_time = tmp;
        }
        add_subtitle(new_sub);
        for (let i = 0; i < subtitles.length; i++) {
            if (subtitles[i].unique_id == new_sub.unique_id) {
                select_sub(i);
            }
        }

    } else {
        subtitles[selected_sub_index].unique_id = parseInt(unique_id); 
        subtitles[selected_sub_index].id = parseInt(elem_id.value);
        subtitles[selected_sub_index].start_time = elem_start_time.value;
        subtitles[selected_sub_index].end_time = elem_end_time.value;
        subtitles[selected_sub_index].text = elem_text.value;
        if (subtitles[selected_sub_index].start_time > subtitles[selected_sub_index].end_time){
            const tmp = subtitles[selected_sub_index].start_time;
            subtitles[selected_sub_index].start_time = subtitles[selected_sub_index].end_time;
            subtitles[selected_sub_index].end_time = tmp;
        }
        subtitles.sort((a, b)=> a.start_time > b.start_time);
    }
    render_subtitles_on_timeline(subtitles);
    document.activeElement.blur();
    change_mode(Mode.FREE_PLAY);
}

function select_sub(n)
{
    //TODO reset prev selected sub color
    if (!subtitles[n]){
        console.log(`[debug] select_sub, invalid entry ${n}`);
        return;
    }
    last_selected_sub_index = selected_sub_index;
    if (subtitles[selected_sub_index]){
        //console.log(`[debug] Removing selected from ${selected_sub_index}`)
        let query = `[data-unique-id="${subtitles[selected_sub_index].unique_id}"]`;
        elem = document.querySelector(query);
        elem.classList.remove("selected");
        //save_displayed_to_selected_subtitle();
    }
    
    let query = `[data-unique-id="${subtitles[n].unique_id}"]`;
    selected_sub_index = n;
    elem = document.querySelector(query);
    if (!elem){
        // Means the subtitle was known but not drawn, so first update the subtitles
        render_subtitles_on_timeline(subtitles);
        elem = document.querySelector(query);
        if (!elem){
            console.error(`Cannot select visual subtitle, does not exist on timeline`)
        }
    }
    elem.classList.add("selected");
}

function deselect_sub(){
    //save_displayed_to_selected_subtitle();
    if (subtitles[selected_sub_index]){
        let query = `[data-unique-id="${subtitles[selected_sub_index].unique_id}"]`;
        elem = document.querySelector(query);
        elem.classList.remove("selected");
    }
    last_selected_sub_index = selected_sub_index;
    selected_sub_index = -1;
    let elem_wrapper = document.getElementById("sub-info");
    elem_wrapper.removeAttribute("unique-id")
    document.getElementById("subtitle-id").value = "";
    document.getElementById("subtitle-start-time").value = "";
    document.getElementById("subtitle-end-time").value = "";
    document.getElementById("subtitle-text").value = "";
}

function select_sub_on_time(time_num){
    const prev_selected = selected_sub_index;
    let time = format_time(time_num);
    for (let i = 0; i < subtitles.length; i++){
        const s = subtitles[i];
        if (time >= s.start_time && time < s.end_time){
            select_sub(i);
            display_selected_subtitle();
            break;
        }
        deselect_sub();
    }
}

function select_next_subtitle(prev){
    const video_player = document.getElementById("video-player");
    let i = 0;
    if (!prev){
        for (i = 0; i < subtitles.length; i++){
            const start_time = convert_to_seconds(subtitles[i].start_time);
            if (start_time > video_player.currentTime){
                video_player.currentTime = start_time;
                break; 
            }
        }
    } else {
        for (i = subtitles.length - 1; i >= 0; i--){
            const end_time = convert_to_seconds(subtitles[i].end_time);
            if (end_time < video_player.currentTime){
                video_player.currentTime = convert_to_seconds(subtitles[i].start_time);
                break;
            }
        }
    }
    if (subtitles[i]){
        const elem = document.querySelector(`#time-line [data-unique-id="${subtitles[i].unique_id}"]`)
        if (!is_elem_on_screen(elem)){
            document.getElementById("time-line-wrapper").scrollLeft = elem.style.left.replace("px","");
        }
    }
}

function move_cursor(percentage) {
    const horizontal_bar = document.querySelector('.horizontal-bar');
    const ptr = document.getElementById('cursor');
    
    const bar_w = horizontal_bar.clientWidth;
    const position = (percentage / 100) * bar_w;
    ptr.style.left = `${position}px`;
}

async function handle_srt_file(file)
{
    if (file.name.endsWith('.srt')) {
        const content = await file.text();
        subtitles = srt_to_subtitles(content);
        render_subtitles_on_timeline(subtitles);
    }
}

function clear_fields()
{
    document.getElementById("load-input").value = "";
    document.getElementById("subtitle-id").value = "";
    document.getElementById("subtitle-start-time").value = "";
    document.getElementById("subtitle-end-time").value = "";
    document.getElementById("subtitle-text").value = "";
}

function time_line_zoom(n, video_element)
{
    if (!video_element){
        video_element = document.getElementById("video-player");
    }
    const elem_time_line = document.getElementById("time-line");
    let w = elem_time_line.getBoundingClientRect().width;
    w+=n;
    elem_time_line.style.width = `${w}px`;
    render_subtitles_on_timeline(subtitles);

    const current_time = video_element.currentTime;
    const total_time = video_element.duration;
    const percentage_played = (current_time / total_time) * 100;
    move_cursor(percentage_played);
}

async function make_clip(start_time, end_time)
{
    const elem_video = document.getElementById('video-player');
    if (elem_video.readyState < 3) { 
        alert("Video not ready to play");
        return;
    }
    elem_video.pause();

    const duration = end_time - start_time;
    if (duration < 0){
        duration = -duration;
    }
    set_overlay(true);
    console.log(`[debug] Will get audio ${start_time} --> ${end_time}`);
    const video_url = elem_video.querySelector("source").getAttribute("src");
    const response = await fetch(video_url);
    const video_blob = await response.blob();
    const audio_context = new AudioContext();

    const array_buffer = await video_blob.arrayBuffer();
    const audio_buffer = await audio_context.decodeAudioData(array_buffer);

    const offline_context = new OfflineAudioContext(
        audio_buffer.numberOfChannels,
        audio_buffer.sampleRate * duration,
        audio_buffer.sampleRate
    );

    const source = offline_context.createBufferSource();
    const segment = offline_context.createBuffer(
        audio_buffer.numberOfChannels,
        audio_buffer.sampleRate * duration,
        audio_buffer.sampleRate
    );

    for (let channel = 0; channel < audio_buffer.numberOfChannels; channel++) {
        const data = audio_buffer.getChannelData(channel).subarray(
            start_time * audio_buffer.sampleRate,
            end_time * audio_buffer.sampleRate
        );
        segment.copyToChannel(data, channel, 0);
    }

    source.buffer = segment;
    source.connect(offline_context.destination);
    source.start();

    console.log("[debug] Offline context start rendering..");
    const rendered_buffer = await offline_context.startRendering();
    console.log("[debug] Converting buffer to wave..");
    const audio_blob = buffer_to_wave(rendered_buffer, duration * audio_buffer.sampleRate);
    
    // const audio_url = URL.createObjectURL(audio_blob);
    // const a = document.createElement('a');
    // a.href = audio_url;
    // a.download = 'audio_segment.wav';
    // document.body.appendChild(a);
    // a.click();
    // document.body.removeChild(a);    
    // URL.revokeObjectURL(audio_url);


    const form_data = new FormData();
    form_data.append('audio', audio_blob, "audio_segment.wav");
    form_data.append('n_seconds', 2);
    result = null;
    console.log("[debug] Sending wave file to server..");
    try {
        const response = await fetch('/beach_to_text', {
            method: 'POST',
            body: form_data
        });

        if (!response.ok) {
            throw new Error('Network response was not ok ' + response.statusText);
        }

        result = await response.json();
        //console.log('File uploaded successfully:', result);
    } catch (error) {
        console.error('Error uploading file:', error);
    }

    audio_context.close();
    set_overlay(false);
    return result;
}

document.addEventListener('DOMContentLoaded', (event) => {
    clear_fields();
    move_cursor(0);
    time_line_zoom(1);
    set_overlay(false)
    add_subtitle(new Subtitle("0:0:0,517", "0:1:48,780", "fgfdg"))

    const video_player = document.getElementById('video-player');
    const elem_cursor = document.getElementById("cursor");
    video_player.addEventListener('timeupdate', ()=>{
        const current_time = video_player.currentTime;
        const total_time = video_player.duration;
    
        const percentage_played = (current_time / total_time) * 100;
        move_cursor(percentage_played);

        if (mode == Mode.FREE_PLAY){
            select_sub_on_time(current_time);
        }
    });

    video_player.addEventListener('seeked', (event) => {
        if (subtitles[selected_sub_index]){
            save_displayed_to_selected_subtitle();
        }

        // I think this is redundant since on timeupdate will take care of this anyway..s
        if (mode == Mode.FREE_PLAY){
            select_sub_on_time(video_player.currentTime)
        }
    });

    // TODO: this doesn't always fire?
    video_player.onloadedmetadata = function () {
        render_subtitles_on_timeline(subtitles);
    };

    video_player.addEventListener("play", e=>{
        if (subtitles[selected_sub_index]){
            save_displayed_to_selected_subtitle();
        }
        //change_mode(Mode.FREE_PLAY);
    });

    document.addEventListener('wheel', e=>{
        if (e.ctrlKey && (e.deltaY > 0 || e.deltaY < 0)){
            let w = 0;
            if (e.deltaY < 0){
                w+=200;
            } else if(e.deltaY >0){
                w-=200;
            }
            
            time_line_zoom(w);
            
            e.preventDefault();
        }
    }, { passive: false });

    document.getElementById("save-all-button").addEventListener("click", e=>{
        subtitles_to_disk(subtitles);
    });
    document.getElementById("save-button").addEventListener("click", e=>{
        save_displayed_to_selected_subtitle();
    });
    document.getElementById("delete-button").addEventListener("click", e=>{
        delete_subtitle(selected_sub_index);
        deselect_sub();
    });
    document.getElementById("generate-button").addEventListener("click", e=>{
        generate_selected_subtitle();
    });

    document.getElementById("fix-button").addEventListener("click", e=>{
        if (confirm("fix subs?")) {
            fix_subtitles(subtitles);
        } 
    });

    const elem_load_input = document.getElementById('load-input');
    elem_load_input.addEventListener('change', async (event) => {
        const files = event.target.files;
        let file = files[0];
        await handle_srt_file(file);
    });
    
    document.querySelectorAll('#subtitle-id, #subtitle-start-time, #subtitle-end-time, #subtitle-text').forEach(e=>{
        e.addEventListener('focus', change_mode.bind(this, Mode.INPUT));
    });

    document.getElementById("subtitle-text").addEventListener("focus", e=>{
        const elem_start = document.getElementById("subtitle-start-time");
        if (!elem_start.value){
            elem_start.value = format_time(video_player.currentTime);
            selected_sub_index = -1;
        }
    });

    document.addEventListener('keydown', function(event) {        
        if (event.code === "Numpad6") {
            select_next_subtitle();
            event.preventDefault();
        } else if (event.code === "Numpad4"){
            select_next_subtitle(true);
            event.preventDefault();
        } else if (event.code === "Numpad0"){
            // const cur_time = format_time(video_player.currentTime);
            // record_new_sub(cur_time);

            const elem_start_time = document.getElementById("subtitle-start-time");
            if (!elem_start_time.value){
                let cur_time = video_player.currentTime;
                if (!video_player.paused){
                    const diff = 0.3;
                    cur_time -= diff;
                }
                cur_time = format_time(cur_time);
                elem_start_time.value = cur_time;
                selected_sub_index = -1;
                change_mode(Mode.INPUT);
            } else {
                save_displayed_to_selected_subtitle();
                fix_subtitles(subtitles, false);
            }

            event.preventDefault();
        } else if (event.code === ' '){
            delete_subtitle(selected_sub_index);
            deselect_sub();
        } else if (event.code == "Numpad7"){
            generate_selected_subtitle()
        } else if (event.code == "Numpad3"){
            let ts = video_player.currentTime;
            if (subtitles[selected_sub_index]){
                ts = convert_to_seconds(subtitles[selected_sub_index].start_time);
            } else {
                const cur_time = video_player.currentTime;
                if (subtitles.length > 0 && convert_to_seconds(subtitles[subtitles.length-1].end_time) < cur_time){
                    ts = convert_to_seconds(subtitles[subtitles.length-1].start_time);
                } else {
                    for (let i = 0; i < subtitles.length-1; i++){
                        if (convert_to_seconds(subtitles[i+1].start_time) > cur_time){
                            ts = convert_to_seconds(subtitles[i].start_time);
                            break;
                        }
                    }
                }
            }
            video_player.currentTime = ts;
            video_player.play();

            event.preventDefault();
        } else if (event.code == "Space"){
            if (document.activeElement.id == "subtitle-text"){
                return;
            }
            if (video_player.paused){
                video_player.play();
            } else {
                video_player.pause();
            }
            event.preventDefault();
        }
    });

    const elem_time_line = document.getElementById("time-line");
    elem_time_line.addEventListener("mousedown", e=>{
        if (subtitles[selected_sub_index]){
            save_displayed_to_selected_subtitle();
        }
        
        const bar_rect = elem_time_line.getBoundingClientRect();
        const click_x = e.clientX - bar_rect.left;
        const bar_w = bar_rect.width;
        const percentage = (click_x / bar_w) * 100;
        const ts = video_player.duration * (percentage/100);
        //console.log(`Clicked at ${percentage.toFixed(2)}%, time: ${ts}.`);
        if (subtitles[selected_sub_index]){
            save_displayed_to_selected_subtitle();
        }
        video_player.currentTime = ts;
        if (mode == Mode.FREE_PLAY){
            // I think this is redudant since timeupdate will also handle thiss
            select_sub_on_time(video_player.currentTime)
        }
    });

    elem_time_line.addEventListener("mousemove", e=>{
        if (!dragged_sub) {
            return;
        }
        const mouse_x = e.clientX;
        const relative_x = mouse_x - elem_time_line.getBoundingClientRect().left - dragged_sub.mouse_offset_x;
        if (dragged_sub.stretch == 0){
            dragged_sub.element.style.left = `${relative_x}px`;
        } else if (dragged_sub.stretch == -1){
            const n_stretched = dragged_sub.original_x - relative_x;
            dragged_sub.element.style.left = `${relative_x}px`;
            dragged_sub.element.style.width = `${dragged_sub.original_w+n_stretched}px`;
        } else if (dragged_sub.stretch == 1){
            const n_stretched = dragged_sub.original_x - relative_x;
            dragged_sub.element.style.width = `${dragged_sub.original_w-n_stretched}px`;
        } else {
            console.error(`Unknown stretch value: ${stretch}`);
        }
        // For some reason DOM doesn't reflect changes.. manually update it
        const old = document.querySelector(`[data-unique-id="${dragged_sub.element.getAttribute('data-unique-id')}"]`)
        old.replaceWith(dragged_sub.element);
    });

    document.addEventListener("mouseup", e=>{
        if (dragged_sub){
            const time_line_rect = document.getElementById("time-line").getBoundingClientRect();
            const mouse_x = e.clientX;
            const mouse_y = e.clientY;
            if (mouse_x >= time_line_rect.left && mouse_x <= time_line_rect.right &&
                mouse_y >= time_line_rect.top && mouse_y <= time_line_rect.bottom) {
                
                const unique_id = dragged_sub.element.getAttribute("data-unique-id");
                if (!unique_id){
                    console.log(`[debug] Cannot obtain unique ID of dragged subtitle`);
                    dragged_sub = null;
                    return;
                }
                
                //let relative_x = mouse_x - time_line_rect.left - dragged_sub.mouse_offset_x;
                let relative_x = mouse_x - elem_time_line.getBoundingClientRect().left - dragged_sub.mouse_offset_x;
                // Bit of a hack
                if (dragged_sub.stretch == 1){
                    relative_x += dragged_sub.original_w;
                }
                const percentage_left = (relative_x / time_line_rect.width) * 100;  
                const total_len = video_player.duration;
                let ts = (percentage_left / 100) * total_len;
                if (ts < 0){
                    ts = 0;
                }
                for (let i = 0; i < subtitles.length; i++){
                    if (subtitles[i].unique_id == unique_id){                        
                        if (dragged_sub.stretch == 0){
                            const sub_len = convert_to_seconds(subtitles[i].end_time) - convert_to_seconds(subtitles[i].start_time);
                            console.log(`[debug] Drag subs: ${subtitles[i].start_time} --> ${format_time(ts)}`);
                            subtitles[i].start_time = format_time(ts);
                            subtitles[i].end_time = format_time(ts + sub_len);
                        } else if (dragged_sub.stretch == -1){
                            subtitles[i].start_time = format_time(ts);
                        } else if (dragged_sub.stretch == 1){
                            subtitles[i].end_time = format_time(ts);
                        }
                        break;
                    }
                }
            }
            dragged_sub = null;
            // Always fix/ reset subtitles, because sub might have been dragged outside of timeline
            fix_subtitles(subtitles, false);
        }
    });
});
