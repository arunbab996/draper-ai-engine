export const extractFramesFromVideoFile = async (videoFile, frameCount = 4) => { // REDUCED TO 4 FRAMES
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const frames = [];
    const videoUrl = URL.createObjectURL(videoFile);

    video.src = videoUrl;
    video.crossOrigin = 'anonymous';
    video.muted = true;

    video.onloadedmetadata = async () => {
      const duration = video.duration;
      const timePoints = [];
      for (let i = 0; i < frameCount; i++) {
        timePoints.push((duration / frameCount) * i);
      }

      for (const time of timePoints) {
        await new Promise((seekResolve) => {
          video.currentTime = time;
          video.onseeked = () => {
            // --- SPEED OPTIMIZATION: 256px is the "AI Sweet Spot" for speed ---
            const scaleFactor = 256 / video.videoWidth;
            canvas.width = 256;
            canvas.height = video.videoHeight * scaleFactor;

            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // --- SPEED OPTIMIZATION: Heavy Compression (0.3) ---
            frames.push(canvas.toDataURL('image/jpeg', 0.3));
            seekResolve();
          };
        });
      }

      URL.revokeObjectURL(videoUrl);
      resolve({ frames, duration });
    };

    video.onerror = (e) => reject(e);
  });
};

export const extractAudioFromVideo = async (videoFile) => {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;

  try {
    const arrayBuffer = await videoFile.arrayBuffer();
    const audioContext = new AudioContext();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    // --- SPEED OPTIMIZATION: Cap at 30 Seconds ---
    // Prevents Whisper from hanging on long files.
    const maxDuration = 30; 
    const trimDuration = Math.min(audioBuffer.duration, maxDuration);
    const trimLength = trimDuration * audioBuffer.sampleRate;

    const offlineContext = new OfflineAudioContext(
      1, // Mono (Stereo is unnecessary for speech)
      trimLength,
      audioBuffer.sampleRate
    );

    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineContext.destination);
    source.start(0, 0, trimDuration);

    const renderedBuffer = await offlineContext.startRendering();
    
    return bufferToWave(renderedBuffer, renderedBuffer.length);
  } catch (e) {
    console.warn("Audio extraction failed", e);
    return null; 
  }
};

function bufferToWave(abuffer, len) {
  let numOfChan = abuffer.numberOfChannels;
  let length = len * numOfChan * 2 + 44;
  let buffer = new ArrayBuffer(length);
  let view = new DataView(buffer);
  let channels = [], i, sample;
  let offset = 0;
  let pos = 0;

  setUint32(0x46464952);                         
  setUint32(length - 8);                         
  setUint32(0x45564157);                         

  setUint32(0x20746d66);                         
  setUint32(16);                                 
  setUint16(1);                                  
  setUint16(numOfChan);
  setUint32(abuffer.sampleRate);
  setUint32(abuffer.sampleRate * 2 * numOfChan); 
  setUint16(numOfChan * 2);                      
  setUint16(16);                                 

  setUint32(0x61746164);                         
  setUint32(length - pos - 4);                   

  for(i = 0; i < abuffer.numberOfChannels; i++)
    channels.push(abuffer.getChannelData(i));

  while(pos < length) {
    for(i = 0; i < numOfChan; i++) {             
      sample = Math.max(-1, Math.min(1, channels[i][offset])); 
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767)|0; 
      view.setInt16(pos, sample, true);          
      pos += 2;
    }
    offset++; 
  }

  let blob = new Blob([buffer], {type: "audio/wav"});
  return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => resolve(reader.result);
  });

  function setUint16(data) { view.setUint16(pos, data, true); pos += 2; }
  function setUint32(data) { view.setUint32(pos, data, true); pos += 4; }
}
