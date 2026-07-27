import { LegalPage } from "@/components/legal-page";

export default function TermsPage() {
  return (
    <LegalPage title="Terms of service">
      <p>
        By using Lockdin you agree to these terms. Lockdin is a revision planning tool for Cambridge
        A-Level students — not an exam board, school, or grading authority.
      </p>
      <h2>Your account</h2>
      <p>
        Keep your login credentials private. You are responsible for activity under your account.
      </p>
      <h2>Revision data</h2>
      <p>
        Predicted grades, XP, streaks, and achievement badges are illustrative estimates based on the
        information you log. They do not guarantee exam results.
      </p>
      <h2>Acceptable use</h2>
      <p>
        Do not attempt to disrupt the service, access other users&apos; data, or upload harmful content.
      </p>
      <h2>Changes</h2>
      <p>
        We may update these terms as Lockdin evolves. Continued use after changes means you accept the
        revised terms.
      </p>
    </LegalPage>
  );
}
