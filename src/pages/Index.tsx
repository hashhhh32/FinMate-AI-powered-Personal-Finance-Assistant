
import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import LandingNavbar from "@/components/landing/LandingNavbar";
import FeatureCard from "@/components/landing/FeatureCard";
import TestimonialCard from "@/components/landing/TestimonialCard";
import { ChevronRight, PieChart, TrendingUp, Shield, Bot, BarChart, CreditCard, DollarSign, Briefcase } from "lucide-react";

const Index = () => {
  const { user } = useAuth();

  const features = [
    {
      icon: <DollarSign className="h-8 w-8 text-finmate-500" />,
      title: "AI Expense Tracking",
      description: "Automatically categorize expenses and get AI-powered insights on your spending patterns."
    },
    {
      icon: <TrendingUp className="h-8 w-8 text-finmate-500" />,
      title: "Stock Predictions",
      description: "AI-driven stock market predictions with risk analysis and real-time market data."
    },
    {
      icon: <Briefcase className="h-8 w-8 text-finmate-500" />,
      title: "Portfolio Management",
      description: "Track, manage, and optimize your investment portfolio with AI-driven recommendations."
    },
    {
      icon: <CreditCard className="h-8 w-8 text-finmate-500" />,
      title: "Credit Score Prediction",
      description: "Predict your credit score and get personalized tips to improve your creditworthiness."
    },
    {
      icon: <Bot className="h-8 w-8 text-finmate-500" />,
      title: "AI Financial Assistant",
      description: "Chat with our AI assistant to manage stocks, get financial advice, and execute trades."
    },
    {
      icon: <PieChart className="h-8 w-8 text-finmate-500" />,
      title: "Budget Management",
      description: "Create and track budgets with AI recommendations to improve your financial health."
    }
  ];

  const testimonials = [
    {
      quote: "FinMate's AI stock predictions have helped me grow my portfolio by 22% in just eight months. The risk analysis is incredibly accurate!",
      author: "Sarah Johnson",
      role: "Small Business Owner"
    },
    {
      quote: "The credit score prediction tool helped me understand exactly what I needed to improve. My score is up 85 points in 6 months!",
      author: "Michael Chen",
      role: "Tech Professional"
    },
    {
      quote: "The AI chatbot makes investing so easy. I can buy stocks and get financial advice without needing to understand complex market terms.",
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
                AI-Powered Financial Management
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-400 animate-fade-up" style={{ animationDelay: "0.1s" }}>
                FinMate uses AI to track expenses, predict stocks, manage your portfolio, forecast your credit score, and provide personalized financial advice.
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
              Powered by Advanced AI Technology
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-lg mx-auto">
              Discover how FinMate's intelligent features transform your financial management.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
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
                Your Complete Financial Dashboard
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                FinMate's comprehensive dashboard gives you a complete view of your financial health with powerful visualizations and AI-driven insights.
              </p>
              <div className="space-y-4">
                <div className="flex items-start gap-2">
                  <BarChart className="h-5 w-5 text-finmate-500 mt-1" />
                  <div>
                    <h3 className="font-medium">Expense Analysis</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">AI-powered categorization and spending insights.</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <TrendingUp className="h-5 w-5 text-finmate-500 mt-1" />
                  <div>
                    <h3 className="font-medium">Stock Predictions</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Get AI-driven stock recommendations with risk analysis.</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CreditCard className="h-5 w-5 text-finmate-500 mt-1" />
                  <div>
                    <h3 className="font-medium">Credit Score Forecast</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Predict and improve your credit score with personalized tips.</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Bot className="h-5 w-5 text-finmate-500 mt-1" />
                  <div>
                    <h3 className="font-medium">AI Financial Assistant</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Chat with our AI to get advice and manage your investments.</p>
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
              Ready to Transform Your Financial Future with AI?
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
