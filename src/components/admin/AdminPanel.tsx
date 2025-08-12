import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UserList } from './UserList';
import { UserForm } from './UserForm';
import { toast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingCard } from '@/components/dashboard/LoadingCard';
import { useSearchParams } from 'react-router-dom';

export function AdminPanel() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedUserId = searchParams.get('userId');
  const selectedUser = users.find(user => user.id === selectedUserId);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        if (data) {
          setUsers(data);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
        toast({
          title: "Error",
          description: "Failed to load users",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const handleEditUser = (user: any) => {
    setSearchParams({ userId: user.id });
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      setUsers(users.filter(user => user.id !== userId));
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
      
      // Reset selected user if the deleted user was selected
      if (selectedUserId === userId) {
        setSearchParams({});
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive"
      });
    }
  };

  const handleSaveUser = async (userData: any) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update(userData)
        .eq('id', userData.id);

      if (error) throw error;

      setUsers(users.map(user => 
        user.id === userData.id ? { ...user, ...userData } : user
      ));
      toast({
        title: "Success",
        description: "User updated successfully",
      });
      setSearchParams({}); // Reset form after successful save
    } catch (error) {
      console.error('Error saving user:', error);
      toast({
        title: "Error",
        description: "Failed to save user",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return <LoadingCard title="Loading users..." />;
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="userList" className="w-full">
        <TabsList>
          <TabsTrigger value="userList">User Management</TabsTrigger>
        </TabsList>
        
        <TabsContent value="userList" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Users ({users.length})</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <UserList 
                users={users} 
                onEdit={handleEditUser} 
                onDelete={handleDeleteUser}
                selectedUserId={selectedUserId}
              />
            </div>
            
            <div>
              {selectedUser ? (
                <UserForm 
                  user={selectedUser} 
                  onSubmit={handleSaveUser}
                  onCancel={() => setSearchParams({})}
                />
              ) : (
                <div className="border rounded-md p-6 text-center bg-white dark:bg-charcoal shadow-sm">
                  <p className="text-muted-foreground">Select a user to edit</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
