export class NavigationManager {
  private static isInitialized = false;
  private static LAST_PATH_KEY = 'lwsrh_last_path';

  static async init() {
    if (typeof window === 'undefined' || this.isInitialized) return;
    this.isInitialized = true;

    const currentUrl = window.location.pathname + window.location.search;
    if (currentUrl !== '/' && !currentUrl.startsWith('/auth')) {
      localStorage.setItem(this.LAST_PATH_KEY, currentUrl);
    }

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        const url = window.location.pathname + window.location.search;
        if (url !== '/' && !url.startsWith('/auth')) {
          localStorage.setItem(this.LAST_PATH_KEY, url);
        }
      }
    });

    const isRevisit = sessionStorage.getItem('lwsrh_is_revisit');
    if (!isRevisit) {
      sessionStorage.setItem('lwsrh_nav_depth', '0');
      sessionStorage.setItem('lwsrh_is_revisit', 'true');
    }
  }

  static push() {
    if (typeof window === 'undefined') return;
    const depth = parseInt(sessionStorage.getItem('lwsrh_nav_depth') || '0');
    sessionStorage.setItem('lwsrh_nav_depth', (depth + 1).toString());
  }

  static getLastPath(): string {
    if (typeof window === 'undefined') return '/home';
    return localStorage.getItem(this.LAST_PATH_KEY) || '/home';
  }

  static getSafeFallback(): string {
    if (typeof window === 'undefined') return '/auth';
    if (localStorage.getItem('adminAuthenticated') === 'true') return '/admin';
    const isAuthed =
      localStorage.getItem('userAuthenticated') === 'true' ||
      localStorage.getItem('hasCompletedProfile') === 'true' ||
      localStorage.getItem('bypassLogin') === 'true';
    return isAuthed ? '/home' : '/auth';
  }

  static safeBack(router: any) {
    this.handleBack(router);
  }

  static handleBack(router: any, fallbackUrl?: string) {
    if (typeof window === 'undefined') return;

    const currentDepth = parseInt(sessionStorage.getItem('lwsrh_nav_depth') || '0');
    const hasHistory = window.history.length > 2;
    const canGoBack = currentDepth > 0 || hasHistory;

    if (currentDepth > 0) {
      sessionStorage.setItem('lwsrh_nav_depth', (currentDepth - 1).toString());
    }

    if (canGoBack) {
      router.back();
      return;
    }

    if (fallbackUrl) {
      router.replace(fallbackUrl);
      return;
    }

    const currentPath = window.location.pathname;
    if (window.location.search.length > 0) {
      router.replace(currentPath);
      return;
    }

    const parts = currentPath.split('/').filter(Boolean);
    if (parts.length > 1) {
      router.replace('/' + parts.slice(0, -1).join('/'));
    } else {
      router.replace(this.getSafeFallback());
    }
  }

  static saveCurrentPath(path: string) {
    if (typeof window === 'undefined') return;
    if (path !== '/' && !path.startsWith('/auth') && !path.includes('_next')) {
      localStorage.setItem(this.LAST_PATH_KEY, path);
    }
  }
}
