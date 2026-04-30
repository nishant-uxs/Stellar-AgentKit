/**
 * Claimable Balance Usage Example
 *
 * Demonstrates the three claimable-balance flows exposed by AgentKit:
 *   1. create  — lock funds with a (possibly composite) claim predicate
 *   2. list    — discover open claimable balances for a recipient
 *   3. claim   — release the locked funds to the recipient
 *
 * Use cases this enables for AI agents:
 *   - Conditional payouts (only pay if X happens before deadline)
 *   - Vesting / scheduled payments
 *   - Two-party escrow (either party can claim before / after deadline)
 *
 * ⚠️ TESTNET ONLY. Never use mainnet secrets in examples.
 *
 * Run with: ts-node examples/claimable-balance-example.ts
 */

import { AgentClient } from "../agent";
import { Keypair } from "@stellar/stellar-sdk";

async function exampleClaimableBalances() {
  console.log("🔒 Claimable Balance Example");
  console.log("=".repeat(60));

  const agent = new AgentClient({ network: "testnet" });

  // In real usage, source/recipient would be funded testnet accounts.
  const source = Keypair.random();
  const recipient = Keypair.random();

  console.log("\nGenerated test accounts:");
  console.log(`  Source:    ${source.publicKey()}`);
  console.log(`  Recipient: ${recipient.publicKey()}`);
  console.log(
    "\n⚠️  Fund these accounts on testnet before running for real:\n" +
      "    https://laboratory.stellar.org/#account-creator?network=test"
  );

  // ─── 1. Create ─────────────────────────────────────────────────────────
  // Lock 50 XLM for the recipient. Two layered conditions, expressed as a
  // composite predicate:
  //   - claimable for the next 24h (beforeRelativeTime: 86400s)
  //   - AND only after the configured "release time" has passed
  //     (i.e. NOT before that absolute timestamp)
  const releaseAtUnix = Math.floor(Date.now() / 1000) + 60; // 60s from now

  console.log("\nCreating claimable balance with composite predicate:");
  console.log(`  Amount:     50 XLM`);
  console.log(`  Window:     next 24h`);
  console.log(`  Earliest:   ${new Date(releaseAtUnix * 1000).toISOString()}`);

  const created = await agent.claimable.create({
    sourceSecret: source.secret(),
    asset: { code: "XLM" },
    amount: "50",
    claimants: [
      {
        destination: recipient.publicKey(),
        predicate: {
          type: "and",
          predicates: [
            { type: "beforeRelativeTime", seconds: 86400 },
            {
              type: "not",
              predicate: {
                type: "beforeAbsoluteTime",
                epochSeconds: releaseAtUnix,
              },
            },
          ],
        },
      },
    ],
  });

  console.log("\n✅ Created!");
  console.log(`  Tx hash:    ${created.transactionHash}`);
  console.log(`  Balance id: ${created.balanceIds[0]}`);

  // ─── 2. List ───────────────────────────────────────────────────────────
  console.log("\nListing open claimable balances for recipient...");
  const open = await agent.claimable.list({
    claimant: recipient.publicKey(),
  });
  console.log(`  Found ${open.length} balance(s).`);
  open.forEach((b) =>
    console.log(`    - ${b.id}  amount=${b.amount} asset=${b.asset}`)
  );

  // ─── 3. Claim ──────────────────────────────────────────────────────────
  // In a real flow you'd wait until the predicate is satisfied. Here we
  // demonstrate the call shape — Horizon will reject the claim with a
  // descriptive error if the predicate is not yet satisfied.
  console.log("\nAttempting to claim (will fail if predicate not yet satisfied)...");
  try {
    const claimed = await agent.claimable.claim({
      claimerSecret: recipient.secret(),
      balanceId: created.balanceIds[0],
    });
    console.log(`✅ Claimed! Tx hash: ${claimed.transactionHash}`);
  } catch (err) {
    console.log(
      `⏳ Not yet claimable (expected): ${(err as Error).message}\n` +
        `   Wait until ${new Date(releaseAtUnix * 1000).toISOString()} and retry.`
    );
  }
}

exampleClaimableBalances().catch((err) => {
  console.error("Example failed:", err);
  process.exit(1);
});
