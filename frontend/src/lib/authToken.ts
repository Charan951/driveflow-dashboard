const TOKEN_KEY = 'carzzi_token';

let memoryAccessToken: string | null = null;
try {
  memoryAccessToken = localStorage.getItem(TOKEN_KEY);
} catch {
  // Ignore private mode/disabled cookies errors
}

export const setMemoryAccessToken = (token: string | null) => {
  memoryAccessToken = token;
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // Ignore private mode/disabled cookies errors
  }
};

export const getMemoryAccessToken = () => memoryAccessToken;

export const clearMemoryAccessToken = () => {
  memoryAccessToken = null;
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Ignore private mode/disabled cookies errors
  }
};
