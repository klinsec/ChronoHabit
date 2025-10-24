export const formatDuration = (ms, showHundredths = false) => {
  if (ms < 0) ms = 0;
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (num) => num.toString().padStart(2, '0');

  if (showHundredths) {
    const hundredths = Math.floor((ms % 1000) / 10);
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}.${pad(hundredths)}`;
  }

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

export const formatDate = (timestamp) => {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Hoy';
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Ayer';
  }
  return date.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};
