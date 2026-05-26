const DOCS_API = 'https://docs.googleapis.com/v1/documents';

export async function fillPlaceholders(
  docId: string,
  placeholders: Map<string, string>,
  token: string,
): Promise<void> {
  const requests = Array.from(placeholders.entries()).map(([key, value]) => ({
    replaceAllText: {
      containsText: { text: `{${key}}`, matchCase: false },
      replaceText: value,
    },
  }));

  const response = await fetch(`${DOCS_API}/${docId}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ requests }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Docs API error [fillPlaceholders docId=${docId}]: ${response.status} ${text}`);
  }
}
