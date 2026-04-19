export {};

declare global {
  interface Window {
    chariow?: {
      open: (productId: string) => void;
    };
  }
}

