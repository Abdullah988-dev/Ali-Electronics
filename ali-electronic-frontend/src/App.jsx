import { Routes, Route } from "react-router-dom";
import { useLocation } from "react-router-dom";
import ProtectedRoute from "./routes/ProtectedRoute.jsx";
import useTitle from "./hooks/useTitle.js";
import CustomerLayout from "./components/layout/CustomerLayout.jsx";
import Home from "./pages/customer/Home.jsx";
import ShopProducts from "./pages/customer/Products.jsx";
import ProductDetail from "./pages/customer/ProductDetail.jsx";
import Cart from "./pages/customer/Cart.jsx";
import Checkout from "./pages/customer/Checkout.jsx";
import OrderSuccess from "./pages/customer/OrderSuccess.jsx";
import MyOrders from "./pages/customer/MyOrders.jsx";
import NotFound from "./pages/NotFound.jsx";
import Login from "./pages/auth/Login.jsx";
import Register from "./pages/auth/Register.jsx";
import AdminLayout from "./admin/components/AdminLayout.jsx";
import Dashboard from "./admin/pages/dashboard/Dashboard.jsx";
import Orders from "./admin/pages/orders/Orders.jsx";
import Categories from "./admin/pages/categories/Categories.jsx";
import Brands from "./admin/pages/brands/Brands.jsx";
import Products from "./admin/pages/products/Products.jsx";
import Users from "./admin/pages/users/Users.jsx";
import ManagementLayout from "./management/components/ManagementLayout.jsx";
import MgmtDashboard from "./management/pages/dashboard/Dashboard.jsx";
import Inventory from "./management/pages/inventory/Inventory.jsx";
import StockIn from "./management/pages/stock-in/StockIn.jsx";
import StockOut from "./management/pages/stock-out/StockOut.jsx";
import Suppliers from "./management/pages/suppliers/Suppliers.jsx";
import Reports from "./management/pages/reports/Reports.jsx";

// Address ke hisaab se browser tab ka title
const TITLES = [
  ["/management", "Management System"],
  ["/admin", "Admin Panel"],
  ["/products", "Products"],
  ["/cart", "Cart"],
  ["/checkout", "Checkout"],
  ["/order-success", "Order ho gaya"],
  ["/orders", "My Orders"],
  ["/login", "Login"],
  ["/register", "Sign up"],
];

function TitleManager() {
  const { pathname } = useLocation();
  const match = TITLES.find(([prefix]) => pathname.startsWith(prefix));
  useTitle(match ? match[1] : "");
  return null;
}

export default function App() {
  return (
    <>
      <TitleManager />
      <Routes>
        {/* Customer website */}
        <Route element={<CustomerLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<ShopProducts />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />

          {/* In ke liye login zaroori hai */}
          <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
          <Route path="/order-success/:id" element={<ProtectedRoute><OrderSuccess /></ProtectedRoute>} />
          <Route path="/orders" element={<ProtectedRoute><MyOrders /></ProtectedRoute>} />

          {/* Ghalat address */}
          <Route path="*" element={<NotFound />} />
        </Route>

        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Admin panel (sirf URL se: /admin) */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={["admin"]}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="orders" element={<Orders />} />
          <Route path="categories" element={<Categories />} />
          <Route path="brands" element={<Brands />} />
          <Route path="products" element={<Products />} />
          <Route path="users" element={<Users />} />
        </Route>

        {/* Management system (admin aur staff) */}
        <Route
          path="/management"
          element={
            <ProtectedRoute roles={["admin", "staff"]}>
              <ManagementLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<MgmtDashboard />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="stock-in" element={<StockIn />} />
          <Route path="stock-out" element={<StockOut />} />
          <Route path="suppliers" element={<Suppliers />} />
          <Route path="reports" element={<Reports />} />
        </Route>
      </Routes>
    </>
  );
}