import { Outlet } from "react-router-dom";
import Navbar from "../components/layout/Navbar.jsx";
import PageTransition from "../components/common/PageTransition.jsx";
import Footer from "../components/layout/Footer.jsx";

export default function PublicLayout() {
  return (
    <div className="min-h-screen bg-page-bg">
      <Navbar />
      <PageTransition><Outlet /></PageTransition>
      <Footer />
    </div>
  );
}
