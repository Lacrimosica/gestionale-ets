import { italianMunicipalityCodes } from "./italian-municipality-codes";

// Build a multi-map so places with multiple codes (e.g. Kazakhstan: Z255, Z152) are all retained
const belfiore = new Map<string, string[]>();
for (const [name, code] of italianMunicipalityCodes) {
  const existing = belfiore.get(name);
  if (existing) existing.push(code);
  else belfiore.set(name, [code]);
}

export interface CodiceFiscaleData {
  code: string;
  firstName: string;
  lastName: string;
  dateBirth: string | Date;
  gender: "M" | "F";
  place: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateCodiceFiscale(data: CodiceFiscaleData): ValidationResult {
  const code = data.code.toUpperCase();
  const providedLastName = code.slice(0, 3);
  const providedFirstName = code.slice(3, 6);
  const providedBirthYear = code.slice(6, 8);
  const providedBirthMonth = code[8];
  const providedBirthDay = code.slice(9, 11);
  const providedBirthPlace = code.slice(11, 15);
  const providedControl = code[15];

  const dateStr = new Date(data.dateBirth).toLocaleDateString("it-IT");
  const [day, month, year] = dateStr.split("/");
  const errors: string[] = [];

  try {
    if (providedLastName !== getName(data.lastName, false)) errors.push("Cognome");
    if (providedFirstName !== getName(data.firstName, true)) errors.push("Nome");
    if (providedBirthYear !== getYear(year)) errors.push("Anno di nascita");
    if (providedBirthMonth !== getMonth(month)) errors.push("Mese di nascita");
    if (providedBirthDay !== getDayGender(day, data.gender)) errors.push("Giorno di nascita o sesso");
    if (!getPlace(data.place).includes(providedBirthPlace)) errors.push("Comune di nascita");
    if (providedControl !== getControl(code)) errors.push("Carattere di controllo");
  } catch (error) {
    return { valid: false, errors: [`Errore interno: ${error}`] };
  }

  return { valid: errors.length === 0, errors };
}

function getName(name: string, first: boolean): string {
  try {
    const upper = name.toUpperCase();
    const cons = [...upper.matchAll(/[B-DF-HJ-NP-TV-Z]/g)].flat();
    const vow = [...upper.matchAll(/[AEIOU]/g)].flat();
    if (cons.length >= 4 && first) return cons[0] + cons[2] + cons[3];
    if (cons.length >= 3) return cons[0] + cons[1] + cons[2];
    if (cons.length >= 2 && vow.length >= 1) return cons[0] + cons[1] + vow[0];
    if (cons.length >= 1 && vow.length >= 2) return cons[0] + vow[0] + vow[1];
    if (vow.length >= 3) return vow[0] + vow[1] + vow[2];
    if (cons.length >= 1 && vow.length >= 1) return cons[0] + vow[0] + "X";
    if (cons.length >= 2) return cons[0] + cons[1] + "X";
    if (cons.length >= 1) return cons[0] + "XX";
    if (vow.length >= 2) return vow[0] + vow[1] + "X";
    if (vow.length >= 1) return vow[0] + "XX";
    return "XXX";
  } catch (e) {
    throw new Error(`[${first ? "NOME" : "COGNOME"}] ${e}`);
  }
}

function getYear(year: string): string {
  return year.length === 4 ? year.slice(2, 4) : year.slice(0, 2);
}

function getMonth(month: string): string {
  const map: Record<number, string> = {
    1: "A", 2: "B", 3: "C", 4: "D", 5: "E", 6: "H",
    7: "L", 8: "M", 9: "P", 10: "R", 11: "S", 12: "T",
  };
  return map[Number(month)] ?? "";
}

function getDayGender(day: string, gender: "M" | "F"): string {
  const dayNum = Number(day);
  if (gender.toUpperCase() === "M") return dayNum.toString().padStart(2, "0");
  if (gender.toUpperCase() === "F") return (dayNum + 40).toString().padStart(2, "0");
  return "";
}

export function getPlace(place: string): string[] {
  const parsed = parsePlace(place);
  return belfiore.get(parsed) ?? [];
}

export function parsePlace(place: string): string {
  const normalized = place.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/'/g, "").toUpperCase();
  if (!normalized.includes("(")) return normalized;
  return normalized.split("(")[0].trimEnd();
}

function getControl(cf: string): string {
  const odd = new Map<string, number>([
    ["0",1],["1",0],["2",5],["3",7],["4",9],["5",13],["6",15],["7",17],["8",19],["9",21],
    ["A",1],["B",0],["C",5],["D",7],["E",9],["F",13],["G",15],["H",17],["I",19],["J",21],
    ["K",2],["L",4],["M",18],["N",20],["O",11],["P",3],["Q",6],["R",8],["S",12],["T",14],
    ["U",16],["V",10],["W",22],["X",25],["Y",24],["Z",23],
  ]);
  const even = new Map<string, number>([
    ["0",0],["1",1],["2",2],["3",3],["4",4],["5",5],["6",6],["7",7],["8",8],["9",9],
    ["A",0],["B",1],["C",2],["D",3],["E",4],["F",5],["G",6],["H",7],["I",8],["J",9],
    ["K",10],["L",11],["M",12],["N",13],["O",14],["P",15],["Q",16],["R",17],["S",18],["T",19],
    ["U",20],["V",21],["W",22],["X",23],["Y",24],["Z",25],
  ]);
  const final = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  let total = 0;
  Array.from(cf.slice(0, 15)).forEach((char, i) => {
    total += (i + 1) % 2 === 0 ? (even.get(char) ?? 0) : (odd.get(char) ?? 0);
  });
  return final[total % 26] ?? "";
}
