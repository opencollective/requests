#!/usr/bin/env node
/**
 * Seed data generation script for test data
 * Generates user data with name and nsec keys for automated testing
 */

import { generateSecretKey, nip19 } from 'nostr-tools';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

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

interface SeedData {
  users: UserSeedData[];
  community: CommunityConfig;
}

/**
 * Converts a secret key (Uint8Array) to nsec format (bech32 encoded)
 */
function secretKeyToNsec(secretKey: Uint8Array): string {
  return nip19.nsecEncode(secretKey);
}

/**
 * Generates seed data with test users and community configuration
 */
function generateSeedData(): SeedData {
  // Generate owner user
  const ownerSecretKey = generateSecretKey();
  const ownerNsec = secretKeyToNsec(ownerSecretKey);

  // Generate additional member users
  const member1SecretKey = generateSecretKey();
  const member1Nsec = secretKeyToNsec(member1SecretKey);

  const member2SecretKey = generateSecretKey();
  const member2Nsec = secretKeyToNsec(member2SecretKey);

  return {
    users: [
      {
        name: 'Test Community Owner',
        nsec: ownerNsec,
        role: 'owner',
      },
      {
        name: 'Test Member 1',
        nsec: member1Nsec,
        role: 'member',
      },
      {
        name: 'Test Member 2',
        nsec: member2Nsec,
        role: 'member',
      },
    ],
    community: {
      name: 'Test Community',
      identifier: 'test-community',
      description: 'A test community for automated testing',
    },
  };
}

/**
 * Main function to generate and save seed data
 */
function main() {
  const seedData = generateSeedData();
  const outputDir = join(__dirname, '..', 'tests', 'fixtures');
  const outputPath = join(outputDir, 'seed-data.json');

  // Create directory if it doesn't exist
  mkdirSync(outputDir, { recursive: true });

  // Write seed data to file
  writeFileSync(outputPath, JSON.stringify(seedData, null, 2), 'utf-8');

  console.log(`✅ Seed data generated successfully at: ${outputPath}`);
  console.log(`   - ${seedData.users.length} users generated`);
  console.log(
    `   - Community: ${seedData.community.name} (${seedData.community.identifier})`
  );
}

main();
