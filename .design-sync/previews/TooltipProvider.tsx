import React from 'react';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent, Button } from 'tabhub';

// TooltipProvider is one part of the Tooltip composition; shown open, in place.
export const InTooltip = () => (
  <div style={{ padding: '40px 24px 8px' }}>
    <TooltipProvider delayDuration={300}>
      <Tooltip open>
        <TooltipTrigger asChild>
          <Button variant="outline" size="icon" aria-label="接受建议">✓</Button>
        </TooltipTrigger>
        <TooltipContent>接受建议</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  </div>
);
