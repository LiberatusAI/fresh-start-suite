import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";

export const HeroSection = () => {
  return (
    <div className="w-full max-w-5xl mx-auto pt-16 pb-24 px-4 text-center">
      <div className="inline-block px-4 py-1 mb-6 rounded-full bg-accent/20 text-xs font-semibold text-accent tracking-widest uppercase">
        Premium Portfolio Analytics
      </div>
      <h1 className="text-5xl md:text-7xl font-black mb-8 tracking-tight leading-tight text-foreground font-sans">
        Monitor Your Investments <br /> with <span className="text-accent">Precision</span>
      </h1>
      <p className="text-lg md:text-2xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed font-normal">
        Receive tailored analytics for your cryptocurrency portfolio, delivered exactly when you need them. Stay ahead of market movements.
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4 mb-16">
        <Link to="/signup">
          <Button variant="default" size="lg" className="text-base font-semibold px-8 py-3 rounded-2xl">
            Get Started
          </Button>
        </Link>
        <Link to="/login">
          <Button variant="outline" size="lg" className="text-base font-semibold px-8 py-3 rounded-2xl">
            Log In
          </Button>
        </Link>
      </div>
      <div className="relative w-full h-[400px] md:h-[500px] bg-background rounded-3xl overflow-hidden border border-border shadow-none flex items-center justify-center">
        <img 
          src="https://images.unsplash.com/photo-1621761191319-c6fb62004040?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1024&q=80"
          alt="Dashboard preview"
          className="w-full h-full object-cover opacity-90 grayscale"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent"></div>
        <div className="absolute bottom-0 left-0 right-0 p-8 text-center">
          <p className="text-lg font-normal text-foreground/80">Sophisticated analytics for your investment portfolio</p>
        </div>
      </div>
    </div>
  );
}
