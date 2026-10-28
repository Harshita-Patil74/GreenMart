import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Leaf, Users, Truck, Recycle } from "lucide-react";
import productApi from "../../api/productApi";
import ProductCard from "../../components/product/ProductCard.jsx";
import { listDemoProducts, unwrapList } from "../../data/demoCatalog.js";

const HERO =
  "https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=1600&q=80";

export default function Home() {
  const navigate = useNavigate();
  const [products, setProducts] = useState(listDemoProducts({ limit: 4 }));

  useEffect(() => {
    productApi
      .list({ limit: 4 })
      .then((r) => setProducts(unwrapList(r, listDemoProducts({ limit: 4 })).slice(0, 4)))
      .catch(() => setProducts(listDemoProducts({ limit: 4 })));
  }, []);

  const features = [
    { title: "100% Organic Products", icon: Leaf },
    { title: "Direct from Farmers", icon: Users },
    { title: "Track Your Orders", icon: Truck },
    { title: "Eco-Friendly Packaging", icon: Recycle },
  ];

  return (
    <div className="bg-page-bg pb-16">
      <div className="gm-container pt-5">
        <div className="relative h-[340px] sm:h-[380px] rounded-[16px] overflow-hidden">
          <img src={HERO} alt="Fresh Organic" className="absolute inset-0 w-full h-full object-cover" />
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(90deg, rgba(0,0,0,.65), rgba(0,0,0,.35) 55%, transparent)" }}
          />
          <div className="relative z-10 h-full flex items-center">
            <div className="max-w-[460px] pl-8 sm:pl-12 pr-6">
              <h1 className="font-heading text-[36px] sm:text-[44px] leading-[1.15] font-bold text-white">
                Fresh. Organic.
                <br />
                Direct from Farmers.
              </h1>
              <p className="mt-3 text-[14px] text-white/90 max-w-[380px]">
                Support local farmers, choose healthy food, and make a sustainable tomorrow.
              </p>
              <div className="mt-7 flex gap-3">
                <button onClick={() => navigate("/shop")} className="gm-btn">
                  Shop Now
                </button>
                <button onClick={() => navigate("/about")} className="gm-btn-outline">
                  Learn More
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white mt-0">
        <div className="gm-container py-6 grid grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <div key={i} className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-[12px] bg-[#E8F5EC] flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <span className="text-[13px] font-medium text-[#1F2937] leading-snug">{f.title}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="gm-container pt-8">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-heading text-[20px] font-semibold text-[#1F2937]">Featured Products</h2>
          <Link to="/shop" className="text-[13px] font-medium text-primary hover:underline">
            View All →
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {products.map((p) => (
            <ProductCard key={p._id || p.id} product={p} />
          ))}
        </div>
      </div>
    </div>
  );
}
