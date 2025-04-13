import HeroSection from "./components/hero";
import Notes from "./components/notes";

export default function Home() {
  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center px-4 text-center">
      <div className="animate-fadeIn opacity-0 w-full" style={{ animationDelay: "0.3s", animationFillMode: "forwards" }}>
        <Notes />
      </div>
      <div className="animate-fadeIn opacity-0 w-full flex flex-col items-center" style={{ animationDelay: "0.3s", animationFillMode: "forwards" }}>
        <HeroSection />
      </div>
    </div>
  );
}
