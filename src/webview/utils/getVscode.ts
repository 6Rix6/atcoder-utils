export const getVscode = () => {
  return (window as any).acquireVsCodeApi();
};
