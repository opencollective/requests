#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Setup script to create a test community using seed data
 * Reads seed data and publishes a NIP-72 community definition event
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  finalizeEvent,
  getPublicKey,
  SimplePool,
  type UnsignedEvent,
  nip19,
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

// Test relays to publish to
const TEST_RELAYS = ['wss://relay.chorus.community', 'wss://nos.lol'];

/**
 * Loads seed data from the fixtures directory
 */
function loadSeedData(): SeedData {
  const seedDataPath = join(
    __dirname,
    '..',
    'tests',
    'fixtures',
    'seed-data.json'
  );
  try {
    const fileContent = readFileSync(seedDataPath, 'utf-8');
    return JSON.parse(fileContent) as SeedData;
  } catch (error) {
    console.error(`Failed to load seed data from ${seedDataPath}:`, error);
    throw error;
  }
}

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

/**
 * Main function to setup the test community
 */
async function main() {
  console.log('Loading seed data...');
  const seedData = loadSeedData();

  // Find owner user
  const owner = seedData.users.find(user => user.role === 'owner');
  if (!owner) {
    throw new Error('No owner user found in seed data');
  }

  console.log(`Found owner: ${owner.name}`);

  // Convert nsec to secret key
  const ownerSecretKey = nsecToSecretKey(owner.nsec);
  const ownerPubkey = getPublicKey(ownerSecretKey);

  console.log(`Owner pubkey: ${ownerPubkey}`);

  // Create community definition event
  const unsignedEvent = createCommunityDefinitionEvent(
    seedData.community,
    ownerPubkey
  );

  // Sign the event
  const signedEvent = finalizeEvent(unsignedEvent, ownerSecretKey);

  console.log(`Created community event with ID: ${signedEvent.id}`);
  console.log(
    `Community: ${seedData.community.name} (${seedData.community.identifier})`
  );

  // Publish to relays
  console.log('Publishing to relays...');
  const pool = new SimplePool();

  try {
    const publishPromises = TEST_RELAYS.map(async relay => {
      try {
        await pool.publish([relay], signedEvent);
        console.log(`  ✅ Published to ${relay}`);
        return { relay, success: true };
      } catch (error) {
        console.error(`  ❌ Failed to publish to ${relay}:`, error);
        return { relay, success: false, error };
      }
    });

    // Wait for all publish operations to complete (settled, not just resolved)
    await Promise.allSettled(publishPromises);

    // Wait a bit for connections to settle before closing
    await new Promise(resolve => setTimeout(resolve, 1000));
  } catch (error) {
    console.error('Error during publishing:', error);
  } finally {
    // Close all connections
    try {
      pool.close(TEST_RELAYS);
      // Wait a bit more to ensure cleanup completes
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      // Ignore errors during cleanup
      console.error('Error during pool cleanup (ignored):', error);
    }
  }

  // Save community information back to seed data file
  const communityId = `${ownerPubkey}:${seedData.community.identifier}`;
  const communityATag = `34550:${ownerPubkey}:${seedData.community.identifier}`;

  const communityInfo: CommunityInfo = {
    id: communityId,
    aTag: communityATag,
    pubkey: ownerPubkey,
    identifier: seedData.community.identifier,
    eventId: signedEvent.id,
  };

  // Update seed data with community info
  const updatedSeedData: SeedData = {
    ...seedData,
    communityInfo,
  };

  // Write updated seed data back to file
  const seedDataPath = join(
    __dirname,
    '..',
    'tests',
    'fixtures',
    'seed-data.json'
  );
  writeFileSync(
    seedDataPath,
    JSON.stringify(updatedSeedData, null, 2),
    'utf-8'
  );

  console.log('\n✅ Community setup complete!');
  console.log(`Community ID: ${communityId}`);
  console.log(`Community A Tag: ${communityATag}`);
  console.log(`Community info saved to: ${seedDataPath}`);
}

main().catch(error => {
  console.error('Error setting up test community:', error);
  process.exit(1);
});
