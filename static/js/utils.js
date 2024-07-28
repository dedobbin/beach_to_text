function is_elem_on_screen(el) 
{
    const rect = el.getBoundingClientRect();
    const window_h = window.innerHeight || document.documentElement.clientHeight;
    const window_w = window.innerWidth || document.documentElement.clientWidth;

    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= window_h &&
        rect.right <= window_w
    );
}

function rand()
{
    return Math.floor(Math.random() * 100000);
}

function get_extension(path) 
{
    const index = path.lastIndexOf('.');
    return index !== -1 ? path.substring(index + 1) : null;
}

function buffer_to_wave(audio_buffer, len) {
    let n_channels = audio_buffer.numberOfChannels,
        length = len * n_channels * 2 + 44,
        buffer = new ArrayBuffer(length),
        view = new DataView(buffer),
        channels = [],
        i,
        sample,
        offset = 0,
        pos = 0;

    set_uint32(0x46464952); // "RIFF"
    set_uint32(length - 8); 
    set_uint32(0x45564157); // "WAVE"

    set_uint32(0x20746d66); // "fmt "
    set_uint32(16); // length = 16
    set_uint16(1); // PCM (uncompressed)
    set_uint16(n_channels);
    set_uint32(audio_buffer.sampleRate);
    set_uint32(audio_buffer.sampleRate * 2 * n_channels); // bytes/sec
    set_uint16(n_channels * 2); // block-align
    set_uint16(16); // 16-bit samples

    set_uint32(0x61746164); // "data"
    set_uint32(length - pos - 4); // chunk length

    for (i = 0; i < audio_buffer.numberOfChannels; i++) {
        channels.push(audio_buffer.getChannelData(i));
    }
    try {
        while (pos < length) {
            for (i = 0; i < n_channels; i++) { 
                sample = Math.max(-1, Math.min(1, channels[i][offset]));
                sample = (0.5 + sample * 32767) | 0; 
                view.setInt16(pos, sample, true); 
                pos += 2;
            }
            offset++; // next source sample
        }
    } catch (e) {
        if (e instanceof RangeError) {
            console.error('This error always happens... should be fine though', e);
        } else {
            throw e;
        }
    }

    return new Blob([buffer], { type: "audio/wav" });

    function set_uint16(data) {
        view.setUint16(pos, data, true);
        pos += 2;
    }

    function set_uint32(data) {
        view.setUint32(pos, data, true);
        pos += 4;
    }
}