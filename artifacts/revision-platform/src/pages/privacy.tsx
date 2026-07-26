import { LegalPage } from "@/components/legal-page";

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy">
      <p>
        Scholr stores your account details, subject choices, study tasks, and revision progress so the
        workspace can function. We do not sell your data.
      </p>
      <h2>What we collect</h2>
      <ul>
        <li>Account information you provide at sign-up (name, email)</li>
        <li>Revision data you enter (subjects, tasks, past-paper scores, syllabus progress)</li>
        <li>Local preferences such as theme and notification settings stored in your browser</li>
      </ul>
      <h2>How we use it</h2>
      <p>
        Your data powers dashboard summaries, study plans, and progress views inside your workspace.
        Gamification metrics such as XP and achievements are calculated on your device from this data —
        they are estimates for motivation, not official grades.
      </p>
      <h2>Contact</h2>
      <p>
        Questions about this policy? Email{" "}
        <a href="mailto:privacy@scholr.app" className="text-primary hover:underline">
          privacy@scholr.app
        </a>
        .
      </p>
    </LegalPage>
  );
}
