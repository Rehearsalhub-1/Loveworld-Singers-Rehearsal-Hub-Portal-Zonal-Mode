import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface QRScannerState {
  lastEventName: string;
  setLastEventName: (name: string) => void;
  customEvents: string[];
  addCustomEvent: (name: string) => void;
}

export const useQRScannerStore = create<QRScannerState>()(
  persist(
    (set) => ({
      lastEventName: 'Rehearsal',
      setLastEventName: (name) => set({ lastEventName: name }),
      customEvents: [],
      addCustomEvent: (name) => set((state) => ({ 
        customEvents: Array.from(new Set([name, ...state.customEvents])) 
      })),
    }),
    {
      name: 'lwsrh_qr_scanner_settings',
    }
  )
);
