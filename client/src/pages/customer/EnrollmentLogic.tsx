import liff from '@line/liff';

const LIFF_ID = import.meta.env.VITE_LIFF_ID as string;

export interface LiffToken {
  idToken: string;
  displayName: string;
  pictureUrl?: string;
}

/**
 * SEAMLESS SIGNUP PROTOCOL — SECURE IDENTITY VERIFICATION
 *
 * Initialises LIFF and returns a signed ID token for server-side verification.
 * The server verifies this token with LINE's API to extract the lineUid securely,
 * preventing any possibility of UID spoofing from the client.
 *
 * If the user is not yet logged into LINE, LIFF redirects them to the
 * LINE permission screen automatically (one-tap login).
 *
 * Usage:
 *   const token = await initializeSeamlessSignup();
 *   if (token) { // send token.idToken to backend for verified linking }
 *
 * Returns null when:
 *   - VITE_LIFF_ID is not configured
 *   - Login redirect is in progress (page will reload)
 *   - An unexpected error occurs
 */
export async function initializeSeamlessSignup(): Promise<LiffToken | null> {
  if (!LIFF_ID) {
    console.warn('LIFF Protocol: VITE_LIFF_ID is not set — skipping LIFF initialisation');
    return null;
  }

  try {
    await liff.init({ liffId: LIFF_ID });

    if (!liff.isLoggedIn()) {
      // One-tap login: redirects to LINE permission screen.
      // After approval, LINE redirects back to this URL with a valid session.
      liff.login();
      return null; // page will redirect, nothing to return
    }

    // Get the signed ID token for server-side verification
    const idToken = liff.getIDToken();
    if (!idToken) {
      console.error('LIFF Protocol: ID token unavailable after login');
      return null;
    }

    const profile = await liff.getProfile();
    const userContext = liff.getContext();

    console.log(`✨ LIFF Protocol: Member ${profile.displayName} identified — context: ${userContext?.type}`);

    return {
      idToken,
      displayName: profile.displayName,
      pictureUrl: profile.pictureUrl,
    };
  } catch (err) {
    console.error('LIFF Protocol Initialization Failed', err);
    return null;
  }
}

/**
 * Returns true when the app is running inside the LINE in-app browser.
 * Use this to conditionally show the LIFF login button vs the manual LINK code flow.
 */
export function isRunningInLine(): boolean {
  if (!LIFF_ID) return false;
  return liff.isInClient();
}

/**
 * Checks whether LIFF is ready to use (initialised + logged in).
 */
export function isLiffReady(): boolean {
  try {
    return liff.isLoggedIn();
  } catch {
    return false;
  }
}
