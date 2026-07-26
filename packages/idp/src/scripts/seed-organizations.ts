import "dotenv/config";
import { and, eq } from "drizzle-orm";
import { auth } from "../auth.js";
import { db } from "../db/index.js";
import { member, organization, user } from "../db/schema.js";

type SeedUser = { name: string; email: string; password: string };

const SEED_USERS: Record<string, SeedUser> = {
  alice: { name: "Alice", email: "alice@example.com", password: "password1234" },
  bob: { name: "Bob", email: "bob@example.com", password: "password1234" },
};

const SEED_ORGS = [
  { slug: "acme", name: "Acme" },
  { slug: "globex", name: "Globex" },
  { slug: "initech", name: "Initech" },
];

type Role = "owner" | "admin" | "member";

// alice は複数組織に異なるロールで所属（multi-membership）、bob は単一所属の対照例。
const MEMBERSHIPS: { orgSlug: string; userKey: keyof typeof SEED_USERS; role: Role }[] = [
  { orgSlug: "acme", userKey: "alice", role: "owner" },
  { orgSlug: "globex", userKey: "alice", role: "admin" },
  { orgSlug: "initech", userKey: "alice", role: "member" },
  { orgSlug: "acme", userKey: "bob", role: "member" },
];

async function ensureUser(u: SeedUser): Promise<string> {
  const existing = await db.select().from(user).where(eq(user.email, u.email));
  if (existing.length > 0) {
    console.log(`  user ${u.email} already exists, skipping`);
    return existing[0].id;
  }
  await auth.api.signUpEmail({
    body: { name: u.name, email: u.email, password: u.password },
  });
  const created = await db.select().from(user).where(eq(user.email, u.email));
  console.log(`  created user ${u.email}`);
  return created[0].id;
}

// createOrganization は作成者(ownerId)を owner メンバーとして自動登録する。
async function ensureOrg(slug: string, name: string, ownerId: string): Promise<string> {
  const existing = await db.select().from(organization).where(eq(organization.slug, slug));
  if (existing.length > 0) {
    console.log(`  org ${slug} already exists, skipping`);
    return existing[0].id;
  }
  const result = await auth.api.createOrganization({
    body: { name, slug, userId: ownerId },
  });
  if (!result) {
    throw new Error(`Failed to create organization ${slug}`);
  }
  console.log(`  created org ${slug}`);
  return result.id;
}

// 既存メンバーシップがあればロールを目的の値へ更新、なければ追加（冪等）。
async function ensureMembership(orgId: string, userId: string, role: Role): Promise<void> {
  const existing = await db
    .select()
    .from(member)
    .where(and(eq(member.organizationId, orgId), eq(member.userId, userId)));
  if (existing.length > 0) {
    if (existing[0].role !== role) {
      await db.update(member).set({ role }).where(eq(member.id, existing[0].id));
      console.log(`  updated membership ${userId}@${orgId} -> ${role}`);
    }
    return;
  }
  await auth.api.addMember({ body: { userId, organizationId: orgId, role } });
  console.log(`  added membership ${userId}@${orgId} (${role})`);
}

async function seedOrganizations() {
  console.log("Seeding organizations and memberships...\n");

  console.log("Creating users...");
  const userIds: Record<string, string> = {};
  for (const [key, u] of Object.entries(SEED_USERS)) {
    userIds[key] = await ensureUser(u);
  }

  console.log("\nCreating organizations...");
  const aliceId = userIds.alice;
  const orgIds: Record<string, string> = {};
  for (const org of SEED_ORGS) {
    // ownerId は作成者。後段のメンバーシップ調整で alice のロールを目的値へ更新する。
    orgIds[org.slug] = await ensureOrg(org.slug, org.name, aliceId);
  }

  console.log("\nAssigning memberships...");
  for (const m of MEMBERSHIPS) {
    await ensureMembership(orgIds[m.orgSlug], userIds[m.userKey], m.role);
  }

  console.log("\nOrganizations seeded successfully!");
  console.log("\nSeeded users (password: password1234):");
  console.log("  alice@example.com -> Acme(owner) / Globex(admin) / Initech(member)");
  console.log("  bob@example.com   -> Acme(member)");
}

seedOrganizations()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Failed to seed organizations:", error);
    process.exit(1);
  });
