import { Sparkles, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGlass } from "@/components/ui/glass-provider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function GlassToggle() {
  const { glassEnabled, setGlassEnabled } = useGlass();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="outline"
              size="icon"
              aria-pressed={glassEnabled}
              onClick={() => setGlassEnabled(!glassEnabled)}
            >
              {glassEnabled ? (
                <Sparkles className="h-[1.2rem] w-[1.2rem]" />
              ) : (
                <Square className="h-[1.2rem] w-[1.2rem] opacity-60" />
              )}
              <span className="sr-only">Toggle liquid glass effect</span>
            </Button>
          }
        />
        <TooltipContent>{glassEnabled ? "Liquid glass: on" : "Liquid glass: off"}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
