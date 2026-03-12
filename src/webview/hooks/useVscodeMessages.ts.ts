import { useEffect } from "react";

export const useVscodeMessages = (
  handlers: Record<string, (msg: any) => void>,
) => {
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { command, ...rest } = event.data;
      handlers[command]?.(rest);
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);
};
