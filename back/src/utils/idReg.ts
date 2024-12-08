export function idExists(jsonData: Record<string, any>, id: string): boolean {
  return Object.values(jsonData).some(
    (entries) =>
      Array.isArray(entries) &&
      entries.some((obj: { ID: string }) => obj.ID === id)
  );
}

export function getObjFromId(
  jsonData: Record<string, any>,
  id: string
): { name: string; object: Record<string, any> } | null {
  for (const [name, entries] of Object.entries(jsonData)) {
    if (Array.isArray(entries)) {
      for (const obj of entries) {
        if (obj.ID === id) {
          return { name, ...obj }; // Flatten the object
        }
      }
    }
  }
  return null; // ID not found
}
