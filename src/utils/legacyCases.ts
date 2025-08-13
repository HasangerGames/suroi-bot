import { readFile } from "node:fs/promises";
import { type Case, CaseType } from "@prisma/client";
import { prisma } from "./misc";

interface LegacyCase {
    readonly type: "warning" | "timeout" | "kick" | "ban"
    readonly userID: string
    readonly caseAuthorID: string
    readonly caseReason: string
    readonly duration: number
    readonly createdAt: Date
}

const caseTypeMap: Record<LegacyCase["type"], CaseType> = {
    "warning": CaseType.WARNING,
    "timeout": CaseType.TIMEOUT,
    "kick": CaseType.KICK,
    "ban": CaseType.BAN
};

export async function migrateLegacyCases() {
    const cases: LegacyCase[] = JSON.parse(await readFile("legacyCases.json", "utf8"));
    await prisma.case.createMany({
        data: cases.map((c: LegacyCase): Omit<Case, "id"> => ({
            type: caseTypeMap[c.type],
            userId: c.userID,
            moderatorId: c.caseAuthorID,
            reason: c.caseReason,
            duration: BigInt(c.duration),
            createdAt: c.createdAt
        }))
    });
}
