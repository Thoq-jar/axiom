import { useEffect, useState } from "preact/hooks";

export const Clock = () => {
  const [now, setNow] = useState(new Date());
  const getGreeting = (hour: number): string => {
    switch (true) {
      case hour < 5:
        return "Good night";
      case hour < 12:
        return "Good morning";
      case hour < 17:
        return "Good afternoon";
      case hour < 21:
        return "Good evening";
      default:
        return "Good night";
    }
  };

  useEffect(() => {
    const intervalId = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(intervalId);
  }, []);

  const timeString = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const dateString = now.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const greeting = getGreeting(now.getHours());

  return (
    <div
      class="mb-6 opacity-0"
      style={{ animation: "fadeSlideIn 0.5s ease 0.1s forwards" }}
    >
      <div class="text-[0.85rem] text-(--accent)rcase tracking-widest font-semibold mb-1">
        {greeting}
      </div>
      <div class="text-[3.5rem] font-bold tracking-tighter text-(--text-primary) tabular-nums leading-none">
        {timeString}
      </div>
      <div class="text-[0.85rem] text-(--text-secondary) mt-1.5">
        {dateString}
      </div>
    </div>
  );
};
