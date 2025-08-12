
import React from 'react';
import { Layout } from '@/components/Layout';
import { AdminPanel } from '@/components/admin/AdminPanel';

const Admin = () => {
  return (
    <Layout>
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
        <AdminPanel />
      </div>
    </Layout>
  );
};

export default Admin;
