
import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import LandingNavbar from "@/components/landing/LandingNavbar";
import FeatureCard from "@/components/landing/FeatureCard";
import TestimonialCard from "@/components/landing/TestimonialCard";
import { ChevronRight, PieChart, TrendingUp, Shield, Bot, BarChart } from "lucide-react";

const Index = () => {
  const { user } = useAuth();

  const features = [
    {
      icon: <PieChart className="h-8 w-8 text-finmate-500" />,
      title: "Smart Budgeting",
      description: "AI-powered budget recommendations based on your spending patterns and financial goals."
    },
    {
      icon: <TrendingUp className="h-8 w-8 text-finmate-500" />,
      title: "Investment Insights",
      description: "Personalized investment suggestions and market analyses tailored to your risk profile."
    },
    {
      icon: <Shield className="h-8 w-8 text-finmate-500" />,
      title: "Fraud Protection",
      description: "Advanced anomaly detection to identify suspicious activities in your financial accounts."
    },
    {
      icon: <Bot className="h-8 w-8 text-finmate-500" />,
      title: "AI Financial Assistant",
      description: "24/7 virtual assistant to answer financial questions and provide personalized advice."
    }
  ];

  const testimonials = [
    {
      quote: "FinMate has completely transformed how I manage my finances. The AI recommendations are spot-on!",
      author: "Sarah Johnson",
      role: "Small Business Owner"
    },
    {
      quote: "The investment insights helped me grow my portfolio by 18% in just six months. Incredible value.",
      author: "Michael Chen",
      role: "Tech Professional"
    },
    {
      quote: "I've tried many financial apps, but FinMate's AI assistant actually understands my goals and helps me achieve them.",
      author: "Alex Rodriguez",
      role: "Freelancer"
    }
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <LandingNavbar />
      
      {/* Hero Section */}
      <section className="py-20 md:py-28">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center text-center space-y-8">
            <div className="space-y-4 max-w-3xl">
              <h1 className="text-4xl md:text-6xl font-bold tracking-tighter gradient-text animate-fade-up">
                Your AI Financial Assistant
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-400 animate-fade-up" style={{ animationDelay: "0.1s" }}>
                FinMate leverages AI to simplify your finances, optimize your investments, and help you achieve your financial goals.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 animate-fade-up" style={{ animationDelay: "0.2s" }}>
              {user ? (
                <Button asChild size="lg" className="gap-1">
                  <Link to="/dashboard">
                    Go to Dashboard <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <>
                  <Button asChild size="lg" className="gap-1">
                    <Link to="/signup">
                      Get Started <ChevronRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link to="/signin">Sign In</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-secondary">
        <div className="container px-4 md:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tighter md:text-4xl gradient-text">
              Powered by AI, Built for You
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-lg mx-auto">
              Discover how FinMate's intelligent features transform your financial management.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => (
              <FeatureCard
                key={index}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
                delay={index * 0.1}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Dashboard Preview Section */}
      <section className="py-16">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col lg:flex-row gap-12 items-center">
            <div className="lg:w-1/2 space-y-6">
              <h2 className="text-3xl font-bold tracking-tighter md:text-4xl gradient-text">
                Your Finances at a Glance
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                FinMate's intuitive dashboard gives you a comprehensive overview of your financial health with powerful visualizations and insights.
              </p>
              <div className="space-y-4">
                <div className="flex items-start gap-2">
                  <BarChart className="h-5 w-5 text-finmate-500 mt-1" />
                  <div>
                    <h3 className="font-medium">Real-time Expense Tracking</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Monitor your spending patterns as they happen.</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <TrendingUp className="h-5 w-5 text-finmate-500 mt-1" />
                  <div>
                    <h3 className="font-medium">Investment Performance</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Track returns and get AI-powered investment recommendations.</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <PieChart className="h-5 w-5 text-finmate-500 mt-1" />
                  <div>
                    <h3 className="font-medium">Budget Allocation</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Visual breakdowns of your spending categories.</p>
                  </div>
                </div>
              </div>
              <Button asChild>
                <Link to={user ? "/dashboard" : "/signup"}>
                  {user ? "View Your Dashboard" : "Try It Now"}
                </Link>
              </Button>
            </div>
            <div className="lg:w-1/2 rounded-lg shadow-lg overflow-hidden border border-gray-200 dark:border-gray-800">
              <img
                src="https://placehold.co/800x600/3B82F6/FFFFFF.png?text=FinMate+Dashboard+Preview&font=Roboto"
                alt="FinMate Dashboard Preview"
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 bg-secondary">
        <div className="container px-4 md:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tighter md:text-4xl gradient-text">
              What Our Users Say
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-lg mx-auto">
              Join thousands of satisfied users who have transformed their financial management with FinMate.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {testimonials.map((testimonial, index) => (
              <TestimonialCard
                key={index}
                quote={testimonial.quote}
                author={testimonial.author}
                role={testimonial.role}
                delay={index * 0.1}
              />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-finmate-900 text-white">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center text-center space-y-6 max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">
              Ready to Transform Your Financial Future?
            </h2>
            <p className="text-lg text-finmate-100">
              Join FinMate today and experience the power of AI-driven financial management.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild size="lg" className="bg-white text-finmate-900 hover:bg-gray-100">
                <Link to="/signup">Get Started for Free</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-white text-white hover:bg-finmate-800">
                <Link to="/signin">Sign In</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-finmate-950 text-white">
        <div className="container px-4 md:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">FinMate</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white">About</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Features</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Pricing</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Careers</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Resources</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white">Blog</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Help Center</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Guides</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">API</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Legal</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white">Privacy</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Terms</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Security</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Contact</h3>
              <ul className="space-y-2">
                <li className="text-gray-400">hello@finmate.com</li>
                <li className="text-gray-400">+1 (555) 123-4567</li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-gray-800 text-center text-gray-400">
            <p>© {new Date().getFullYear()} FinMate. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
