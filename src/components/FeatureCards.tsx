import { Target, Shield, Sparkles } from "lucide-react";

const features = [
  {
    icon: Target,
    title: "Accurate Results",
    description: "State-of-the-art AI with 99.8% diagnostic accuracy"
  },
  {
    icon: Shield,
    title: "Data Privacy", 
    description: "Military-grade encryption & zero data retention policy"
  },
  {
    icon: Sparkles,
    title: "User Friendly",
    description: "Intuitive interface designed for seamless experience"
  }
];

export const FeatureCards = () => {
  return (
    <section className="grid grid-cols-1 md:grid-cols-3 gap-8 my-16">
      {features.map((feature, index) => (
        <div
          key={index}
          className="bg-white rounded-2xl p-8 text-center shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border border-primary/10"
        >
          <div className="bg-gradient-to-br from-primary to-accent w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <feature.icon className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-primary mb-4">
            {feature.title}
          </h3>
          <p className="text-muted-foreground leading-relaxed">
            {feature.description}
          </p>
        </div>
      ))}
    </section>
  );
};