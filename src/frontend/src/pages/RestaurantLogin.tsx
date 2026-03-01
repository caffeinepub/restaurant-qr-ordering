import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Building2,
  ChefHat,
  Lock,
  Phone,
  Receipt,
  Settings,
  User,
  UtensilsCrossed,
  WifiOff,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useSellerStore } from "../sellerStore";
import type { UserRole } from "../types";

interface Props {
  onSuccess: (restaurantId: string, role: UserRole) => void;
  onBack: () => void;
}

type Step = "identity" | "role" | "pin";

export default function RestaurantLogin({ onSuccess, onBack }: Props) {
  const { restaurants, getActivePinsForRestaurant } = useSellerStore();

  const [step, setStep] = useState<Step>("identity");
  const [name, setName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [identityError, setIdentityError] = useState("");
  const [matchedRestaurantId, setMatchedRestaurantId] = useState<string | null>(
    null,
  );
  const [selectedRole, setSelectedRole] = useState<
    "admin" | "kitchen" | "billing" | null
  >(null);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);

  const matchedRestaurant = matchedRestaurantId
    ? (restaurants.find((r) => r.id === matchedRestaurantId) ?? null)
    : null;

  function handleIdentitySubmit(e: React.FormEvent) {
    e.preventDefault();
    setIdentityError("");

    if (!name.trim() || !ownerName.trim() || !phone.trim()) {
      setIdentityError("Please fill in all fields.");
      return;
    }

    const found = restaurants.find(
      (r) =>
        r.name.toLowerCase() === name.trim().toLowerCase() &&
        r.ownerName.toLowerCase() === ownerName.trim().toLowerCase() &&
        r.ownerPhone === phone.trim(),
    );

    if (!found) {
      setIdentityError(
        "No restaurant found with these details. Please check with the seller.",
      );
      return;
    }

    setMatchedRestaurantId(found.id);
    setStep("role");
  }

  function handleRoleSelect(role: "admin" | "kitchen" | "billing") {
    setSelectedRole(role);
    setPin("");
    setPinError(false);
    setStep("pin");
  }

  function handlePinSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!matchedRestaurantId || !selectedRole) return;

    const pins = getActivePinsForRestaurant(matchedRestaurantId);
    let valid = false;
    if (selectedRole === "admin" && pin === pins.admin) valid = true;
    if (selectedRole === "kitchen" && pin === pins.kitchen) valid = true;
    if (selectedRole === "billing" && pin === pins.billing) valid = true;

    if (valid) {
      toast.success(`Logged in as ${selectedRole}`);
      onSuccess(matchedRestaurantId, selectedRole);
    } else {
      setPinError(true);
      setPin("");
      toast.error("Incorrect PIN. Please try again.");
    }
  }

  // Suspended screen
  if (step === "role" && matchedRestaurant && !matchedRestaurant.isActive) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 rounded-2xl bg-gray-800 flex items-center justify-center mx-auto mb-6">
            <WifiOff className="w-10 h-10 text-gray-400" />
          </div>
          <h2 className="text-2xl font-display font-bold text-white mb-3">
            Service Suspended
          </h2>
          <p className="text-gray-400 leading-relaxed mb-6">
            This restaurant's service has been temporarily suspended.
            <br />
            Please contact the seller for more information.
          </p>
          <button
            type="button"
            onClick={() => {
              setStep("identity");
              setMatchedRestaurantId(null);
            }}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mx-auto text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4 shadow-primary">
            <UtensilsCrossed className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            {step === "identity" && "Restaurant Login"}
            {step === "role" && matchedRestaurant?.name}
            {step === "pin" &&
              `${selectedRole ? selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1) : ""} Access`}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {step === "identity" && "Enter your restaurant details to continue"}
            {step === "role" && "Select your role to access the dashboard"}
            {step === "pin" && "Enter your PIN to continue"}
          </p>
        </div>

        {/* Step: Identity Verification */}
        {step === "identity" && (
          <div className="bg-white rounded-2xl border border-border shadow-card p-6">
            <form onSubmit={handleIdentitySubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label
                  htmlFor="restaurant-name"
                  className="text-sm font-medium text-foreground flex items-center gap-1.5"
                >
                  <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                  Restaurant Name
                </Label>
                <Input
                  id="restaurant-name"
                  placeholder="e.g. Spice Garden"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setIdentityError("");
                  }}
                  autoComplete="organization"
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="owner-name"
                  className="text-sm font-medium text-foreground flex items-center gap-1.5"
                >
                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                  Owner Name
                </Label>
                <Input
                  id="owner-name"
                  placeholder="e.g. Rajan Sharma"
                  value={ownerName}
                  onChange={(e) => {
                    setOwnerName(e.target.value);
                    setIdentityError("");
                  }}
                  autoComplete="name"
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="phone"
                  className="text-sm font-medium text-foreground flex items-center gap-1.5"
                >
                  <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  placeholder="e.g. +91 98765 43210"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setIdentityError("");
                  }}
                  autoComplete="tel"
                />
              </div>

              {identityError && (
                <p className="text-destructive text-sm text-center">
                  {identityError}
                </p>
              )}

              <Button
                type="submit"
                className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-semibold"
              >
                <Lock className="w-4 h-4 mr-2" />
                Continue
              </Button>
            </form>

            <button
              type="button"
              onClick={onBack}
              className="mt-4 w-full flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm py-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </button>
          </div>
        )}

        {/* Step: Role Selection */}
        {step === "role" && matchedRestaurant && matchedRestaurant.isActive && (
          <div className="bg-white rounded-2xl border border-border shadow-card p-6">
            <p className="text-sm text-muted-foreground text-center mb-5">
              Welcome,{" "}
              <span className="font-semibold text-foreground">
                {matchedRestaurant.name}
              </span>
              ! Select your role:
            </p>

            <div className="space-y-3">
              <RoleCard
                icon={<Settings className="w-6 h-6" />}
                title="Admin"
                description="Manage menu, tables, QR codes & reports"
                color="purple"
                onClick={() => handleRoleSelect("admin")}
              />
              <RoleCard
                icon={<ChefHat className="w-6 h-6" />}
                title="Kitchen"
                description="View & update order preparation status"
                color="orange"
                onClick={() => handleRoleSelect("kitchen")}
              />
              <RoleCard
                icon={<Receipt className="w-6 h-6" />}
                title="Billing"
                description="Process payments & generate bills"
                color="green"
                onClick={() => handleRoleSelect("billing")}
              />
            </div>

            <button
              type="button"
              onClick={() => {
                setStep("identity");
                setMatchedRestaurantId(null);
              }}
              className="mt-4 w-full flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm py-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          </div>
        )}

        {/* Step: PIN Entry */}
        {step === "pin" && selectedRole && (
          <div className="bg-white rounded-2xl border border-border shadow-card p-6">
            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div className="text-center mb-2">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 ${
                    selectedRole === "admin"
                      ? "bg-purple-500"
                      : selectedRole === "kitchen"
                        ? "bg-orange-500"
                        : "bg-green-500"
                  }`}
                >
                  {selectedRole === "admin" && (
                    <Settings className="w-6 h-6 text-white" />
                  )}
                  {selectedRole === "kitchen" && (
                    <ChefHat className="w-6 h-6 text-white" />
                  )}
                  {selectedRole === "billing" && (
                    <Receipt className="w-6 h-6 text-white" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Enter{" "}
                  <span className="font-semibold text-foreground capitalize">
                    {selectedRole}
                  </span>{" "}
                  PIN
                </p>
              </div>

              <Input
                type="password"
                placeholder="• • • •"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setPinError(false);
                }}
                className={`text-center text-2xl tracking-widest h-14 font-mono ${
                  pinError ? "border-destructive" : ""
                }`}
                maxLength={6}
                autoFocus
              />

              {pinError && (
                <p className="text-destructive text-sm text-center">
                  Incorrect PIN. Please try again.
                </p>
              )}

              <Button
                type="submit"
                className={`w-full h-11 text-white font-semibold ${
                  selectedRole === "admin"
                    ? "bg-purple-500 hover:bg-purple-600"
                    : selectedRole === "kitchen"
                      ? "bg-orange-500 hover:bg-orange-600"
                      : "bg-green-500 hover:bg-green-600"
                }`}
              >
                Login as{" "}
                {selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}
              </Button>
            </form>

            <button
              type="button"
              onClick={() => {
                setStep("role");
                setSelectedRole(null);
                setPin("");
                setPinError(false);
              }}
              className="mt-4 w-full flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm py-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Role Selection
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

interface RoleCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: "purple" | "orange" | "green";
  onClick: () => void;
}

function RoleCard({ icon, title, description, color, onClick }: RoleCardProps) {
  const colorMap = {
    purple: "bg-purple-50 text-purple-600 group-hover:bg-purple-100",
    orange: "bg-orange-50 text-orange-600 group-hover:bg-orange-100",
    green: "bg-green-50 text-green-600 group-hover:bg-green-100",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary/30 hover:bg-primary/5 transition-all duration-200 text-left"
    >
      <div
        className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${colorMap[color]}`}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground text-sm">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
          {description}
        </p>
      </div>
      <ArrowLeft className="w-4 h-4 text-muted-foreground rotate-180 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}
