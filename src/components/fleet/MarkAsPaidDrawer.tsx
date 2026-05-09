import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Camera,
  FileText,
  Loader2,
  Paperclip,
  X,
} from "lucide-react";
import {
  getProofType,
  uploadPaymentProof,
  validateProofFile,
} from "@/lib/paymentProofs";
import {
  useMarkPaymentPaidWithProof,
  type CollectedBy,
  type PaymentMode,
  type PaymentSource,
} from "@/hooks/useMarkPaymentPaidWithProof";

export interface MarkAsPaidTarget {
  /** row UUID in the source table */
  payment_id: string;
  source: PaymentSource;
  rider_name: string | null;
  amount_due: number;
  label: string; // e.g. "Week 12" or "P001"
}

interface MarkAsPaidDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: MarkAsPaidTarget | null;
  collectedBy: CollectedBy;
  requireProof: boolean;
}

const PAYMENT_MODE_OPTIONS: { value: PaymentMode; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "bank-transfer", label: "Bank Transfer" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
];

const today = () => new Date().toISOString().split("T")[0];

export const MarkAsPaidDrawer = ({
  open,
  onOpenChange,
  target,
  collectedBy,
  requireProof,
}: MarkAsPaidDrawerProps) => {
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("cash");
  const [upiLast4, setUpiLast4] = useState("");
  const [paymentDate, setPaymentDate] = useState<string>(today());
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // TL mode: always UPI, no dropdown
  const isTL = requireProof;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const markPaid = useMarkPaymentPaidWithProof();

  // Reset form when drawer opens for a new target
  useEffect(() => {
    if (open) {
      setPaymentMode(isTL ? "upi" : "cash");
      setUpiLast4("");
      setPaymentDate(today());
      setNotes("");
      setFile(null);
      setPreviewUrl(null);
    }
  }, [open, target?.payment_id]);

  // Image preview URL lifecycle
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    if (getProofType(file) === "image") {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreviewUrl(null);
  }, [file]);

  const canSubmit = useMemo(() => {
    if (!target) return false;
    if (isSubmitting) return false;
    if (requireProof && !file) return false;
    if (isTL && upiLast4.trim().length !== 4) return false;
    if (!isTL && paymentMode === "upi" && upiLast4.trim().length !== 4) return false;
    return true;
  }, [target, isSubmitting, requireProof, file, isTL, paymentMode, upiLast4]);

  const handleFilePick = (picked: File | null) => {
    if (!picked) return;
    const v = validateProofFile(picked);
    if (!v.ok) {
      toast.error(v.error || "Invalid file");
      return;
    }
    setFile(picked);
  };

  const clearFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!target) return;
    setIsSubmitting(true);
    try {
      let screenshotUrl: string | null = null;
      if (file) {
        screenshotUrl = await uploadPaymentProof(file, target.payment_id);
      }

      await markPaid.mutateAsync({
        payment_id: target.payment_id,
        source: target.source,
        amount_due: target.amount_due,
        payment_mode: paymentMode,
        upi_last4: paymentMode === "upi" ? upiLast4.trim() : undefined,
        payment_date: paymentDate,
        notes: notes.trim() || undefined,
        screenshot_url: screenshotUrl,
        collected_by: collectedBy,
      });

      toast.success("Payment marked as paid");
      onOpenChange(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to mark payment";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92vh]">
        <div className="w-full max-w-2xl mx-auto flex flex-col overflow-hidden">
        <DrawerHeader className="text-left">
          {isTL ? (
            <>
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                Mark Paid
              </p>
              <DrawerTitle className="text-lg">
                {target?.rider_name || "Unknown"}
              </DrawerTitle>
              <DrawerDescription>
                {target ? `${target.label}` : "Record payment details"}
              </DrawerDescription>
            </>
          ) : (
            <>
              <DrawerTitle>Mark as Paid</DrawerTitle>
              <DrawerDescription>
                {target ? (
                  <>
                    {target.rider_name || "Unknown"} · {target.label} ·{" "}
                    <span className="font-semibold text-foreground">
                      ₹{target.amount_due.toLocaleString("en-IN")}
                    </span>
                  </>
                ) : (
                  "Record payment details"
                )}
              </DrawerDescription>
            </>
          )}
        </DrawerHeader>

        <div className="px-4 sm:px-6 pb-2 space-y-4 overflow-y-auto">
          {isTL ? (
            <div className="space-y-2">
              <Label>Amount</Label>
              <div className="h-16 px-4 flex items-center justify-between rounded-lg border bg-[#fafaf7] border-[#e8e3da]">
                <span className="text-[26px] font-extrabold tracking-tight tabular-nums text-[#1c1917]">
                  ₹{(target?.amount_due ?? 0).toLocaleString("en-IN")}
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#78716c]">
                  Full amount
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="payment-mode">Payment Mode</Label>
              <Select
                value={paymentMode}
                onValueChange={(v) => setPaymentMode(v as PaymentMode)}
              >
                <SelectTrigger id="payment-mode" className="h-11 text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_MODE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {(isTL || paymentMode === "upi") && (
            <div className="space-y-2">
              <Label htmlFor="upi-last4">
                UPI ref · last 4 digits{" "}
                <span className="text-red-600">*</span>
              </Label>
              <Input
                id="upi-last4"
                noSpaces
                value={upiLast4}
                onChange={(e) =>
                  setUpiLast4(
                    e.target.value
                      .replace(/[^a-zA-Z0-9]/g, "")
                      .slice(0, 4)
                      .toUpperCase()
                  )
                }
                placeholder="0000"
                maxLength={4}
                className={
                  isTL
                    ? "h-12 text-xl font-bold text-center tracking-[0.5em]"
                    : "h-11 text-base tracking-widest"
                }
              />
            </div>
          )}

          {!isTL && (
            <div className="space-y-2">
              <Label htmlFor="payment-date">Payment Date</Label>
              <Input
                id="payment-date"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                max={today()}
                className="h-11 text-base"
              />
            </div>
          )}

          {!isTL && (
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any reference number, remarks..."
                rows={2}
                className="text-base"
              />
            </div>
          )}

          {requireProof && (
            <div className="space-y-2">
              <Label>
                Payment Proof <span className="text-red-600">*</span>
              </Label>
              <p className="text-xs text-muted-foreground">
                Upload a photo of cash, UPI screenshot, or PDF receipt. Max 5MB.
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                capture="environment"
                className="hidden"
                onChange={(e) => handleFilePick(e.target.files?.[0] || null)}
              />

              {!file ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-14 border-dashed"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="h-5 w-5 mr-2" />
                  Take photo or upload file
                </Button>
              ) : (
                <div className="relative border rounded-lg overflow-hidden bg-gray-100">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Payment proof preview"
                      className="w-full max-h-64 object-contain bg-white"
                    />
                  ) : (
                    <div className="flex items-center gap-3 p-4">
                      <FileText className="h-8 w-8 text-red-500 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {(file.size / 1024).toFixed(0)} KB
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2 p-2 bg-white border-t">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-2"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Paperclip className="h-4 w-4" />
                      Replace
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={clearFile}
                    >
                      <X className="h-4 w-4" />
                      Remove
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DrawerFooter className="sm:px-6">
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={isTL ? "h-14 text-[17px] font-bold" : "h-12 text-base"}
          >
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isSubmitting
              ? "Saving..."
              : isTL && target
              ? `Confirm ₹${target.amount_due.toLocaleString("en-IN")}`
              : "Confirm Payment"}
          </Button>
          {!isTL && (
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="h-11"
            >
              Cancel
            </Button>
          )}
        </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
