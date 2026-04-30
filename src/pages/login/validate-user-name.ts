export type ValidationResult = {
  isValid: boolean;
  errorMessage: string | null;
};

type UserNameField = 'firstName' | 'surname';

const OnlyEnglishLettersAndHyphenPattern = /^[A-Za-z-]+$/;

const MinLengthByField: Record<UserNameField, number> = {
  firstName: 3,
  surname: 4,
};

function isFirstLetterUppercase(value: string): boolean {
  const firstCharacter = value.charAt(0);
  return firstCharacter === firstCharacter.toUpperCase();
}

export default function validateUserName(field: UserNameField, rawValue: string): ValidationResult {
  const value = rawValue.trim();

  if (value.length === 0) {
    return { isValid: false, errorMessage: 'This field is required.' };
  }

  if (!OnlyEnglishLettersAndHyphenPattern.test(value)) {
    return { isValid: false, errorMessage: 'Use only English letters and hyphen.' };
  }

  if (!isFirstLetterUppercase(value)) {
    return { isValid: false, errorMessage: 'First letter must be uppercase.' };
  }

  const minLength = MinLengthByField[field];
  if (value.length < minLength) {
    return { isValid: false, errorMessage: `Minimum length is ${minLength}.` };
  }

  return { isValid: true, errorMessage: null };
}
