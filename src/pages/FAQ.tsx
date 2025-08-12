import React from 'react';
import { Layout } from '@/components/Layout';

export default function FAQ() {
  return (
    <Layout>
      <div className="container py-8 max-w-4xl mx-auto">
        <div className="prose prose-lg max-w-none">
          <h1 className="text-4xl font-bold mb-8 text-gray-900">FutureCast FAQ</h1>
          
          <div className="space-y-8">
            <div>
              <h3 className="text-xl font-semibold mb-2 text-gray-800">What is FutureCast?</h3>
              <p className="text-gray-600">
                FutureCast is a crypto intelligence platform that delivers powerful, data-driven insights to retail crypto investors. We track over 3,000 cryptocurrencies using more than 25 performance and behavioral metrics to help you make smarter, faster investment decisions.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2 text-gray-800">What kind of data and reports do I get?</h3>
              <p className="text-gray-600">
                Depending on your subscription, you'll receive scheduled reports with in-depth analytics covering:
              </p>
              <ul className="text-gray-600 ml-6 mt-2 space-y-1">
                <li>• Price action</li>
                <li>• Volume trends</li>
                <li>• Social sentiment</li>
                <li>• Whale activity</li>
                <li>• Network health</li>
                <li>• On-chain behavior</li>
                <li>• … and much more.</li>
              </ul>
              <p className="text-gray-600 mt-2">
                You can also view live charts for any of the assets you track through our dashboard.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2 text-gray-800">How does the subscription work?</h3>
              <p className="text-gray-600 mb-3">
                We offer three monthly subscription plans:
              </p>
              <div className="space-y-3">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-800">Basic — $19.99/month</h4>
                  <ul className="text-gray-600 ml-4 mt-1 space-y-1">
                    <li>• 5 crypto assets</li>
                    <li>• 1 detailed daily report</li>
                  </ul>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-800">Pro — $49.99/month</h4>
                  <ul className="text-gray-600 ml-4 mt-1 space-y-1">
                    <li>• Up to 20 assets</li>
                    <li>• 3 reports daily</li>
                  </ul>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-800">Elite — $99.99/month</h4>
                  <ul className="text-gray-600 ml-4 mt-1 space-y-1">
                    <li>• Unlimited assets</li>
                    <li>• Hourly reports, 24x per day</li>
                  </ul>
                </div>
              </div>
              <p className="text-gray-600 mt-3">
                No long-term commitment — cancel anytime.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2 text-gray-800">What cryptocurrencies do you track?</h3>
              <p className="text-gray-600">
                We currently support over 3,000 crypto assets — from Bitcoin and Ethereum to smaller altcoins and DeFi tokens. You can browse the full list of supported assets here (data source).
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2 text-gray-800">Do I need to create an account to access reports?</h3>
              <p className="text-gray-600">
                Yes, registration is required to activate your subscription and begin receiving reports via email. Signing up takes less than a minute.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2 text-gray-800">Can I upgrade or downgrade my plan later?</h3>
              <p className="text-gray-600">
                Yes — you can upgrade or downgrade at any time based on your tracking needs. Changes take effect at the start of your next billing cycle.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2 text-gray-800">How do I receive my reports?</h3>
              <p className="text-gray-600">
                Reports are delivered directly to your email inbox according to the schedule of your plan (daily or hourly). You can also access historical charts and live asset data from your FutureCast dashboard.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2 text-gray-800">Do you offer a free trial?</h3>
              <p className="text-gray-600">
                We currently do not offer a free trial, but you can start with the Essential plan for just $4.95/week to try the platform with minimal risk.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2 text-gray-800">Can I cancel my subscription?</h3>
              <p className="text-gray-600">
                Yes. You can cancel your subscription anytime from your account settings. Your access will remain active until the end of your current billing week.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2 text-gray-800">Is my data and payment information secure?</h3>
              <p className="text-gray-600">
                Absolutely. We use secure, encrypted payment processing and never share your personal or financial data with third parties.
              </p>
            </div>

            {/* Contact Information */}
            <div className="border-t pt-8 mt-12">
              <h2 className="text-2xl font-semibold mb-4 text-gray-800">Still have questions?</h2>
              <p className="text-gray-600 mb-4">
                If you need additional help or have questions not covered in this FAQ, please contact us:
              </p>
              <div className="space-y-2">
                <p className="text-gray-600">
                  Email: <a href="mailto:support@futurecast.pro" className="text-blue-600 hover:text-blue-800 underline">support@futurecast.pro</a>
                </p>
                <p className="text-gray-600">
                  Help Center: <a href="/help" className="text-blue-600 hover:text-blue-800 underline">FutureCast Help Center</a>
                </p>
              </div>
              <p className="text-gray-500 text-sm mt-6">
                Last updated: {new Date().toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
} 