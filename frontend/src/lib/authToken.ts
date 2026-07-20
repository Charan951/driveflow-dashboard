const TOKEN_KEY = '__cz_ut';

// Clean up legacy plain text key if it exists
try {
  localStorage.removeItem('carzzi_token');
} catch {
  // Ignore
}

const obfuscate = (str: string): string => {
  try {
    const reversed = str.split('').reverse().join('');
    return window.btoa(unescape(encodeURIComponent(reversed)));
  } catch {
    return str;
  }
};

const deobfuscate = (str: string): string => {
  try {
    const decoded = decodeURIComponent(escape(window.atob(str)));
    return decoded.split('').reverse().join('');
  } catch {
    return '';
  }
};

let memoryAccessToken: string | null = null;
try {
  const persisted = localStorage.getItem(TOKEN_KEY);
  if (persisted) {
    memoryAccessToken = deobfuscate(persisted);
  }
} catch {
  // Ignore private mode/disabled cookies errors
}

export const setMemoryAccessToken = (token: string | null) => {
  memoryAccessToken = token;
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, obfuscate(token));
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // Ignore private mode/disabled cookies errors
  }
};

export const getMemoryAccessToken = () => {
  if (memoryAccessToken) return memoryAccessToken;
  try {
    const persisted = localStorage.getItem(TOKEN_KEY);
    return persisted ? deobfuscate(persisted) : null;
  } catch {
    return null;
  }
};

export const clearMemoryAccessToken = () => {
  memoryAccessToken = null;
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Ignore private mode/disabled cookies errors
  }
};
