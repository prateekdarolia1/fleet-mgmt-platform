import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { formatDate } from "@/lib/dateUtils";
import { useRiders } from "@/hooks/useRiders";
import { useVehicles } from "@/hooks/useVehicles";
import {
  useUnifiedOverduePayments,
  useUnifiedUpcomingPayments,
  type UnifiedOverduePayment,
  type UnifiedUpcomingPayment,
} from "@/hooks/useUnifiedPayments";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Phone,
  Search,
  Truck,
  User,
} from "lucide-react";
import {
  MarkAsPaidDrawer,
  type MarkAsPaidTarget,
} from "@/components/fleet/MarkAsPaidDrawer";

type TLId = "TL1" | "TL2";

const isValidTL = (value: string): value is TLId =>
  value === "TL1" || value === "TL2";

const TLCollection = () => {
  const { tlId } = useParams<{ tlId: string }>();
  const normalized = (tlId || "").toUpperCase();

  if (!isValidTL(normalized)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <Card className="max-w-sm w-full">
          <CardContent className="pt-6 text-center space-y-2">
            <AlertCircle className="h-10 w-10 text-red-500 mx-auto" />
            <h1 className="text-xl font-semibold">Invalid URL</h1>
            <p className="text-sm text-muted-foreground">
              This collection page doesn't exist. Please check the URL you were given.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <TLCollectionView tl={normalized} />;
};

interface TLCollectionViewProps {
  tl: TLId;
}

const TLCollectionView = ({ tl }: TLCollectionViewProps) => {
  const { riders, loading: ridersLoading } = useRiders();
  const { vehicles } = useVehicles();
  const { data: overduePayments, isLoading: overdueLoading } =
    useUnifiedOverduePayments(100);
  const { data: upcomingPayments, isLoading: upcomingLoading } =
    useUnifiedUpcomingPayments(14);

  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [target, setTarget] = useState<MarkAsPaidTarget | null>(null);

  const openMarkAsPaid = (t: MarkAsPaidTarget) => {
    setTarget(t);
    setDrawerOpen(true);
  };

  // rider_id → rider (used for mobile number lookup + TL filter)
  const riderMap = useMemo(
    () => new Map(riders.map((r) => [r.rider_id, r])),
    [riders]
  );

  // rider_id → vehicle number
  const riderVehicleMap = useMemo(
    () =>
      new Map(
        vehicles.filter((v) => v.rider_id).map((v) => [v.rider_id!, v.vehicle_number])
      ),
    [vehicles]
  );

  // Rider IDs assigned to this TL
  const myRiderIds = useMemo(
    () =>
      new Set(
        riders.filter((r) => r.onboarded_by === tl).map((r) => r.rider_id)
      ),
    [riders, tl]
  );

  const belongsToMe = <T extends { rider_id: string }>(p: T): boolean =>
    myRiderIds.has(p.rider_id);

  const matchesSearch = <T extends { rider_name?: string | null; rider_id: string }>(
    p: T
  ): boolean => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const name = (p.rider_name || "").toLowerCase();
    const id = p.rider_id.toLowerCase();
    return name.includes(q) || id.includes(q);
  };

  const myOverdue = useMemo(
    () => (overduePayments || []).filter(belongsToMe).filter(matchesSearch),
    [overduePayments, myRiderIds, search]
  );

  const myUpcoming = useMemo(
    () => (upcomingPayments || []).filter(belongsToMe).filter(matchesSearch),
    [upcomingPayments, myRiderIds, search]
  );

  const loading = ridersLoading || overdueLoading || upcomingLoading;

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Sticky Header — full-width bg, content centered */}
      <header className="sticky top-0 z-20 bg-white border-b shadow-sm">
        <div className="max-w-2xl mx-auto">
          <div className="px-4 sm:px-6 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 className="text-lg font-bold">{tl} Collections</h1>
                <p className="text-xs text-muted-foreground">
                  {myRiderIds.size} rider{myRiderIds.size === 1 ? "" : "s"} assigned
                </p>
              </div>
              <Badge className="bg-blue-600 text-white">{tl}</Badge>
            </div>
          </div>
          {/* Search */}
          <div className="px-4 sm:px-6 pb-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by rider name or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10 text-base"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <Tabs defaultValue="overdue" className="w-full">
        <div className="sticky top-[113px] z-10 bg-gray-50 border-b">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-3 pb-2">
            <TabsList className="w-full h-11">
              <TabsTrigger value="overdue" className="flex-1 text-sm">
                Overdue
                <Badge
                  variant="secondary"
                  className="ml-2 bg-red-100 text-red-700 hover:bg-red-100"
                >
                  {myOverdue.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="upcoming" className="flex-1 text-sm">
                Upcoming
                <Badge
                  variant="secondary"
                  className="ml-2 bg-amber-100 text-amber-700 hover:bg-amber-100"
                >
                  {myUpcoming.length}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        <TabsContent value="overdue" className="mt-0 max-w-2xl mx-auto px-4 sm:px-6 pt-3 space-y-3">
          {loading ? (
            <LoadingState />
          ) : myOverdue.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 className="h-10 w-10 text-green-500" />}
              title="No overdue payments"
              subtitle="All your riders are up to date."
            />
          ) : (
            myOverdue.map((p) => (
              <PaymentCard
                key={`${p.source}-${p.id}`}
                id={p.id}
                rider_id={p.rider_id}
                rider_name={p.rider_name}
                week_number={p.week_number}
                payment_id={p.payment_id}
                source={p.source as "payments" | "rental_payments"}
                due_date={p.due_date}
                amount_due={p.amount_due ?? 0}
                balance={p.balance ?? p.amount_due ?? 0}
                variant="overdue"
                phone={
                  riderMap.get(p.rider_id)?.mobile_number ||
                  riderMap.get(p.rider_id)?.phone ||
                  null
                }
                vehicle={riderVehicleMap.get(p.rider_id) || null}
                onMarkAsPaid={openMarkAsPaid}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="upcoming" className="mt-0 max-w-2xl mx-auto px-4 sm:px-6 pt-3 space-y-3">
          {loading ? (
            <LoadingState />
          ) : myUpcoming.length === 0 ? (
            <EmptyState
              icon={<Calendar className="h-10 w-10 text-gray-400" />}
              title="No payments due"
              subtitle="Nothing due in the next 14 days."
            />
          ) : (
            myUpcoming.map((p) => (
              <PaymentCard
                key={`${p.source}-${p.id}`}
                id={p.id}
                rider_id={p.rider_id}
                rider_name={p.rider_name}
                week_number={p.week_number}
                payment_id={p.payment_id}
                source={p.source as "payments" | "rental_payments"}
                due_date={p.due_date}
                amount_due={p.amount_due ?? 0}
                variant="upcoming"
                phone={
                  riderMap.get(p.rider_id)?.mobile_number ||
                  riderMap.get(p.rider_id)?.phone ||
                  null
                }
                vehicle={riderVehicleMap.get(p.rider_id) || null}
                onMarkAsPaid={openMarkAsPaid}
              />
            ))
          )}
        </TabsContent>
      </Tabs>

      <MarkAsPaidDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        target={target}
        collectedBy={tl}
        requireProof={true}
      />
    </div>
  );
};

interface PaymentCardProps {
  id: string;
  rider_id: string;
  rider_name?: string | null;
  week_number?: number | null;
  payment_id?: string | null;
  source: "payments" | "rental_payments";
  due_date?: string | null;
  amount_due: number;
  balance?: number;
  variant: "overdue" | "upcoming";
  phone: string | null;
  vehicle: string | null;
  onMarkAsPaid: (target: MarkAsPaidTarget) => void;
}

const PaymentCard = ({
  id,
  rider_id,
  rider_name,
  week_number,
  payment_id,
  source,
  due_date,
  amount_due,
  balance,
  variant,
  phone,
  vehicle,
  onMarkAsPaid,
}: PaymentCardProps) => {
  const isOverdue = variant === "overdue";
  const amountToShow = balance ?? amount_due;

  return (
    <Card
      className={`border ${
        isOverdue ? "border-red-200 bg-red-50/30" : "border-amber-200 bg-amber-50/30"
      }`}
    >
      <CardContent className="p-4 space-y-3">
        {/* Top row: Rider + Period */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <p className="font-semibold truncate">{rider_name || "Unknown"}</p>
            </div>
            <p className="text-xs text-muted-foreground ml-6">{rider_id}</p>
          </div>
          <Badge variant="outline" className="flex-shrink-0 text-xs">
            {source === "rental_payments"
              ? `Week ${week_number ?? "—"}`
              : payment_id || "—"}
          </Badge>
        </div>

        {/* Details */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          {phone && (
            <div className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <a
                href={`tel:${phone}`}
                className="text-blue-600 hover:underline truncate"
                onClick={(e) => e.stopPropagation()}
              >
                {phone}
              </a>
            </div>
          )}
          {vehicle && (
            <div className="flex items-center gap-1.5">
              <Truck className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <span className="truncate">{vehicle}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 col-span-2">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <span>{due_date ? `Due ${formatDate(due_date)}` : "No due date"}</span>
          </div>
        </div>

        {/* Amount + Action */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div>
            <p className="text-xs text-muted-foreground">
              {isOverdue ? "Balance" : "Amount Due"}
            </p>
            <p
              className={`text-xl font-bold ${
                isOverdue ? "text-red-600" : "text-amber-700"
              }`}
            >
              ₹{amountToShow.toLocaleString("en-IN")}
            </p>
          </div>
          <Button
            size="sm"
            className="h-10 px-4"
            onClick={() =>
              onMarkAsPaid({
                payment_id: id,
                source,
                rider_name: rider_name ?? null,
                amount_due,
                label:
                  source === "rental_payments"
                    ? `Week ${week_number ?? "—"}`
                    : payment_id || "—",
              })
            }
          >
            Mark as Paid
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const LoadingState = () => (
  <div className="text-center py-12 text-muted-foreground">
    <p>Loading...</p>
  </div>
);

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}

const EmptyState = ({ icon, title, subtitle }: EmptyStateProps) => (
  <div className="text-center py-12 space-y-2">
    <div className="flex justify-center">{icon}</div>
    <p className="font-semibold">{title}</p>
    <p className="text-sm text-muted-foreground">{subtitle}</p>
  </div>
);

export default TLCollection;
