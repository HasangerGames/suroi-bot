import { prisma } from "./misc";

const baseXp = 100; // The XP needed to reach level 1
const levelMultiplier = 1.5; // The factor by which the XP needed to attain the next level increases

export function getLevelInfoForXp(xp: number): { level: number, relativeXp: number, xpForNextLevel: number } {
    const level = getLevelForXp(xp);
    const xpForCurrentLevel = getXpForLevel(level);
    const xpForNextLevel = getXpForLevel(level + 1) - xpForCurrentLevel;
    const relativeXp = xp - xpForCurrentLevel;
    return { level, relativeXp, xpForNextLevel };
}

export function getLevelForXp(xp: number): number {
    return Math.floor((xp / baseXp) ** (1 / levelMultiplier)) + 1;
}

export function getXpForLevel(level: number): number {
    return Math.floor(baseXp * ((level - 1) ** levelMultiplier));
}

export async function getRank(xp: number): Promise<number> {
    return await prisma.user.count({ where: { xp: { gt: xp } } });
}
