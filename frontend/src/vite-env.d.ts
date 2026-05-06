/// <reference types="vite/client" />

interface CashfreeCheckoutOptions {
  paymentSessionId: string;
  redirectTarget?: '_self' | '_blank' | '_top' | '_modal';
}

interface CashfreeInstance {
  checkout: (options: CashfreeCheckoutOptions) => Promise<any>;
}

interface CashfreeInitializer {
  (config: { mode: 'sandbox' | 'production' }): CashfreeInstance;
}

interface Window {
  Cashfree: CashfreeInitializer;
}
