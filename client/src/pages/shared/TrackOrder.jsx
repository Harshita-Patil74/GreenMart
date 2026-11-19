import React, { useEffect, useState, useRef, useCallback } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import ProductIdentifier from "../../components/product/ProductIdentifier.jsx";
import { Clock3, MapPin, PackageCheck, Search, Truck } from "lucide-react";
import orderApi from "../../api/orderApi";
import OrderStepper from "../../components/orders/OrderStepper.jsx";
import OrderStatusBadge from "../../components/orders/OrderStatusBadge.jsx";
import BackButton from "../../components/common/BackButton.jsx";
import ErrorState from "../../components/common/ErrorState.jsx";
import { formatINR } from "../../utils/cartTotals.js";
import { subscribeOrderStatus, subscribeOrderLocation } from "../../socket/socketClient.js";
import { DeliveryTrackingMap } from "../../components/map/MapView.jsx";
import {
  calculateRouteWithDebounce,
  formatDistance,
  formatDuration,
  routingService,
} from "../../utils/routingService.js";
import {
  hasOrderItemDiscountBreakdown,
  orderItemDiscount,
  orderItemGross,
  orderItemPremiumDiscount,
  orderItemRegularDiscount,
  orderItemTotal,
  orderTotals,
} from "../../utils/orderPricing.js";

export default function TrackOrder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [orderId, setOrderId] = useState(id || "");
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState(null);
  const [farmerLocation, setFarmerLocation] = useState(null);
  const [locationUpdatedAt, setLocationUpdatedAt] = useState(null);
  const [route, setRoute] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [routeStatus, setRouteStatus] = useState("idle");
  const [routeError, setRouteError] = useState(null);
  const routeCalculatingRef = useRef(false);

  const loadOrder = async (targetId) => {
    if (!targetId?.trim()) return;
    const lookupId = targetId.trim().replace(/^#/, "");
    setLoading(true);
    setError(null);
    try {
      const { data } = await orderApi.get(encodeURIComponent(lookupId));
      setOrder(data);
      setOrderId(targetId.trim());
      if (data.currentLocation && Number.isFinite(data.currentLocation.lat) && Number.isFinite(data.currentLocation.lng)) {
        setFarmerLocation({ lat: data.currentLocation.lat, lng: data.currentLocation.lng });
        setLocationUpdatedAt(data.currentLocation.updatedAt);
      } else {
        // Fall back to the farmer's dispatch location recorded at order creation
        // when no live location has been reported yet.
        const dispatchLocations = data.deliverySnapshot?.dispatchLocations || [];
        const dispatch = dispatchLocations.find(
          (dl) => dl.location && Number.isFinite(dl.location.lat) && Number.isFinite(dl.location.lng)
        );
        if (dispatch) {
          setFarmerLocation({ lat: dispatch.location.lat, lng: dispatch.location.lng });
        }
      }
    } catch (requestError) {
      setOrder(null);
      setError(requestError?.message || "Couldn't find this order.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) loadOrder(id);
  }, [id]);

  // Real-time delivery location updates for this order only.
  useEffect(() => {
    const targetId = order?._id || id;
    if (!targetId) return undefined;
    const unsubscribe = subscribeOrderLocation((update) => {
      if (String(update.orderId) !== String(targetId)) return;
      setFarmerLocation(update.location);
      setLocationUpdatedAt(update.updatedAt);
      setOrder((prev) => (prev ? { ...prev, currentLocation: { ...update.location, updatedAt: update.updatedAt } } : prev));
    });
    return unsubscribe;
  }, [order?._id, id]);

  const totals = orderTotals(order || {});

  const customerLocation =
    (order?.deliverySnapshot?.destinationCoordinates &&
      Number.isFinite(order.deliverySnapshot.destinationCoordinates.lat) &&
      Number.isFinite(order.deliverySnapshot.destinationCoordinates.lng)
      ? order.deliverySnapshot.destinationCoordinates
      : (order?.coordinates && Number.isFinite(order.coordinates.lat) && Number.isFinite(order.coordinates.lng)
        ? order.coordinates
        : null));

  // Recalculate the road route when farmer or customer location changes.
  // Debounced to avoid excessive OSRM requests; tiny movements reuse the last route.
  useEffect(() => {
    if (!farmerLocation || !customerLocation) {
      setRouteStatus("idle");
      setRouteError(null);
      return;
    }
    const valid =
      Number.isFinite(farmerLocation.lat) &&
      Number.isFinite(farmerLocation.lng) &&
      Number.isFinite(customerLocation.lat) &&
      Number.isFinite(customerLocation.lng);
    if (!valid) {
      setRouteStatus("idle");
      setRouteError("Invalid coordinates");
      return;
    }

    setRouteStatus("calculating");
    calculateRouteWithDebounce(
      farmerLocation,
      customerLocation,
      (newRoute, newRouteInfo, error) => {
        if (error) {
          setRouteStatus("error");
          setRouteError(error);
          // Preserve last valid route markers; route line may be absent
          if (!route) setRoute(null);
          return;
        }
        setRoute(newRoute);
        setRouteInfo(newRouteInfo);
        setRouteStatus("idle");
        setRouteError(null);
      },
    );
  }, [farmerLocation, customerLocation]);

  // Cleanup pending debounced requests on unmount
  useEffect(() => {
    return () => {
      routingService.cancelPending();
    };
  }, []);

  const submit = (event) => {
    event.preventDefault();
    if (orderId.trim()) navigate(`/track-order/${encodeURIComponent(orderId.trim())}`);
  };

  const hasLocationData = Boolean(farmerLocation || customerLocation);
  const cancelled = order?.status?.toLowerCase() === "cancelled";
  const delivered = order?.status?.toLowerCase() === "delivered";

  return (
    <div className="gm-container space-y-5 py-6 pb-16">
      <BackButton fallback="/customer/orders" />
      <div>
        <h1 className="text-xl font-heading font-bold text-gray-900">Track Your Order</h1>
        <p className="mt-1 text-xs text-gray-500">View live status updates for an order on your account.</p>
      </div>

      {!id && (
        <form onSubmit={submit} className="flex max-w-xl gap-2 rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
          <label className="sr-only" htmlFor="track-order-id">Order ID</label>
          <input id="track-order-id" value={orderId} onChange={(event) => setOrderId(event.target.value)} placeholder="Enter an order ID" className="h-9 min-w-0 flex-1 rounded-lg border border-gray-200 px-3 text-sm focus:border-primary focus:outline-none" />
          <button disabled={!orderId.trim()} className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3 text-xs font-semibold text-white disabled:opacity-50"><Search className="h-4 w-4" /> Track</button>
        </form>
      )}

      {loading && <div className="rounded-xl border border-gray-100 bg-white p-5 text-sm text-gray-500">Loading order...</div>}
      {error && <ErrorState message={error} onRetry={() => loadOrder(id || orderId)} />}

      {order && !loading && (
        <>
          <OrderStepper history={order.statusHistory || []} status={order.status} />
          <div className="grid items-start gap-4 lg:grid-cols-2">
            <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-gray-400">Order number</p>
                  <h2 className="mt-1 text-sm font-bold text-gray-900">#{order.orderNumber}</h2>
                </div>
                <OrderStatusBadge status={order.status} />
              </div>
                {(order.items || []).some((item) => item.fulfillmentStatus || item.deliveryFailureReason) && (
                  <ul className="mt-3 space-y-2 border-t border-gray-100 pt-3">
                    {(order.items || []).map((item, index) => (
                      <li key={item._id || item.product || index} className="text-xs text-gray-600">
                        <span className="font-medium text-gray-800">{item.name || "Product"}</span>
                        <ProductIdentifier productId={item.productId || item.product} className="mt-0.5 flex" />
                        <span className="ml-2"><OrderStatusBadge status={item.fulfillmentStatus || order.status} /></span>
                        {item.deliveryFailureReason && <p className="mt-1 text-red-700">Delivery attempt failed: {item.deliveryFailureReason}</p>}
                        {item.fulfillmentHistory?.length > 1 && (
                          <ol className="mt-1 space-y-0.5 pl-2 text-[10px] text-gray-500">
                            {item.fulfillmentHistory.map((entry, historyIndex) => (
                              <li key={`${entry.status}-${entry.at || historyIndex}`}>
                                {entry.status}{entry.at ? ` · ${new Date(entry.at).toLocaleString("en-IN")}` : ""}
                                {entry.reason ? ` — ${entry.reason}` : ""}
                              </li>
                            ))}
                          </ol>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              {order.estimatedDelivery && <p className="mt-4 flex items-center gap-2 text-xs text-gray-600"><Clock3 className="h-3.5 w-3.5 text-primary" />Estimated delivery {new Date(order.estimatedDelivery).toLocaleDateString("en-IN")}</p>}
              <div className="mt-4 border-t border-gray-100 pt-3">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Delivery address</p>
                <p className="flex items-start gap-2 text-xs leading-5 text-gray-700"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />{[order.address?.name, order.address?.line1, order.address?.city, order.address?.phone].filter(Boolean).join(", ") || "No delivery address available."}</p>
              </div>
              {hasLocationData && (
                <p className={`mt-3 flex items-center gap-2 text-xs text-gray-600 ${cancelled || delivered ? "text-gray-400" : ""}`}>
                  <Truck className="h-3.5 w-3.5 text-primary shrink-0" />
                  Last location update
                  {locationUpdatedAt ? ` {new Date(locationUpdatedAt).toLocaleString("en-IN")}` : " available"}
                </p>
              )}
            </section>

            <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900"><PackageCheck className="h-4 w-4 text-primary" />Delivery tracking</h2>
              <div className="mt-3 space-y-3">
                {cancelled ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                    <p className="font-semibold">Order cancelled</p>
                    <p className="mt-1">Live tracking is not available for cancelled orders.</p>
                  </div>
                ) : hasLocationData ? (
                  <DeliveryTrackingMap
                    farmerLocation={farmerLocation}
                    customerLocation={customerLocation}
                    farmerLabel="Farmer"
                    customerLabel="Delivery destination"
                    height="320px"
                    route={route}
                    routeInfo={routeInfo}
                    routeStatus={routeStatus}
                    routeError={routeError}
                  />
                ) : (
                  <div className="rounded-lg border border-gray-200 bg-[#FAF8F1] p-3 text-xs text-gray-500 flex items-center justify-center h-40">
                    No live location available for this order yet.
                  </div>
                )}
                {!cancelled && delivered && hasLocationData && (
                  <p className="text-[10px] text-gray-400">Order delivered. Map shows the last known farmer location.</p>
                )}
              </div>
            </section>
          </div>

          <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3"><PackageCheck className="h-4 w-4 text-primary" />Items in this order</h2>
            <div className="mt-3 divide-y divide-gray-100">
              {(order.items || []).map((item, index) => {
                const gross = orderItemGross(item);
                const discount = orderItemDiscount(item);
                const regularSavings = orderItemRegularDiscount(item);
                const premiumSavings = orderItemPremiumDiscount(item);
                return <div key={item._id || item.product || index} className="flex justify-between gap-3 py-2 text-xs">
                  <span className="text-gray-700">{item.name} <span className="text-gray-400">× {item.quantity}</span><ProductIdentifier productId={item.productId || item.product} className="mt-0.5 flex" />{item.offerSnapshot?.offerTitle && <span className="block text-emerald-700">{item.offerSnapshot.offerTitle}</span>}</span>
                  <span className="shrink-0 text-right font-semibold text-gray-900">{discount > 0 && <span className="block font-normal text-gray-400 line-through">{formatINR(gross)}</span>}{formatINR(orderItemTotal(item))}
                    {hasOrderItemDiscountBreakdown(item) && regularSavings > 0 && <span className="block text-[10px] font-normal text-emerald-700">Regular saved {formatINR(regularSavings)}</span>}
                    {hasOrderItemDiscountBreakdown(item) && premiumSavings > 0 && <span className="block text-[10px] font-normal text-emerald-800">Premium saved {formatINR(premiumSavings)}</span>}
                  </span>
                </div>;
              })}
            </div>
            <div className="mt-2 space-y-1 border-t border-gray-100 pt-3 text-xs">
              <div className="flex justify-between"><span>Original Product Subtotal</span><span>{formatINR(totals.subtotal)}</span></div>
              {totals.breakdownKnown ? (
                <>
                  <div className="flex justify-between text-emerald-700"><span>Regular Offer Savings</span><span>− {formatINR(totals.regularDiscount)}</span></div>
                  <div className="flex justify-between text-emerald-700"><span>Exclusive Subscriber Savings</span><span>− {formatINR(totals.premiumDiscount)}</span></div>
                  <div className="flex justify-between font-semibold text-emerald-700"><span>Total Discount</span><span>− {formatINR(totals.discount)}</span></div>
                </>
              ) : totals.discount > 0 ? (
                <div className="flex justify-between text-emerald-700"><span>Discount</span><span>− {formatINR(totals.discount)}</span></div>
              ) : null}
              <div className="flex justify-between"><span>Delivery Charge</span><span>{formatINR(totals.deliveryCharge)}</span></div>
              <div className="flex justify-between pt-1 text-sm font-bold text-gray-900"><span>Final Payable Amount</span><span>{formatINR(totals.total)}</span></div>
            </div>
            <Link to={`/orders/${order._id}`} className="mt-3 inline-block text-xs font-semibold text-primary hover:underline">View order details</Link>
          </section>
        </>
      )}
      {!order && !loading && !error && (
        <div className="rounded-xl border border-gray-100 bg-white p-6 text-center text-sm text-gray-500">
          Sign in and enter an order ID from <Link to="/customer/orders" className="font-semibold text-primary">My Orders</Link> to see its latest status.
        </div>
      )}
    </div>
  );
}
