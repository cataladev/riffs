"use client";

import Link from "next/link";
import Image from "next/image";
import { ModeToggle } from "@/components/modetoggle";
import CoolButton from "./coolbutton";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function HeroSection() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const logoSrc =
    mounted && resolvedTheme === "dark"
      ? "/images/riffswhite.png"
      : "/images/riffstransparent2.png";

  return (
    <>
      <Image
        src={logoSrc}
        alt="Riffs logo"
        width={480}
        height={480}
        className="w-108 h-108 md:w-120 md:h-120 mb-6"
      />
      <p className="mt-6 max-w-xl text-md md:text-lg text-gray-600 dark:text-gray-300">
        Riffs lets you hum a melody, turn it into guitar tabs, and bring it to life through intuitive editing and rhythm-style gameplay.
      </p>
      <div className="relative z-0 mt-8 flex max-w-max cursor-pointer items-center overflow-hidden rounded-lg p-[3px]">
        <div className="moving-border absolute inset-0 h-full w-full rounded-lg bg-[conic-gradient(from_0deg,#9722b6_20deg,#8b5cf6_140deg,transparent_240deg)]" />
        <div className="relative z-10">
          <Link href="/create">
            <CoolButton label="Start Creating" />
          </Link>
        </div>
      </div>
    </>
  );
}
