import { createFileRoute, redirect } from "@tanstack/react-router";
import { getMe } from "@/lib/ldr.functions";
import { Dashboard } from "@/components/Dashboard";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const { who } = await getMe();
    if (!who) throw redirect({ to: "/unlock" });
  },
  head: () => ({
    meta: [
      { title: "Iru & Рахат — JustUs 💞" },
      { name: "description", content: "Weather, moods, sticky notes, hearts and a countdown: Paris ↔ Aktobe." },
      { property: "og:title", content: "Iru & Рахат — JustUs 💞" },
      { property: "og:description", content: "Our little long-distance dashboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});
