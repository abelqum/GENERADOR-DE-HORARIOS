export function timeToMinutes(time) {
  if (!time || typeof time !== "string") {
    return null;
  }

  const [hours, minutes] = time.split(":").map(Number);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return hours * 60 + minutes;
}

export function isValidTimeRange(startTime, endTime) {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);

  if (start === null || end === null) {
    return false;
  }

  return end > start;
}

export function timeRangesOverlap(
  firstStart,
  firstEnd,
  secondStart,
  secondEnd,
) {
  const firstStartMinutes = timeToMinutes(firstStart);
  const firstEndMinutes = timeToMinutes(firstEnd);
  const secondStartMinutes = timeToMinutes(secondStart);
  const secondEndMinutes = timeToMinutes(secondEnd);

  if (
    firstStartMinutes === null ||
    firstEndMinutes === null ||
    secondStartMinutes === null ||
    secondEndMinutes === null
  ) {
    return false;
  }

  return (
    firstStartMinutes < secondEndMinutes &&
    secondStartMinutes < firstEndMinutes
  );
}

export function formatTime(value) {
  if (!value) {
    return "Sin hora";
  }

  const [hours, minutes] = value.split(":");

  return `${hours}:${minutes}`;
}