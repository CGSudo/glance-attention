export async function* sampleVideoFrames(file: Blob) {
  if (file.type.startsWith('image/')) {
    yield { frame: file, t: 0, progress: 50 };
    return;
  }
  const video = document.createElement('video');
  const url = URL.createObjectURL(file);
  video.preload = 'auto';
  video.muted = true;
  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error('Cannot decode this video. Choose a browser-supported video format.'));
      video.src = url;
    });
    if (!Number.isFinite(video.duration) || video.duration <= 0) throw new Error('Video duration is unavailable');
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Video decoding is unavailable');
    let size = 0;
    const count = Math.ceil(video.duration * 5);
    for (let index = 0; index < count; index++) {
      const t = index / 5;
      if (video.currentTime !== t) {
        await new Promise<void>((resolve, reject) => {
          video.onseeked = () => resolve();
          video.onerror = () => reject(new Error('Video frame decoding failed'));
          video.currentTime = t;
        });
      }
      context.drawImage(video, 0, 0);
      const frame = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Video frame encoding failed')), 'image/png');
      });
      size += frame.size;
      if (size > 25 * 1024 * 1024) throw new Error('Sampled frames exceed 25 MB. Choose a shorter or smaller video.');
      yield { frame, t, progress: Math.round(((index + 1) / count) * 50) };
    }
  } finally {
    video.removeAttribute('src');
    video.load();
    URL.revokeObjectURL(url);
  }
}
