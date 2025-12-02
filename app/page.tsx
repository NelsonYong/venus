import { Metadata } from "next";
import { LandingNavbar } from "./components/landing/landing-navbar";
import { HeroSection } from "./components/landing/hero-section";
import { LandingFooter } from "./components/landing/landing-footer";

export const metadata: Metadata = {
  title: "Venus AI",
  description:
    "Venus is a powerful AI chatbot that helps you with coding, writing, research, and more. Built with Next.js and powered by advanced language models.",
  keywords: [
    "AI",
    "chatbot",
    "artificial intelligence",
    "coding assistant",
    "GPT",
    "language model",
    "Next.js",
  ],
  authors: [{ name: "Venus Team" }],
  openGraph: {
    title: "Venus AI",
    description:
      "Venus is a powerful AI chatbot that helps you with coding, writing, research, and more.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Venus AI",
    description:
      "Venus is a powerful AI chatbot that helps you with coding, writing, research, and more.",
  },
};

export default function HomePage() {
  return (
    <div className="relative h-screen flex flex-col">
      <LandingNavbar />
      <main className="flex-1 flex flex-col items-center justify-center">
        <HeroSection />
      </main>
      <LandingFooter />
    </div>
  );
}
