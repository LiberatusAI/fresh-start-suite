
import React from 'react';
import { Checkout as CheckoutComponent } from '@/components/checkout/Checkout';
import { Layout } from '@/components/Layout';

const Checkout = () => {
  return (
    <Layout>
      <div className="min-h-[calc(100vh-200px)] py-12">
        <CheckoutComponent />
      </div>
    </Layout>
  );
};

export default Checkout;
