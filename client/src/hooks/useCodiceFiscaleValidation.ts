import { useMemo } from 'react';

export interface CFValidationResult {
  valid: boolean;
  errors: string[];
  details: {
    lastName: boolean;
    firstName: boolean;
    birthYear: boolean;
    birthMonth: boolean;
    birthDay: boolean;
    birthPlace: boolean;
    control: boolean;
  };
}

function getName(name: string, first: boolean): string {
  try {
    const upper = name.toUpperCase();
    const cons = [...upper.matchAll(/[B-DF-HJ-NP-TV-Z]/g)].map(m => m[0]);
    const vow = [...upper.matchAll(/[AEIOU]/g)].map(m => m[0]);

    if (cons.length >= 4 && first) return cons[0] + cons[2] + cons[3];
    if (cons.length >= 3) return cons[0] + cons[1] + cons[2];
    if (cons.length >= 2 && vow.length >= 1) return cons[0] + cons[1] + vow[0];
    if (cons.length >= 1 && vow.length >= 2) return cons[0] + vow[0] + vow[1];
    if (vow.length >= 3) return vow[0] + vow[1] + vow[2];
    if (cons.length >= 1 && vow.length >= 1) return cons[0] + vow[0] + 'X';
    if (cons.length >= 2) return cons[0] + cons[1] + 'X';
    if (cons.length >= 1) return cons[0] + 'XX';
    if (vow.length >= 2) return vow[0] + vow[1] + 'X';
    if (vow.length >= 1) return vow[0] + 'XX';
    return 'XXX';
  } catch {
    return '';
  }
}

function getYear(year: string): string {
  return year.length === 4 ? year.slice(2, 4) : year.slice(0, 2);
}

function getMonth(month: string): string {
  const map: Record<number, string> = {
    1: 'A', 2: 'B', 3: 'C', 4: 'D', 5: 'E', 6: 'H',
    7: 'L', 8: 'M', 9: 'P', 10: 'R', 11: 'S', 12: 'T',
  };
  return map[Number(month)] ?? '';
}

function getDayGender(day: string, gender: string): string {
  const dayNum = Number(day);
  if (gender.toUpperCase() === 'M') return dayNum.toString().padStart(2, '0');
  if (gender.toUpperCase() === 'F') return (dayNum + 40).toString().padStart(2, '0');
  return '';
}

function getControl(cf: string): string {
  const odd = new Map<string, number>([
    ['0',1],['1',0],['2',5],['3',7],['4',9],['5',13],['6',15],['7',17],['8',19],['9',21],
    ['A',1],['B',0],['C',5],['D',7],['E',9],['F',13],['G',15],['H',17],['I',19],['J',21],
    ['K',2],['L',4],['M',18],['N',20],['O',11],['P',3],['Q',6],['R',8],['S',12],['T',14],
    ['U',16],['V',10],['W',22],['X',25],['Y',24],['Z',23],
  ]);
  const even = new Map<string, number>([
    ['0',0],['1',1],['2',2],['3',3],['4',4],['5',5],['6',6],['7',7],['8',8],['9',9],
    ['A',0],['B',1],['C',2],['D',3],['E',4],['F',5],['G',6],['H',7],['I',8],['J',9],
    ['K',10],['L',11],['M',12],['N',13],['O',14],['P',15],['Q',16],['R',17],['S',18],['T',19],
    ['U',20],['V',21],['W',22],['X',23],['Y',24],['Z',25],
  ]);
  const final = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  let total = 0;
  Array.from(cf.slice(0, 15)).forEach((char, i) => {
    total += (i + 1) % 2 === 0 ? (even.get(char) ?? 0) : (odd.get(char) ?? 0);
  });
  return final[total % 26] ?? '';
}

export function useCodiceFiscaleValidation(
  code: string,
  firstName: string,
  lastName: string,
  birthDate: string,
  gender: string
): CFValidationResult {
  return useMemo(() => {
    if (!code || code.length !== 16) {
      return {
        valid: false,
        errors: [],
        details: {
          lastName: false,
          firstName: false,
          birthYear: false,
          birthMonth: false,
          birthDay: false,
          birthPlace: false,
          control: false,
        },
      };
    }

    const cfUpper = code.toUpperCase();
    const providedLastName = cfUpper.slice(0, 3);
    const providedFirstName = cfUpper.slice(3, 6);
    const providedBirthYear = cfUpper.slice(6, 8);
    const providedBirthMonth = cfUpper[8];
    const providedBirthDay = cfUpper.slice(9, 11);
    const providedBirthPlace = cfUpper.slice(11, 15);
    const providedControl = cfUpper[15];

    const errors: string[] = [];
    const details = {
      lastName: false,
      firstName: false,
      birthYear: false,
      birthMonth: false,
      birthDay: false,
      birthPlace: false,
      control: false,
    };

    try {
      const expectedLastName = getName(lastName, false);
      const lastNameMatch = providedLastName === expectedLastName;
      details.lastName = lastNameMatch;
      if (!lastNameMatch) errors.push('Cognome');

      const expectedFirstName = getName(firstName, true);
      const firstNameMatch = providedFirstName === expectedFirstName;
      details.firstName = firstNameMatch;
      if (!firstNameMatch) errors.push('Nome');

      if (birthDate) {
        const date = new Date(birthDate);
        const dateStr = date.toLocaleDateString('it-IT');
        const [day, month, year] = dateStr.split('/');

        const expectedYear = getYear(year);
        const yearMatch = providedBirthYear === expectedYear;
        details.birthYear = yearMatch;
        if (!yearMatch) errors.push('Anno di nascita');

        const expectedMonth = getMonth(month);
        const monthMatch = providedBirthMonth === expectedMonth;
        details.birthMonth = monthMatch;
        if (!monthMatch) errors.push('Mese di nascita');

        const expectedDay = getDayGender(day, gender);
        const dayMatch = providedBirthDay === expectedDay;
        details.birthDay = dayMatch;
        if (!dayMatch) errors.push('Giorno di nascita');
      }

      // For birthPlace, just check if it's a 4-character code (can't validate without Belfiore map)
      const placeMatch = /^[A-Z0-9]{4}$/.test(providedBirthPlace);
      details.birthPlace = placeMatch;
      if (!placeMatch) errors.push('Luogo di nascita');

      const expectedControl = getControl(cfUpper.slice(0, 15));
      const controlMatch = providedControl === expectedControl;
      details.control = controlMatch;
      if (!controlMatch) errors.push('Carattere di controllo');
    } catch {
      return {
        valid: false,
        errors: ['Errore nella validazione'],
        details,
      };
    }

    return {
      valid: errors.length === 0,
      errors,
      details,
    };
  }, [code, firstName, lastName, birthDate, gender]);
}
