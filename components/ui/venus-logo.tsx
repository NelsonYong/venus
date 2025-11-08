import { cn } from "@/lib/utils";

interface VenusLogoProps {
  className?: string;
  size?: number;
}

export function VenusLogo({ className, size = 32 }: VenusLogoProps) {
  const scale = size / 33;
  const width = 88 * scale;
  const height = 33 * scale;

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 88 33"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("transition-colors", className)}
    >
      <g id="mark">
        <path
          d="M13.2371 21.0407L24.3186 12.8506C24.8619 12.4491 25.6384 12.6057 25.8973 13.2294C27.2597 16.5185 26.651 20.4712 23.9403 23.1851C21.2297 25.8989 17.4581 26.4941 14.0108 25.1386L10.2449 26.8843C15.6463 30.5806 22.2053 29.6665 26.304 25.5601C29.5551 22.3051 30.562 17.8683 29.6205 13.8673L29.629 13.8758C28.2637 7.99809 29.9647 5.64871 33.449 0.844576C33.5314 0.730667 33.6139 0.616757 33.6964 0.5L29.1113 5.09055V5.07631L13.2343 21.0436"
          fill="currentColor"
        />
        <path
          d="M10.9503 23.0313C7.07343 19.3235 7.74185 13.5853 11.0498 10.2763C13.4959 7.82722 17.5036 6.82767 21.0021 8.2971L24.7595 6.55998C24.0826 6.07017 23.215 5.54334 22.2195 5.17313C17.7198 3.31926 12.3326 4.24192 8.67479 7.90126C5.15635 11.4239 4.0499 16.8403 5.94992 21.4622C7.36924 24.9165 5.04257 27.3598 2.69884 29.826C1.86829 30.7002 1.0349 31.5745 0.36364 32.5L10.9474 23.0341"
          fill="currentColor"
        />
      </g>
    </svg>
  );
}

export function VenusLogoText({ className, size = 120 }: VenusLogoProps) {
  const scale = size / 130;
  const width = 130 * scale;
  const height = 36 * scale;

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 130 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("transition-colors", className)}
    >
      {/* V */}
      <path
        d="M0 0L11 32H19L30 0H24L15 26L6 0H0Z"
        fill="currentColor"
      />

      {/* e */}
      <path
        d="M33 17C33 11.4772 37.0294 7 42 7C46.9706 7 51 11.4772 51 17C51 18.5 50.85 19.8 50.65 21H37.5C38 25 40.5 27.5 43.5 27.5C46 27.5 48 26 49.5 24L52.5 27C50 30 46.5 32 42.5 32C37.0294 32 33 27.5228 33 17ZM38 15.5H48C47.5 11.5 45 8.5 42 8.5C38 8.5 38.3 11.5 38 15.5Z"
        fill="currentColor"
      />

      {/* n */}
      <path
        d="M56 7.5H62.5V11.5C64 8.8 66.5 7 69.5 7C75 7 78 10.5 78 15.5V32H71.5V17C71.5 13 69 11 66 11C62 11 60 13.5 60 17.5V32H56V7.5Z"
        fill="currentColor"
      />

      {/* u */}
      <path
        d="M82 7.5H88.5V22C88.5 26 91 28 94 28C98 28 100 25.5 100 21.5V7.5H104V32H100V28.5C98.5 30.8 96 32 93 32C87.5 32 84.5 28.5 84.5 23.5V7.5H82Z"
        fill="currentColor"
      />

      {/* s */}
      <path
        d="M107 15.5C107 10.5 110.5 7.5 115.5 7.5C119 7.5 121.5 9.5 123 12L118.5 15C117 13 115.5 11.5 113.5 11.5C111 11.5 109.5 13 109.5 15C109.5 21 124 17.5 124 26C124 30.5 120.5 33 115.5 33C111 33 107.5 30.5 106 27.5L110.5 25C112 27.5 114 29.5 116 29.5C118.5 29.5 120 28 120 26C120 19.5 107 23.5 107 15V15.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function VenusLogoFull({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3 relative", className)}>
      <VenusLogo size={40} />
      <VenusLogoText
        size={70}
        className="absolute top-1/2 left-[80px] -translate-x-1/2 -translate-y-1/2"
      />
    </div>
  );
}
