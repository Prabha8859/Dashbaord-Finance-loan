/** Extracts a human-readable message from any axios/API error. */
export const getApiErrorMessage = (
  err: unknown,
  fallback = "Something went wrong. Please try again."
): string => {
  const anyErr = err as { response?: { data?: { message?: string } }; message?: string };
  return anyErr?.response?.data?.message || anyErr?.message || fallback;
};
