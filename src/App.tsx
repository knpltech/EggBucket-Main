import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import OrderPage from "./pages/OrderPage.tsx";
import OrderSuccess from "./pages/OrderSuccess.tsx";
import AdminLogin from "./pages/admin/AdminLogin.tsx";
import AdminDashboard from "./pages/admin/AdminDashboard.tsx";
import OrderDetail from "./pages/admin/OrderDetail.tsx";
import DeliveryLogin from "./pages/delivery/DeliveryLogin.tsx";
import DeliveryOrders from "./pages/delivery/DeliveryOrders.tsx";
import NotFound from "./pages/NotFound.tsx";
import BackButtonHandler from "./components/BackButtonHandler.tsx";

const queryClient = new QueryClient();


const APP_MODE: "user" | "admin" | "delivery" = "user";


const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <BackButtonHandler />
        <Routes>

          {/* 🔥 ROOT ROUTE CONTROL */}
          <Route
            path="/"
            element={
              APP_MODE === "user" ? <Index /> :
              APP_MODE === "admin" ? <Navigate to="/admin" /> :
              <Navigate to="/delivery" />
            }
          />

          {/* USER ROUTES */}
          <Route path="/order" element={<OrderPage />} />
          <Route path="/order-success" element={<OrderSuccess />} />

          {/* ADMIN ROUTES */}
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/order/:orderId" element={<OrderDetail />} />

          {/* DELIVERY ROUTES */}
          <Route path="/delivery" element={<DeliveryLogin />} />
          <Route path="/delivery/orders" element={<DeliveryOrders />} />

          {/* NOT FOUND */}
          <Route path="*" element={<NotFound />} />

        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;











































































































































