import React from 'react';

const Index = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Welcome to Your App
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            A beautiful, modern React application built with TypeScript and Tailwind CSS.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            <div className="p-6 bg-card rounded-lg border">
              <h3 className="text-xl font-semibold mb-4">Feature One</h3>
              <p className="text-muted-foreground">
                Describe your first amazing feature here.
              </p>
            </div>
            <div className="p-6 bg-card rounded-lg border">
              <h3 className="text-xl font-semibold mb-4">Feature Two</h3>
              <p className="text-muted-foreground">
                Describe your second amazing feature here.
              </p>
            </div>
            <div className="p-6 bg-card rounded-lg border">
              <h3 className="text-xl font-semibold mb-4">Feature Three</h3>
              <p className="text-muted-foreground">
                Describe your third amazing feature here.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;