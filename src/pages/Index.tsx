import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InventoryManagement } from "@/components/fleet/InventoryManagement";
import { RiderManagement } from "@/components/fleet/RiderManagement";
import { PaymentTracking } from "@/components/fleet/PaymentTracking";
import UserManagement from "@/components/UserManagement";
import { useAuth } from "@/hooks/useAuth";
import { Bike, Users, CreditCard, Activity, Package, UserCheck, Receipt, UserCog, LogOut } from "lucide-react";
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
  const { user, userRole, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 ml-72">
          <div className="flex items-center justify-between min-h-[4rem]">
            <div className="flex flex-col justify-center">
              <h1 className="text-2xl font-bold text-foreground leading-tight">Fleet Management</h1>
              <p className="text-muted-foreground text-sm mt-1">EV Rental Business Dashboard</p>
            </div>
            <div className="flex items-center space-x-3 flex-shrink-0">
              <div className="text-sm text-muted-foreground">
                {user?.email} ({userRole})
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSignOut}
                className="flex items-center space-x-2"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </Button>
              <Badge variant="secondary" className="whitespace-nowrap">Single City</Badge>
              <Badge variant="outline" className="whitespace-nowrap">B2B Focused</Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Dashboard Overview */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
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

        {/* Main Content with Sidebar */}
        <SidebarProvider>
          <div className="flex min-h-screen w-full">
            <Sidebar className="w-72 bg-sidebar border-r border-sidebar-border">
              <SidebarContent className="bg-sidebar">
                {/* Sidebar Header */}
                <div className="p-6 border-b border-sidebar-border">
                  <h2 className="text-lg font-semibold text-sidebar-foreground">Management</h2>
                  <p className="text-sm text-sidebar-foreground/70 mt-1">Fleet Operations</p>
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
                      {(userRole === 'super_admin' || userRole === 'admin') && (
                        <SidebarMenuItem>
                          <SidebarMenuButton 
                            onClick={() => setActiveTab("users")}
                            className={`
                              w-full h-12 px-4 rounded-lg transition-all duration-200 
                              ${activeTab === "users" 
                                ? "bg-sidebar-accent text-sidebar-primary font-semibold shadow-sm" 
                                : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                              }
                            `}
                          >
                            <UserCog className="mr-3 h-5 w-5" />
                            <span className="text-sm">User Management</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      )}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              </SidebarContent>
            </Sidebar>
            
            <main className="flex-1 p-6">
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

              {activeTab === "users" && (userRole === 'super_admin' || userRole === 'admin') && (
                <div className="space-y-4">
                  <UserManagement />
                </div>
              )}
            </main>
          </div>
        </SidebarProvider>
      </div>
    </div>
  );
};

export default Index;
