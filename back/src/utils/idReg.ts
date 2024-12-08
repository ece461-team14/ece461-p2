export function idExists(jsonData: Record<string, any>, id: string): boolean {
  return Object.values(jsonData).some(
    (entries) =>
      Array.isArray(entries) &&
      entries.some((obj: { ID: string }) => obj.ID === id)
  );
}

export function getObjFromId(
  registry: Record<string, any>,
  id: string
): any | null {
  for (const nameField in registry) {
    if (Object.hasOwnProperty.call(registry, nameField)) {
      // Iterate over the array of objects under each name field
      for (const entry of registry[nameField]) {
        if (entry.ID === id) {
          return entry; // Return the object with the matching ID
        }
      }
    }
  }
  return null; // ID not found
}
