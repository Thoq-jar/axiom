import { Terminal } from "../components/ui/terminal.tsx";

export const TerminalPage = () => {
  return (
    <div
      class="w-full flex flex-col items-center justify-center p-4 lg:p-18"
      style={{ height: "100dvh" }}
    >
      <div class="w-full h-full mx-auto">
        <Terminal />
      </div>
    </div>
  );
};
