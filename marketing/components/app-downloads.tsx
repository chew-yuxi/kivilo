import styles from './app-downloads.module.css'

export function AppDownloads() {
  return (
    <div className={styles.downloads}>
      <p>Prefer an app?</p>
      <div className={styles.options}>
        <a className={styles.store} href="https://play.google.com/store/apps/details?id=one.kivilo.kivilo" aria-label="Download Kivilo on Google Play">
          <svg viewBox="0 0 24 27" width="26" height="30" aria-hidden="true">
            <path d="M1 1.3 13.2 13.5 1 25.7Z" fill="#4285f4" />
            <path d="m1 1.3 15.5 8.8-3.3 3.4Z" fill="#34a853" />
            <path d="m13.2 13.5 3.3-3.4 5.5 3.1c.3.2.3.4 0 .6l-5.5 3.1Z" fill="#fbbc04" />
            <path d="m1 25.7 12.2-12.2 3.3 3.4Z" fill="#ea4335" />
          </svg>
          <span>Google Play</span>
        </a>
        <div className={styles.unavailable}>
          <svg viewBox="0 0 24 24" width="28" height="30" aria-hidden="true" fill="currentColor">
            <path d="M17.1 12.3c0-2.2 1.8-3.3 1.9-3.4-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.7.8-3.4.8-.7 0-1.7-.8-2.8-.8-1.5 0-2.9.9-3.7 2.2-1.6 2.7-.4 6.8 1.1 8.9.7 1 1.5 2.1 2.6 2.1 1.1 0 1.4-.7 2.8-.7 1.3 0 1.6.7 2.8.7s1.9-1 2.6-2c.8-1.2 1.2-2.4 1.2-2.5-.1 0-2.7-1-2.7-3.5ZM14.8 5.7c.6-.8 1.1-1.9 1-3-1 .1-2.1.7-2.8 1.5-.6.7-1.2 1.8-1 2.9 1 .1 2.1-.6 2.8-1.4Z" />
          </svg>
          <span>iPhone <span className={styles.availability}>Coming soon</span></span>
        </div>
      </div>
    </div>
  )
}
