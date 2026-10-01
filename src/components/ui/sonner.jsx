import { Toaster as Sonner } from 'sonner';

/**
 * shadcn ships this wrapper wired to `next-themes`, which does not exist in a
 * Vite extension. The theme is owned by src/hooks/useTheme.js instead, so the
 * resolved theme is passed in as a prop by whoever renders the Toaster.
 */
const Toaster = ({ theme = 'system', ...props }) => {
  return (
    <Sonner
      theme={theme}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground'
        }
      }}
      {...props}
    />
  );
};

export { Toaster };
