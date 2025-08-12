import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';

interface UserFormProps {
  user: any;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

const formSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters."),
  lastName: z.string().min(2, "Last name must be at least 2 characters."),
  email: z.string().email("Please enter a valid email address."),
  isAdmin: z.boolean().default(false),
  subscriptionTierId: z.string().nullable(),
});

export function UserForm({ user, onSubmit, onCancel }: UserFormProps) {
  const [tiers, setTiers] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: user?.first_name || '',
      lastName: user?.last_name || '',
      email: user?.email || '',
      isAdmin: user?.is_admin || false,
      subscriptionTierId: user?.subscription_tier_id || null,
    },
  });

  // Fetch subscription tiers
  useEffect(() => {
    const fetchTiers = async () => {
      try {
        const { data, error } = await supabase
          .from('tiers')
          .select('*')
          .order('price', { ascending: true });

        if (error) throw error;

        if (data) {
          setTiers(data);
        }
      } catch (error) {
        console.error('Error fetching tiers:', error);
      }
    };

    fetchTiers();
  }, []);

  // Update form values when user changes
  useEffect(() => {
    if (user) {
      form.reset({
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        email: user.email || '',
        isAdmin: user.is_admin || false,
        subscriptionTierId: user.subscription_tier_id || null,
      });
    }
  }, [user, form]);

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    try {
      await onSubmit({
        id: user.id,
        first_name: values.firstName,
        last_name: values.lastName,
        email: values.email,
        is_admin: values.isAdmin,
        subscription_tier_id: values.subscriptionTierId,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-gold/20 dark:border-gold/30">
      <CardHeader>
        <CardTitle>Edit User</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
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
              name="isAdmin"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Admin Access</FormLabel>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="subscriptionTierId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subscription Tier</FormLabel>
                  <Select
                    value={field.value || "none"}
                    onValueChange={(value) => field.onChange(value === "none" ? null : value)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a subscription tier">
                          {field.value === null ? "None" : 
                            tiers.find(t => t.id === field.value)?.name?.charAt(0).toUpperCase() + 
                            tiers.find(t => t.id === field.value)?.name?.slice(1) + 
                            ` ($${tiers.find(t => t.id === field.value)?.price})`
                          }
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {tiers.map((tier) => (
                        <SelectItem key={tier.id} value={tier.id}>
                          {tier.name.charAt(0).toUpperCase() + tier.name.slice(1)} (${tier.price})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end space-x-2 pt-2">
              <Button 
                type="button" 
                variant="outline"
                onClick={onCancel}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Update User'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
