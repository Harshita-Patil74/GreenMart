export const DEMO_PRODUCTS = [
  {
    _id: "prod_tomatoes",
    name: "Organic Tomatoes",
    price: 40,
    unit: "kg",
    category: "Vegetables",
    ratingAverage: 4.8,
    ratingCount: 120,
    stock: 80,
    description:
      "Fresh farm organic tomatoes grown without harmful chemicals. Rich in lycopene, vitamins, and natural flavor.",
    images: ["/images/products/tomatoes.jpg"],
  },
  {
    _id: "prod_spinach",
    name: "Fresh Spinach",
    price: 25,
    unit: "bunch",
    category: "Vegetables",
    ratingAverage: 4.6,
    ratingCount: 96,
    stock: 50,
    description: "Crisp, leafy spinach harvested daily from certified organic farms in Gadag.",
    images: ["/images/products/spinach.jpg"],
  },
  {
    _id: "prod_bananas",
    name: "Organic Bananas",
    price: 50,
    unit: "kg",
    category: "Fruits",
    ratingAverage: 4.7,
    ratingCount: 84,
    stock: 60,
    description: "Naturally ripened organic bananas, sweet and rich in potassium.",
    images: ["/images/products/bananas.jpg"],
  },
  {
    _id: "prod_milk",
    name: "A2 Cow Milk",
    price: 60,
    unit: "litre",
    category: "Dairy & Eggs",
    ratingAverage: 4.9,
    ratingCount: 210,
    stock: 40,
    description: "Grass-fed A2 cow milk delivered fresh in eco-friendly glass bottles.",
    images: ["/images/products/milk.jpg"],
  },
  {
    _id: "prod_carrots",
    name: "Organic Carrots",
    price: 35,
    unit: "kg",
    category: "Vegetables",
    ratingAverage: 4.5,
    ratingCount: 78,
    stock: 90,
    description: "Crunchy organic carrots grown in mineral-rich soil without pesticides.",
    images: ["/images/products/carrots.jpg"],
  },
  {
    _id: "prod_apples",
    name: "Organic Apples",
    price: 120,
    unit: "kg",
    category: "Fruits",
    ratingAverage: 4.6,
    ratingCount: 64,
    stock: 40,
    description: "Crisp, naturally sweet apples from highland organic orchards.",
    images: ["/images/products/apples.jpg"],
  },
  {
    _id: "prod_rice",
    name: "Brown Rice",
    price: 80,
    unit: "kg",
    category: "Grains & Pulses",
    ratingAverage: 4.4,
    ratingCount: 52,
    stock: 120,
    description: "Whole-grain brown rice, stone-milled and packed at the farm.",
    images: ["/images/products/brown-rice.jpg"],
  },
];

export const DEMO_FARMS = [
  {
    id: "farm_green",
    name: "Green Fields Farm",
    locationName: "Gadag, Karnataka",
    speciality: "Vegetables",
    distance: "4.2 km",
    rating: 4.8,
    avatar: "/images/avatars/ramesh.jpg",
  },
  {
    id: "farm_healthy",
    name: "Healthy Harvest Farm",
    locationName: "Ron, Gadag",
    speciality: "Leafy Greens",
    distance: "8.1 km",
    rating: 4.6,
    avatar: "/images/avatars/ramesh.jpg",
  },
  {
    id: "farm_sunrise",
    name: "Sunrise Organic Farm",
    locationName: "Nargund, Gadag",
    speciality: "Dairy",
    distance: "12 km",
    rating: 4.7,
    avatar: "/images/avatars/ramesh.jpg",
  },
];

export const DEMO_FARMER = {
  name: "Ramesh Gouda",
  farmName: "Green Fields Farm",
  city: "Gadag",
  state: "Karnataka",
  avatar: "/images/avatars/ramesh.jpg",
};

export function listDemoProducts({ category, search, maxPrice, limit } = {}) {
  let items = [...DEMO_PRODUCTS];
  if (category) items = items.filter((p) => p.category === category);
  if (search) {
    const q = search.toLowerCase();
    items = items.filter((p) => p.name.toLowerCase().includes(q));
  }
  if (maxPrice) items = items.filter((p) => p.price <= Number(maxPrice));
  if (limit) items = items.slice(0, Number(limit));
  return items;
}

export function getDemoProduct(id) {
  return DEMO_PRODUCTS.find((p) => p._id === id) || DEMO_PRODUCTS[0];
}

export function unwrapList(payload, fallback = DEMO_PRODUCTS) {
  const items = payload?.data?.items || payload?.data || payload?.items;
  if (Array.isArray(items) && items.length) return items;
  return fallback;
}
