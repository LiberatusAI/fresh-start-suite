import React from 'react';
import { Layout } from '@/components/Layout';
import { AccountSettings } from '@/components/dashboard/AccountSettings';

export default function Settings() {
  return (
    <Layout>
      <div className="container py-8 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Account Settings</h1>
        <AccountSettings />
      </div>
    </Layout>
  );
}
