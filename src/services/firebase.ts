import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const provider = new GoogleAuthProvider();
// Add required Google Workspace scopes for Google Sheets and Google Drive (creating & editing sheets)
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.setCustomParameters({
  prompt: 'select_account',
});

const TOKEN_KEY = 'google_oauth_access_token';
const TOKEN_TIME_KEY = 'google_oauth_token_timestamp';

export const getStoredAccessToken = (): string | null => {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const timestamp = localStorage.getItem(TOKEN_TIME_KEY);
    if (token) {
      if (timestamp) {
        const elapsed = Date.now() - parseInt(timestamp, 10);
        // OAuth access tokens generally valid for up to 1 hour; allow 3 hours window or until rejected
        if (elapsed < 3 * 3600 * 1000) {
          return token;
        }
      } else {
        return token;
      }
    }
  } catch (e) {
    console.warn('LocalStorage error:', e);
  }
  return null;
};

export const saveAccessToken = (token: string | null) => {
  cachedAccessToken = token;
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(TOKEN_TIME_KEY, Date.now().toString());
    } else {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(TOKEN_TIME_KEY);
    }
  } catch (e) {
    console.warn('LocalStorage error:', e);
  }
};

let isSigningIn = false;
let cachedAccessToken: string | null = getStoredAccessToken();

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      const storedToken = cachedAccessToken || getStoredAccessToken();
      if (storedToken) {
        cachedAccessToken = storedToken;
        if (onAuthSuccess) onAuthSuccess(user, storedToken);
      } else if (!isSigningIn) {
        // Fallback: if user is authenticated in Firebase
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to obtain Google OAuth access token from sign-in.');
    }

    saveAccessToken(credential.accessToken);
    return { user: result.user, accessToken: credential.accessToken };
  } catch (error: any) {
    if (
      error?.code === 'auth/popup-closed-by-user' ||
      error?.code === 'auth/cancelled-popup-request' ||
      error?.message?.includes('closed-by-user')
    ) {
      // User closed the popup window - not an application fault
      return null;
    }
    console.warn('Sign in issue:', error?.message || error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken || getStoredAccessToken();
};

export const setCachedAccessToken = (token: string | null) => {
  saveAccessToken(token);
};

export const logout = async (): Promise<void> => {
  await signOut(auth);
  saveAccessToken(null);
};
