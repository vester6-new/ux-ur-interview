import App from "../../../ux-interview-app";

export default async function InterviewPage({ params }) {
  const { slug } = await params;
  return <App view="interview" slug={slug} />;
}
