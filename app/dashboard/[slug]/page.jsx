import App from "../../../ux-interview-app";

export default async function InterviewDashboardPage({ params }) {
  const { slug } = await params;
  return <App view="interviewDashboard" slug={slug} />;
}
