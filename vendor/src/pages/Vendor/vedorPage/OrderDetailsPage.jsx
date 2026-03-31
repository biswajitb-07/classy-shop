import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { FaBoxOpen, FaHistory, FaMapMarkerAlt } from "react-icons/fa";
import toast from "react-hot-toast";
import {
  useGetVendorOrdersQuery,
  useUpdateOrderStatusMutation,
} from "../../../features/api/orderApi";
import {
  useAssignDeliveryPartnerMutation,
  useGetDeliveryPartnersQuery,
} from "../../../features/api/authApi";
import PageLoader from "../../../component/Loader/PageLoader";
import ErrorMessage from "../../../component/error/ErrorMessage";
import ConfirmDialog from "../../../component/ConfirmDialog";
import AuthButtonLoader from "../../../component/Loader/AuthButtonLoader";
import { connectVendorSocket } from "../../../lib/socket";
import LiveRouteMap from "../../../component/tracking/LiveRouteMap";

const STATUS_LABELS = {
  pending: "Pending",
  processing: "Processing",
  shipped: "Shipped",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  return_requested: "Return Requested",
  return_approved: "Return Approved",
  return_rejected: "Return Rejected",
  return_completed: "Return Completed",
  completed: "Completed",
  failed: "Failed",
  refund: "Refund In Progress",
};

const getStatusLabel = (status) => {
  if (!status) return "Unknown";
  return (
    STATUS_LABELS[status] ||
    String(status)
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase())
  );
};

const getStatusColor = (status) => {
  if (!status) return "bg-gray-500 text-white";

  switch (status) {
    case "pending":
      return "bg-yellow-500 text-white";
    case "processing":
      return "bg-blue-500 text-white";
    case "shipped":
      return "bg-purple-500 text-white";
    case "out_for_delivery":
      return "bg-orange-500 text-white";
    case "delivered":
    case "completed":
      return "bg-green-500 text-white";
    case "cancelled":
    case "failed":
    case "return_rejected":
      return "bg-red-500 text-white";
    case "return_requested":
      return "bg-yellow-500 text-white";
    case "return_approved":
      return "bg-orange-500 text-white";
    case "return_completed":
    case "refund":
      return "bg-emerald-600 text-white";
    default:
      return "bg-gray-500 text-white";
  }
};

const getTimelineDotColor = (status) => {
  if (!status) return "bg-slate-400";

  switch (status) {
    case "pending":
      return "bg-yellow-500";
    case "processing":
      return "bg-blue-500";
    case "shipped":
      return "bg-purple-500";
    case "out_for_delivery":
      return "bg-orange-500";
    case "delivered":
    case "completed":
      return "bg-green-500";
    case "cancelled":
    case "failed":
    case "return_rejected":
      return "bg-red-500";
    case "return_requested":
      return "bg-amber-500";
    case "return_approved":
      return "bg-orange-500";
    case "return_completed":
    case "refund":
      return "bg-emerald-600";
    default:
      return "bg-slate-400";
  }
};

const formatTimelineActor = (role) => {
  switch (role) {
    case "user":
      return "Customer";
    case "vendor":
      return "Vendor";
    case "system":
      return "System";
    default:
      return "Update";
  }
};

const formatTimelineTime = (value) => {
  if (!value) return "Time unavailable";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Time unavailable";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const getMapUrl = (latitude, longitude) =>
  `https://www.google.com/maps?q=${latitude},${longitude}`;

const INDIA_BOUNDS = {
  minLatitude: 6,
  maxLatitude: 38.5,
  minLongitude: 68,
  maxLongitude: 98,
};

const buildDirectionsUrl = (origin, destination) => {
  if (!hasCoordinate(destination?.latitude, destination?.longitude)) return "";

  if (hasCoordinate(origin?.latitude, origin?.longitude)) {
    return `https://www.google.com/maps/dir/?api=1&origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&travelmode=driving`;
  }

  return `https://www.google.com/maps/search/?api=1&query=${destination.latitude},${destination.longitude}`;
};

const hasCoordinate = (latitude, longitude) =>
  latitude !== null &&
  latitude !== undefined &&
  longitude !== null &&
  longitude !== undefined;

const isWithinIndiaBounds = (location) =>
  hasCoordinate(location?.latitude, location?.longitude) &&
  Number(location.latitude) >= INDIA_BOUNDS.minLatitude &&
  Number(location.latitude) <= INDIA_BOUNDS.maxLatitude &&
  Number(location.longitude) >= INDIA_BOUNDS.minLongitude &&
  Number(location.longitude) <= INDIA_BOUNDS.maxLongitude;

const toRadians = (value) => (Number(value) * Math.PI) / 180;

const calculateDistanceKm = (origin, destination) => {
  if (
    !hasCoordinate(origin?.latitude, origin?.longitude) ||
    !hasCoordinate(destination?.latitude, destination?.longitude)
  ) {
    return null;
  }

  const earthRadiusKm = 6371;
  const latDiff = toRadians(destination.latitude - origin.latitude);
  const lonDiff = toRadians(destination.longitude - origin.longitude);
  const a =
    Math.sin(latDiff / 2) * Math.sin(latDiff / 2) +
    Math.cos(toRadians(origin.latitude)) *
      Math.cos(toRadians(destination.latitude)) *
      Math.sin(lonDiff / 2) *
      Math.sin(lonDiff / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Number((earthRadiusKm * c).toFixed(1));
};

const formatDistance = (distanceKm) => {
  if (distanceKm === null || distanceKm === undefined) return "Mapping route";
  if (distanceKm < 1) return `${Math.max(100, Math.round(distanceKm * 1000))} m away`;
  return `${distanceKm.toFixed(1)} km away`;
};

const estimateEtaMinutes = (distanceKm, speedMetersPerSecond) => {
  if (!Number.isFinite(Number(distanceKm))) return null;

  const liveSpeedKmh =
    speedMetersPerSecond !== null &&
    speedMetersPerSecond !== undefined &&
    Number(speedMetersPerSecond) > 0
      ? Number(speedMetersPerSecond) * 3.6
      : 24;

  return Math.max(3, Math.round((Number(distanceKm) / liveSpeedKmh) * 60));
};

const formatEta = (etaMinutes) => {
  if (!etaMinutes) return "ETA updating";
  if (etaMinutes < 60) return `${etaMinutes} mins`;

  const hours = Math.floor(etaMinutes / 60);
  const minutes = etaMinutes % 60;
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
};

const getTrackingMilestones = (status, isLiveTrackingActive) => {
  const normalizedStatus = String(status || "");

  return [
    {
      label: "Packed",
      done: [
        "shipped",
        "out_for_delivery",
        "delivered",
        "return_requested",
        "return_approved",
        "return_completed",
        "return_rejected",
      ].includes(normalizedStatus),
    },
    {
      label: "On the way",
      done: ["delivered"].includes(normalizedStatus),
      active:
        ["out_for_delivery", "return_approved"].includes(normalizedStatus) ||
        isLiveTrackingActive,
    },
    {
      label: "Delivered",
      done: normalizedStatus === "delivered",
      active: normalizedStatus === "delivered",
    },
  ];
};

const getInitialStatusGuess = (order) =>
  order?.paymentMethod === "razorpay" ? "processing" : "pending";

const getInitialStatusReason = (order, status) => {
  if (status === "processing" && order?.paymentMethod === "razorpay") {
    return "Payment confirmed via Razorpay";
  }

  if (status === "pending" && order?.paymentMethod === "cod") {
    return "Order placed with Cash on Delivery";
  }

  return "Order tracking started";
};

const buildTimelineEntries = (order) => {
  if (!order) return [];

  const history = [...(order.statusHistory || [])]
    .filter((entry) => entry?.to)
    .sort((a, b) => new Date(a.at || 0) - new Date(b.at || 0))
    .map((entry) => ({
      ...entry,
      synthetic: false,
    }));

  const entries = [...history];
  const initialStatus = getInitialStatusGuess(order);
  const hasExplicitInitialEntry = entries.some((entry) => !entry.from);

  if (!hasExplicitInitialEntry) {
    entries.unshift({
      from: "",
      to: initialStatus,
      role: "system",
      reason: getInitialStatusReason(order, initialStatus),
      at: order.createdAt,
      synthetic: true,
    });
  }

  const firstRealEntry = history[0];
  if (
    firstRealEntry?.from &&
    firstRealEntry.from !== initialStatus &&
    !entries.some(
      (entry) => entry.synthetic && entry.to === firstRealEntry.from,
    )
  ) {
    entries.splice(1, 0, {
      from: initialStatus,
      to: firstRealEntry.from,
      role: "system",
      reason: "Earlier order milestones were not fully tracked yet.",
      at: firstRealEntry.at || order.updatedAt || order.createdAt,
      synthetic: true,
    });
  }

  const latestTrackedStatus = entries[entries.length - 1]?.to;
  if (latestTrackedStatus !== order.orderStatus) {
    entries.push({
      from: latestTrackedStatus || "",
      to: order.orderStatus,
      role: "system",
      reason: "Current status synced from the order record.",
      at: order.updatedAt || order.createdAt,
      synthetic: true,
    });
  }

  return entries;
};

const OrderTimelineCard = ({ entries }) => (
  <div className="bg-white rounded-2xl shadow-md p-6">
    <div className="flex items-center gap-3 mb-5">
      <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center">
        <FaHistory className="text-indigo-600" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-gray-800">Tracking Timeline</h2>
        <p className="text-sm text-gray-500">
          Order activity, actor, and reasons are shown here.
        </p>
      </div>
    </div>

    <div className="space-y-0">
      {entries.map((entry, index) => {
        const isLast = index === entries.length - 1;

        return (
          <div key={`${entry.to}_${entry.at || index}_${index}`} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div
                className={`w-4 h-4 rounded-full ring-4 ring-white ${getTimelineDotColor(
                  entry.to,
                )}`}
              />
              {!isLast ? <div className="w-px flex-1 min-h-14 bg-gray-200" /> : null}
            </div>

            <div className={isLast ? "pb-0" : "pb-6"}>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                    entry.to,
                  )}`}
                >
                  {getStatusLabel(entry.to)}
                </span>
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                  {formatTimelineActor(entry.role)}
                </span>
              </div>

              <p className="mt-2 text-sm text-gray-500">
                {formatTimelineTime(entry.at)}
              </p>

              {entry.reason ? (
                <p className="mt-2 text-sm text-gray-600">{entry.reason}</p>
              ) : null}

              {entry.from ? (
                <p className="mt-1 text-xs text-gray-500">
                  Changed from {getStatusLabel(entry.from)}
                </p>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

const OrderDetailsPage = () => {
  const { orderId } = useParams();
  const {
    data: ordersData,
    isLoading,
    isError,
    refetch,
  } = useGetVendorOrdersQuery();
  const orders = ordersData?.orders || [];
  const order = orders.find((item) => item._id === orderId);

  const [updateOrderStatus, { isLoading: isUpdating }] =
    useUpdateOrderStatusMutation();
  const { data: deliveryPartnersData } = useGetDeliveryPartnersQuery();
  const [assignDeliveryPartner, { isLoading: isAssigningDeliveryPartner }] =
    useAssignDeliveryPartnerMutation();

  const [actionLoading, setActionLoading] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMeta, setConfirmMeta] = useState({
    title: "",
    description: "",
    payload: null,
  });
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedDeliveryPartner, setSelectedDeliveryPartner] = useState("");
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [liveLocation, setLiveLocation] = useState(null);
  const [liveDestination, setLiveDestination] = useState(null);
  const [isLiveTrackingActive, setIsLiveTrackingActive] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (order?.orderStatus) {
      setSelectedStatus(order.orderStatus);
    }
  }, [order?.orderStatus]);

  useEffect(() => {
    setSelectedDeliveryPartner(order?.assignedDeliveryPartner?._id || "");
  }, [order?.assignedDeliveryPartner?._id]);

  useEffect(() => {
    if (!order) return;

    const currentLocation = order.deliveryTracking?.currentLocation;
    setLiveLocation(
      currentLocation?.latitude !== null && currentLocation?.longitude !== null
        ? currentLocation
        : null
    );
    setLiveDestination(
      order.customerLiveLocation?.latitude !== null &&
        order.customerLiveLocation?.latitude !== undefined &&
        order.customerLiveLocation?.longitude !== null &&
        order.customerLiveLocation?.longitude !== undefined
        ? order.customerLiveLocation
        : order.shippingAddress?.location || null
    );
    setIsLiveTrackingActive(Boolean(order.deliveryTracking?.isLive));
  }, [
    order?._id,
    order?.customerLiveLocation?.latitude,
    order?.customerLiveLocation?.longitude,
    order?.customerLiveLocation?.updatedAt,
    order?.shippingAddress?.location?.latitude,
    order?.shippingAddress?.location?.longitude,
    order?.deliveryTracking?.isLive,
    order?.deliveryTracking?.currentLocation?.latitude,
    order?.deliveryTracking?.currentLocation?.longitude,
    order?.deliveryTracking?.currentLocation?.updatedAt,
  ]);

  useEffect(() => {
    if (!order?._id) return undefined;

    const socket = connectVendorSocket();

    const handleLocationUpdate = (payload) => {
      if (payload?.orderId !== order._id) return;
      setLiveLocation(payload.location || null);
      setIsLiveTrackingActive(Boolean(payload?.tracking?.isLive));
    };

    const handleLocationStop = (payload) => {
      if (payload?.orderId !== order._id) return;
      setIsLiveTrackingActive(false);
    };

    const handleDestinationUpdate = (payload) => {
      if (payload?.orderId !== order._id) return;
      setLiveDestination(payload.destination || order.shippingAddress?.location || null);
    };

    socket.on("order:location:update", handleLocationUpdate);
    socket.on("order:location:stopped", handleLocationStop);
    socket.on("order:destination:update", handleDestinationUpdate);

    return () => {
      socket.off("order:location:update", handleLocationUpdate);
      socket.off("order:location:stopped", handleLocationStop);
      socket.off("order:destination:update", handleDestinationUpdate);
    };
  }, [order?._id]);

  const getVariantDisplay = (productType, variant) => {
    if (!variant || variant === "default") return "Default";

    if (productType === "Fashion" || productType === "Footwear") {
      const [key, value] = variant.split(":");
      if (key === "size" && value) return `Size: ${value}`;
      return variant.replace(":", ": ");
    }

    if (productType === "Electronics") {
      const pairs = variant.split("|").map((pair) => pair.split(":"));
      const ram = pairs.find(([key]) => key === "ram")?.[1];
      const storage = pairs.find(([key]) => key === "storage")?.[1];
      const parts = [];

      if (ram) parts.push(`RAM: ${ram}`);
      if (storage) parts.push(`Storage: ${storage}`);

      return parts.length ? parts.join(", ") : variant;
    }

    return variant;
  };

  const openConfirm = (title, description, payload) => {
    setConfirmMeta({ title, description, payload });
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    setConfirmOpen(false);
    if (!confirmMeta.payload) return;

    const actionKey = confirmMeta.payload.__actionKey || "generic";
    setActionLoading(actionKey);

    try {
      await updateOrderStatus({
        orderId: order._id,
        body: confirmMeta.payload,
      }).unwrap();
      toast.success("Order updated");
      await refetch();
    } catch (error) {
      const message =
        error?.data?.message || error?.message || "Failed to update order";
      toast.error(message);
    } finally {
      setActionLoading(null);
    }
  };

  if (isError) return <ErrorMessage onRetry={refetch} />;
  if (isLoading) {
    return (
      <div className="h-[26rem] grid place-items-center bg-gradient-to-br from-gray-50 to-gray-100">
        <PageLoader message="Loading order..." />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto text-center bg-white rounded-2xl shadow-xl p-8">
            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-r from-indigo-100 to-indigo-200 rounded-full flex items-center justify-center">
              <FaBoxOpen className="w-12 h-12 text-indigo-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Order Not Found
            </h2>
            <p className="text-gray-600 mb-8">
              The order you are looking for does not exist.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const totalItems = order.items.reduce((total, item) => total + item.quantity, 0);
  const timelineEntries = buildTimelineEntries(order);
  const statusOptions = [
    { value: "processing", label: "processing" },
    { value: "shipped", label: "shipped" },
    { value: "out_for_delivery", label: "out for delivery" },
  ];
  const canCancel =
    order.orderStatus !== "delivered" && order.orderStatus !== "cancelled";
  const isReturnRequested = order.orderStatus === "return_requested";
  const isReturnApproved = order.orderStatus === "return_approved";
  const isIndiaOrder = String(order.shippingAddress?.country || "")
    .trim()
    .toLowerCase()
    .includes("india");
  const rawTrackingLocation = liveLocation || order.deliveryTracking?.currentLocation;
  const trackingLocation =
    isIndiaOrder &&
    rawTrackingLocation &&
    !isWithinIndiaBounds(rawTrackingLocation)
      ? null
      : rawTrackingLocation;
  const rawDestinationLocation =
    liveDestination ||
    order.customerLiveLocation ||
    order.shippingAddress?.location;
  const destinationLocation =
    isIndiaOrder &&
    rawDestinationLocation &&
    !isWithinIndiaBounds(rawDestinationLocation)
      ? order.shippingAddress?.location || null
      : rawDestinationLocation;
  const hasCustomerLiveDestination = Boolean(
    liveDestination?.source === "customer_live" ||
      (order.customerLiveLocation?.latitude !== null &&
        order.customerLiveLocation?.latitude !== undefined &&
        order.customerLiveLocation?.longitude !== null &&
        order.customerLiveLocation?.longitude !== undefined)
  );
  const hasTrackingLocation = Boolean(
    trackingLocation?.latitude !== null &&
      trackingLocation?.latitude !== undefined &&
      trackingLocation?.longitude !== null &&
      trackingLocation?.longitude !== undefined
  );
  const hasDestinationLocation = Boolean(
    hasCoordinate(destinationLocation?.latitude, destinationLocation?.longitude)
  );
  const showTrackingCard =
    hasTrackingLocation ||
    isLiveTrackingActive ||
    order.orderStatus === "out_for_delivery" ||
    order.orderStatus === "return_approved";
  const mapUrl = hasTrackingLocation
    ? getMapUrl(trackingLocation.latitude, trackingLocation.longitude)
    : "";
  const directionsUrl = buildDirectionsUrl(trackingLocation, destinationLocation);
  const distanceKm =
    hasTrackingLocation && hasDestinationLocation
      ? calculateDistanceKm(trackingLocation, destinationLocation)
      : null;
  const etaMinutes = estimateEtaMinutes(distanceKm, trackingLocation?.speed);
  const trackingMilestones = getTrackingMilestones(
    order.orderStatus,
    isLiveTrackingActive
  );
  const primaryActionKey =
    selectedStatus === "cancelled" ? "cancel" : `status_${selectedStatus}`;

  const normalizeStatus = (status) =>
    String(status || "")
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");

  const handleSetStatus = (status) => {
    const normalizedStatus = normalizeStatus(status);
    const statusLabel = normalizedStatus.replace(/_/g, " ");

    openConfirm(
      `Set status to ${statusLabel}`,
      `Set order status to "${statusLabel}"?`,
      {
        status: normalizedStatus,
        reason: `Status changed to ${statusLabel} by vendor`,
        __actionKey: `status_${normalizedStatus}`,
      },
    );
  };

  const handleCancel = () => {
    openConfirm(
      "Cancel Order",
      "Are you sure you want to cancel this order? This cannot be undone.",
      {
        status: "cancelled",
        reason: "Cancelled by vendor",
        __actionKey: "cancel",
      },
    );
  };

  const handleStatusChange = (event) => {
    setSelectedStatus(event.target.value);
  };

  const handleApplyStatus = () => {
    if (!selectedStatus || selectedStatus === order.orderStatus) return;

    if (selectedStatus === "out_for_delivery") {
      setAssignDialogOpen(true);
      return;
    }

    if (selectedStatus === "cancelled") {
      handleCancel();
      return;
    }

    handleSetStatus(selectedStatus);
  };

  const handleReturnApprove = () => {
    openConfirm(
      "Approve Return",
      "Approve return request and mark payment as refund (DB-only).",
      {
        status: "return_approved",
        reason: "Return approved by vendor",
        __actionKey: "approve",
      },
    );
  };

  const handleReturnReject = () => {
    openConfirm("Reject Return", "Reject the return request.", {
      status: "return_rejected",
      reason: "Return rejected by vendor",
      __actionKey: "reject",
    });
  };

  const handleReturnComplete = () => {
    openConfirm(
      "Complete Return",
      "Mark return as completed and mark payment refunded (DB-only).",
      {
        status: "return_completed",
        reason: "Return completed by vendor",
        __actionKey: "complete",
      },
    );
  };

  const handleAssignAndMarkOutForDelivery = async () => {
    if (!selectedDeliveryPartner) {
      toast.error("Please select a delivery partner");
      return;
    }

    setActionLoading("assign_out_for_delivery");

    try {
      await assignDeliveryPartner({
        orderId: order._id,
        deliveryPartnerId: selectedDeliveryPartner,
      }).unwrap();

      await updateOrderStatus({
        orderId: order._id,
        body: {
          status: "out_for_delivery",
          reason: "Status changed to out for delivery by vendor",
          __actionKey: "status_out_for_delivery",
        },
      }).unwrap();

      setAssignDialogOpen(false);
      toast.success("Delivery partner assigned and order marked out for delivery");
      await refetch();
    } catch (error) {
      toast.error(
        error?.data?.message ||
          error?.message ||
          "Failed to assign delivery partner"
      );
    } finally {
      setActionLoading(null);
    }
  };

  const deliveryPartners = (deliveryPartnersData?.deliveryPartners || []).filter(
    (deliveryPartner) =>
      (!deliveryPartner.isBlocked &&
        deliveryPartner.isAvailable &&
        deliveryPartner.isOnline) ||
      deliveryPartner._id === order.assignedDeliveryPartner?._id
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pb-16">
      <div className="container px-4 mx-auto">
        <div className="flex items-center justify-between mt-8 mb-6">
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">
            Order Details #{order.orderId}
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-2xl shadow-md overflow-hidden p-6">
              <div className="mb-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex flex-col gap-2">
                    <div className="text-sm text-gray-600">Current status</div>
                    <div
                      className={`inline-flex w-fit px-3 py-1.5 rounded-full text-sm font-medium ${getStatusColor(
                        order.orderStatus,
                      )}`}
                    >
                      {getStatusLabel(order.orderStatus)}
                    </div>
                  </div>

                  <div className="flex w-full flex-col items-stretch gap-3 sm:w-[18rem] sm:gap-2">
                    <select
                      value={selectedStatus}
                      onChange={handleStatusChange}
                      disabled={
                        isUpdating ||
                        order.orderStatus === "cancelled" ||
                        order.orderStatus === "return_completed"
                      }
                      className="w-full rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2.5 text-xs font-medium text-indigo-700 outline-none transition focus:border-indigo-300 disabled:cursor-not-allowed disabled:opacity-60 sm:rounded-xl sm:px-4 sm:py-3 sm:text-sm"
                    >
                      {statusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                      {canCancel ? <option value="cancelled">cancel</option> : null}
                    </select>

                    <button
                      onClick={handleApplyStatus}
                      disabled={
                        isUpdating ||
                        !selectedStatus ||
                        selectedStatus === order.orderStatus ||
                        order.orderStatus === "cancelled" ||
                        order.orderStatus === "return_completed"
                      }
                      className="flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-0 sm:rounded-xl sm:px-4 sm:py-3 sm:text-sm"
                    >
                      {actionLoading === primaryActionKey ? (
                        <AuthButtonLoader size={14} />
                      ) : selectedStatus === "cancelled" ? (
                        "Cancel Order"
                      ) : (
                        "Update Status"
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="hidden md:block">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left font-semibold text-gray-600 uppercase">
                        Product
                      </th>
                      <th className="px-6 py-4 text-left font-semibold text-gray-600 uppercase">
                        Variant
                      </th>
                      <th className="px-6 py-4 text-center font-semibold text-gray-600 uppercase">
                        Qty
                      </th>
                      <th className="px-6 py-4 text-right font-semibold text-gray-600 uppercase">
                        Price
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {order.items.map((item, index) => (
                      <tr
                        key={`${item.productId}_${index}`}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <img
                              src={item.product.image?.[0] || "/fallback-image.jpg"}
                              alt={item.product.name}
                              className="w-16 h-16 object-cover rounded-lg"
                            />
                            <div>
                              <h4 className="font-semibold text-gray-800">
                                {item.product.name}
                              </h4>
                              <p className="text-xs text-gray-500 mt-1">
                                {item.productType}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {getVariantDisplay(item.productType, item.variant)}
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-gray-700">
                          {item.quantity}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <p className="text-indigo-600 font-bold">
                            ₹{item.subtotal.toLocaleString()}
                          </p>
                          <p className="text-sm text-gray-500">
                            ₹{item.price.toLocaleString()} each
                          </p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden divide-y divide-gray-100">
                {order.items.map((item, index) => (
                  <div
                    key={`${item.productId}_${index}`}
                    className="p-4 flex flex-col gap-3"
                  >
                    <div className="flex gap-4 items-center">
                      <img
                        src={item.product.image?.[0] || "/fallback-image.jpg"}
                        alt={item.product.name}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                      <div>
                        <h4 className="font-semibold text-gray-800">
                          {item.product.name}
                        </h4>
                        <p className="text-xs text-gray-500">
                          {item.productType}
                        </p>
                        <p className="text-xs text-indigo-600">
                          {getVariantDisplay(item.productType, item.variant)}
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                      <div className="text-right">
                        <p className="text-indigo-600 font-bold">
                          ₹{item.subtotal.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500">
                          ₹{item.price.toLocaleString()} each
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <OrderTimelineCard entries={timelineEntries} />
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                Order Summary
              </h2>
              <div className="space-y-3 text-gray-600 text-sm">
                <div className="flex justify-between">
                  <span>Order ID</span>
                  <span>#{order.orderId}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date</span>
                  <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Last Update</span>
                  <span>{formatTimelineTime(order.updatedAt || order.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Items</span>
                  <span>{totalItems}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment</span>
                  <span>{order.paymentMethod === "cod" ? "COD" : "Razorpay"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment Status</span>
                  <span className="font-medium">
                    {getStatusLabel(order.paymentStatus)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span className="text-green-500 font-medium">Free</span>
                </div>
                <hr className="border-gray-200 my-2" />
                <div className="flex justify-between text-base font-bold text-gray-800">
                  <span>Total</span>
                  <span className="text-indigo-600">
                    ₹{order.totalAmount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-start gap-3">
                  <span>Status</span>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                      order.orderStatus,
                    )}`}
                  >
                    {getStatusLabel(order.orderStatus)}
                  </span>
                </div>
                <div className="flex justify-between items-start gap-3">
                  <span>Delivery partner</span>
                  <div className="text-right">
                    <p className="font-medium text-gray-700">
                      {order.assignedDeliveryPartner?.name || "Not assigned"}
                    </p>
                    {order.assignedDeliveryPartner ? (
                      <p className="mt-1 text-xs text-gray-500">
                        {order.assignedDeliveryPartner.isOnline
                          ? "Online now"
                          : "Offline"}{" "}
                        •{" "}
                        {order.assignedDeliveryPartner.isAvailable
                          ? "Available"
                          : "Paused"}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <FaMapMarkerAlt className="text-indigo-500" />
                Shipping Address
              </h2>
              <div className="text-gray-600 text-sm space-y-1">
                <p className="font-medium">{order.shippingAddress.fullName}</p>
                {order.shippingAddress.addressLine1 ? (
                  <p>{order.shippingAddress.addressLine1}</p>
                ) : null}
                <p>
                  {order.shippingAddress.village}, {order.shippingAddress.city},{" "}
                  {order.shippingAddress.district}, {order.shippingAddress.state} -{" "}
                  {order.shippingAddress.postalCode}
                </p>
                <p>{order.shippingAddress.country}</p>
                <p>{order.shippingAddress.phone}</p>
              </div>
            </div>

            {showTrackingCard ? (
              <div className="bg-white rounded-2xl shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <FaMapMarkerAlt className="text-cyan-500" />
                  Live Delivery Tracking
                </h2>

                <div className="rounded-3xl border border-cyan-100 bg-cyan-50/70 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">
                        Assigned rider
                      </p>
                      <p className="mt-2 text-lg font-bold text-gray-800">
                        {order.assignedDeliveryPartner?.name || "Partner sync pending"}
                      </p>
                      <p className="mt-1 text-sm text-gray-600">
                        {order.assignedDeliveryPartner?.vehicleType
                          ? `${order.assignedDeliveryPartner.vehicleType} • `
                          : ""}
                        {isLiveTrackingActive ? "Live tracking on" : "Awaiting next update"}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-[0.2em] ${
                          isLiveTrackingActive
                            ? "bg-cyan-500 text-white"
                            : "bg-white text-gray-700"
                        }`}
                      >
                        {isLiveTrackingActive ? "Tracking live" : "Last shared"}
                      </span>
                      <span className="text-sm text-gray-500">
                        {formatTimelineTime(
                          trackingLocation?.updatedAt || order.deliveryTracking?.lastSharedAt
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div className="rounded-2xl border border-cyan-100 bg-white p-4">
                      <p className="text-xs uppercase tracking-[0.22em] text-gray-500">
                        Distance left
                      </p>
                      <p className="mt-2 text-lg font-bold text-gray-800">
                        {formatDistance(distanceKm)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-cyan-100 bg-white p-4">
                      <p className="text-xs uppercase tracking-[0.22em] text-gray-500">
                        ETA
                      </p>
                      <p className="mt-2 text-lg font-bold text-gray-800">
                        {formatEta(etaMinutes)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-cyan-100 bg-white p-4">
                      <p className="text-xs uppercase tracking-[0.22em] text-gray-500">
                        Destination
                      </p>
                      <p className="mt-2 text-sm font-semibold text-gray-800">
                        {order.shippingAddress?.city || "Customer destination"}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {hasDestinationLocation ? "Route mapped" : "Address pin syncing"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-3">
                    {trackingMilestones.map((step) => (
                      <div
                        key={step.label}
                        className={`rounded-2xl border px-4 py-3 ${
                          step.done
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : step.active
                            ? "border-cyan-200 bg-cyan-50 text-cyan-700"
                            : "border-gray-200 bg-white text-gray-500"
                        }`}
                      >
                        <p className="text-xs font-semibold uppercase tracking-[0.18em]">
                          {step.done ? "Done" : step.active ? "Active" : "Next"}
                        </p>
                        <p className="mt-2 text-sm font-semibold">{step.label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {hasTrackingLocation ? (
                  <>
                    <div className="mt-4">
                    <LiveRouteMap
                      origin={trackingLocation}
                      destination={destinationLocation}
                      heightClass="h-56"
                      restrictToIndia={isIndiaOrder}
                      riderLabel={
                        order.assignedDeliveryPartner?.name || "Delivery partner"
                      }
                        destinationLabel={
                          hasCustomerLiveDestination
                            ? "Customer live location"
                            : order.shippingAddress?.fullName || "Customer"
                        }
                      />
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                        <p className="text-xs uppercase tracking-[0.22em] text-gray-500">
                          Rider coordinates
                        </p>
                        <p className="mt-2 text-sm font-semibold text-gray-800">
                          {Number(trackingLocation.latitude).toFixed(5)},{" "}
                          {Number(trackingLocation.longitude).toFixed(5)}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                        <p className="text-xs uppercase tracking-[0.22em] text-gray-500">
                          Destination
                        </p>
                        <p className="mt-2 text-sm font-semibold text-gray-800">
                          {hasCustomerLiveDestination
                            ? "Customer live delivery pin"
                            : order.shippingAddress?.addressLine1 ||
                              order.shippingAddress?.village}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {hasCustomerLiveDestination
                            ? `${Number(destinationLocation?.latitude || 0).toFixed(5)}, ${Number(
                                destinationLocation?.longitude || 0
                              ).toFixed(5)}`
                            : `${order.shippingAddress?.city}, ${order.shippingAddress?.state}`}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <a
                        href={mapUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex w-full items-center justify-center rounded-xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-cyan-600"
                      >
                        Open Live Map
                      </a>
                      <a
                        href={directionsUrl || mapUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex w-full items-center justify-center rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
                      >
                        Open Route View
                      </a>
                    </div>
                  </>
                ) : (
                  <div className="mt-4 rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-5 text-sm text-gray-500">
                    Delivery partner ne abhi location share start nahi ki hai.
                  </div>
                )}
              </div>
            ) : null}

            <div className="bg-white rounded-2xl shadow-md p-6 flex flex-col gap-3">
              {isReturnRequested ? (
                <>
                  <button
                    onClick={handleReturnApprove}
                    disabled={isUpdating}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center"
                  >
                    {actionLoading === "approve" ? (
                      <AuthButtonLoader className="text-white" size={16} />
                    ) : (
                      "Approve Return"
                    )}
                  </button>
                  <button
                    onClick={handleReturnReject}
                    disabled={isUpdating}
                    className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200"
                  >
                    {actionLoading === "reject" ? (
                      <AuthButtonLoader className="text-white" size={16} />
                    ) : (
                      "Reject Return"
                    )}
                  </button>
                </>
              ) : null}

              {isReturnApproved ? (
                <button
                  onClick={handleReturnComplete}
                  disabled={isUpdating}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center"
                >
                  {actionLoading === "complete" ? (
                    <AuthButtonLoader className="text-white" size={16} />
                  ) : (
                    "Mark Return Completed"
                  )}
                </button>
              ) : null}

              {!isReturnRequested && !isReturnApproved ? (
                <div className="text-sm text-gray-600">
                  Vendor actions available in the header controls.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title={confirmMeta.title}
        description={confirmMeta.description}
        confirmText="Confirm"
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
        loading={isUpdating}
      />

      {assignDialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/45"
            onClick={() => setAssignDialogOpen(false)}
          />
          <div className="relative mx-4 w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-gray-800">
              Assign Delivery Partner
            </h3>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              `Out for delivery` mark karne se pehle delivery partner select karo.
            </p>

            <div className="mt-5 space-y-3">
              <select
                value={selectedDeliveryPartner}
                onChange={(event) => setSelectedDeliveryPartner(event.target.value)}
                className="delivery-partner-select w-full rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm outline-none focus:border-indigo-300"
              >
                <option value="">Select delivery partner</option>
                {deliveryPartners.map((deliveryPartner) => (
                  <option
                    key={deliveryPartner._id}
                    value={deliveryPartner._id}
                  >
                    {deliveryPartner.name} • {deliveryPartner.vehicleType} •{" "}
                    {deliveryPartner.isOnline ? "online" : "offline"}
                  </option>
                ))}
              </select>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  onClick={() => setAssignDialogOpen(false)}
                  disabled={isAssigningDeliveryPartner || isUpdating}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignAndMarkOutForDelivery}
                  disabled={
                    isAssigningDeliveryPartner ||
                    isUpdating ||
                    !selectedDeliveryPartner
                  }
                  className="flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionLoading === "assign_out_for_delivery" ? (
                    <AuthButtonLoader size={16} />
                  ) : (
                    "Assign & Mark Out for Delivery"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default OrderDetailsPage;
