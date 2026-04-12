import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Navbar from "@/components/Navbar";
import Home from "@/pages/Home";
import Businesses from "@/pages/Businesses";
import BusinessProfile from "@/pages/BusinessProfile";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import RegisterBusiness from "@/pages/RegisterBusiness";
import Dashboard from "@/pages/Dashboard";
import Admin from "@/pages/Admin";
import Cars from "@/pages/Cars";
import CarDetail from "@/pages/CarDetail";
import GarageServices from "@/pages/GarageServices";
import AutomotiveSupport from "@/pages/AutomotiveSupport";
import BrandPage from "@/pages/BrandPage";
import VerifyEmail from "@/pages/VerifyEmail";
import AutoDealers from "@/pages/AutoDealers";
import AutoSpares from "@/pages/AutoSpares";
import AutoGarages from "@/pages/AutoGarages";
import Terms from "@/pages/Terms";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/automobile-dealers" component={AutoDealers} />
      <Route path="/autospares-dealers" component={AutoSpares} />
      <Route path="/autogarage-repair" component={AutoGarages} />
      <Route path="/businesses" component={Businesses} />
      <Route path="/business/:id" component={BusinessProfile} />
      <Route path="/cars" component={Cars} />
      <Route path="/cars/:id" component={CarDetail} />
      <Route path="/garages/services" component={GarageServices} />
      <Route path="/automotive-support" component={AutomotiveSupport} />
      <Route path="/brand/:brand" component={BrandPage} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/register-business" component={RegisterBusiness} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/admin" component={Admin} />
      <Route path="/terms" component={Terms} />
      <Route path="/verify-email/:token" component={VerifyEmail} />
      <Route component={NotFound} />
    </Switch>
  );
}

function Layout() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1">
        <Router />
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Layout />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
