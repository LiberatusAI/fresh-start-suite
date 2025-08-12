import React from 'react';
import { Layout } from '@/components/Layout';

export default function Terms() {
  return (
    <Layout>
      <div className="container py-8 max-w-4xl mx-auto">
        <div className="prose prose-lg max-w-none">
          <h1 className="text-4xl font-bold mb-8 text-gray-900">Terms of Service</h1>
          
          <div className="space-y-8">
            {/* Terms of Service Section */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-gray-800">1. Acceptance of Terms</h2>
              <p className="text-gray-600 mb-4">
                By accessing and using FutureCast, you accept and agree to be bound by the terms and provisions of this agreement. If you do not agree to these terms, please do not use our service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-gray-800">2. Service Description</h2>
              <p className="text-gray-600 mb-4">
                FutureCast provides advanced investment analysis, portfolio management tools, and financial forecasting services. We offer subscription-based access to our platform, analytics, and related services to help you make informed investment decisions.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-gray-800">3. User Accounts and Responsibilities</h2>
              <p className="text-gray-600 mb-4">
                You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must notify us immediately of any unauthorized use of your account or any other breach of security.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-gray-800">4. Subscription and Billing</h2>
              <p className="text-gray-600 mb-4">
                Subscription fees are billed in advance on a recurring basis and are non-refundable except as required by law. You may cancel your subscription at any time, and the cancellation will take effect at the end of your current billing period. We reserve the right to change our pricing with reasonable notice.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-gray-800">5. Data Privacy and Security</h2>
              <p className="text-gray-600 mb-4">
                We respect your privacy and are committed to protecting your personal data. We use industry-standard security measures to protect your information. Please refer to our Privacy Policy for detailed information about how we collect, use, store, and protect your information.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-gray-800">6. Investment Disclaimer</h2>
              <p className="text-gray-600 mb-4">
                FutureCast provides information and tools for educational and informational purposes only. Our services do not constitute investment advice, and we are not a registered investment advisor. All investment decisions are your responsibility, and you should consult with qualified professionals before making investment decisions.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-gray-800">7. Limitation of Liability</h2>
              <p className="text-gray-600 mb-4">
                FutureCast shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the service. Our total liability shall not exceed the amount paid by you for the service during the twelve months preceding the claim.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-gray-800">8. Acceptable Use</h2>
              <p className="text-gray-600 mb-4">
                You agree not to use our service for any unlawful purpose or in any way that could damage, disable, or impair our service. You may not attempt to gain unauthorized access to our systems or interfere with other users' use of the service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-gray-800">9. Changes to Terms</h2>
              <p className="text-gray-600 mb-4">
                We reserve the right to modify these terms at any time. We will notify you of material changes via email or through our service. Continued use of our service after changes constitutes acceptance of the new terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-gray-800">10. Termination</h2>
              <p className="text-gray-600 mb-4">
                We may terminate or suspend your account immediately, without prior notice, for conduct that we believe violates these terms or is harmful to other users, us, or third parties.
              </p>
            </section>

            {/* FAQ Section */}
            <div className="border-t pt-8 mt-12">
              <h1 className="text-4xl font-bold mb-8 text-gray-900">Frequently Asked Questions</h1>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-2 text-gray-800">How do I cancel my subscription?</h3>
                  <p className="text-gray-600">
                    You can cancel your subscription at any time through your account settings. Navigate to Settings → Subscription Management and click "Cancel Subscription." The cancellation will take effect at the end of your current billing period, and you'll continue to have access until then.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-2 text-gray-800">Is my financial data secure?</h3>
                  <p className="text-gray-600">
                    Yes, we use bank-level encryption and security measures to protect your data. We never store your financial account credentials directly and use read-only connections to financial institutions. All data is encrypted both in transit and at rest.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-2 text-gray-800">Can I change my subscription plan?</h3>
                  <p className="text-gray-600">
                    Yes, you can upgrade or downgrade your subscription plan at any time through your account settings. Upgrades take effect immediately, while downgrades take effect at the end of your current billing period. Changes will be prorated appropriately.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-2 text-gray-800">What types of assets can I track?</h3>
                  <p className="text-gray-600">
                    FutureCast supports tracking of stocks, bonds, ETFs, mutual funds, REITs, commodities, cryptocurrencies, and other investment vehicles. We're continuously adding support for new asset types and international markets.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-2 text-gray-800">How often is the data updated?</h3>
                  <p className="text-gray-600">
                    Our data is updated in real-time during market hours for supported exchanges. End-of-day data is updated within 30 minutes of market close. Historical data and fundamental information are refreshed nightly.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-2 text-gray-800">Do you offer customer support?</h3>
                  <p className="text-gray-600">
                    Yes, we provide customer support via email, chat, and help documentation. Premium subscribers receive priority support with faster response times and access to advanced features and tutorials.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-2 text-gray-800">Can I export my data and reports?</h3>
                  <p className="text-gray-600">
                    Yes, you can export your portfolio data, analysis reports, and charts in various formats including CSV, PDF, Excel, and PNG. This feature is available to all subscribers and helps you share insights with advisors or for your records.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-2 text-gray-800">Is there a mobile app?</h3>
                  <p className="text-gray-600">
                    Currently, FutureCast is available as a responsive web application optimized for both desktop and mobile browsers. A dedicated mobile app for iOS and Android is in development and will be available soon.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-2 text-gray-800">Do you provide investment advice?</h3>
                  <p className="text-gray-600">
                    No, FutureCast provides analytical tools and information for educational purposes only. We are not a registered investment advisor and do not provide personalized investment advice. Always consult with qualified financial professionals for investment decisions.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-2 text-gray-800">What happens to my data if I cancel?</h3>
                  <p className="text-gray-600">
                    Your data remains accessible during your current billing period. After cancellation, we retain your data for 30 days to allow for reactivation. After 30 days, your data is permanently deleted unless required by law to retain it longer.
                  </p>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="border-t pt-8 mt-12">
              <h2 className="text-2xl font-semibold mb-4 text-gray-800">Contact Us</h2>
              <p className="text-gray-600 mb-4">
                If you have any questions about these Terms of Service, our FAQ, or need assistance with our platform, please contact us:
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