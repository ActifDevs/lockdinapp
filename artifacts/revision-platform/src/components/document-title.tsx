import { useEffect } from "react";
import { useLocation } from "wouter";

const APP_NAME = "Scholr";
const DEFAULT_TITLE = `${APP_NAME} — A-Level Revision Workspace`;

const ROUTE_TITLES: Array<{ match: (path: string) => boolean; title: string }> = [
  { match: (path) => path === "/", title: DEFAULT_TITLE },
  { match: (path) => path === "/login", title: `Log in · ${APP_NAME}` },
  { match: (path) => path === "/signup", title: `Sign up · ${APP_NAME}` },
  { match: (path) => path === "/forgot-password", title: `Reset password · ${APP_NAME}` },
  { match: (path) => path === "/onboarding", title: `Setup · ${APP_NAME}` },
  { match: (path) => path === "/dashboard", title: `Dashboard · ${APP_NAME}` },
  { match: (path) => path === "/study-plan", title: `Study plan · ${APP_NAME}` },
  { match: (path) => path === "/subjects", title: `Subjects · ${APP_NAME}` },
  { match: (path) => path.startsWith("/subjects/"), title: `Subject · ${APP_NAME}` },
  { match: (path) => path === "/past-papers", title: `Past papers · ${APP_NAME}` },
  { match: (path) => path === "/progress", title: `Progress · ${APP_NAME}` },
  { match: (path) => path === "/calendar", title: `Calendar · ${APP_NAME}` },
  { match: (path) => path === "/settings", title: `Settings · ${APP_NAME}` },
  { match: (path) => path === "/privacy", title: `Privacy · ${APP_NAME}` },
  { match: (path) => path === "/terms", title: `Terms · ${APP_NAME}` },
];

function titleForPath(path: string): string {
  const match = ROUTE_TITLES.find(({ match }) => match(path));
  return match?.title ?? DEFAULT_TITLE;
}

export function DocumentTitle() {
  const [location] = useLocation();

  useEffect(() => {
    document.title = titleForPath(location);
  }, [location]);

  return null;
}
