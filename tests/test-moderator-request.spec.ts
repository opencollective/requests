import { test } from '@playwright/test';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  nip19,
  getPublicKey,
  finalizeEvent,
  verifyEvent,
  SimplePool,
} from 'nostr-tools';

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

// Store seed data and owner nsec for tests and cleanup
let seedData: SeedData | null = null;
let ownerNsec: string | null = null;

test.beforeEach(() => {
  // Load seed data before each test
  seedData = loadSeedData();
  const owner = seedData.users.find(user => user.role === 'owner');

  if (!owner) {
    throw new Error('No owner user found in seed data');
  }

  // Store owner nsec for cleanup
  ownerNsec = owner.nsec;
});

test.afterEach(async () => {
  // Cleanup: Delete all owner's kind 1111 events
  if (!ownerNsec) {
    return;
  }

  // Get owner's pubkey from nsec
  const decoded = nip19.decode(ownerNsec);
  if (decoded.type !== 'nsec') {
    // eslint-disable-next-line no-console
    console.error('Invalid nsec format in cleanup');
    return;
  }
  const secretKey =
    decoded.data instanceof Uint8Array
      ? decoded.data
      : new Uint8Array(decoded.data as number[]);
  const ownerPubkey = getPublicKey(secretKey);

  // Query for all kind 1111 events by the owner
  const relays = ['wss://relay.chorus.community', 'wss://nos.lol'];

  const pool = new SimplePool();

  try {
    // eslint-disable-next-line no-console
    console.log(`Querying for kind 1111 events by owner ${ownerPubkey}...`);
    const requestEvents = await pool.querySync(relays, {
      kinds: [1111],
      authors: [ownerPubkey],
      limit: 1000, // Adjust if you have more than 1000 events
    });

    // eslint-disable-next-line no-console
    console.log(`Found ${requestEvents.length} events to delete`);

    // Create and publish deletion events (kind 5) for each request
    for (const event of requestEvents) {
      const deletionEvent = {
        kind: 5,
        pubkey: ownerPubkey,
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
    console.log(`Cleanup complete: Deleted ${requestEvents.length} events`);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error during cleanup:', error);
    // Don't fail the test if cleanup fails
  } finally {
    pool.close(relays);
  }
});

test('test', async ({ page }) => {
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
