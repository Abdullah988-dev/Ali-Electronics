import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { catalogApi } from "../../services/catalogService.js";
import Navbar from "./Navbar.jsx";
import Footer from "./Footer.jsx";

export default function CustomerLayout() {
  const [categories, setCategories] = useState([]);
  const { pathname } = useLocation();

  useEffect(() => {
    catalogApi.categories().then(setCategories).catch(() => {});
  }, []);

  // page badalne par upar se shuru ho
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="site">
      <Navbar categories={categories} />
      <main className="site-main">
        <Outlet />
      </main>
      <Footer categories={categories} />
    </div>
  );
}