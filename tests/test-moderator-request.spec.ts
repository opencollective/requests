import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import WebSocket from 'ws';
import {
  nip19,
  getPublicKey,
  finalizeEvent,
  verifyEvent,
  SimplePool,
  type UnsignedEvent,
} from 'nostr-tools';

const nodeWebSocket = WebSocket as unknown as typeof globalThis.WebSocket;
if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = nodeWebSocket;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface UserSeedData {
  name: string;
  nsec: string;
  role?: 'owner' | 'member';
}

interface CommunityConfig {
  name: string;
  identifier: string;
  description: string;
}

interface CommunityInfo {
  id: string;
  aTag: string;
  pubkey: string;
  identifier: string;
  eventId: string;
}

interface SeedData {
  users: UserSeedData[];
  community: CommunityConfig;
  communityInfo?: CommunityInfo;
}

function loadSeedData(): SeedData {
  const seedDataPath = join(__dirname, 'fixtures', 'seed-data.json');
  const fileContent = readFileSync(seedDataPath, 'utf-8');
  return JSON.parse(fileContent) as SeedData;
}

// Test relays to publish to
const TEST_RELAYS = ['wss://relay.chorus.community', 'wss://nos.lol'];

/**
 * Converts nsec (bech32) to secret key (Uint8Array)
 */
function nsecToSecretKey(nsec: string): Uint8Array {
  const decoded = nip19.decode(nsec);
  if (decoded.type !== 'nsec') {
    throw new Error('Invalid nsec format');
  }
  return decoded.data;
}

/**
 * Creates a NIP-72 community definition event (kind 34550)
 */
function createCommunityDefinitionEvent(
  community: CommunityConfig,
  ownerPubkey: string
): UnsignedEvent {
  const tags: string[][] = [
    ['d', community.identifier],
    ['name', community.name],
    ['description', community.description],
    ['p', ownerPubkey, '', 'moderator'], // Owner as moderator
  ];

  // Add relay tags
  TEST_RELAYS.forEach(relay => {
    tags.push(['relay', relay]);
  });

  return {
    kind: 34550,
    pubkey: ownerPubkey,
    created_at: Math.floor(Date.now() / 1000),
    tags,
    content: '',
  };
}

// Store seed data and user nsecs for tests and cleanup
let seedData: SeedData | null = null;
let ownerNsec: string | null = null;
let memberNsec: string | null = null;

test.beforeEach(async () => {
  // Load seed data before each test
  seedData = loadSeedData();
  const owner = seedData.users.find(user => user.role === 'owner');
  const member = seedData.users.find(user => user.name === 'Test Member 1');

  if (!owner) {
    throw new Error('No owner user found in seed data');
  }

  // Store user nsecs for cleanup
  ownerNsec = owner.nsec;
  memberNsec = member?.nsec || null;

  // Create and publish community definition event
  const ownerSecretKey = nsecToSecretKey(owner.nsec);
  const ownerPubkey = getPublicKey(ownerSecretKey);

  const unsignedEvent = createCommunityDefinitionEvent(
    seedData.community,
    ownerPubkey
  );

  const signedEvent = finalizeEvent(unsignedEvent, ownerSecretKey);

  // Publish to relays
  const pool = new SimplePool();
  try {
    await Promise.all(pool.publish(TEST_RELAYS, signedEvent));
    // eslint-disable-next-line no-console
    console.log(
      `Published community definition event: ${signedEvent.id} for community ${seedData.community.name}`
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error publishing community definition event:', error);
    throw error;
  } finally {
    pool.close(TEST_RELAYS);
  }
});

async function cleanupUserEvents(
  nsec: string,
  userName: string,
  pool: SimplePool,
  relays: string[]
): Promise<void> {
  // Get user's pubkey from nsec
  const decoded = nip19.decode(nsec);
  if (decoded.type !== 'nsec') {
    // eslint-disable-next-line no-console
    console.error(`Invalid nsec format in cleanup for ${userName}`);
    return;
  }
  const secretKey =
    decoded.data instanceof Uint8Array
      ? decoded.data
      : new Uint8Array(decoded.data as number[]);
  const userPubkey = getPublicKey(secretKey);

  try {
    // eslint-disable-next-line no-console
    console.log(
      `Querying for kind 1111/4552 events by ${userName} ${userPubkey}...`
    );
    const requestEvents = await pool.querySync(relays, {
      kinds: [1111, 4552],
      authors: [userPubkey],
      limit: 1000, // Adjust if you have more than 1000 events
    });

    // eslint-disable-next-line no-console
    console.log(
      `Found ${requestEvents.length} events to delete for ${userName}`
    );

    // Create and publish deletion events (kind 5) for each request
    for (const event of requestEvents) {
      const deletionEvent = {
        kind: 5,
        pubkey: userPubkey,
        created_at: Math.floor(Date.now() / 1000),
        tags: [['e', event.id]],
        content: '',
      };

      const signedDeletionEvent = finalizeEvent(deletionEvent, secretKey);

      if (verifyEvent(signedDeletionEvent)) {
        await Promise.all(pool.publish(relays, signedDeletionEvent));
        // eslint-disable-next-line no-console
        console.log(`Published deletion event for ${event.id}`);
        // Small delay between deletions to avoid overwhelming relays
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    // eslint-disable-next-line no-console
    console.log(
      `Cleanup complete for ${userName}: Deleted ${requestEvents.length} events`
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Error during cleanup for ${userName}:`, error);
    // Don't fail the test if cleanup fails
  }
}

test.afterEach(async () => {
  const relays = ['wss://relay.chorus.community', 'wss://nos.lol'];
  const pool = new SimplePool();

  try {
    // Cleanup owner events
    if (ownerNsec) {
      await cleanupUserEvents(ownerNsec, 'owner', pool, relays);
    }

    // Cleanup member events
    if (memberNsec) {
      await cleanupUserEvents(memberNsec, 'Team Member 1', pool, relays);
    }
  } finally {
    pool.close(relays);
  }
});

test('moderator request', async ({ page }) => {
  if (!seedData) {
    throw new Error('Seed data not loaded');
  }

  const owner = seedData.users.find(user => user.role === 'owner');

  if (!owner) {
    throw new Error('No owner user found in seed data');
  }

  // Get community ID - use communityInfo.id if available, otherwise construct it
  let communityId: string;
  if (seedData.communityInfo?.id) {
    communityId = seedData.communityInfo.id;
  } else if (seedData.communityInfo?.pubkey) {
    communityId = `${seedData.communityInfo.pubkey}:${seedData.communityInfo.identifier}`;
  } else {
    throw new Error(
      'Community info not found in seed data. Run pnpm test:setup first.'
    );
  }

  // Build community URL (encode the colon) - uses baseURL from playwright.config.ts
  const communityUrl = `/community/${encodeURIComponent(communityId)}`;

  await page.goto(communityUrl);
  await page.getByRole('button', { name: 'Log In' }).click();
  await page.getByRole('button', { name: 'Advanced options' }).click();
  await page.getByRole('textbox', { name: 'Nostr Secret Key (nsec)' }).click();

  await page
    .getByRole('textbox', { name: 'Nostr Secret Key (nsec)' })
    .fill(owner.nsec);
  await page.getByRole('button', { name: 'Use nsec' }).click();
  await page.goto(communityUrl);
  await page.getByRole('button', { name: 'New Request' }).click();
  await page.getByRole('textbox', { name: 'Subject' }).click();
  await page.getByRole('textbox', { name: 'Subject' }).fill('Owner post');
  await page.getByRole('textbox', { name: 'What would you like to' }).click();
  await page
    .getByRole('textbox', { name: 'What would you like to' })
    .fill('owned post');
  await page.getByRole('button', { name: 'Send' }).click();
  await page.getByRole('button', { name: '← Back to Dashboard' }).click();
  await page.getByRole('heading', { name: 'Owner post' }).click();
  await page.getByRole('combobox').selectOption('in-progress');
  await page.getByRole('button', { name: '← Back to Dashboard' }).click();
});

test('request to become a moderator', async ({ browser }) => {
  if (!seedData) {
    throw new Error('Seed data not loaded');
  }

  const owner = seedData.users.find(user => user.role === 'owner');
  const teamMember1 = seedData.users.find(
    user => user.name === 'Test Member 1'
  );

  if (!owner) {
    throw new Error('No owner user found in seed data');
  }

  if (!teamMember1) {
    throw new Error('Team Member 1 not found in seed data');
  }

  // Get community ID - use communityInfo.id if available, otherwise construct it
  let communityId: string;
  if (seedData.communityInfo?.id) {
    communityId = seedData.communityInfo.id;
  } else if (seedData.communityInfo?.pubkey) {
    communityId = `${seedData.communityInfo.pubkey}:${seedData.communityInfo.identifier}`;
  } else {
    throw new Error(
      'Community info not found in seed data. Run pnpm test:setup first.'
    );
  }

  // Build community URL (encode the colon) - uses baseURL from playwright.config.ts
  const communityUrl = `/community/${encodeURIComponent(communityId)}`;

  // Create two separate browser contexts
  const ownerContext = await browser.newContext();
  const teamMemberContext = await browser.newContext();

  const ownerPage = await ownerContext.newPage();
  const teamMemberPage = await teamMemberContext.newPage();

  // Owner actions
  await ownerPage.goto(communityUrl);
  await ownerPage.getByRole('button', { name: 'Log In' }).click();
  await ownerPage.getByRole('button', { name: 'Advanced options' }).click();
  await ownerPage
    .getByRole('textbox', { name: 'Nostr Secret Key (nsec)' })
    .click();
  await ownerPage
    .getByRole('textbox', { name: 'Nostr Secret Key (nsec)' })
    .fill(owner.nsec);
  await ownerPage.getByRole('button', { name: 'Use nsec' }).click();
  await ownerPage.goto(communityUrl);

  // Team Member 1 actions - go to home page
  await teamMemberPage.goto(communityUrl);
  await teamMemberPage.getByRole('button', { name: 'Log In' }).click();
  await teamMemberPage
    .getByRole('button', { name: 'Advanced options' })
    .click();
  await teamMemberPage
    .getByRole('textbox', { name: 'Nostr Secret Key (nsec)' })
    .click();
  await teamMemberPage
    .getByRole('textbox', { name: 'Nostr Secret Key (nsec)' })
    .fill(teamMember1.nsec);
  await teamMemberPage.getByRole('button', { name: 'Use nsec' }).click();
  await teamMemberPage.goto(communityUrl);

  await teamMemberPage.getByRole('button', { name: 'Expand' }).click();
  await teamMemberPage
    .getByRole('button', { name: 'Collapse' })
    .press('ControlOrMeta+`');
  await teamMemberPage
    .getByRole('button', { name: 'Collapse' })
    .press('ControlOrMeta+`');
  const requestModeratorButton = teamMemberPage.getByRole('button', {
    name: 'Request to be Moderator',
  });

  await expect(requestModeratorButton).toBeVisible({ timeout: 15000 });
  await expect(requestModeratorButton).toBeEnabled();
  await requestModeratorButton.click();
  await teamMemberPage
    .getByRole('textbox', { name: 'Message (optional)' })
    .click();
  await teamMemberPage
    .getByRole('textbox', { name: 'Message (optional)' })
    .fill('Please make me a moderator');
  await teamMemberPage.getByRole('button', { name: 'Send Request' }).click();

  await ownerPage.getByRole('button', { name: 'Expand' }).click();
  await ownerPage.goto(
    'http://localhost:5173/community/f12f8dfa437a2700befb5ee936bd0236b6d89cb72698f39bb24624de2969ce60%3Atest-community'
  );
  await expect(ownerPage.getByRole('button', { name: 'Expand' })).toBeVisible();
  await ownerPage.getByRole('button', { name: 'Expand' }).click();
  await ownerPage.getByRole('button', { name: 'Accept' }).click();
  await ownerPage.getByRole('button', { name: 'Expand' }).click();
  await expect(
    ownerPage.getByRole('button', { name: 'Collapse' })
  ).toBeVisible();
  // Cleanup contexts
  await ownerContext.close();
  await teamMemberContext.close();
});
