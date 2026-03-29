export const fetcher = async <T = unknown>(url: string): Promise<T> => {
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error("Failed to fetch");
  }

  return res.json();
};
