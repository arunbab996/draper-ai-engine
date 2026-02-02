export const extractFramesFromVideoFile = async (videoFile, frameCount = 8) => {
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
      // Calculate specific timestamps to capture
      const timePoints = [];
      for (let i = 0; i < frameCount; i++) {
        timePoints.push((duration / frameCount) * i);
      }

      // Process frames sequentially
      for (const time of timePoints) {
        await new Promise((seekResolve) => {
          video.currentTime = time;
          video.onseeked = () => {
            // --- SPEED OPTIMIZATION: Resize to 384px width ---
            // This is small enough for fast upload but big enough for AI to see details.
            const scaleFactor = 384 / video.videoWidth;
            canvas.width = 384;
            canvas.height = video.videoHeight * scaleFactor;

            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // --- SPEED OPTIMIZATION: Reduce Quality to 0.4 ---
            // Compresses the image size significantly to beat Vercel timeouts.
            frames.push(canvas.toDataURL('image/jpeg', 0.4));
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
    
    // Use Mono channel (1) to reduce audio size by half
    const offlineContext = new OfflineAudioContext(
      1, 
      audioBuffer.length,
      audioBuffer.sampleRate
    );

    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineContext.destination);
    source.start();

    const renderedBuffer = await offlineContext.startRendering();
    
    return bufferToWave(renderedBuffer, renderedBuffer.length);
  } catch (e) {
    console.warn("Audio extraction failed or file has no audio", e);
    return null; 
  }
};

// Helper function to convert AudioBuffer to WAV format
function bufferToWave(abuffer, len) {
  let numOfChan = abuffer.numberOfChannels;
  let length = len * numOfChan * 2 + 44;
  let buffer = new ArrayBuffer(length);
  let view = new DataView(buffer);
  let channels = [], i, sample;
  let offset = 0;
  let pos = 0;

  // RIFF identifier
  setUint32(0x46464952);                         
  setUint32(length - 8);                         
  // WAVE identifier
  setUint32(0x45564157);                         

  // fmt chunk identifier
  setUint32(0x20746d66);                         
  setUint32(16);                                 
  setUint16(1);                                  
  setUint16(numOfChan);
  setUint32(abuffer.sampleRate);
  setUint32(abuffer.sampleRate * 2 * numOfChan); 
  setUint16(numOfChan * 2);                      
  setUint16(16);                                 

  // data chunk identifier
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
