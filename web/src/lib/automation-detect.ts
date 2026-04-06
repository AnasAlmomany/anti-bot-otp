export interface AutomationSignals {
  webdriver: boolean;
  headless: boolean;
  selenium: boolean;
  puppeteer: boolean;
  playwright: boolean;
  plugins_missing: boolean;
  languages_empty: boolean;
  permissions_anomaly: boolean;
  connection_anomaly: boolean;
  screen_anomaly: boolean;
  hardware_anomaly: boolean;
  focus_anomaly: boolean;
}

export function detectAutomation(): AutomationSignals {
  const signals: AutomationSignals = {
    webdriver: false,
    headless: false,
    selenium: false,
    puppeteer: false,
    playwright: false,
    plugins_missing: false,
    languages_empty: false,
    permissions_anomaly: false,
    connection_anomaly: false,
    screen_anomaly: false,
    hardware_anomaly: false,
    focus_anomaly: false,
  };

  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return signals;
  }

  // navigator.webdriver — Selenium/Puppeteer/Playwright all set this
  signals.webdriver = !!navigator.webdriver;

  // Headless Chrome detection
  const ua = navigator.userAgent || '';
  const isChrome = ua.includes('Chrome');
  if (ua.includes('HeadlessChrome') || (isChrome && !(window as any).chrome)) {
    signals.headless = true;
  }

  // Selenium globals
  if (
    (window as any).__selenium_unwrapped !== undefined ||
    (window as any).__webdriver_evaluate !== undefined ||
    (window as any).__driver_evaluate !== undefined
  ) {
    signals.selenium = true;
  }

  // Puppeteer globals
  if ((window as any).__puppeteer_evaluation_script__ !== undefined) {
    signals.puppeteer = true;
  }

  // Playwright globals
  if (
    (window as any).__playwright !== undefined ||
    (window as any).__pw_manual !== undefined
  ) {
    signals.playwright = true;
  }

  // Missing plugins (Chrome should have plugins)
  if (isChrome && navigator.plugins.length === 0) {
    signals.plugins_missing = true;
  }

  // Empty languages
  if (navigator.languages.length === 0) {
    signals.languages_empty = true;
  }

  // Permissions API anomaly — headless often has "prompt" for notification
  // while real browsers have "default" or "denied" after user interaction
  try {
    if (typeof Notification !== 'undefined' && Notification.permission === 'denied' &&
        navigator.permissions) {
      // Headless browsers sometimes report inconsistent permission states
      navigator.permissions.query({ name: 'notifications' }).then((result) => {
        if (result.state !== 'denied') {
          signals.permissions_anomaly = true;
        }
      }).catch(() => {});
    }
  } catch (_) {}

  // Connection anomaly — headless may have rtt=0 or no connection info
  try {
    const conn = (navigator as any).connection;
    if (conn && conn.rtt === 0 && conn.downlink === 0) {
      signals.connection_anomaly = true;
    }
  } catch (_) {}

  // Screen anomaly — headless often has 0x0 outer dimensions or
  // missing color depth
  try {
    if (window.outerWidth === 0 && window.outerHeight === 0) {
      signals.screen_anomaly = true;
    }
    if (screen.colorDepth === 0) {
      signals.screen_anomaly = true;
    }
  } catch (_) {}

  // Hardware anomaly — 0 logical processors is suspicious
  try {
    if (navigator.hardwareConcurrency === 0) {
      signals.hardware_anomaly = true;
    }
  } catch (_) {}

  // Focus anomaly — headless browsers often don't have document focus
  try {
    if (!document.hasFocus()) {
      signals.focus_anomaly = true;
    }
  } catch (_) {}

  return signals;
}
