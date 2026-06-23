import "dotenv/config";
import { auth } from "../auth.js";

async function seedOAuthClients() {
  console.log("Seeding OAuth clients...\n");

  // App Aのクライアント登録
  console.log("Creating App A client...");
  try {
    const appAClient = await auth.api.adminCreateOAuthClient({
      body: {
        client_name: "App A",
        redirect_uris: ["https://a.localtest.me:3001/api/auth/oauth2/callback/idp"],
      },
    });
    console.log("  Client ID:", appAClient.client_id);
    console.log("  Client Secret:", appAClient.client_secret);
    console.log("  Redirect URIs:", appAClient.redirect_uris);
    console.log("");
  } catch (error) {
    if (error instanceof Error && error.message?.includes("already exists")) {
      console.log("  App A client already exists, skipping...\n");
    } else {
      console.error("  Failed to create App A client:", error);
    }
  }

  // App Bのクライアント登録
  console.log("Creating App B client...");
  try {
    const appBClient = await auth.api.adminCreateOAuthClient({
      body: {
        client_name: "App B",
        redirect_uris: ["https://b.localtest.me:3002/api/auth/oauth2/callback/idp"],
      },
    });
    console.log("  Client ID:", appBClient.client_id);
    console.log("  Client Secret:", appBClient.client_secret);
    console.log("  Redirect URIs:", appBClient.redirect_uris);
    console.log("");
  } catch (error) {
    if (error instanceof Error && error.message?.includes("already exists")) {
      console.log("  App B client already exists, skipping...\n");
    } else {
      console.error("  Failed to create App B client:", error);
    }
  }

  console.log("OAuth clients seeded successfully!");
  console.log("\nIMPORTANT: Save the client IDs and secrets above.");
  console.log("Update your app-a and app-b .env files with these values.");
}

seedOAuthClients()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Failed to seed clients:", error);
    process.exit(1);
  });
