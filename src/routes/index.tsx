import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Projeto inicial" },
      { name: "description", content: "Projeto inicial" },
      { property: "og:title", content: "Projeto inicial" },
      { property: "og:description", content: "Projeto inicial" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  return <h1>Projeto inicial</h1>;
}
