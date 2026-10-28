import React from "react";
import BackButton from "../../components/common/BackButton.jsx";
import { ShieldCheck, Users, Truck, Package, Heart, Sparkles } from "lucide-react";

export default function About() {
  return (
    <div className="gm-container max-w-4xl mx-auto space-y-10 py-8 pb-16">
      <BackButton fallback="/" />
      {/* Header */}
      <div className="text-center space-y-3">
        <span className="text-xs font-bold uppercase tracking-wider text-[#16803C] bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
          Our Mission & Vision
        </span>
        <h1 className="text-3xl sm:text-4xl font-heading font-extrabold text-gray-900 tracking-tight">
          About GreenMart
        </h1>
        <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto leading-relaxed">
          GreenMart is a farmer-first marketplace connecting organic growers with conscious consumers. We eliminate unfair middlemen, guarantee authentic farm-fresh nutrition, and champion sustainable agriculture.
        </p>
      </div>

      {/* Hero Visual Card */}
      <div className="rounded-3xl overflow-hidden relative shadow-lg min-h-[260px] flex items-center p-8 bg-[#0F3D2E] text-white">
        <img
          src="/images/banners/hero-basket.jpg"
          alt="Organic Farm Fresh Produce"
          className="absolute inset-0 w-full h-full object-cover opacity-30"
        />
        <div className="relative z-10 max-w-lg space-y-3">
          <h2 className="text-2xl sm:text-3xl font-heading font-extrabold text-[#86efac]">
            Empowering Farmers. <br /> Nourishing Communities.
          </h2>
          <p className="text-xs sm:text-sm text-gray-200 leading-relaxed">
            By connecting local organic farmers directly to your kitchen table in Gadag and across Karnataka, 100% of the true product value goes to sustainable producers.
          </p>
        </div>
      </div>

      {/* 4 Pillars */}
      <div className="grid sm:grid-cols-2 gap-4">
        {[
          {
            title: "100% Certified Organic",
            desc: "Zero chemical pesticides, no synthetic fertilizers, naturally nurtured soil.",
            icon: ShieldCheck,
          },
          {
            title: "Direct from Local Farmers",
            desc: "Fair compensation directly into our farming partners' bank accounts.",
            icon: Users,
          },
          {
            title: "Real-time Order Tracking",
            desc: "Follow your harvest journey from the field to your doorstep in hours.",
            icon: Truck,
          },
          {
            title: "Eco-Friendly Packaging",
            desc: "Biodegradable, reusable, and zero single-use plastic deliveries.",
            icon: Package,
          },
        ].map((pillar, idx) => {
          const Icon = pillar.icon;
          return (
            <div
              key={idx}
              className="bg-white rounded-2xl border border-gray-100 p-5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] space-y-2 hover:border-emerald-200 transition"
            >
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-[#16803C] flex items-center justify-center">
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="font-heading font-bold text-gray-900 text-base">
                {pillar.title}
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">{pillar.desc}</p>
            </div>
          );
        })}
      </div>

      <div className="text-center pt-4">
        <Link
          to="/shop"
          className="inline-block px-8 py-3 rounded-xl bg-[#16803C] hover:bg-[#126B32] text-white font-semibold text-sm shadow-md transition"
        >
          Explore Fresh Harvests Now →
        </Link>
      </div>
    </div>
  );
}
