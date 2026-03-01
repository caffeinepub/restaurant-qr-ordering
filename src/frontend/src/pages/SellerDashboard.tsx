import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  Building2,
  ChefHat,
  CircleDollarSign,
  Clock,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  LogOut,
  Phone,
  Plus,
  Receipt,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Trash2,
  TrendingUp,
  User,
  WifiOff,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { DEFAULT_PINS, useSellerStore } from "../sellerStore";
import type { Restaurant, RestaurantPins } from "../types";

type PageView =
  | "home"
  | "kitchen"
  | "billing"
  | "admin"
  | "seller"
  | "restaurant-login";

interface Props {
  navigate: (p: PageView) => void;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function getDaysRemaining(endDate: number): number {
  return Math.ceil((endDate - Date.now()) / MS_PER_DAY);
}

function getSubStatus(
  restaurant: Restaurant,
): "active" | "expiring" | "expired" | "suspended" {
  if (!restaurant.isActive) return "suspended";
  const days = getDaysRemaining(restaurant.subscriptionEndDate);
  if (days < 0) return "expired";
  if (days <= 3) return "expiring";
  return "active";
}

// ─── Two-step PIN auth ─────────────────────────────────────────────────────────
function SellerAuth() {
  const { sellerLogin } = useSellerStore();
  const [step, setStep] = useState<1 | 2>(1);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (step === 1) {
      if (code === "6598") {
        setStep(2);
        setCode("");
        setError("");
      } else {
        setError("Incorrect code");
        setCode("");
      }
    } else {
      if (code === "6478") {
        sellerLogin();
        toast.success("Welcome to the Seller Dashboard");
      } else {
        setError("Incorrect code");
        setCode("");
      }
    }
  }

  return (
    <div className="min-h-screen seller-bg flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 seller-grid-pattern opacity-20 pointer-events-none" />

      <div className="relative w-full max-w-sm">
        {/* Logo area */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl seller-icon-bg mb-4 shadow-seller-glow">
            <ShieldCheck className="w-8 h-8 text-seller-accent" />
          </div>
          <h1 className="text-2xl font-display font-bold text-seller-text">
            Seller Portal
          </h1>
          <p className="text-sm text-seller-muted mt-1">
            {step === 1
              ? "Enter your primary access code"
              : "Enter your secondary access code"}
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 justify-center mb-6">
          <div
            className={`w-2.5 h-2.5 rounded-full transition-colors ${
              step === 1 ? "bg-seller-accent" : "bg-seller-accent/50"
            }`}
          />
          <div className="w-8 h-px bg-seller-border" />
          <div
            className={`w-2.5 h-2.5 rounded-full transition-colors ${
              step === 2 ? "bg-seller-accent" : "bg-seller-border"
            }`}
          />
        </div>

        {/* Form card */}
        <div className="seller-card rounded-2xl p-6 shadow-seller">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-seller-text text-sm font-medium block mb-2">
                Access Code — Step {step} of 2
              </Label>
              <Input
                type="password"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setError("");
                }}
                placeholder="Enter code"
                className="seller-input text-seller-text placeholder:text-seller-muted/60 text-lg tracking-widest text-center h-12"
                autoFocus
                maxLength={6}
              />
              {error && (
                <p className="text-red-400 text-sm mt-2 flex items-center gap-1.5">
                  <XCircle className="w-4 h-4" />
                  {error}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-12 seller-btn font-semibold text-sm"
            >
              <Lock className="w-4 h-4 mr-2" />
              {step === 1 ? "Continue" : "Access Dashboard"}
            </Button>
          </form>
        </div>

        {/* Back step */}
        {step === 2 && (
          <button
            type="button"
            onClick={() => {
              setStep(1);
              setCode("");
              setError("");
            }}
            className="mt-4 flex items-center gap-1.5 text-seller-muted text-sm mx-auto hover:text-seller-text transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to step 1
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Add Restaurant Modal ───────────────────────────────────────────────────────
interface AddRestaurantModalProps {
  open: boolean;
  onClose: () => void;
}

function AddRestaurantModal({ open, onClose }: AddRestaurantModalProps) {
  const { addRestaurant } = useSellerStore();
  const [name, setName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !ownerName.trim() || !ownerPhone.trim()) {
      toast.error("Please fill all fields");
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      addRestaurant({
        name: name.trim(),
        ownerName: ownerName.trim(),
        ownerPhone: ownerPhone.trim(),
      });
      toast.success(`${name.trim()} added successfully`);
      setName("");
      setOwnerName("");
      setOwnerPhone("");
      setSubmitting(false);
      onClose();
    }, 400);
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="seller-card border-seller-border text-seller-text max-w-md">
        <DialogHeader>
          <DialogTitle className="text-seller-text flex items-center gap-2">
            <Building2 className="w-5 h-5 text-seller-accent" />
            Add New Restaurant
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <Label className="text-seller-muted text-xs mb-1.5 block">
              Restaurant Name
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Spice Garden"
              className="seller-input text-seller-text placeholder:text-seller-muted/50"
            />
          </div>
          <div>
            <Label className="text-seller-muted text-xs mb-1.5 block">
              Owner Name
            </Label>
            <Input
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="e.g. Rajan Sharma"
              className="seller-input text-seller-text placeholder:text-seller-muted/50"
            />
          </div>
          <div>
            <Label className="text-seller-muted text-xs mb-1.5 block">
              Owner Phone
            </Label>
            <Input
              value={ownerPhone}
              onChange={(e) => setOwnerPhone(e.target.value)}
              placeholder="e.g. +91 98765 43210"
              className="seller-input text-seller-text placeholder:text-seller-muted/50"
            />
          </div>
          <DialogFooter className="gap-2 mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="seller-outline-btn flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="seller-btn flex-1"
            >
              {submitting ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              {submitting ? "Adding..." : "Add Restaurant"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Status Badge ───────────────────────────────────────────────────────────────
function StatusBadge({ restaurant }: { restaurant: Restaurant }) {
  const status = getSubStatus(restaurant);
  const days = getDaysRemaining(restaurant.subscriptionEndDate);

  if (status === "suspended") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-seller-muted/20 text-seller-muted border border-seller-border">
        <WifiOff className="w-3 h-3" />
        Suspended
      </span>
    );
  }
  if (status === "expired") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/30">
        <XCircle className="w-3 h-3" />
        Expired
      </span>
    );
  }
  if (status === "expiring") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
        <Clock className="w-3 h-3" />
        Expiring in {days}d
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
      <BadgeCheck className="w-3 h-3" />
      Active
    </span>
  );
}

// ─── Manage PINs Modal ─────────────────────────────────────────────────────────
interface ManagePinsModalProps {
  restaurant: Restaurant | null;
  onClose: () => void;
}

function ManagePinsModal({ restaurant, onClose }: ManagePinsModalProps) {
  const { updateRestaurantPins } = useSellerStore();

  const current: RestaurantPins = {
    ...DEFAULT_PINS,
    ...(restaurant?.pins ?? {}),
  };

  const [adminPin, setAdminPin] = useState(current.admin);
  const [kitchenPin, setKitchenPin] = useState(current.kitchen);
  const [billingPin, setBillingPin] = useState(current.billing);
  const [showPins, setShowPins] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  function toggleShow(field: string) {
    setShowPins((prev) => ({ ...prev, [field]: !prev[field] }));
  }

  function validatePin(value: string) {
    return /^\d{4,6}$/.test(value);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!restaurant) return;

    if (!validatePin(adminPin)) {
      toast.error("Admin PIN must be 4–6 digits");
      return;
    }
    if (!validatePin(kitchenPin)) {
      toast.error("Kitchen PIN must be 4–6 digits");
      return;
    }
    if (!validatePin(billingPin)) {
      toast.error("Billing PIN must be 4–6 digits");
      return;
    }

    const uniquePins = new Set([adminPin, kitchenPin, billingPin]);
    if (uniquePins.size < 3) {
      toast.error("Each role must have a unique PIN");
      return;
    }

    setSaving(true);
    setTimeout(() => {
      updateRestaurantPins(restaurant.id, {
        admin: adminPin,
        kitchen: kitchenPin,
        billing: billingPin,
      });
      toast.success(`PINs updated for ${restaurant.name}`);
      setSaving(false);
      onClose();
    }, 300);
  }

  const fields: {
    key: string;
    label: string;
    icon: React.ElementType;
    value: string;
    onChange: (v: string) => void;
    placeholder: string;
  }[] = [
    {
      key: "admin",
      label: "Admin PIN",
      icon: ShieldCheck,
      value: adminPin,
      onChange: setAdminPin,
      placeholder: "e.g. 0000",
    },
    {
      key: "kitchen",
      label: "Kitchen PIN",
      icon: ChefHat,
      value: kitchenPin,
      onChange: setKitchenPin,
      placeholder: "e.g. 1234",
    },
    {
      key: "billing",
      label: "Billing PIN",
      icon: Receipt,
      value: billingPin,
      onChange: setBillingPin,
      placeholder: "e.g. 5678",
    },
  ];

  return (
    <Dialog open={!!restaurant} onOpenChange={onClose}>
      <DialogContent className="seller-card border-seller-border text-seller-text max-w-md">
        <DialogHeader>
          <DialogTitle className="text-seller-text flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-seller-accent" />
            Manage PINs — {restaurant?.name}
          </DialogTitle>
        </DialogHeader>

        <p className="text-seller-muted text-xs mt-1">
          Set a unique 4–6 digit PIN for each role. Staff will use these PINs to
          access their dashboard.
        </p>

        <form onSubmit={handleSave} className="space-y-4 mt-3">
          {fields.map((f) => (
            <div key={f.key}>
              <Label className="text-seller-muted text-xs mb-1.5 flex items-center gap-1.5">
                <f.icon className="w-3.5 h-3.5" />
                {f.label}
              </Label>
              <div className="relative">
                <Input
                  type={showPins[f.key] ? "text" : "password"}
                  value={f.value}
                  onChange={(e) =>
                    f.onChange(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder={f.placeholder}
                  className="seller-input text-seller-text placeholder:text-seller-muted/50 pr-10 tracking-widest"
                  maxLength={6}
                />
                <button
                  type="button"
                  onClick={() => toggleShow(f.key)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-seller-muted hover:text-seller-text transition-colors"
                >
                  {showPins[f.key] ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          ))}

          <div className="rounded-lg bg-seller-muted/10 border border-seller-border px-3 py-2 text-xs text-seller-muted">
            <strong className="text-seller-text">Note:</strong> Changing PINs
            takes effect immediately. Inform staff of their new PIN.
          </div>

          <DialogFooter className="gap-2 mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="seller-outline-btn flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="seller-btn flex-1"
            >
              {saving ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <KeyRound className="w-4 h-4 mr-2" />
              )}
              {saving ? "Saving..." : "Save PINs"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Dashboard ─────────────────────────────────────────────────────────────
function Dashboard({ navigate }: Props) {
  const {
    restaurants,
    sellerLogout,
    toggleRestaurantActive,
    renewSubscription,
    removeRestaurant,
  } = useSellerStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [managePinsRestaurantId, setManagePinsRestaurantId] = useState<
    string | null
  >(null);

  const managePinsRestaurant =
    restaurants.find((r) => r.id === managePinsRestaurantId) ?? null;

  const now = Date.now();
  const total = restaurants.length;
  const active = restaurants.filter(
    (r) => r.isActive && r.subscriptionEndDate >= now,
  ).length;
  const suspended = restaurants.filter((r) => !r.isActive).length;
  const expiringSoon = restaurants.filter((r) => {
    if (!r.isActive) return false;
    const d = getDaysRemaining(r.subscriptionEndDate);
    return d >= 0 && d <= 3;
  }).length;

  const alerts = restaurants.filter((r) => {
    if (!r.isActive) return false;
    const d = getDaysRemaining(r.subscriptionEndDate);
    return d <= 3;
  });

  const confirmRemove = restaurants.find((r) => r.id === confirmRemoveId);

  return (
    <div className="min-h-screen seller-bg">
      <div className="absolute inset-0 seller-grid-pattern opacity-10 pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 seller-header border-b border-seller-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate("home")}
            className="w-9 h-9 rounded-lg seller-icon-bg flex items-center justify-center hover:opacity-80 transition-opacity"
          >
            <ArrowLeft className="w-4 h-4 text-seller-muted" />
          </button>
          <div className="flex items-center gap-3 flex-1">
            <div className="w-9 h-9 rounded-xl seller-icon-bg flex items-center justify-center shadow-seller-glow">
              <ShieldCheck className="w-5 h-5 text-seller-accent" />
            </div>
            <div>
              <h1 className="font-display font-bold text-seller-text text-lg leading-tight">
                Platform Seller Dashboard
              </h1>
              <p className="text-xs text-seller-muted">
                Manage restaurant subscriptions
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg seller-card-subtle border border-seller-border">
            <CircleDollarSign className="w-4 h-4 text-seller-accent" />
            <span className="text-seller-text text-sm font-semibold">
              ₹5,000
            </span>
            <span className="text-seller-muted text-xs">/month</span>
          </div>
          <button
            type="button"
            onClick={() => {
              sellerLogout();
              toast.success("Signed out");
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg seller-icon-bg hover:opacity-80 transition-opacity text-seller-muted hover:text-seller-text text-sm"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Alert banners */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            {alerts.map((r) => {
              const d = getDaysRemaining(r.subscriptionEndDate);
              return (
                <div
                  key={r.id}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
                    d < 0
                      ? "bg-red-500/10 border-red-500/30 text-red-400"
                      : "bg-amber-500/10 border-amber-500/30 text-amber-400"
                  }`}
                >
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span className="text-sm font-medium">
                    <strong>{r.name}</strong>:{" "}
                    {d < 0
                      ? `Subscription expired ${Math.abs(d)} day${Math.abs(d) !== 1 ? "s" : ""} ago`
                      : d === 0
                        ? "Subscription expires today!"
                        : `Subscription expires in ${d} day${d !== 1 ? "s" : ""}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => renewSubscription(r.id)}
                    className="ml-auto text-xs px-3 py-1 rounded-md seller-btn-sm font-medium"
                  >
                    Renew Now
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: "Total Restaurants",
              value: total,
              icon: Building2,
              color: "text-seller-accent",
              bg: "seller-stat-bg-accent",
            },
            {
              label: "Active",
              value: active,
              icon: TrendingUp,
              color: "text-emerald-400",
              bg: "seller-stat-bg-green",
            },
            {
              label: "Suspended",
              value: suspended,
              icon: WifiOff,
              color: "text-seller-muted",
              bg: "seller-stat-bg-muted",
            },
            {
              label: "Expiring Soon",
              value: expiringSoon,
              icon: Clock,
              color: "text-amber-400",
              bg: "seller-stat-bg-amber",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="seller-card rounded-xl p-4 flex flex-col gap-3"
            >
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center ${stat.bg}`}
              >
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-seller-text font-display">
                  {stat.value}
                </p>
                <p className="text-xs text-seller-muted mt-0.5">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Restaurant list header */}
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-seller-text text-lg">
            Restaurants
          </h2>
          <Button
            onClick={() => setShowAddModal(true)}
            className="seller-btn h-9 text-sm"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Restaurant
          </Button>
        </div>

        {/* Empty state */}
        {restaurants.length === 0 ? (
          <div className="seller-card rounded-2xl p-12 text-center">
            <div className="w-16 h-16 rounded-2xl seller-icon-bg flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-seller-muted/50" />
            </div>
            <h3 className="font-display font-bold text-seller-text text-lg mb-2">
              No restaurants yet
            </h3>
            <p className="text-seller-muted text-sm mb-6 max-w-xs mx-auto">
              Add your first restaurant client to start managing subscriptions.
            </p>
            <Button
              onClick={() => setShowAddModal(true)}
              className="seller-btn"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add First Restaurant
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {restaurants.map((restaurant) => {
              const days = getDaysRemaining(restaurant.subscriptionEndDate);

              return (
                <div
                  key={restaurant.id}
                  className={`seller-card rounded-xl p-4 sm:p-5 transition-all ${
                    !restaurant.isActive ? "opacity-60" : ""
                  }`}
                >
                  {/* Suspended banner */}
                  {!restaurant.isActive && (
                    <div className="flex items-center gap-2 mb-3 px-3 py-1.5 rounded-lg bg-seller-muted/10 border border-seller-border text-seller-muted text-xs font-bold tracking-widest uppercase">
                      <WifiOff className="w-3.5 h-3.5" />
                      Service Suspended
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* Info */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-xl seller-icon-bg flex items-center justify-center shrink-0">
                        <Building2 className="w-5 h-5 text-seller-accent" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-display font-bold text-seller-text text-sm">
                            {restaurant.name}
                          </h3>
                          <StatusBadge restaurant={restaurant} />
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
                          <span className="flex items-center gap-1.5 text-xs text-seller-muted">
                            <User className="w-3 h-3" />
                            {restaurant.ownerName}
                          </span>
                          <span className="flex items-center gap-1.5 text-xs text-seller-muted">
                            <Phone className="w-3 h-3" />
                            {restaurant.ownerPhone}
                          </span>
                          <span
                            className={`flex items-center gap-1.5 text-xs font-semibold ${
                              days < 0
                                ? "text-red-400"
                                : days <= 3
                                  ? "text-amber-400"
                                  : "text-seller-muted"
                            }`}
                          >
                            <Clock className="w-3 h-3" />
                            {days < 0
                              ? `${Math.abs(days)}d overdue`
                              : `${days}d remaining`}
                          </span>
                        </div>
                        {/* Subscription bar */}
                        <div className="mt-2.5 flex items-center gap-2">
                          <div className="flex-1 h-1 rounded-full bg-seller-border overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                days < 0
                                  ? "bg-red-500"
                                  : days <= 3
                                    ? "bg-amber-400"
                                    : "bg-emerald-500"
                              }`}
                              style={{
                                width: `${Math.max(0, Math.min(100, (days / 30) * 100))}%`,
                              }}
                            />
                          </div>
                          <span className="text-xs text-seller-muted/60 shrink-0">
                            {new Date(
                              restaurant.subscriptionEndDate,
                            ).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Separator
                      orientation="vertical"
                      className="bg-seller-border hidden sm:block h-12"
                    />

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap sm:shrink-0">
                      {/* Renew */}
                      <Button
                        size="sm"
                        onClick={() => {
                          renewSubscription(restaurant.id);
                          toast.success(
                            `${restaurant.name} renewed for 30 days`,
                          );
                        }}
                        className="seller-btn-sm h-8 text-xs px-3 flex items-center gap-1.5"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Renew 30d
                      </Button>

                      {/* Toggle active */}
                      <button
                        type="button"
                        onClick={() => {
                          toggleRestaurantActive(restaurant.id);
                          toast.success(
                            restaurant.isActive
                              ? `${restaurant.name} suspended`
                              : `${restaurant.name} activated`,
                          );
                        }}
                        className={`h-8 px-3 text-xs rounded-lg border font-medium transition-all flex items-center gap-1.5 ${
                          restaurant.isActive
                            ? "border-seller-border text-seller-muted hover:text-red-400 hover:border-red-500/40 bg-transparent"
                            : "border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 bg-transparent"
                        }`}
                      >
                        {restaurant.isActive ? (
                          <>
                            <WifiOff className="w-3.5 h-3.5" /> Suspend
                          </>
                        ) : (
                          <>
                            <BadgeCheck className="w-3.5 h-3.5" /> Activate
                          </>
                        )}
                      </button>

                      {/* Manage PINs */}
                      <button
                        type="button"
                        onClick={() => setManagePinsRestaurantId(restaurant.id)}
                        className="h-8 px-3 text-xs rounded-lg border border-seller-border text-seller-muted hover:text-seller-accent hover:border-seller-accent/40 flex items-center gap-1.5 bg-transparent transition-all"
                        title="Manage PINs"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        PINs
                      </button>

                      {/* Remove */}
                      <button
                        type="button"
                        onClick={() => setConfirmRemoveId(restaurant.id)}
                        className="w-8 h-8 rounded-lg border border-seller-border text-seller-muted hover:text-red-400 hover:border-red-500/40 flex items-center justify-center transition-all"
                        title="Remove restaurant"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Subscription pricing note */}
        <div className="seller-card rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg seller-stat-bg-accent flex items-center justify-center shrink-0">
            <CircleDollarSign className="w-5 h-5 text-seller-accent" />
          </div>
          <div>
            <p className="text-seller-text text-sm font-semibold">
              Monthly Subscription: ₹5,000 per restaurant
            </p>
            <p className="text-seller-muted text-xs mt-0.5">
              Each restaurant pays ₹5,000/month for full access to the QR
              ordering system.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-seller-muted py-4">
          © {new Date().getFullYear()}.{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            className="hover:text-seller-text transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            Built with love using caffeine.ai
          </a>
        </div>
      </main>

      {/* Add Restaurant Modal */}
      <AddRestaurantModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
      />

      {/* Manage PINs Modal */}
      <ManagePinsModal
        restaurant={managePinsRestaurant}
        onClose={() => setManagePinsRestaurantId(null)}
      />

      {/* Confirm Remove Dialog */}
      <Dialog
        open={!!confirmRemoveId}
        onOpenChange={() => setConfirmRemoveId(null)}
      >
        <DialogContent className="seller-card border-seller-border text-seller-text max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-seller-text flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-400" />
              Remove Restaurant
            </DialogTitle>
          </DialogHeader>
          <p className="text-seller-muted text-sm mt-1">
            Are you sure you want to remove{" "}
            <strong className="text-seller-text">{confirmRemove?.name}</strong>?
            This action cannot be undone.
          </p>
          <DialogFooter className="gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setConfirmRemoveId(null)}
              className="seller-outline-btn flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (confirmRemoveId) {
                  const name = confirmRemove?.name ?? "Restaurant";
                  removeRestaurant(confirmRemoveId);
                  setConfirmRemoveId(null);
                  toast.success(`${name} removed`);
                }
              }}
              className="bg-red-500/80 hover:bg-red-500 text-white border-0 flex-1"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Entry point ────────────────────────────────────────────────────────────────
export default function SellerDashboard({ navigate }: Props) {
  const { isSellerAuthenticated } = useSellerStore();

  if (!isSellerAuthenticated) {
    return <SellerAuth />;
  }

  return <Dashboard navigate={navigate} />;
}
