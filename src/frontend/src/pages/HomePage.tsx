import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { QrCode, Store, UtensilsCrossed } from "lucide-react";

type PageView =
  | "home"
  | "kitchen"
  | "billing"
  | "admin"
  | "seller"
  | "restaurant-login";

interface Props {
  navigate: (page: PageView) => void;
}

export default function HomePage({ navigate }: Props) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-border shadow-xs">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-primary">
            <UtensilsCrossed className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-display font-bold text-foreground leading-tight">
              Restaurant QR System
            </h1>
            <p className="text-xs text-muted-foreground">
              Multi-restaurant management platform
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-10 flex flex-col items-center justify-center">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-5">
            <span>🍽️</span>
            <span>Restaurant Management Platform</span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-display font-bold text-foreground mb-4 leading-tight">
            Welcome to the
            <br />
            <span className="text-primary">QR Ordering System</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-lg mx-auto">
            QR-based digital menus, real-time kitchen updates, and seamless
            billing — for every restaurant on the platform.
          </p>
        </div>

        {/* Two main cards */}
        <div className="grid sm:grid-cols-2 gap-6 w-full max-w-2xl">
          {/* Login as Restaurant */}
          <Card
            className="shadow-card hover:shadow-card-hover transition-all duration-200 cursor-pointer group border-border hover:-translate-y-1"
            onClick={() => navigate("restaurant-login")}
          >
            <CardContent className="p-8 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-5 shadow-primary group-hover:scale-110 transition-transform duration-200">
                <UtensilsCrossed className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-display font-bold text-xl text-foreground mb-3">
                Login as Restaurant
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                Access your restaurant's admin panel, kitchen dashboard, or
                billing counter. Your data is completely private.
              </p>
              <Button className="w-full bg-primary hover:bg-primary/90 text-white font-semibold">
                Restaurant Login
              </Button>
            </CardContent>
          </Card>

          {/* Login as Seller */}
          <Card
            className="shadow-card hover:shadow-card-hover transition-all duration-200 cursor-pointer group border-border hover:-translate-y-1"
            onClick={() => navigate("seller")}
          >
            <CardContent className="p-8 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-700 flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-200">
                <Store className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-display font-bold text-xl text-foreground mb-3">
                Seller Dashboard
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                Manage all restaurants, subscriptions, service status, and staff
                PINs from one secure place.
              </p>
              <Button
                variant="outline"
                className="w-full font-semibold border-slate-300 hover:bg-slate-50"
              >
                Seller Access
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* QR info section */}
        <div className="mt-10 w-full max-w-2xl">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
                  <QrCode className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-display font-bold text-foreground text-sm mb-1">
                    How QR Ordering Works
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Each restaurant creates their own tables in the Admin Panel.
                    A unique QR code is generated per table — customers scan to
                    open the digital menu and place orders directly.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
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
