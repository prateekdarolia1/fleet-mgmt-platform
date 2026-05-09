import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useRiders } from "@/hooks/useRiders";
import { useVehicles } from "@/hooks/useVehicles";
import {
  useUnifiedOverduePayments,
  useUnifiedUpcomingPayments,
} from "@/hooks/useUnifiedPayments";
import { AlertCircle, Check, Phone, Search } from "lucide-react";
import {
  MarkAsPaidDrawer,
  type MarkAsPaidTarget,
} from "@/components/fleet/MarkAsPaidDrawer";

type TLId = "TL1" | "TL2";

const isValidTL = (value: string): value is TLId =>
  value === "TL1" || value === "TL2";

// Elegant eggshell palette — picked from the design handoff.
const PAL = {
  page: "#f5f2ec",
  card: "#ffffff",
  ink: "#1c1917",
  muted: "#78716c",
  hairline: "#e8e3da",
  chipBg: "#f3ede2",
  chipBorder: "#c9b58a",
  ribbon: "#1c1917",
  overdue: "#a13d3a",
  overdueBg: "#f7ece9",
  overdueInk: "#7a2c2a",
  upcoming: "#8a6b2e",
  upcomingBg: "#f6efde",
  upcomingInk: "#6a5121",
  callInk: "#2f5d8a",
  empty: "#3f7a47",
  emptyBg: "#e8efe7",
} as const;

const fmtRupee = (n: number) => "₹" + (n || 0).toLocaleString("en-IN");
const overdueLabel = (d: number) =>
  d === 1 ? "1 day late" : `${d} days late`;
const upcomingLabel = (d: number) =>
  d <= 0 ? "Due today" : d === 1 ? "Due tomorrow" : `Due in ${d} days`;
const fmtDueDate = (s?: string | null) => {
  if (!s) return "";
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return "";
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${d} ${months[m - 1]}`;
};
const daysFromToday = (dateStr?: string | null): number | null => {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return null;
  const due = new Date(y, m - 1, d);
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((today.getTime() - due.getTime()) / 86_400_000);
};

const TLCollection = () => {
  const { tlId } = useParams<{ tlId: string }>();
  const normalized = (tlId || "").toUpperCase();

  if (!isValidTL(normalized)) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ background: PAL.page }}
      >
        <div
          className="max-w-sm w-full rounded-2xl p-6 text-center space-y-2"
          style={{ background: PAL.card, border: `1px solid ${PAL.hairline}` }}
        >
          <AlertCircle className="h-10 w-10 text-red-500 mx-auto" />
          <h1 className="text-xl font-semibold" style={{ color: PAL.ink }}>
            Invalid URL
          </h1>
          <p className="text-sm" style={{ color: PAL.muted }}>
            This collection page doesn't exist. Please check the URL you were given.
          </p>
        </div>
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
    useUnifiedOverduePayments();
  const { data: upcomingPayments, isLoading: upcomingLoading } =
    useUnifiedUpcomingPayments();

  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"overdue" | "upcoming">("overdue");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [target, setTarget] = useState<MarkAsPaidTarget | null>(null);

  const openMarkAsPaid = (t: MarkAsPaidTarget) => {
    setTarget(t);
    setDrawerOpen(true);
  };

  const riderMap = useMemo(
    () => new Map(riders.map((r) => [r.rider_id, r])),
    [riders]
  );

  const riderVehicleMap = useMemo(
    () =>
      new Map(
        vehicles.filter((v) => v.rider_id).map((v) => [v.rider_id!, v.vehicle_number])
      ),
    [vehicles]
  );

  const myRiderIds = useMemo(
    () =>
      new Set(
        riders.filter((r) => r.onboarded_by === tl).map((r) => r.rider_id)
      ),
    [riders, tl]
  );

  const belongsToMe = <T extends { rider_id: string }>(p: T): boolean =>
    myRiderIds.has(p.rider_id);

  const matchesSearch = <
    T extends { rider_name?: string | null; rider_id: string }
  >(
    p: T
  ): boolean => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const name = (p.rider_name || "").toLowerCase();
    const id = p.rider_id.toLowerCase();
    const vehicle = (riderVehicleMap.get(p.rider_id) || "").toLowerCase();
    return name.includes(q) || id.includes(q) || vehicle.includes(q);
  };

  const byDueAsc = <T extends { due_date?: string | null }>(a: T, b: T) =>
    new Date(a.due_date || 0).getTime() - new Date(b.due_date || 0).getTime();

  const myOverdue = useMemo(
    () =>
      (overduePayments || [])
        .filter(belongsToMe)
        .filter(matchesSearch)
        .slice()
        .sort(byDueAsc),
    [overduePayments, myRiderIds, search, riderVehicleMap]
  );

  const myUpcoming = useMemo(
    () =>
      (upcomingPayments || [])
        .filter(belongsToMe)
        .filter(matchesSearch)
        .slice()
        .sort(byDueAsc),
    [upcomingPayments, myRiderIds, search, riderVehicleMap]
  );

  const overdueTotal = useMemo(
    () => myOverdue.reduce((sum, p) => sum + (p.balance ?? p.amount_due ?? 0), 0),
    [myOverdue]
  );
  const upcomingTotal = useMemo(
    () => myUpcoming.reduce((sum, p) => sum + (p.amount_due ?? 0), 0),
    [myUpcoming]
  );

  const loading = ridersLoading || overdueLoading || upcomingLoading;
  const list = tab === "overdue" ? myOverdue : myUpcoming;

  return (
    <div
      className="min-h-screen pb-12"
      style={{ background: PAL.page, color: PAL.ink }}
    >
      <div className="max-w-md mx-auto">
        {/* Sticky header */}
        <div
          className="sticky top-0 z-10"
          style={{
            background: PAL.card,
            borderBottom: `1px solid ${PAL.hairline}`,
          }}
        >
          <div className="px-4 pt-3 pb-2 flex items-center justify-between">
            <div>
              <p
                className="text-[11px] font-bold uppercase tracking-[0.12em]"
                style={{ color: PAL.muted }}
              >
                Today's collections
              </p>
              <p
                className="text-[19px] font-semibold"
                style={{ color: PAL.ink, letterSpacing: "-0.01em" }}
              >
                {tl} · {myRiderIds.size} rider{myRiderIds.size === 1 ? "" : "s"}
              </p>
            </div>
            <div
              className="w-11 h-11 rounded-full font-semibold grid place-items-center text-base"
              style={{ background: PAL.ribbon, color: PAL.page }}
            >
              {tl[2]}
            </div>
          </div>

          <div className="px-4 pb-3">
            <div className="relative">
              <div
                className="absolute left-3 top-3"
                style={{ color: PAL.muted }}
              >
                <Search className="h-4 w-4" />
              </div>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search rider, ID or plate"
                className="w-full h-11 pl-10 pr-3 rounded-xl outline-none text-[15px]"
                style={{
                  background: PAL.page,
                  border: `1px solid ${PAL.hairline}`,
                  color: PAL.ink,
                }}
              />
            </div>
          </div>

          <div className="px-4 pb-3 flex gap-2">
            {[
              {
                id: "overdue" as const,
                label: "Overdue",
                n: myOverdue.length,
                t: overdueTotal,
                accent: PAL.overdue,
              },
              {
                id: "upcoming" as const,
                label: "Upcoming",
                n: myUpcoming.length,
                t: upcomingTotal,
                accent: PAL.upcoming,
              },
            ].map((entry) => {
              const active = tab === entry.id;
              return (
                <button
                  key={entry.id}
                  onClick={() => setTab(entry.id)}
                  className="flex-1 h-14 rounded-xl px-3 text-left transition"
                  style={
                    active
                      ? { background: PAL.ribbon, color: PAL.page }
                      : {
                          background: PAL.page,
                          color: PAL.ink,
                          border: `1px solid ${PAL.hairline}`,
                        }
                  }
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-semibold">
                      {entry.label}
                    </span>
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                      style={
                        active
                          ? {
                              background: "rgba(255,255,255,0.18)",
                              color: PAL.page,
                            }
                          : { background: entry.accent, color: "#fff" }
                      }
                    >
                      {entry.n}
                    </span>
                  </div>
                  <div className="text-base font-extrabold tabular-nums">
                    {fmtRupee(entry.t)}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* List */}
        <div className="p-4 space-y-3">
          {loading ? (
            <div
              className="text-center py-12"
              style={{ color: PAL.muted }}
            >
              Loading...
            </div>
          ) : list.length === 0 ? (
            <div className="text-center py-16">
              <div
                className="mx-auto mb-3 w-14 h-14 rounded-full grid place-items-center"
                style={{ background: PAL.emptyBg, color: PAL.empty }}
              >
                <Check className="h-7 w-7" strokeWidth={2.5} />
              </div>
              <p
                className="text-base font-semibold"
                style={{ color: PAL.ink }}
              >
                All clear
              </p>
              <p className="text-sm mt-1" style={{ color: PAL.muted }}>
                {tab === "overdue"
                  ? "No overdue riders"
                  : "Nothing due soon"}
              </p>
            </div>
          ) : (
            list.map((p) => {
              const phone =
                riderMap.get(p.rider_id)?.mobile_number ||
                riderMap.get(p.rider_id)?.phone ||
                null;
              const vehicle = riderVehicleMap.get(p.rider_id) || null;
              return (
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
                  balance={
                    "balance" in p ? (p.balance as number | undefined) : undefined
                  }
                  variant={tab}
                  phone={phone}
                  vehicle={vehicle}
                  onMarkAsPaid={openMarkAsPaid}
                />
              );
            })
          )}
        </div>
      </div>

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
  const accent = isOverdue ? PAL.overdue : PAL.upcoming;
  const accentBg = isOverdue ? PAL.overdueBg : PAL.upcomingBg;
  const accentInk = isOverdue ? PAL.overdueInk : PAL.upcomingInk;
  const days = daysFromToday(due_date);
  const daysText =
    days == null
      ? "No date"
      : isOverdue
      ? overdueLabel(Math.max(days, 1))
      : upcomingLabel(days);
  const amountToShow = balance ?? amount_due;
  const isPartial =
    isOverdue && balance != null && balance > 0 && balance < amount_due;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: PAL.card, border: `1px solid ${PAL.hairline}` }}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p
              className="text-[17px] font-semibold leading-tight truncate"
              style={{ color: PAL.ink, letterSpacing: "-0.01em" }}
            >
              {rider_name || "Unknown"}
            </p>
            <p className="text-xs mt-0.5" style={{ color: PAL.muted }}>
              {rider_id}
              {source === "rental_payments" && week_number
                ? ` · Week ${week_number}`
                : payment_id
                ? ` · ${payment_id}`
                : ""}
            </p>
          </div>
          <span
            className="flex-shrink-0 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wide"
            style={{ background: accentBg, color: accentInk }}
          >
            {daysText}
          </span>
        </div>

        {vehicle && (
          <div
            className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md"
            style={{
              border: `1.5px solid ${PAL.chipBorder}`,
              background: PAL.chipBg,
            }}
          >
            <span
              className="text-[9px] font-bold -mr-0.5"
              style={{ color: PAL.muted }}
            >
              IND
            </span>
            <span
              className="text-sm font-bold tracking-wider font-mono"
              style={{ color: PAL.ink }}
            >
              {vehicle}
            </span>
          </div>
        )}

        <div className="mt-4 flex items-end justify-between">
          <div>
            <p
              className="text-[11px] uppercase font-semibold tracking-wider"
              style={{ color: PAL.muted }}
            >
              {isPartial ? "Balance" : "To collect"}
            </p>
            <p
              className="text-[34px] font-extrabold tabular-nums leading-none mt-1"
              style={{ color: PAL.ink, letterSpacing: "-0.02em" }}
            >
              {fmtRupee(amountToShow)}
            </p>
            {isPartial && (
              <p className="text-[11px] mt-1" style={{ color: PAL.muted }}>
                of {fmtRupee(amount_due)} ·{" "}
                {fmtRupee(amount_due - amountToShow)} already paid
              </p>
            )}
          </div>
          {due_date && (
            <p className="text-[11px] pb-1" style={{ color: PAL.muted }}>
              Due {fmtDueDate(due_date)}
            </p>
          )}
        </div>
      </div>

      <div
        className="grid grid-cols-2"
        style={{ borderTop: `1px solid ${PAL.hairline}` }}
      >
        {phone ? (
          <a
            href={`tel:${phone}`}
            className="h-14 flex items-center justify-center gap-2 font-semibold active:opacity-70"
            style={{
              color: PAL.callInk,
              borderRight: `1px solid ${PAL.hairline}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Phone className="h-[18px] w-[18px]" /> Call
          </a>
        ) : (
          <div
            className="h-14 flex items-center justify-center text-sm"
            style={{
              color: PAL.muted,
              borderRight: `1px solid ${PAL.hairline}`,
            }}
          >
            No phone
          </div>
        )}
        <button
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
          className="h-14 flex items-center justify-center gap-2 font-bold active:opacity-85"
          style={{ background: accent, color: "#fff" }}
        >
          <Check className="h-[18px] w-[18px]" strokeWidth={2.5} /> Mark Paid
        </button>
      </div>
    </div>
  );
};

export default TLCollection;
