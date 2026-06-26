export type CockpitActionResponse = {
  ok: boolean;
  label: string;
  actionId?: string;
  status?: string;
};

export async function postCockpitAction(
  slug: string,
  actionId: string,
  status: "approved" | "done" | "rejected",
): Promise<CockpitActionResponse> {
  const res = await fetch(`/api/sites/${slug}/actions`, {
    method: "POST",
    headers: { Accept: "application/json" },
    body: new URLSearchParams({ actionId, status }),
  });
  return (await res.json()) as CockpitActionResponse;
}

/** Run async work then restore scroll after Next.js refresh. */
export async function withScrollPreserved(run: () => Promise<void>): Promise<void> {
  const scrollY = window.scrollY;
  await run();
  requestAnimationFrame(() => {
    window.scrollTo({ top: scrollY, left: 0, behavior: "instant" });
  });
}
