'use client';

import * as React from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface ToolbarTooltipButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  tooltip: string;
  active?: boolean;
}

export const ToolbarTooltipButton = React.forwardRef<HTMLButtonElement, ToolbarTooltipButtonProps>(
  ({ tooltip, children, active, className, ...props }, ref) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          ref={ref}
          type="button"
          className={cn(
            'flex h-8 min-w-8 px-1.5 items-center justify-center rounded-md transition-all duration-300 text-sm font-medium',
            active
              ? 'bg-[#007FFF] text-white shadow-[0_0_0_3px_#DBEDFF]'
              : 'bg-transparent text-[#98A2B3] hover:text-[#007FFF] hover:bg-[#F0F7FF]',
            className,
          )}
          {...props}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  ),
);
ToolbarTooltipButton.displayName = 'ToolbarTooltipButton';
