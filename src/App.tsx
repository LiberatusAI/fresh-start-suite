import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApolloProvider } from '@apollo/client';
import { apolloClient } from '@/integrations/graphql/client';
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { AssetProvider } from "@/context/AssetContext";
import { ThemeProvider } from "@/hooks/use-theme";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AdminRoute from "@/components/auth/AdminRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import SubscriptionSelection from "./pages/SubscriptionSelection";
import AssetSelection from "./pages/AssetSelection";
import PlanSelection from "./pages/PlanSelection";
import Checkout from "./pages/Checkout";
import ReportScheduling from "./pages/ReportScheduling";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import PlanChange from "./pages/PlanChange";
import AssetDetails from "./pages/AssetDetails";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import SubscriptionSuccessPage from "./pages/SubscriptionSuccessPage";
import SubscriptionCanceledPage from "./pages/SubscriptionCanceledPage";
import Terms from "./pages/Terms";
import Contact from "./pages/Contact";

const queryClient = new QueryClient();

const App = () => (
  <ApolloProvider client={apolloClient}>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <AuthProvider>
            <AssetProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<Navigate to="/signup" replace />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route 
                    path="/subscription" 
                    element={
                      <ProtectedRoute>
                        <SubscriptionSelection />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/assets" 
                    element={
                      <ProtectedRoute>
                        <AssetSelection />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/plan-selection" 
                    element={
                      <ProtectedRoute>
                        <PlanSelection />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/checkout" 
                    element={
                      <ProtectedRoute>
                        <Checkout />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/plan-change" 
                    element={
                      <ProtectedRoute>
                        <PlanChange />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/scheduling" 
                    element={
                      <ProtectedRoute>
                        <ReportScheduling />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/dashboard" 
                    element={
                      <ProtectedRoute>
                        <Dashboard />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/asset/:assetId" 
                    element={
                      <ProtectedRoute>
                        <AssetDetails />
                      </ProtectedRoute>
                    }
                  />
                  <Route 
                    path="/settings" 
                    element={
                      <ProtectedRoute>
                        <Settings />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/admin" 
                    element={
                      <AdminRoute>
                        <Admin />
                      </AdminRoute>
                    } 
                  />
                  <Route 
                    path="/subscription-success" 
                    element={ 
                      <ProtectedRoute>
                        <SubscriptionSuccessPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route 
                    path="/subscription-canceled" 
                    element={ 
                      <ProtectedRoute>
                        <SubscriptionCanceledPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/contact" element={<Contact />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </AssetProvider>
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ApolloProvider>
);

export default App;
