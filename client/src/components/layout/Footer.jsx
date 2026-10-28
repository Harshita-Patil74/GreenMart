import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Leaf, Mail, MapPin } from "lucide-react";
import Logo from "../common/Logo.jsx";
import categoryApi from "../../api/categoryApi.js";

const linkClass = "inline-flex min-h-6 items-center gap-1 rounded-sm text-[13px] leading-5 text-[#315846] transition-colors hover:text-[#176B3A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176B3A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#B7D9BC]";
const categoriesFallbackMessage = "Categories are temporarily unavailable.";

const linkGroups = [
  {
    title: "Quick links",
    label: "Quick links",
    links: [
      { label: "Home", to: "/" },
      { label: "Shop", to: "/shop" },
      { label: "About Us", to: "/about" },
      { label: "Contact Us", to: "/contact" },
    ],
  },
  {
    title: "For customers",
    label: "Customer links",
    links: [
      { label: "My Account", to: "/customer/dashboard" },
      { label: "My Orders", to: "/customer/orders" },
      { label: "Track Order", to: "/track-order" },
      { label: "Help & Support", to: "/contact" },
    ],
  },
  {
    title: "For farmers",
    label: "Farmer links",
    links: [
      { label: "Explore Farmers", to: "/farmers" },
      { label: "Farmer Login", to: "/login?role=farmer" },
      { label: "Become a Farmer", to: "/register?role=farmer" },
      { label: "Farmer Support", to: "/contact" },
    ],
  },
  {
    title: "For admins",
    label: "Admin links",
    links: [
      { label: "Admin Login", to: "/admin/login" },
      { label: "Manage Users", to: "/admin/users" },
      { label: "Reports", to: "/admin/reports" },
      { label: "Settings", to: "/admin/settings" },
    ],
  },
];

export default function Footer() {
  const [categories, setCategories] = useState([]);
  const [categoryError, setCategoryError] = useState("");

  useEffect(() => {
    let active = true;
    categoryApi.list()
      .then(({ data }) => {
        if (!Array.isArray(data)) throw new Error("The category response was invalid.");
        if (active) setCategories(data.filter((category) => category?._id && category?.name));
      })
      .catch(() => {
        if (active) setCategoryError(categoriesFallbackMessage);
      });
    return () => { active = false; };
  }, []);

  return (
    <footer className="relative isolate mt-12 overflow-hidden border-t border-[#A5C9AA] bg-[#B7D9BC] text-[#24483A]">
      <div aria-hidden="true" className="pointer-events-none absolute bottom-10 right-0 -z-10 flex items-end gap-1 text-[#176B3A]/[0.07]">
        <Leaf className="h-20 w-20 rotate-[-28deg] sm:h-28 sm:w-28" strokeWidth={1} />
        <Leaf className="mb-2 h-14 w-14 rotate-[18deg] sm:h-20 sm:w-20" strokeWidth={1} />
      </div>

      <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-x-8 gap-y-9 px-5 py-10 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1.15fr_1.15fr_1fr_1.2fr] lg:gap-x-6 lg:py-12">
        <section className="min-w-0 sm:col-span-2 lg:col-span-1" aria-labelledby="footer-brand">
          <div className="inline-flex max-w-full rounded-lg bg-white/80 p-1.5">
            <Logo to={null} subtitle size="sm" className="w-[190px]" />
          </div>
          <h2 id="footer-brand" className="sr-only">About GreenMart</h2>
          <p className="mt-4 max-w-sm text-[13px] leading-6 text-[#315846]">
            Bringing fresh, thoughtfully grown produce from local farmers to your table.
          </p>
          <Link to="/about" className={`${linkClass} mt-3 font-semibold text-[#176B3A]`}>
            Our story <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
          </Link>
        </section>

        {linkGroups.map((group) => (
          <nav key={group.label} aria-label={group.label} className="min-w-0">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-[#176B3A]">{group.title}</h2>
            <ul className="space-y-2">
              {group.links.map(({ label, to }) => (
                <li key={label}><Link className={linkClass} to={to}>{label}</Link></li>
              ))}
            </ul>
          </nav>
        ))}

        <div className="min-w-0">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-[#176B3A]">Get in touch</h2>
          <p className="text-[13px] leading-5 text-[#315846]">
            Questions about an order or your account? We’re here to help.
          </p>
          <Link className={`${linkClass} mt-2 font-semibold text-[#176B3A]`} to="/contact">
            Contact our team <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
          </Link>
          <div className="mt-4 space-y-2 border-t border-[#A5C9AA] pt-3 text-[11px] leading-5 text-[#405E4D]">
            <a className={`${linkClass} text-[11px] text-[#405E4D]`} href="mailto:support@greenmart.org">
              <Mail aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-[#43835A]" />support@greenmart.org
            </a>
            <a className={`${linkClass} text-[11px] text-[#405E4D]`} href="tel:+919611843210">
              <MapPin aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-[#43835A]" />+91 96118 43210
            </a>
            <p className="pl-[22px]">Plot 42, Green Avenue, Gadag, Karnataka - 582101</p>
            <p className="pl-[22px]">Mon–Sat, 8 AM–8 PM</p>
          </div>
        </div>

        <nav aria-label="Shop categories" className="min-w-0 sm:col-span-2 lg:col-span-6">
          <div className="border-t border-[#A5C9AA] pt-5">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-[#176B3A]">Shop by category</h2>
            {categoryError ? (
              <p role="status" className="text-[13px] text-[#405E4D]">{categoriesFallbackMessage}</p>
            ) : categories.length ? (
              <ul className="flex flex-wrap gap-x-5 gap-y-2">
                {categories.map((category) => (
                  <li key={category._id}>
                    <Link className={linkClass} to={`/shop?category=${encodeURIComponent(category.name)}`}>
                      {category.name}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p role="status" className="text-[13px] text-[#405E4D]">Loading categories…</p>
            )}
          </div>
        </nav>
      </div>

      <div className="border-t border-[#91B998] bg-[#A5CFA9]">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-2 px-5 py-4 text-xs text-[#315846] sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} GreenMart. Fresh produce from local farmers.</p>
          <p className="inline-flex items-center gap-1.5 font-medium text-[#176B3A]">
            <Leaf aria-hidden="true" className="h-3.5 w-3.5" /> Go Green <span aria-hidden="true">•</span> Choose Organic
          </p>
        </div>
      </div>
    </footer>
  );
}
