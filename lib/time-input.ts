export function minuteOf(hour: string) {
  return Number(hour.slice(0, 2)) * 60 + Number(hour.slice(3));
}
export function hourOf(minute: number) {
  return `${Math.floor(minute / 60)
    .toString()
    .padStart(2, "0")}:${(minute % 60).toString().padStart(2, "0")}`;
}
