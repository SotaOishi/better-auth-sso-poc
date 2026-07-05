import { Hono } from "hono";
import type { OrganizationMembership } from "../auth.js";
import { auth } from "../auth.js";

const activeOrganizationRoutes = new Hono();

// App単位のローカルなactive組織を設定する。
// スナップショット（保持中の所属一覧）に含まれる組織IDのみ許可する。
activeOrganizationRoutes.post("/active-organization", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) {
    return c.redirect(`/?error=${encodeURIComponent("ログインが必要です")}`);
  }

  const body = await c.req.parseBody();
  const organizationId = typeof body.organizationId === "string" ? body.organizationId : "";

  const raw = (session.user as { organizations?: string | null }).organizations;
  let organizations: OrganizationMembership[] = [];
  if (raw) {
    try {
      organizations = JSON.parse(raw) as OrganizationMembership[];
    } catch {
      organizations = [];
    }
  }

  // スナップショットに含まれない組織IDは拒否する。
  const isMember = organizations.some((org) => org.id === organizationId);
  if (!isMember) {
    return c.redirect(`/?error=${encodeURIComponent("選択された組織には所属していません")}`);
  }

  const response = await auth.api.updateUser({
    headers: c.req.raw.headers,
    asResponse: true,
    body: { activeOrganizationId: organizationId },
  });

  const cookies = response.headers.getSetCookie();
  for (const cookie of cookies) {
    c.header("Set-Cookie", cookie, { append: true });
  }

  return c.redirect("/");
});

export { activeOrganizationRoutes };
