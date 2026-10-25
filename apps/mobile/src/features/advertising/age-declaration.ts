import AsyncStorage from "@react-native-async-storage/async-storage";
import { z } from "zod";

const storageKey = "blockout:advertising-age";

/** Explicit completed years; 100 represents 100 years or more, never a guessed default. */
export const completedYearsSchema = z.number().int().min(0).max(100);

/** Converts a device-local calendar day to its storage representation, without UTC shifting. */
function localDay(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** Rejects malformed calendar dates rather than letting Date normalize corrupt stored data. */
function isCalendarDay(value: string): boolean {
  const date = new Date(`${value}T12:00:00`);
  return !Number.isNaN(date.getTime()) && localDay(date) === value;
}

const declarationSchema = z
  .object({
    category: z.enum(["under16", "16–17", "adult"]),
    declaredAt: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine(isCalendarDay),
  })
  .strict();

/** The installation keeps only advertising treatment and declaration day; never raw age or identity. */
export type AgeDeclaration = z.infer<typeof declarationSchema>;

/** Reads this installation only; corrupt/missing data stays absent and I/O failures remain explicit. */
export async function readAgeDeclaration(): Promise<AgeDeclaration | null> {
  const stored = await AsyncStorage.getItem(storageKey);
  if (stored === null) return null;
  try {
    const parsed = declarationSchema.safeParse(JSON.parse(stored));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Validates explicit input and replaces category/day only after ordinary storage acknowledges the write. */
export async function submitAgeDeclaration(
  age: number,
  now = new Date(),
): Promise<AgeDeclaration> {
  const years = completedYearsSchema.parse(age);
  const declaration: AgeDeclaration = {
    category: years < 16 ? "under16" : years < 18 ? "16–17" : "adult",
    declaredAt: localDay(now),
  };
  await AsyncStorage.setItem(storageKey, JSON.stringify(declaration));
  return declaration;
}

/**
 * Evaluates at launch; minors renew after one calendar year, with February 29 clamped to February 28.
 * Adults never age or expire annually. Future local dates are unusable, never adult evidence.
 */
export function getAgeDeclarationStatus(
  declaration: AgeDeclaration | null,
  launch = new Date(),
): "missing" | "expired" | "current" {
  if (!declaration || declaration.declaredAt > localDay(launch))
    return "missing";
  if (declaration.category === "adult") return "current";
  const anniversary = new Date(`${declaration.declaredAt}T12:00:00`);
  const month = anniversary.getMonth();
  anniversary.setFullYear(anniversary.getFullYear() + 1);
  if (anniversary.getMonth() !== month) anniversary.setDate(0);
  return localDay(launch) >= localDay(anniversary) ? "expired" : "current";
}

/** Child protection for unusable declarations supplies no declaration and changes no stored category. */
export function getAdvertisingAgeCategory(
  declaration: AgeDeclaration | null,
  launch = new Date(),
): AgeDeclaration["category"] {
  return declaration &&
    getAgeDeclarationStatus(declaration, launch) === "current"
    ? declaration.category
    : "under16";
}
