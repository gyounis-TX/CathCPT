// ICD-10 Usage Tracking Service
// Tracks usage patterns to intelligently rank frequently-used codes higher

import { logger } from './logger';
import { ICD10Code, icd10Codes, getCodesByCluster } from '../data/icd10Codes';

const ICD10_USAGE_KEY = 'icd10_usage_tracking';

export interface ICD10Usage {
  code: string;
  useCount: number;
  lastUsed: string; // ISO date string
}

// Weight factors for ranking algorithm
const RECENCY_WEIGHT = 0.4;
const FREQUENCY_WEIGHT = 0.6;
const RECENCY_DECAY_DAYS = 30; // Codes used within 30 days get full recency bonus

// Get all usage data
export async function getUsageData(): Promise<ICD10Usage[]> {
  try {
    const { value } = await window.storage.get(ICD10_USAGE_KEY);
    if (value) {
      return JSON.parse(value) as ICD10Usage[];
    }
    return [];
  } catch (error) {
    logger.error('Error loading ICD-10 usage data', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

// Save usage data
async function saveUsageData(data: ICD10Usage[]): Promise<void> {
  try {
    await window.storage.set(ICD10_USAGE_KEY, JSON.stringify(data));
  } catch (error) {
    logger.error('Error saving ICD-10 usage data', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

// Record usage of a code
export async function recordCodeUsage(code: string): Promise<void> {
  const usage = await getUsageData();
  const existing = usage.find(u => u.code === code);
  const now = new Date().toISOString();

  if (existing) {
    existing.useCount += 1;
    existing.lastUsed = now;
  } else {
    usage.push({
      code,
      useCount: 1,
      lastUsed: now
    });
  }

  await saveUsageData(usage);
}

// Record usage of multiple codes at once
export async function recordMultipleCodeUsage(codes: string[]): Promise<void> {
  const usage = await getUsageData();
  const now = new Date().toISOString();

  for (const code of codes) {
    const existing = usage.find(u => u.code === code);
    if (existing) {
      existing.useCount += 1;
      existing.lastUsed = now;
    } else {
      usage.push({
        code,
        useCount: 1,
        lastUsed: now
      });
    }
  }

  await saveUsageData(usage);
}

// Calculate ranking score for a code
function calculateScore(usage: ICD10Usage | undefined, maxUseCount: number): number {
  if (!usage) {
    return 0;
  }

  // Frequency score: normalize by max use count
  const frequencyScore = maxUseCount > 0 ? usage.useCount / maxUseCount : 0;

  // Recency score: decay based on days since last use
  const daysSinceUse = Math.floor(
    (Date.now() - new Date(usage.lastUsed).getTime()) / (1000 * 60 * 60 * 24)
  );
  const recencyScore = Math.max(0, 1 - daysSinceUse / RECENCY_DECAY_DAYS);

  // Combined weighted score
  return FREQUENCY_WEIGHT * frequencyScore + RECENCY_WEIGHT * recencyScore;
}

// Rank codes by usage
export async function rankCodesByUsage(codes: ICD10Code[]): Promise<ICD10Code[]> {
  const usage = await getUsageData();

  if (usage.length === 0) {
    // No usage data, return original order
    return codes;
  }

  // Find max use count for normalization
  const maxUseCount = Math.max(...usage.map(u => u.useCount));

  // Create a map for quick lookup
  const usageMap = new Map(usage.map(u => [u.code, u]));

  // Sort by score descending, then by original order for ties
  return [...codes].sort((a, b) => {
    const scoreA = calculateScore(usageMap.get(a.code), maxUseCount);
    const scoreB = calculateScore(usageMap.get(b.code), maxUseCount);

    if (scoreB !== scoreA) {
      return scoreB - scoreA;
    }

    // Preserve original order for ties (codes with no usage)
    return codes.indexOf(a) - codes.indexOf(b);
  });
}

// Rank codes within each cluster
export async function rankCodesByCluster(): Promise<{
  primary: ICD10Code[];
  comorbid: ICD10Code[];
  postProcedure: ICD10Code[];
}> {
  const primaryCodes = getCodesByCluster('primary');
  const comorbidCodes = getCodesByCluster('comorbid');
  const postProcedureCodes = getCodesByCluster('postProcedure');

  const [rankedPrimary, rankedComorbid, rankedPostProcedure] = await Promise.all([
    rankCodesByUsage(primaryCodes),
    rankCodesByUsage(comorbidCodes),
    rankCodesByUsage(postProcedureCodes)
  ]);

  return {
    primary: rankedPrimary,
    comorbid: rankedComorbid,
    postProcedure: rankedPostProcedure
  };
}

// Get top N most used codes
export async function getTopUsedCodes(n: number = 10): Promise<ICD10Code[]> {
  const usage = await getUsageData();

  if (usage.length === 0) {
    return [];
  }

  // Sort by use count descending
  const sortedUsage = [...usage].sort((a, b) => b.useCount - a.useCount);
  const topCodes = sortedUsage.slice(0, n).map(u => u.code);

  // Map to ICD10Code objects
  return topCodes
    .map(code => icd10Codes.find(c => c.code === code))
    .filter((c): c is ICD10Code => c !== undefined);
}

// Get recently used codes
export async function getRecentlyUsedCodes(days: number = 7): Promise<ICD10Code[]> {
  const usage = await getUsageData();
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

  const recentUsage = usage
    .filter(u => new Date(u.lastUsed).getTime() > cutoff)
    .sort((a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime());

  return recentUsage
    .map(u => icd10Codes.find(c => c.code === u.code))
    .filter((c): c is ICD10Code => c !== undefined);
}

// Clear all usage data
export async function clearUsageData(): Promise<void> {
  await window.storage.remove(ICD10_USAGE_KEY);
}

// Export usage data (for backup/sync)
export async function exportUsageData(): Promise<string> {
  const usage = await getUsageData();
  return JSON.stringify(usage, null, 2);
}

// Import usage data (for restore/sync)
export async function importUsageData(json: string, merge: boolean = true): Promise<void> {
  try {
    const importedUsage = JSON.parse(json) as ICD10Usage[];

    if (!Array.isArray(importedUsage)) {
      throw new Error('Invalid format: expected array of usage records.');
    }

    if (merge) {
      const existingUsage = await getUsageData();
      const usageMap = new Map(existingUsage.map(u => [u.code, u]));

      // Merge imported usage
      for (const imported of importedUsage) {
        const existing = usageMap.get(imported.code);
        if (existing) {
          // Combine counts and use most recent date
          existing.useCount += imported.useCount;
          if (new Date(imported.lastUsed) > new Date(existing.lastUsed)) {
            existing.lastUsed = imported.lastUsed;
          }
        } else {
          usageMap.set(imported.code, imported);
        }
      }

      await saveUsageData(Array.from(usageMap.values()));
    } else {
      await saveUsageData(importedUsage);
    }
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Invalid JSON format.');
    }
    throw error;
  }
}

// Get usage statistics
export async function getUsageStats(): Promise<{
  totalCodesUsed: number;
  totalUseCount: number;
  mostUsedCode: { code: string; count: number } | null;
  lastUsedDate: string | null;
}> {
  const usage = await getUsageData();

  if (usage.length === 0) {
    return {
      totalCodesUsed: 0,
      totalUseCount: 0,
      mostUsedCode: null,
      lastUsedDate: null
    };
  }

  const totalUseCount = usage.reduce((sum, u) => sum + u.useCount, 0);
  const mostUsed = usage.reduce((max, u) => (u.useCount > max.useCount ? u : max), usage[0]);
  const lastUsed = usage.reduce(
    (latest, u) => (new Date(u.lastUsed) > new Date(latest) ? u.lastUsed : latest),
    usage[0].lastUsed
  );

  return {
    totalCodesUsed: usage.length,
    totalUseCount,
    mostUsedCode: { code: mostUsed.code, count: mostUsed.useCount },
    lastUsedDate: lastUsed
  };
}
