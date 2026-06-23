/** In-memory JWT for the current tab only — never written to localStorage/sessionStorage. */
let memoryAccessToken: string | null = null;

export const setMemoryAccessToken = (token: string | null) => {
  memoryAccessToken = token;
};

export const getMemoryAccessToken = () => memoryAccessToken;

export const clearMemoryAccessToken = () => {
  memoryAccessToken = null;
};
