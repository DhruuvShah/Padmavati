import { cn } from "@/lib/utils"

type SliderProps = {
  className?: string;
  value?: number[];
  defaultValue?: number[];
  min?: number;
  max?: number;
  step?: number;
  onValueChange?: (value: number[]) => void;
  disabled?: boolean;
}

const thumbCls = [
  "absolute w-full h-0 appearance-none bg-transparent cursor-pointer pointer-events-none",
  "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:size-4",
  "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2",
  "[&::-webkit-slider-thumb]:border-primary [&::-webkit-slider-thumb]:bg-white",
  "[&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:cursor-pointer",
  "[&::-webkit-slider-thumb]:pointer-events-auto",
  "[&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full",
  "[&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-primary",
  "[&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:cursor-pointer",
  "[&::-moz-range-track]:bg-transparent",
].join(" ");

function Slider({ className, value, defaultValue, min = 0, max = 100, step = 1, onValueChange, disabled }: SliderProps) {
  const vals = value ?? defaultValue ?? [min, max];
  const isRange = vals.length > 1;
  const low = vals[0];
  const high = isRange ? vals[1] : max;

  const lowPct = ((low - min) / (max - min)) * 100;
  const highPct = ((high - min) / (max - min)) * 100;

  return (
    <div className={cn("relative flex items-center w-full h-5", className)}>
      <div className="absolute inset-x-0 h-1.5 rounded-full bg-border" style={{ top: "50%", transform: "translateY(-50%)" }} />
      <div
        className="absolute h-1.5 rounded-full bg-primary"
        style={{
          left: `${isRange ? lowPct : 0}%`,
          right: `${isRange ? 100 - highPct : 100 - lowPct}%`,
          top: "50%",
          transform: "translateY(-50%)",
        }}
      />
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={low}
        disabled={disabled}
        className={thumbCls}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (isRange) onValueChange?.([Math.min(v, high), high]);
          else onValueChange?.([v]);
        }}
      />
      {isRange && (
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={high}
          disabled={disabled}
          className={thumbCls}
          onChange={(e) => {
            const v = Number(e.target.value);
            onValueChange?.([low, Math.max(v, low)]);
          }}
        />
      )}
    </div>
  );
}

export { Slider }
