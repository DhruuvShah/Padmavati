import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";

import LandingPage from "./pages/landing";
import LoginPage from "./pages/login";
import AdminLayout from "./pages/admin/layout";
import DashboardPage from "./pages/admin/dashboard";
import ProductsPage from "./pages/admin/products";
import NewProductPage from "./pages/admin/new-product";
import CategoriesPage from "./pages/admin/categories";
import PartiesPage from "./pages/admin/parties";
import RatesPage from "./pages/admin/rates";
import CreateCataloguePage from "./pages/admin/create-catalogue";
import CataloguesPage from "./pages/admin/catalogues";
import AccessRequestsPage from "./pages/admin/access-requests";
import CatalogueSharePage from "./pages/catalogue-share";
import ProtectedRoute from "./components/ProtectedRoute";

import { ThemeProvider } from "next-themes";

export default function App() {
  const Provider: any = ThemeProvider;
  return (
    <Provider attribute="class" defaultTheme="light" enableSystem>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          
          <Route element={<ProtectedRoute />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="products" element={<ProductsPage />} />
              <Route path="products/new" element={<NewProductPage />} />
              <Route path="products/:id/edit" element={<NewProductPage />} />
              <Route path="categories" element={<CategoriesPage />} />
              <Route path="parties" element={<PartiesPage />} />
              <Route path="rates" element={<RatesPage />} />
              <Route path="create-catalogue" element={<CreateCataloguePage />} />
              <Route path="catalogues" element={<CataloguesPage />} />
              <Route path="access-requests" element={<AccessRequestsPage />} />
            </Route>
          </Route>
          
          <Route path="/catalogue/:id" element={<CatalogueSharePage />} />
        </Routes>
        <Toaster position="top-right" />
      </BrowserRouter>
    </Provider>
  );
}
