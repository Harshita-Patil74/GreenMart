import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import productApi from "../../api/productApi";
import ProductForm from "../../components/product/ProductForm.jsx";
import BackButton from "../../components/common/BackButton.jsx";
import toast from "react-hot-toast";

export default function ProductAddEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [initial, setInitial] = useState(null);
  const [loading, setLoading] = useState(!!id);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      productApi.get(id).then((r) => { setInitial(r.data); setLoading(false); }).catch(() => { toast.error("Not found"); setLoading(false); });
    } else {
      setLoading(false);
    }
  }, [id]);

  const onSubmit = async (form) => {
    setSubmitting(true);
    try {
      const { data } = id ? await productApi.update(id, form) : await productApi.create(form);
      toast.success(!id && data?._id ? `Product created · ID ${data._id}` : "Saved");
      navigate("/farmer/products");
    } catch (e) { toast.error("Save failed"); } finally { setSubmitting(false); }
  };

  if (loading) return <div>Loading...</div>;
  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 sm:space-y-6">
      <BackButton fallback="/farmer/products" />
      <div>
        <h2 className="text-2xl font-heading font-semibold text-[#26352B]">{id ? "Edit Product" : "Add Product"}</h2>
        <p className="mt-1 text-sm text-[#68756B]">Add product details and images for your farm listing.</p>
      </div>
      <section className="rounded-xl border border-[#E2E6DF] bg-white p-4 shadow-card sm:p-6 lg:p-8">
        <ProductForm initial={initial} onSubmit={onSubmit} isSubmitting={submitting} />
      </section>
    </div>
  );
}