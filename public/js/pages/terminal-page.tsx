import { Terminal } from "../components/ui/terminal.tsx";

export const TerminalPage = () => {
  return (
    <div class="fixed ml-4 inset-0 w-full h-full flex flex-col items-center justify-center bg-background z-1 p-4 lg:p-18">
      <div class="w-full h-full mx-auto">
        <Terminal />
      </div>
    </div>
  );
};
