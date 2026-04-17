import { useState, useEffect } from "react";
import { formatDateWithWeekday } from "@/lib/dateUtils";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InventoryManagement } from "@/components/fleet/InventoryManagement";
import { RiderManagement } from "@/components/fleet/RiderManagement";
import { BatteryManagement } from "@/components/fleet/BatteryManagement";
import { PaymentTracking } from "@/components/fleet/PaymentTracking";
import UserManagement from "@/components/admin/UserManagement";
import { PlacesSeeder } from "@/components/admin/PlacesSeeder";
import { ConnectionTest } from "@/components/debug/ConnectionTest";
import { DataImportPage } from "@/components/import/DataImportPage";
import { useVehicleStats } from "@/hooks/useVehicleStats";
import { useRiders } from "@/hooks/useRiders";
import { useBatteryStats } from "@/hooks/useBatteryStats";
import { Bike, Users, CreditCard, Activity, Package, UserCheck, Receipt, Shield, Wrench, CheckCircle2, Clock, User, Battery, Upload } from "lucide-react";
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("inventory");
  const { stats: vehicleStats, loading: statsLoading } = useVehicleStats();
  const { riders, loading: ridersLoading } = useRiders();
  const { data: batteryStats, isLoading: batteryStatsLoading } = useBatteryStats();

  // Initialize activeTab from URL search params
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab') || 'inventory';
    // Validate that the tab is one of the allowed values
    const validTabs = ['inventory', 'riders', 'batteries', 'payments', 'users', 'import'];
    if (validTabs.includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    } else {
      setActiveTab('inventory');
    }
  }, [searchParams]);

  // Update URL when activeTab changes
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // TL filter (shared between stats + Rider Management table)
  const [riderTlFilter, setRiderTlFilter] = useState<'all' | 'TL1' | 'TL2' | 'none'>('all');

  const tlFilteredRiders = riders.filter(rider => {
    if (riderTlFilter === 'all') return true;
    if (riderTlFilter === 'none') return !rider.onboarded_by;
    return rider.onboarded_by === riderTlFilter;
  });

  // Calculate rider statistics (respects TL filter)
  const riderStats = {
    total: tlFilteredRiders.length,
    active: tlFilteredRiders.filter(rider => rider.status === 'active').length,
    live: tlFilteredRiders.filter(rider => rider.duty_status === 'LIVE').length,
    idle: tlFilteredRiders.filter(rider => rider.duty_status === 'IDLE' || !rider.duty_status).length
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <Sidebar className="w-64 shrink-0 relative z-10 border-r border-sidebar-border">
          <SidebarContent>
            {/* Sidebar Header */}
            <div className="p-4 border-b border-sidebar-border">
              <h2 className="text-lg font-semibold text-sidebar-foreground">Lilypad Fleet Manager</h2>
            </div>
            
            <SidebarGroup className="px-4 py-6">
              <SidebarGroupContent>
                <SidebarMenu className="space-y-2">
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => handleTabChange("inventory")}
                      className={`
                        w-full h-12 px-4 rounded-lg transition-all duration-200
                        ${activeTab === "inventory"
                          ? "bg-sidebar-accent text-sidebar-primary font-semibold shadow-sm"
                          : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                        }
                      `}
                    >
                      <Package className="mr-3 h-5 w-5" />
                      <span className="text-sm">Vehicle Management</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => handleTabChange("riders")}
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
                      onClick={() => handleTabChange("batteries")}
                      className={`
                        w-full h-12 px-4 rounded-lg transition-all duration-200
                        ${activeTab === "batteries"
                          ? "bg-sidebar-accent text-sidebar-primary font-semibold shadow-sm"
                          : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                        }
                      `}
                    >
                      <Battery className="mr-3 h-5 w-5" />
                      <span className="text-sm">Battery Management</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => handleTabChange("payments")}
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
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => handleTabChange("users")}
                      className={`
                        w-full h-12 px-4 rounded-lg transition-all duration-200
                        ${activeTab === "users"
                          ? "bg-sidebar-accent text-sidebar-primary font-semibold shadow-sm"
                          : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                        }
                      `}
                    >
                      <Shield className="mr-3 h-5 w-5" />
                      <span className="text-sm">User Management</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => handleTabChange("import")}
                      className={`
                        w-full h-12 px-4 rounded-lg transition-all duration-200
                        ${activeTab === "import"
                          ? "bg-sidebar-accent text-sidebar-primary font-semibold shadow-sm"
                          : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                        }
                      `}
                    >
                      <Upload className="mr-3 h-5 w-5" />
                      <span className="text-sm">Data Import</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            
            {/* User Info removed - no authentication */}
            <div className="mt-auto p-4 border-t border-sidebar-border">
              <div className="text-sm text-sidebar-foreground/70">
                Fleet Management Dashboard
              </div>
            </div>
          </SidebarContent>
        </Sidebar>
        
        <main className="flex-1 min-w-0 flex flex-col relative z-0">
          {/* Header */}
          <header className="border-b bg-card p-4 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <h1 className="text-2xl font-bold text-foreground">
                  {formatDateWithWeekday(new Date())}
                </h1>
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
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 w-full max-w-screen-2xl mx-auto">
              {/* Vehicle Statistics Cards - Show only for Inventory Management */}
              {activeTab === "inventory" && (
                <>
                  {/* Card 1 - Total Vehicles */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Vehicles</CardTitle>
                      <Bike className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {statsLoading ? "..." : vehicleStats.total.count}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {statsLoading ? "Loading..." : `${vehicleStats.total.lowSpeed} Low Speed • ${vehicleStats.total.highSpeed} High Speed`}
                      </p>
                    </CardContent>
                  </Card>
                  
                  {/* Card 2 - Deployed */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Deployed</CardTitle>
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {statsLoading ? "..." : vehicleStats.deployed.count}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {statsLoading ? "Loading..." : `${vehicleStats.deployed.lowSpeed} Low Speed • ${vehicleStats.deployed.highSpeed} High Speed`}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Card 3 - Ready for Deployment */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Ready for Deployment</CardTitle>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {statsLoading ? "..." : vehicleStats.readyForDeployment.count}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {statsLoading ? "Loading..." : `${vehicleStats.readyForDeployment.lowSpeed} Low Speed • ${vehicleStats.readyForDeployment.highSpeed} High Speed`}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Card 4 - Under Maintenance */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Under Maintenance</CardTitle>
                      <Wrench className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {statsLoading ? "..." : vehicleStats.underMaintenance.count}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {statsLoading ? "Loading..." : `${vehicleStats.underMaintenance.lowSpeed} Low Speed • ${vehicleStats.underMaintenance.highSpeed} High Speed`}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Card 5 - Active Rentals */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Active Rentals</CardTitle>
                      <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {statsLoading ? "..." : vehicleStats.activeRentals.count}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {statsLoading ? "Loading..." : `${vehicleStats.activeRentals.utilizationRate}% utilization`}
                      </p>
                    </CardContent>
                  </Card>
                </>
              )}

              {/* Rider Statistics Cards - Show only for Rider Management */}
              {activeTab === "riders" && (
                <>
                  {/* Card 1 - Total Riders */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Riders</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {ridersLoading ? "..." : riderStats.total}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Registered riders
                      </p>
                    </CardContent>
                  </Card>

                  {/* Card 2 - Total Active Riders */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Active Riders</CardTitle>
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {ridersLoading ? "..." : riderStats.active}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Active status riders
                      </p>
                    </CardContent>
                  </Card>

                  {/* Card 3 - Total Live Riders */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Live Riders</CardTitle>
                      <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {ridersLoading ? "..." : riderStats.live}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Currently on duty
                      </p>
                    </CardContent>
                  </Card>

                  {/* Card 4 - Total Idle Riders */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Idle Riders</CardTitle>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {ridersLoading ? "..." : riderStats.idle}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Not on duty
                      </p>
                    </CardContent>
                  </Card>
                </>
              )}

              {/* Battery Statistics Cards - Show only for Battery Management */}
              {activeTab === "batteries" && (
                <>
                  {/* Card 1 - Total Batteries */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Batteries</CardTitle>
                      <Battery className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {batteryStatsLoading ? "..." : batteryStats?.total.count || 0}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        All batteries in inventory
                      </p>
                    </CardContent>
                  </Card>

                  {/* Card 2 - Mapped Batteries */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Mapped Batteries</CardTitle>
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {batteryStatsLoading ? "..." : batteryStats?.mapped.count || 0}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Assigned to vehicles
                      </p>
                    </CardContent>
                  </Card>

                  {/* Card 3 - Unmapped Batteries */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Unmapped Batteries</CardTitle>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {batteryStatsLoading ? "..." : batteryStats?.unmapped.count || 0}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Available for mapping
                      </p>
                    </CardContent>
                  </Card>

                  {/* Card 4 - Active Batteries */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Active Batteries</CardTitle>
                      <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {batteryStatsLoading ? "..." : batteryStats?.active.count || 0}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        In active use
                      </p>
                    </CardContent>
                  </Card>
                </>
              )}
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
                  <RiderManagement
                    tlFilter={riderTlFilter}
                    onTlFilterChange={setRiderTlFilter}
                  />
                </div>
              )}

              {activeTab === "batteries" && (
                <div className="space-y-4">
                  <BatteryManagement />
                </div>
              )}

              {activeTab === "payments" && (
                <div className="space-y-4">
                  <PaymentTracking />
                </div>
              )}
              
              {activeTab === "users" && (
                <div className="space-y-4">
                  <UserManagement />
                  <PlacesSeeder />
                </div>
              )}

              {activeTab === "import" && (
                <div className="space-y-4">
                  <DataImportPage />
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
