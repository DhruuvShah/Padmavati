import React from 'react';

export function Logo({ className = "", light = false }: { className?: string; light?: boolean }) {
  return (
    <div className={`flex items-center gap-2 ${className} select-none`}>
      <div className="text-destructive font-bold text-3xl -skew-x-[15deg] tracking-tighter scale-x-[1.15] leading-none ml-2">
        P<span className="-ml-1">C</span>
      </div>
      <div className="flex flex-col ml-1">
        <span className={`font-display text-[20px] font-medium leading-none tracking-tight ${light ? 'text-white' : 'text-foreground'}`}>
          Padmavati
        </span>
        <span className={`text-[7px] tracking-[0.28em] font-sans font-bold uppercase mt-[4px] ml-[1px] ${light ? 'text-gray-400' : 'text-gray-500'}`}>
          CORPORATION
        </span>
      </div>
    </div>
  );
}
