import { Button } from "@/components/ui/button";

type CoolButtonProps = {
  label: string;
  onClick?: () => void;
  className?: string;
};

export default function CoolButton({ label, onClick, className }: CoolButtonProps) {
  return (
    <Button
      size="lg"
      onClick={onClick}
      className={`relative group overflow-hidden bg-gradient-to-r from-[#fe5b35] to-[#9722b6] text-white px-6 py-3 font-semibold rounded-lg 
        transition-all duration-200 hover:brightness-95 active:scale-95 ${className}`}
    >
      <span className="z-10 relative">{label}</span>
      <span className="absolute inset-0 bg-white/20 blur-sm translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 ease-in-out" />
    </Button>
  );
}
