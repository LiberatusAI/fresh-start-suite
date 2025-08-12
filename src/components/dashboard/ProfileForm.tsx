import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import { TIME_OPTIONS } from '@/components/dashboard/constants';
import { convertLocalTimeToUTC, convertUTCTimeToLocal, getUserTimezone } from '@/utils/timezoneUtils';

const formSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters."),
  lastName: z.string().min(2, "Last name must be at least 2 characters."),
  email: z.string().email("Please enter a valid email address."),
  texturePreference: z.boolean().default(false),
  globalReportTime: z.string().min(1, "Please select a report time."),
});

type ProfileFormProps = {
  userId: string;
  initialData: {
    first_name: string;
    last_name: string;
    email: string;
    texture_preference: boolean;
    global_report_time: string;
  }
};

export function ProfileForm({ userId, initialData }: ProfileFormProps) {
  const [loading, setLoading] = useState(false);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: initialData.first_name || '',
      lastName: initialData.last_name || '',
      email: initialData.email || '',
      texturePreference: initialData.texture_preference ?? false,
      globalReportTime: initialData.global_report_time 
        ? convertUTCTimeToLocal(initialData.global_report_time) 
        : '09:00',
    },
  });

  // Make sure the form is reset when initialData changes
  React.useEffect(() => {
    if (initialData) {
      form.reset({
        firstName: initialData.first_name || '',
        lastName: initialData.last_name || '',
        email: initialData.email || '',
        texturePreference: initialData.texture_preference ?? false,
        globalReportTime: initialData.global_report_time 
          ? convertUTCTimeToLocal(initialData.global_report_time) 
          : '09:00',
      });
    }
  }, [initialData, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!userId) {
      console.error('No userId provided');
      return;
    }

    console.log('Form submitted with values:', values);
    setLoading(true);
    try {
      console.log('Attempting to update profile with:', {
        first_name: values.firstName,
        last_name: values.lastName,
        email: values.email,
        texture_preference: values.texturePreference,
        global_report_time: values.globalReportTime,
      });

      const { data, error } = await supabase
        .from('profiles')
        .update({
          first_name: values.firstName,
          last_name: values.lastName,
          email: values.email,
          texture_preference: values.texturePreference,
          global_report_time: convertLocalTimeToUTC(values.globalReportTime),
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error('Supabase update error:', error);
        throw error;
      }

      console.log('Profile updated successfully:', data);

      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Failed to update profile",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="firstName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>First Name</FormLabel>
              <FormControl>
                <Input {...field} />
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
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input {...field} type="email" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="globalReportTime"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Global Report Time</FormLabel>
              <FormControl>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full md:w-[200px] border-gold/20 bg-white/80 dark:bg-charcoal-light/80 dark:border-gold/30 dark:text-white">
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent 
                    position="item-aligned"
                    avoidCollisions={true}
                    align="center"
                    side="bottom"
                    className="z-50 bg-white dark:bg-charcoal-light min-w-[200px]"
                  >
                    {TIME_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormDescription>
                This time will be used for all your asset reports (your timezone: {getUserTimezone()})
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="texturePreference"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Background Texture</FormLabel>
                <FormDescription>
                  Toggle the marble-like texture in the background
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={(checked) => {
                    console.log('Switch toggled to:', checked);
                    field.onChange(checked);
                    // Trigger form submission immediately when switch is toggled
                    form.handleSubmit(onSubmit)();
                  }}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <Button 
          type="submit" 
          className="w-full border-gold text-gold hover:bg-gold/5 mt-4"
          disabled={loading}
        >
          {loading ? "Updating..." : "Update Profile"}
        </Button>
      </form>
    </Form>
  );
}
