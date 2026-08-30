import { LegalPage } from "@/components/legal-page";

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy">
      <p>
        Lockdin stores your account details, subject choices, study tasks, and revision progress so the
        workspace can function. We do not sell your data.
      </p>
      <h2>What we collect</h2>
      <ul>
        <li>Account information you provide at sign-up (name, email)</li>
        <li>Revision data you enter (subjects, tasks, past-paper scores, syllabus progress)</li>
        <li>Local preferences such as theme and notification settings stored in your browser</li>
      </ul>
      <h2>Product analytics</h2>
      <p>
        When analytics is configured, Lockdin uses PostHog (EU cloud) for a small set of custom product
        events so we can see whether people complete signup, onboarding, task creation, and past-paper
        logging. This is product analytics, not advertising. Automatic collection is turned off:
        no autocapture, no Session Replay, no heatmaps, and no advertising integrations. Events do not
        include email, name, username, task notes, syllabus text, or paper scores. Preview and Production
        use separate PostHog projects operationally.
      </p>
      <p>
        Analytics is optional for the product: if it is not configured, Lockdin still works. This page
        does not give legal advice. Questions about under-18 participants, lawful basis, and processor
        agreements remain for formal privacy review.
      </p>
      <h2>How we use it</h2>
      <p>
        Your data powers dashboard summaries, study plans, and progress views inside your workspace.
        Gamification metrics such as XP and achievements are calculated on your device from this data —
        they are estimates for motivation, not official grades.
      </p>
      <h2>Contact</h2>
      <p>
        Questions about this policy? Email{" "}
        <a href="mailto:privacy@lockdin.app" className="text-primary hover:underline">
          privacy@lockdin.app
        </a>
        .
      </p>
    </LegalPage>
  );
}
