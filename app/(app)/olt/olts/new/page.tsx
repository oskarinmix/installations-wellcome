import Link from "next/link";
import { OltForm } from "../_form";
import { ArrowLeft } from "lucide-react";

export default function NewOltPage() {
  return (
    <div className="space-y-6 max-w-sm">
      <div>
        <Link
          href="/olt/olts"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="size-3" />
          Back to OLTs
        </Link>
        <h2 className="text-xl font-semibold">Add OLT</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Configure SSH connection to your fiber OLT device</p>
      </div>
      <OltForm />
    </div>
  );
}
