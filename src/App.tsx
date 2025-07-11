
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/ClerkAuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import MainAdminDashboard from "./pages/MainAdminDashboard";
import DepartmentAdminDashboard from "./pages/DepartmentAdminDashboard";
import StaffDashboard from "./pages/StaffDashboard";
import TimetableGenerator from "./pages/TimetableGenerator";
import DepartmentWorkspace from "./pages/DepartmentWorkspace";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Protected Routes */}
            <Route path="/main-admin" element={
              <ProtectedRoute requiredRole="main_admin">
                <MainAdminDashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/dept-admin" element={
              <ProtectedRoute requiredRole="dept_admin">
                <DepartmentAdminDashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/staff" element={
              <ProtectedRoute requiredRole="staff">
                <StaffDashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/timetable-generator" element={
              <ProtectedRoute>
                <TimetableGenerator />
              </ProtectedRoute>
            } />
            
            <Route path="/department/:deptId" element={
              <ProtectedRoute>
                <DepartmentWorkspace />
              </ProtectedRoute>
            } />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
