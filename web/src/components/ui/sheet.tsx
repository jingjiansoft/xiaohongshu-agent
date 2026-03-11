'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

const SheetContext = React.createContext<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
}>({ open: false, onOpenChange: () => {} });

const Sheet = ({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) => {
  return (
    <SheetContext.Provider value={{ open, onOpenChange }}>
      {children}
    </SheetContext.Provider>
  );
};

const SheetTrigger = ({ children }: { children: React.ReactNode }) => {
  const { onOpenChange } = React.useContext(SheetContext);
  return (
    <span onClick={() => onOpenChange(true)}>
      {children}
    </span>
  );
};

const SheetPortal = ({ children }: { children: React.ReactNode }) => {
  const { open } = React.useContext(SheetContext);
  if (!open) return null;
  return children;
};

const SheetOverlay = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  const { onOpenChange } = React.useContext(SheetContext);
  return (
    <div
      className={cn(
        'fixed inset-0 z-50 bg-black/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        className
      )}
      onClick={() => onOpenChange(false)}
      {...props}
    />
  );
};

const SheetContent = ({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  const { open, onOpenChange } = React.useContext(SheetContext);

  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    if (open) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <SheetPortal>
      <SheetOverlay />
      <div
        className={cn(
          'fixed right-0 top-0 z-50 h-full w-full sm:max-w-md border-l border-white/10 bg-[#141414] p-6 shadow-lg shadow-black/50 duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right',
          className
        )}
        {...props}
      >
        {children}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 rounded-lg p-1 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </SheetPortal>
  );
};

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex flex-col space-y-2 text-left', className)}
    {...props}
  />
);

const SheetTitle = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h2
    className={cn('text-lg font-semibold text-white', className)}
    {...props}
  />
);

const SheetDescription = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p
    className={cn('text-sm text-gray-400', className)}
    {...props}
  />
);

const SheetFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 gap-2 pt-4', className)}
    {...props}
  />
);

export {
  Sheet,
  SheetTrigger,
  SheetPortal,
  SheetOverlay,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};