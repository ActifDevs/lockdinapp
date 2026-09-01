import { BrandName } from "@/components/brand-name";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { IllustBooks } from "@/components/illustrations";

/**
 * Public self-registration is disabled for the controlled beta.
 * Invited participants receive an email invitation and set their password
 * via the invitation / update-password flow — not this page.
 */
export default function Signup() {
  return (
    <div className="grid min-h-[100dvh] lg:grid-cols-2">
      <aside className="auth-aside grain">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_20%,rgba(255,255,255,0.15),transparent_55%)]" />
        <div className="relative z-10 flex h-full flex-col justify-between p-10 text-primary-foreground">
          <Link href="/" className="font-bold tracking-tight">
            <BrandName />
          </Link>
          <div className="flex flex-1 flex-col items-center justify-center py-8">
            <IllustBooks onBrand className="w-full max-w-[18rem]" />
          </div>
          <div className="max-w-sm">
            <p className="text-3xl font-semibold leading-snug tracking-tight">
              Your A-Level workspace starts with your subjects.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-primary-foreground/75">
              Add syllabus units, log papers, and keep a daily plan that matches
              Cambridge structure.
            </p>
          </div>
        </div>
      </aside>

      <div className="relative flex flex-col justify-center bg-background px-4 py-12 sm:px-8">
        <Link
          href="/"
          className="absolute left-4 top-6 font-bold tracking-tight lg:hidden"
        >
          <BrandName />
        </Link>

        <div className="mx-auto w-full max-w-sm space-y-6">
          <div className="space-y-3">
            <h1 className="font-bold tracking-tight">Invitation only</h1>
            <p className="text-muted-foreground">
              This is a controlled beta. Registration is currently by invitation
              only.
            </p>
            <p className="text-sm text-muted-foreground">
              If you received an invitation email, open the link in that message
              to set your password and continue. Already set up? Sign in below.
            </p>
          </div>

          <Button asChild className="h-11 w-full cursor-pointer text-base">
            <Link href="/login">Sign in</Link>
          </Button>

          <p className="text-sm text-muted-foreground">
            Questions about access? See{" "}
            <Link
              href="/privacy"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Privacy
            </Link>{" "}
            or email{" "}
            <a
              href="mailto:privacy@lockdin.app"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              privacy@lockdin.app
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
