import { Card } from "@/components/ui/card";
import { Zap, Shield, Palette, Rocket } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Built with modern technologies for optimal performance and speed."
  },
  {
    icon: Shield,
    title: "Secure by Default",
    description: "Security best practices implemented from the ground up."
  },
  {
    icon: Palette,
    title: "Beautiful Design",
    description: "Thoughtfully designed components with attention to detail."
  },
  {
    icon: Rocket,
    title: "Ready to Launch",
    description: "Everything you need to get your project off the ground quickly."
  }
];

const Features = () => {
  return (
    <section className="py-24 bg-gradient-subtle">
      <div className="container px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Everything You Need
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            A carefully crafted foundation with modern tools and beautiful design systems.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card 
                key={index} 
                className="p-6 text-center hover:shadow-medium transition-all duration-300 hover:-translate-y-1 animate-fade-in border-0 shadow-soft"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center mx-auto mb-4 shadow-glow">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">
                  {feature.description}
                </p>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Features;