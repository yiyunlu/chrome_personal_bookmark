// Merged onto window.TabHub by the sync build (cfg.extraEntries). The app
// raises its undo toast through sonner's `toast` store; exposing the SAME
// sonner instance the bundled Toaster listens to is the only way a design
// (or a preview) can put a toast on screen.
export { toast } from 'sonner';
