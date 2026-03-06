
import Link from "next/link";
import Image from "next/image";
import { BrainCircuit, FileText, CheckCircle2, Zap, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Navbar } from "@/components/navbar";
import { PlaceHolderImages } from "@/lib/placeholder-images";

export default function LandingPage() {
  const heroImage = PlaceHolderImages.find(img => img.id === 'hero-quiz');

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-20 sm:py-32">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 opacity-10">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary rounded-full blur-[100px]" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent rounded-full blur-[100px]" />
          </div>

          <div className="container mx-auto px-4 grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8 text-center lg:text-left animate-fade-in">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary font-medium text-sm border border-primary/20">
                <Sparkles className="h-4 w-4" />
                <span>AI-Powered Education</span>
              </div>
              <h1 className="text-5xl sm:text-7xl font-headline font-extrabold leading-[1.1] text-foreground">
                Turn Documents into <span className="text-primary">Interactive</span> Quizzes
              </h1>
              <p className="text-xl text-muted-foreground max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Upload PDFs, DOCX, or text files and let our AI generate comprehensive assessments in seconds. Perfect for students, teachers, and lifelong learners.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link href="/dashboard">
                  <Button size="lg" className="text-lg px-8 h-14 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
                    Get Started Free
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Button size="lg" variant="outline" className="text-lg px-8 h-14">
                  View Demo
                </Button>
              </div>
              <div className="flex items-center justify-center lg:justify-start gap-8 pt-4">
                <div className="text-center lg:text-left">
                  <div className="font-headline font-bold text-2xl">10k+</div>
                  <div className="text-sm text-muted-foreground">Quizzes Created</div>
                </div>
                <div className="w-px h-8 bg-border" />
                <div className="text-center lg:text-left">
                  <div className="font-headline font-bold text-2xl">98%</div>
                  <div className="text-sm text-muted-foreground">Accuracy Rate</div>
                </div>
              </div>
            </div>

            <div className="relative animate-fade-in delay-200">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border bg-card">
                {heroImage && (
                  <Image
                    src={heroImage.imageUrl}
                    alt={heroImage.description}
                    width={1200}
                    height={800}
                    className="w-full h-auto object-cover"
                    data-ai-hint={heroImage.imageHint}
                  />
                )}
              </div>
              <div className="absolute -bottom-6 -left-6 bg-background p-4 rounded-xl shadow-xl border animate-bounce">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-accent rounded-full flex items-center justify-center">
                    <CheckCircle2 className="text-accent-foreground h-6 w-6" />
                  </div>
                  <div>
                    <div className="font-bold">Quiz Generated!</div>
                    <div className="text-xs text-muted-foreground">in 2.4 seconds</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 bg-white/50">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
              <h2 className="text-3xl sm:text-4xl font-headline font-bold">Everything you need for smarter learning</h2>
              <p className="text-muted-foreground text-lg">Our platform combines cutting-edge AI with a seamless user experience to make assessment creation effortless.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: <FileText className="h-8 w-8 text-primary" />,
                  title: "Document Upload",
                  description: "Support for PDF, DOCX, and TXT files. Just drag and drop to start."
                },
                {
                  icon: <Zap className="h-8 w-8 text-accent" />,
                  title: "Instant Generation",
                  description: "Our AI analyzes content in real-time to create relevant, high-quality questions."
                },
                {
                  icon: <Sparkles className="h-8 w-8 text-primary" />,
                  title: "Detailed Explanations",
                  description: "Get in-depth AI reasoning for every answer to reinforce your learning."
                }
              ].map((feature, i) => (
                <Card key={i} className="border-none bg-background shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="pt-8 space-y-4">
                    <div className="bg-white w-16 h-16 rounded-2xl shadow-inner flex items-center justify-center">
                      {feature.icon}
                    </div>
                    <h3 className="text-xl font-headline font-bold">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-12 bg-background">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <BrainCircuit className="text-primary h-6 w-6" />
            <span className="text-lg font-headline font-bold">SmartAssess</span>
          </div>
          <div className="text-sm text-muted-foreground">
            © 2024 SmartAssess AI. All rights reserved.
          </div>
          <div className="flex gap-6">
            <Link href="#" className="text-sm text-muted-foreground hover:text-primary">Terms</Link>
            <Link href="#" className="text-sm text-muted-foreground hover:text-primary">Privacy</Link>
            <Link href="#" className="text-sm text-muted-foreground hover:text-primary">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
