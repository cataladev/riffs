import HeroSection from "./components/hero";
import Notes from "./components/notes";

export default function Home() {
  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center px-4 text-center">
      <Notes />
      <HeroSection />
    </div>
  );
}
