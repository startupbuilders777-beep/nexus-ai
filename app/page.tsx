import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Brain,
  Database,
  FileText,
  Globe,
  LayoutDashboard,
  Lock,
  MessageSquare,
  Plug,
  Rocket,
  Scale,
  Server,
  Zap,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Brain className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">NexusAI</span>
          </div>
          <nav className="flex items-center gap-6">
            <Link href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Features
            </Link>
            <Link href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Pricing
            </Link>
            <Link href="#docs" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Docs
            </Link>
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Get Started</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-32">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background" />
        <div className="container">
          <div className="mx-auto max-w-4xl text-center">
            <Badge variant="secondary" className="mb-4">
              <Rocket className="mr-1 h-3 w-3" />
              Now in Public Beta
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              Put Your Data in{" "}
              <span className="gradient-text">Every AI&apos;s Brain</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              Ingest data from 50+ sources, transform it into embeddings, and serve it to any AI model.
              Build powerful RAG applications with enterprise-grade security and analytics.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register">
                <Button size="lg" className="h-12 px-8 text-base">
                  Start Free Trial
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button size="lg" variant="outline" className="h-12 px-8 text-base">
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  View Demo
                </Button>
              </Link>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              No credit card required • 14-day free trial • Cancel anytime
            </p>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Everything You Need to Build AI Apps
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              From data ingestion to AI integration, we handle the entire pipeline.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, i) => (
              <Card key={i} className="border-2 hover:border-primary/50 transition-colors">
                <CardHeader>
                  <feature.icon className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-muted/50">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Simple, Transparent Pricing
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Start free, scale as you grow. No hidden fees.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto">
            {pricingPlans.map((plan, i) => (
              <Card key={i} className={plan.featured ? "border-primary shadow-lg shadow-primary/10" : ""}>
                <CardHeader>
                  {plan.featured && (
                    <Badge className="w-fit mb-2">Most Popular</Badge>
                  )}
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-6">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    {plan.price !== "Custom" && <span className="text-muted-foreground">/mo</span>}
                  </div>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, j) => (
                      <li key={j} className="flex items-center text-sm">
                        <Zap className="h-4 w-4 text-primary mr-2 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button className="w-full" variant={plan.featured ? "default" : "outline"}>
                    {plan.cta}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container">
          <Card className="bg-primary text-primary-foreground border-0">
            <CardContent className="p-12 text-center">
              <h2 className="text-3xl font-bold mb-4">Ready to Power Your AI?</h2>
              <p className="text-primary/80 mb-8 max-w-xl mx-auto">
                Join thousands of companies using NexusAI to build smarter AI applications.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button size="lg" variant="secondary" className="h-12 px-8 text-base">
                  Start Free Trial
                </Button>
                <Button size="lg" variant="ghost" className="h-12 px-8 text-base text-primary-foreground hover:bg-primary/20">
                  Contact Sales
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                  <Brain className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold">NexusAI</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Put your data in every AI's brain.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#" className="hover:text-foreground">Features</Link></li>
                <li><Link href="#" className="hover:text-foreground">Pricing</Link></li>
                <li><Link href="#" className="hover:text-foreground">Integrations</Link></li>
                <li><Link href="#" className="hover:text-foreground">Changelog</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#" className="hover:text-foreground">Documentation</Link></li>
                <li><Link href="#" className="hover:text-foreground">API Reference</Link></li>
                <li><Link href="#" className="hover:text-foreground">Guides</Link></li>
                <li><Link href="#" className="hover:text-foreground">Blog</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#" className="hover:text-foreground">About</Link></li>
                <li><Link href="#" className="hover:text-foreground">Careers</Link></li>
                <li><Link href="#" className="hover:text-foreground">Legal</Link></li>
                <li><Link href="#" className="hover:text-foreground">Contact</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
            © 2024 NexusAI. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

const features = [
  {
    icon: Database,
    title: "Data Connectors",
    description: "Connect to 50+ data sources including files, cloud storage, CRMs, databases, and more.",
  },
  {
    icon: FileText,
    title: "Smart Processing",
    description: "Intelligent chunking, deduplication, and PII scrubbing for high-quality data.",
  },
  {
    icon: Brain,
    title: "Embeddings Generation",
    description: "Generate embeddings using OpenAI, Cohere, Anthropic, or custom models.",
  },
  {
    icon: Server,
    title: "Vector Storage",
    description: "Store embeddings in our built-in vector DB or connect to Pinecone, Weaviate, and more.",
  },
  {
    icon: MessageSquare,
    title: "RAG API",
    description: "Simple REST API to query your data with any AI model. Just send a prompt.",
  },
  {
    icon: Globe,
    title: "Multi-Model Support",
    description: "Use OpenAI, Anthropic, Google Gemini, Meta Llama, or your own models.",
  },
  {
    icon: Scale,
    title: "Enterprise Security",
    description: "SOC 2 compliant, SSO/SAML, role-based access, and data residency options.",
  },
  {
    icon: Plug,
    title: "Webhooks & SDKs",
    description: "Automate workflows with webhooks and integrate with Python, Node, and Go SDKs.",
  },
  {
    icon: Lock,
    title: "Usage Analytics",
    description: "Track which data is used most, by which models, and optimize accordingly.",
  },
];

const pricingPlans = [
  {
    name: "Starter",
    price: "$0",
    description: "Perfect for hobbyists and testing",
    features: ["1,000 tokens/mo", "1 data source", "Basic support", "Community access"],
    cta: "Start Free",
  },
  {
    name: "Startup",
    price: "$99",
    description: "For small teams building AI apps",
    features: ["100K tokens/mo", "5 data sources", "Email support", "API access", "Basic analytics"],
    cta: "Start Trial",
    featured: true,
  },
  {
    name: "Growth",
    price: "$399",
    description: "For growing companies",
    features: ["1M tokens/mo", "Unlimited sources", "Priority support", "Advanced analytics", "Webhooks"],
    cta: "Start Trial",
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "For large organizations",
    features: ["Unlimited tokens", "Dedicated support", "Custom integrations", "SLA", "On-premise"],
    cta: "Contact Sales",
  },
];
