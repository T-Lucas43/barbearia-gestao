export default function Brand({
  light = false,
  compact = false,
}: {
  light?: boolean;
  compact?: boolean;
}) {
  return (
    <img
      className={"elares-brand" + (compact ? " compact" : "")}
      src={`/brand/elares-barber-${light ? "light" : "dark"}.svg`}
      width={220}
      height={58}
      alt="Elares Barber"
    />
  );
}
