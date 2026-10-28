import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import productApi from "../../api/productApi";
import ProductForm from "../../components/product/ProductForm.jsx";
import BackButton from "../../components/common/BackButton.jsx";
import Button from "../../components/common/Button.jsx";
import toast from "react-hot-toast";

export default function ProductAddEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [initial, setInitial] = useState(null);
  const [loading, setLoading] = useState(!!id);

  useEffect(() => {
    if (id) {
      productApi.get(id).then((r) => { setInitial(r.data); setLoading(false); }).catch(() => { toast.error("Not found"); setLoading(false); });
    }
  }, [id]);

  const onSubmit = async (form) => {
    try {
      if (id) await productApi.update(id, form); else await productApi.create(form);
      toast.success("Saved");
      navigate("/farmer/products");
    } catch (e) { toast.error("Save failed"); }
  };

  if (loading) return <div>Loading...</div>;
  return (
    <div className="max-w-2xl">
      <BackButton fallback="/farmer/products" />
      <h2 className="text-2xl font-heading mb-4">{id ? "Edit Product" : "Add Product"}</h2>
      <ProductForm initial={initial} onSubmit={onSubmit} />
    </div>
  );
}
// fix useAuth import? not needed
void Button;
