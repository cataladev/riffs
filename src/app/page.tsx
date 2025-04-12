  import Link from "next/link";
  import { Button } from "@/components/ui/button";

  export default function Home() {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <img src="/images/riffs.png" alt="Riffs logo" className="w-108 h-108 md:w-120 md:h-120 mb-6" />
        <p className="mt-6 max-w-xl text-md md:text-lg text-gray-700">
          Riffs lets you hum a melody, turn it into guitar tabs, and bring it to life through intuitive editing and rhythm-style gameplay.
        </p>
        <div className="relative z-0 mt-8 flex max-w-max cursor-pointer items-center overflow-hidden rounded-lg p-[2px]">
          <div className="moving-border absolute inset-0 h-full w-full rounded-lg bg-[conic-gradient(from_0deg,#22d3ee_20deg,#8b5cf6_140deg,transparent_240deg)]"/>
          <div className="relative z-10">
            <Link href="/create">
              <Button size="lg" className="bg-gradient-to-r from-[#fe5b35] to-[#9722b6] text-white px-6 py-3 font-semibold rounded-lg hover:scale-105 transition-transform">
                Start Creating
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }
