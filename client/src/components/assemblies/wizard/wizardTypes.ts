// Re-export for convenience in wizard components
export interface BoardGeneration {
  id: string;
  name: string;
}

export interface Address {
  id: string;
  address: string;
}

// Generic section props for all wizard sections
export interface WizardSectionProps<T> {
  form: T;
  setForm: (f: T | ((prev: T) => T)) => void;
}
