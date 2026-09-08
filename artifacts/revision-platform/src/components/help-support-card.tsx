import { Check, ExternalLink, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function HelpSupportCard({
  supportFormUrl,
}: {
  supportFormUrl?: string;
}) {
  const configuredSupportFormUrl = supportFormUrl?.trim();

  return (
    <Card className="dash-stat-card card-tint-cream overflow-hidden border-0 shadow-[var(--elev-2)]">
      <CardHeader className="bg-muted/15 pb-5">
        <CardTitle className="flex items-center gap-2 text-xl font-bold tracking-[-0.01em]">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <HelpCircle className="h-4 w-4" aria-hidden strokeWidth={2} />
          </span>
          Help &amp; Support
        </CardTitle>
        <CardDescription className="max-w-prose">
          Get help, report bugs, give feedback, or request account deletion.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            As a beta participant, you can use our support form to:
          </p>
          <ul className="space-y-2 text-sm">
            {[
              "Ask for help using Lockdin",
              "Report a bug or issue",
              "Give feedback or suggestions",
              "Request privacy/account deletion",
            ].map((purpose) => (
              <li key={purpose} className="flex items-start gap-2">
                <Check
                  className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                  aria-hidden
                />
                <span>{purpose}</span>
              </li>
            ))}
          </ul>
          {configuredSupportFormUrl ? (
            <Button asChild className="w-full sm:w-auto">
              <a
                href={configuredSupportFormUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open support form
                <ExternalLink className="h-4 w-4" aria-hidden />
              </a>
            </Button>
          ) : (
            <div className="rounded-lg border border-border/50 bg-muted/30 p-4">
              <p className="text-sm text-muted-foreground">
                The beta support form is temporarily unavailable. Please try
                again later.
              </p>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            For privacy or account deletion requests, you can also email{" "}
            <a
              href="mailto:privacy@lockdin.app"
              className="text-primary hover:underline"
            >
              privacy@lockdin.app
            </a>
            .
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
