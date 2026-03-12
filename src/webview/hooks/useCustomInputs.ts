import { useState } from "react";
import type { SampleInput } from "../../lib/scrapeAtCoder";

export const useCustomInputs = () => {
  const [customInputs, setCustomInputs] = useState<SampleInput[]>([]);

  const handleAdd = () =>
    setCustomInputs((prev) => [...prev, { input: "", output: "" }]);

  const handleRemove = (index: number) =>
    setCustomInputs((prev) => prev.filter((_, i) => i !== index));

  const handleChange = (
    index: number,
    field: "input" | "output",
    event: Event,
  ) => {
    const value = (event.target as HTMLTextAreaElement).value;
    setCustomInputs((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  return { customInputs, handleAdd, handleRemove, handleChange };
};
