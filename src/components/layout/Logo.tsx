/** Brand mark. Geometric, neutral, and recolourable via currentColor. */
export function Logo({ size = 32 }: { size?: number }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-xl bg-brand-600 text-white"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none">
        <path
          d="M4 7.5L12 3.5l8 4-8 4-8-4z"
          fill="currentColor"
          fillOpacity="0.95"
        />
        <path
          d="M4 12.2l8 4 8-4M4 16.6l8 4 8-4"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity="0.75"
        />
      </svg>
    </span>
  );
}
