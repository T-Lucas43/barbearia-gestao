export default function Brand({
  light = false,
  compact = false,
}: {
  light?: boolean;
  compact?: boolean;
}) {
  if (!light)
    return (
      <span className="brand-adaptive">
        <img
          className={
            "elares-brand brand-on-light" + (compact ? " compact" : "")
          }
          src="/brand/elares-barber-dark.svg?v=gold"
          width={220}
          height={58}
          alt="Elares Barber"
        />
        <img
          className={"elares-brand brand-on-dark" + (compact ? " compact" : "")}
          src="/brand/elares-barber-light.svg?v=gold"
          width={220}
          height={58}
          alt="Elares Barber"
        />
      </span>
    );
  return (
    <img
      className={"elares-brand" + (compact ? " compact" : "")}
      src={`/brand/elares-barber-${light ? "light" : "dark"}.svg?v=gold`}
      width={220}
      height={58}
      alt="Elares Barber"
    />
  );
}
