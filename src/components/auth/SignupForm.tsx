import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { GoogleAuthButton } from "./GoogleAuthButton";
import { SubscriptionTier } from "@/types";
import { getSignupFlow } from "@/utils/featureFlags";
import { logger } from "@/utils/logger";

const signupSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SignupFormValues = z.infer<typeof signupSchema>;

interface SignupFormProps {
  selectedPlan?: SubscriptionTier;
  onPlanSelect?: (plan: SubscriptionTier) => void;
}

export function SignupForm({ selectedPlan, onPlanSelect }: SignupFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(data: SignupFormValues) {
    const signupFlow = getSignupFlow();
    logger.onboardingStep('signup-started', { signupFlow, selectedPlan });

    if (signupFlow === 'plan-first' && !selectedPlan) {
      toast({
        title: "Please select a plan",
        description: "Choose a subscription plan to continue.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Sign up with Supabase
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            firstName: data.firstName,
            lastName: data.lastName,
          },
        },
      });
      
      if (error) {
        throw error;
      }

      if (authData.user) {
        if (signupFlow === 'value-first') {
          // NEW: Value-first flow - auto-assign trial and go to asset selection
          logger.onboardingStep('trial-assignment', { userId: authData.user.id });
          
          // Get trial tier ID from database
          const { data: trialTier, error: trialTierError } = await supabase
            .from('tiers')
            .select('id')
            .eq('name', 'trial')
            .single();

          if (trialTierError || !trialTier) {
            logger.error('onboarding', 'Failed to fetch trial tier', { error: trialTierError });
            throw new Error('Failed to fetch trial tier information');
          }

          const { error: tierError } = await supabase
            .from('profiles')
            .update({ 
              subscription_tier_id: trialTier.id,
              trial_started_at: new Date().toISOString()
            })
            .eq('id', authData.user.id);

          if (tierError) {
            logger.databaseOperation('trial-assignment', 'profiles', false, tierError, authData.user.id);
            throw tierError;
          }

          logger.databaseOperation('trial-assignment', 'profiles', true, null, authData.user.id);
          
          // Navigate to asset selection instead of payment
          logger.onboardingStep('navigate-to-assets', { userId: authData.user.id });
          navigate('/assets', { 
            state: { 
              isFirstTimeUser: true,
              fromSignup: true 
            } 
          });
        } else {
          // EXISTING: Plan-first flow - create checkout session
          logger.onboardingStep('checkout-session-creation', { userId: authData.user.id, tier: selectedPlan });
          
          const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke('create-signup-checkout', {
            body: {
              userId: authData.user.id,
              tier: selectedPlan,
              email: data.email,
              firstName: data.firstName,
              lastName: data.lastName,
              couponId: 'your_coupon_id_here',
              trialPeriodDays: selectedPlan === 'trial' ? 7 : null
            }
          });

          if (checkoutError) {
            logger.stripeOperation('create-signup-checkout', false, undefined, checkoutError, authData.user.id);
            throw checkoutError;
          }

          if (checkoutData?.url) {
            logger.stripeOperation('create-signup-checkout', true, checkoutData.sessionId, undefined, authData.user.id);
            window.location.href = checkoutData.url;
          } else {
            throw new Error('Failed to create checkout session');
          }
        }
      }
    } catch (error: any) {
      console.error("Signup error:", error);
      logger.error('onboarding', 'Signup failed', { error: error.message, signupFlow });
      toast({
        title: "Sign up failed",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="space-y-2 text-center mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Create your account</h1>
        <p className="text-muted-foreground text-sm">
          Enter your information to create your AssetMelody account
        </p>
      </div>
      
      {/* Google Auth Button - Temporarily hidden
      <div className="mb-6">
        <GoogleAuthButton text="Sign up with Google" />
      </div>
      
      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or continue with email</span>
        </div>
      </div>
      */}
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="John" 
                      {...field} 
                      className="bg-white/70 dark:bg-charcoal-light/80 border-gold/20 focus:border-gold/40 dark:text-white dark:placeholder:text-gray-400"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Doe" 
                      {...field} 
                      className="bg-white/70 dark:bg-charcoal-light/80 border-gold/20 focus:border-gold/40 dark:text-white dark:placeholder:text-gray-400"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input 
                    type="email"
                    placeholder="john.doe@example.com" 
                    {...field} 
                    className="bg-white/70 dark:bg-charcoal-light/80 border-gold/20 focus:border-gold/40 dark:text-white dark:placeholder:text-gray-400"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input 
                    type="password"
                    placeholder="••••••••" 
                    {...field} 
                    className="bg-white/70 dark:bg-charcoal-light/80 border-gold/20 focus:border-gold/40 dark:text-white dark:placeholder:text-gray-400"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm Password</FormLabel>
                <FormControl>
                  <Input 
                    type="password"
                    placeholder="••••••••" 
                    {...field} 
                    className="bg-white/70 dark:bg-charcoal-light/80 border-gold/20 focus:border-gold/40 dark:text-white dark:placeholder:text-gray-400"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <Button 
            type="submit" 
            className="w-full bg-gold hover:bg-gold-dark text-white"
            disabled={isLoading || (getSignupFlow() === 'plan-first' && !selectedPlan)}
          >
            {isLoading ? "Creating Account..." : 
              getSignupFlow() === 'value-first' ? "Create Account & Explore Assets" :
              selectedPlan === 'trial' ? "Start Free Trial" : "Create Account & Continue to Payment"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
