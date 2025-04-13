import { Button } from "@/components/ui/button";

type CoolButtonProps = {
  label: string;
  onClick?: () => void;
  className?: string;
  iconRight?: React.ReactNode;
  style?: React.CSSProperties;
};

export default function CoolButton({
  label,
  onClick,
  className,
  iconRight,
  style,
}: CoolButtonProps) {
  return (
    <Button
      onClick={onClick}
      size="lg"
      style={style}
      className={`relative overflow-hidden group bg-gradient-to-r from-[#fe5b35] to-[#9722b6] text-white px-6 py-3 font-semibold rounded-lg 
        transition-all duration-200 hover:brightness-95 active:scale-95 ${className}`}>
      <span className="relative z-10 flex items-center">
        {label}
        {iconRight && <span className="ml-2">{iconRight}</span>}
      </span>
      <span className="absolute inset-0 bg-white/20 blur-sm translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 ease-in-out pointer-events-none" />
    </Button>
  );
}
