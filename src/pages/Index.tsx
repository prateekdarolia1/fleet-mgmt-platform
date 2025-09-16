import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InventoryManagement } from "@/components/fleet/InventoryManagement";
import { RiderManagement } from "@/components/fleet/RiderManagement";
import { PaymentTracking } from "@/components/fleet/PaymentTracking";
import { ConnectionTest } from "@/components/debug/ConnectionTest";
import { Bike, Users, CreditCard, Activity, Package, UserCheck, Receipt } from "lucide-react";
import { 
  Sidebar, 
  SidebarContent, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem, 
  SidebarProvider 
} from "@/components/ui/sidebar";

const Index = () => {
  const [activeTab, setActiveTab] = useState("inventory");

  // Mock data for dashboard overview
  const overviewStats = {
    totalVehicles: 100,
    activeRentals: 67,
    availableVehicles: 33,
    totalRiders: 245,
    activeRiders: 67,
    monthlyRevenue: 125000,
    pendingPayments: 15
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <Sidebar className="w-64 shrink-0 relative z-10 border-r border-sidebar-border">
          <SidebarContent>
            {/* Sidebar Header */}
            <div className="p-4 border-b border-sidebar-border">
              <h2 className="text-lg font-semibold text-sidebar-foreground">Fleet Management</h2>
              <p className="text-sm text-sidebar-foreground/70 mt-1">EV Rental Business</p>
            </div>
            
            <SidebarGroup className="px-4 py-6">
              <SidebarGroupContent>
                <SidebarMenu className="space-y-2">
                  <SidebarMenuItem>
                    <SidebarMenuButton 
                      onClick={() => setActiveTab("inventory")}
                      className={`
                        w-full h-12 px-4 rounded-lg transition-all duration-200 
                        ${activeTab === "inventory" 
                          ? "bg-sidebar-accent text-sidebar-primary font-semibold shadow-sm" 
                          : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                        }
                      `}
                    >
                      <Package className="mr-3 h-5 w-5" />
                      <span className="text-sm">Inventory Management</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton 
                      onClick={() => setActiveTab("riders")}
                      className={`
                        w-full h-12 px-4 rounded-lg transition-all duration-200 
                        ${activeTab === "riders" 
                          ? "bg-sidebar-accent text-sidebar-primary font-semibold shadow-sm" 
                          : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                        }
                      `}
                    >
                      <UserCheck className="mr-3 h-5 w-5" />
                      <span className="text-sm">Rider Management</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton 
                      onClick={() => setActiveTab("payments")}
                      className={`
                        w-full h-12 px-4 rounded-lg transition-all duration-200 
                        ${activeTab === "payments" 
                          ? "bg-sidebar-accent text-sidebar-primary font-semibold shadow-sm" 
                          : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                        }
                      `}
                    >
                      <Receipt className="mr-3 h-5 w-5" />
                      <span className="text-sm">Payment Tracking</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
        
        <main className="flex-1 min-w-0 flex flex-col relative z-0">
          {/* Header */}
          <header className="border-b bg-card p-4 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <h1 className="text-2xl font-bold text-foreground">Fleet Management</h1>
                <p className="text-muted-foreground text-sm mt-1">EV Rental Business Dashboard</p>
              </div>
              <div className="flex items-center space-x-3">
                <Badge variant="secondary" className="hidden sm:inline-flex">Single City</Badge>
                <Badge variant="outline" className="hidden sm:inline-flex">B2B Focused</Badge>
                <ConnectionTest />
              </div>
            </div>
          </header>

          {/* Dashboard Overview */}
          <div className="flex-1 p-4 sm:p-6 space-y-6 overflow-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 w-full max-w-screen-2xl mx-auto">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Vehicles</CardTitle>
                    <Bike className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{overviewStats.totalVehicles}</div>
                    <p className="text-xs text-muted-foreground">
                      {overviewStats.availableVehicles} available
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Rentals</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{overviewStats.activeRentals}</div>
                    <p className="text-xs text-muted-foreground">
                      {Math.round((overviewStats.activeRentals / overviewStats.totalVehicles) * 100)}% utilization
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Riders</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{overviewStats.totalRiders}</div>
                    <p className="text-xs text-muted-foreground">
                      {overviewStats.activeRiders} currently active
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">₹{overviewStats.monthlyRevenue.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">
                      {overviewStats.pendingPayments} pending payments
                    </p>
                  </CardContent>
                </Card>
              </div>

            {/* Main Content */}
            <div className="w-full">
              {activeTab === "inventory" && (
                <div className="space-y-4">
                  <InventoryManagement />
                </div>
              )}
              
              {activeTab === "riders" && (
                <div className="space-y-4">
                  <RiderManagement />
                </div>
              )}
              
              {activeTab === "payments" && (
                <div className="space-y-4">
                  <PaymentTracking />
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Index;
