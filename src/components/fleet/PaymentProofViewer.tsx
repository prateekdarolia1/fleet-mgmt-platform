import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, FileText, Image as ImageIcon, Paperclip } from "lucide-react";
import { formatDate } from "@/lib/dateUtils";
import { cleanUpiLast4 } from "@/lib/payments/display";

interface PaymentProofViewerProps {
  url: string | null | undefined;
  collectedBy?: string | null;
  collectedAt?: string | null;
  upiLast4?: string | null;
  riderName?: string | null;
  label?: string | null;
  /** When true, render compact icon button. When false, render text button. */
  compact?: boolean;
}

const isPdfUrl = (url: string) => url.toLowerCase().split("?")[0].endsWith(".pdf");

export const PaymentProofViewer = ({
  url,
  collectedBy,
  collectedAt,
  upiLast4,
  riderName,
  label,
  compact = true,
}: PaymentProofViewerProps) => {
  const [open, setOpen] = useState(false);

  if (!url) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }

  const isPdf = isPdfUrl(url);
  const upi = cleanUpiLast4(upiLast4);

  return (
    <>
      {compact ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          title="View payment proof"
          onClick={() => setOpen(true)}
        >
          {isPdf ? <FileText className="h-4 w-4 text-blue-600" /> : <ImageIcon className="h-4 w-4 text-blue-600" />}
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => setOpen(true)}
        >
          <Paperclip className="h-3.5 w-3.5" />
          View Proof
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Payment Proof
              {label && <Badge variant="outline">{label}</Badge>}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            {(riderName || collectedBy || collectedAt || upi) && (
              <div className="text-sm text-muted-foreground space-y-0.5">
                {riderName && <div><span className="font-medium text-foreground">Rider:</span> {riderName}</div>}
                {collectedBy && (
                  <div>
                    <span className="font-medium text-foreground">Collected by:</span>{" "}
                    <Badge variant="secondary" className="font-mono">{collectedBy}</Badge>
                  </div>
                )}
                {collectedAt && (
                  <div><span className="font-medium text-foreground">Collected on:</span> {formatDate(collectedAt)}</div>
                )}
                {upi && (
                  <div>
                    <span className="font-medium text-foreground">UPI:</span>{" "}
                    <span className="font-mono">••{upi}</span>
                  </div>
                )}
              </div>
            )}

            <div className="rounded-md border bg-muted/30 overflow-hidden">
              {isPdf ? (
                <div className="flex flex-col items-center justify-center py-12 px-6 gap-3">
                  <FileText className="h-12 w-12 text-red-500" />
                  <p className="text-sm text-muted-foreground">PDF receipt</p>
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" className="gap-1.5">
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open PDF
                    </Button>
                  </a>
                </div>
              ) : (
                <a href={url} target="_blank" rel="noopener noreferrer" className="block">
                  <img
                    src={url}
                    alt="Payment proof"
                    className="w-full max-h-[70vh] object-contain bg-white"
                  />
                </a>
              )}
            </div>

            <div className="flex justify-end">
              <a href={url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="gap-1.5">
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open in new tab
                </Button>
              </a>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
