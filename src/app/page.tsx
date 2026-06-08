import Link from "next/link";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.logo}>
          Build<span className={styles.logoAccent}>Watch</span>
        </Link>
        <nav className={styles.nav}>
          <Link href="/login" className={styles.navLink}>
            Log in
          </Link>
          <Link href="/register" className={styles.navCta}>
            Get Started
          </Link>
        </nav>
      </header>

      <main>
        <section className={styles.hero}>
          <h1 className={styles.heroTitle}>
            Construction Project Monitoring, Simplified
          </h1>
          <p className={styles.heroSubtitle}>
            Track milestones, review photo submissions, and get AI-powered
            insights — all in one platform.
          </p>
          <div className={styles.heroCtas}>
            <Link href="/register" className={styles.primaryBtn}>
              Get Started
            </Link>
            <Link href="/login" className={styles.secondaryBtn}>
              Log In
            </Link>
          </div>
        </section>

        <section className={styles.features}>
          <h2 className={styles.featuresTitle}>
            Everything you need to monitor construction
          </h2>
          <div className={styles.featureGrid}>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>01</div>
              <h3 className={styles.featureHeading}>Milestone Tracking</h3>
              <p className={styles.featureText}>
                Define and track project milestones with planned costs and
                status updates.
              </p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>02</div>
              <h3 className={styles.featureHeading}>Photo Submissions</h3>
              <p className={styles.featureText}>
                Field workers submit geotagged photos to document progress at
                each milestone.
              </p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>03</div>
              <h3 className={styles.featureHeading}>AI-Powered Reports</h3>
              <p className={styles.featureText}>
                Automated analysis of submissions with progress indicators and
                anomaly detection.
              </p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>04</div>
              <h3 className={styles.featureHeading}>Real-Time Monitoring</h3>
              <p className={styles.featureText}>
                Dashboard with live updates, activity charts, and instant
                notifications.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <p>&copy; {new Date().getFullYear()} BuildWatch. All rights reserved.</p>
      </footer>
    </div>
  );
}
