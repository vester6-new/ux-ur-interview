import App from "../../ux-interview-app";

export default async function ShortInterviewPage({ params }) {
  const { slug } = await params;
  return <App view="interview" slug={slug} />;
}
