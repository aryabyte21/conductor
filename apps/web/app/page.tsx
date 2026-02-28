import { Nav } from "@/components/Nav";
import { Hero } from "@/components/Hero";
import { Problem } from "@/components/Problem";
import { HowItWorks } from "@/components/HowItWorks";
import { Clients } from "@/components/Clients";
import { Features } from "@/components/Features";
import { Download } from "@/components/Download";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <Nav />
      <Hero />
      <Problem />
      <HowItWorks />
      <Clients />
      <Features />
      <Download />
      <Footer />
    </main>
  );
}
