import liff from '@line/liff';

const LIFF_ID = import.meta.env.VITE_LIFF_ID as string;

export interface LiffProfile {
  lineUid: string;
  displayName: string;
  pictureUrl?: string;
}

/**
 * SEAMLESS SIGNUP PROTOCOL
 *
 * Initialises LIFF and returns the customer's LINE profile in one step.
 * If the user is not yet logged into LINE, LIFF redirects them to the
 * LINE permission screen automatically (one-tap login).
 *
 * Usage:
 *   const profile = await initializeSeamlessSignup();
 *   if (profile) { // user is authenticated via LINE }
 *
 * Returns null when:
 *   - VITE_LIFF_ID is not configured
 *   - Running outside of the LINE in-app browser and login is in progress (redirect)
 *   - An unexpected error occurs
 */
export async function initializeSeamlessSignup(): Promise<LiffProfile | null> {
  if (!LIFF_ID) {
    console.warn('LIFF Protocol: VITE_LIFF_ID is not set — skipping LIFF initialisation');
    return null;
  }

  try {
    await liff.init({ liffId: LIFF_ID });

    if (!liff.isLoggedIn()) {
      // One-tap login: redirects to LINE permission screen.
      // After approval, LINE redirects back to this URL with a token.
      liff.login();
      return null; // page will redirect, nothing to return
    }

    const profile = await liff.getProfile();
    const userContext = liff.getContext();

    console.log(`✨ LIFF Protocol: Member ${profile.displayName} identified — context: ${userContext?.type}`);

    return {
      lineUid: profile.userId,
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
