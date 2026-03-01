import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ChefHat,
  QrCode,
  Receipt,
  Settings,
  Store,
  UtensilsCrossed,
} from "lucide-react";
import { useStore } from "../store";

interface Props {
  navigate: (page: "home" | "kitchen" | "billing" | "admin" | "seller") => void;
}

export default function HomePage({ navigate }: Props) {
  const tables = useStore((s) => s.tables);
  const orders = useStore((s) => s.orders);
  const activeOrders = orders.filter((o) => o.status === "active");
  const occupiedTables = tables.filter((t) => t.isOccupied);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-border shadow-xs">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-primary">
              <UtensilsCrossed className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold text-foreground">
                Restaurant
              </h1>
              <p className="text-xs text-muted-foreground">Management System</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:block">
              {occupiedTables.length}/{tables.length} tables occupied
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-10">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
            <span>🍽️</span>
            <span>Restaurant Management System</span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-display font-bold text-foreground mb-4 leading-tight">
            Manage Your Restaurant
            <br />
            <span className="text-primary">Effortlessly</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            QR-based ordering, real-time kitchen updates, seamless billing — all
            in one place.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
          {[
            { label: "Total Tables", value: tables.length, icon: "🪑" },
            { label: "Occupied", value: occupiedTables.length, icon: "👥" },
            { label: "Active Orders", value: activeOrders.length, icon: "📋" },
            {
              label: "Menu Items",
              value: useStore.getState().menuItems.filter((m) => m.isAvailable)
                .length,
              icon: "🍽️",
            },
          ].map((stat) => (
            <Card key={stat.label} className="shadow-card">
              <CardContent className="p-4 text-center">
                <div className="text-3xl mb-1">{stat.icon}</div>
                <div className="text-2xl font-display font-bold text-foreground">
                  {stat.value}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {stat.label}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Navigation Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <DashboardCard
            icon={<ChefHat className="w-7 h-7" />}
            title="Kitchen Dashboard"
            description="View incoming orders, update preparation status, and manage kitchen workflow in real-time."
            color="orange"
            badge="PIN: 1234"
            onClick={() => navigate("kitchen")}
          />
          <DashboardCard
            icon={<Receipt className="w-7 h-7" />}
            title="Billing Counter"
            description="Process payments, generate bills with GST, and manage table turnover efficiently."
            color="green"
            badge="PIN: 5678"
            onClick={() => navigate("billing")}
          />
          <DashboardCard
            icon={<Settings className="w-7 h-7" />}
            title="Admin Panel"
            description="Manage menu items, tables, QR codes, sales reports, and system settings."
            color="purple"
            badge="PIN: 0000"
            onClick={() => navigate("admin")}
          />
          <DashboardCard
            icon={<Store className="w-7 h-7" />}
            title="Seller Dashboard"
            description="Manage all restaurants, subscriptions, service status, and staff PINs from one place."
            color="blue"
            badge="Seller Access"
            onClick={() => navigate("seller")}
          />
        </div>

        {/* QR Info Section */}
        <Card className="shadow-card border-primary/20 bg-primary/5">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shrink-0">
                <QrCode className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-display font-bold text-foreground mb-1">
                  QR Code Ordering
                </h3>
                <p className="text-sm text-muted-foreground">
                  Customers scan the QR code on their table to access the
                  digital menu and place orders directly. Go to{" "}
                  <strong>Admin Panel → Table Management</strong> to view and
                  print QR codes.
                </p>
              </div>
              <Button
                onClick={() => navigate("admin")}
                variant="outline"
                className="shrink-0"
              >
                Manage QR Codes
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-16 py-6 text-center text-sm text-muted-foreground">
        <p>
          © {new Date().getFullYear()}. Built with ❤️ using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            caffeine.ai
          </a>
        </p>
      </footer>
    </div>
  );
}

interface DashboardCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: "orange" | "green" | "purple" | "blue";
  badge: string;
  onClick: () => void;
}

function DashboardCard({
  icon,
  title,
  description,
  color,
  badge,
  onClick,
}: DashboardCardProps) {
  const colorMap = {
    orange: "bg-orange-50 text-orange-600 border-orange-200",
    green: "bg-green-50 text-green-600 border-green-200",
    purple: "bg-purple-50 text-purple-600 border-purple-200",
    blue: "bg-blue-50 text-blue-600 border-blue-200",
  };
  const iconBg = {
    orange: "bg-orange-500",
    green: "bg-green-500",
    purple: "bg-purple-500",
    blue: "bg-blue-500",
  };

  return (
    <Card
      className="shadow-card hover:shadow-card-hover transition-all duration-200 cursor-pointer group border-border hover:-translate-y-1"
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div
          className={`w-12 h-12 rounded-xl ${iconBg[color]} flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform duration-200`}
        >
          {icon}
        </div>
        <h3 className="font-display font-bold text-lg text-foreground mb-2">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
          {description}
        </p>
        <div
          className={`inline-flex items-center text-xs font-medium px-3 py-1 rounded-full border ${colorMap[color]}`}
        >
          {badge}
        </div>
      </CardContent>
    </Card>
  );
}
