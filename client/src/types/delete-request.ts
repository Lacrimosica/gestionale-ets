/** What the page-level delete confirmation is currently asking the user to confirm. */
export type DeleteRequestType =
  | 'person'
  | 'role'
  | 'document'
  | 'flag'
  | 'suppression'
  | 'volunteer_period'
  | 'member_period';

export interface DeleteRequest {
  isOpen: boolean;
  type: DeleteRequestType | null;
  id: string | null;
  title: string;
  message: string;
  confirmPhrase: string;
  confirmValue: string;
  isLoading: boolean;
}
