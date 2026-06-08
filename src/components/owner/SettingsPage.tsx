'use client'

import React, { useState } from 'react'
import { Monitor, Smartphone, Download, Check } from 'lucide-react'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import styles from './SettingsPage.module.css'

export type SettingsPageProps = {
  userName?: string
  userInitials?: string
  userPlan?: string
  userEmail?: string
  userTimezone?: string
}

export default function SettingsPage({
  userName = 'User',
  userInitials = 'US',
  userPlan = 'Standard Plan',
  userEmail = '',
  userTimezone = 'Europe/London (GMT+1)',
}: SettingsPageProps) {
  const [weeklyDigest, setWeeklyDigest] = useState(true)
  const [silenceAlert, setSilenceAlert] = useState(true)
  const [emailNotifs, setEmailNotifs] = useState(true)
  const [pushEnabled, setPushEnabled] = useState(false)

  return (
    <div className={styles.shell}>
      <Sidebar activeItem="Settings" projectName="" userName={userName} userInitials={userInitials} userPlan={userPlan} />
      <div className={styles.mainArea}>
        <Topbar title="Settings" />
        <div className={styles.content}>
          <div className={styles.layout}>
            {/* ── Left column ── */}
            <div className={styles.col}>

              {/* Profile */}
              <div className={styles.card}>
                <div className={styles.cardTitle}>Profile</div>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Full name</label>
                  <div className={styles.fieldInput}>{userName}</div>
                </div>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Email address</label>
                  <div className={styles.fieldRow}>
                    <div className={styles.fieldInput} style={{ flex: 1 }}>{userEmail || 'Not set'}</div>
                    <span className={styles.changeLink}>Change</span>
                  </div>
                </div>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Phone number</label>
                  <div className={`${styles.fieldInput} ${styles.placeholder}`}>+44 ··· ··· ····</div>
                </div>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>
                    Timezone <span className={styles.badgeReq}>diaspora</span>
                  </label>
                  <div className={styles.fieldInput}>{userTimezone}</div>
                </div>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Password</label>
                  <span className={styles.changeLink}>Change password →</span>
                </div>
                <button className={styles.saveBtn}>Save changes</button>
              </div>

              {/* Notification preferences */}
              <div className={styles.card}>
                <div className={styles.cardTitle}>Notification preferences</div>
                <div className={styles.settingRow}>
                  <div>
                    <div className={styles.sLabel}>Weekly digest</div>
                    <div className={styles.sSub}>Every Monday in your timezone</div>
                  </div>
                  <button
                    type="button"
                    className={`${styles.toggle} ${weeklyDigest ? styles.toggleOn : ''}`}
                    onClick={() => setWeeklyDigest(v => !v)}
                    role="switch"
                    aria-checked={weeklyDigest}
                    aria-label="Weekly digest"
                  />
                </div>
                <div className={styles.settingRow}>
                  <div>
                    <div className={styles.sLabel}>Silence alert</div>
                    <div className={styles.sSub}>Alert if no submission after N days</div>
                  </div>
                  <div className={styles.thresholdRow}>
                    <span className={styles.thresholdVal}>5 days</span>
                    <button
                      type="button"
                      className={`${styles.toggle} ${silenceAlert ? styles.toggleOn : ''}`}
                      onClick={() => setSilenceAlert(v => !v)}
                      role="switch"
                      aria-checked={silenceAlert}
                      aria-label="Silence alert"
                    />
                  </div>
                </div>
                <div className={styles.settingRow}>
                  <div>
                    <div className={styles.sLabel}>
                      Milestone action required
                      <span className={styles.badgeAlways}>always on</span>
                    </div>
                    <div className={styles.sSub}>Cannot be disabled</div>
                  </div>
                  <div className={styles.toggleLocked} aria-disabled="true">
                    <Check size={10} />
                  </div>
                </div>
                <div className={styles.settingRow}>
                  <div>
                    <div className={styles.sLabel}>Email notifications</div>
                    <div className={styles.sSub}>Send to {userEmail || 'your email'}</div>
                  </div>
                  <button
                    type="button"
                    className={`${styles.toggle} ${emailNotifs ? styles.toggleOn : ''}`}
                    onClick={() => setEmailNotifs(v => !v)}
                    role="switch"
                    aria-checked={emailNotifs}
                    aria-label="Email notifications"
                  />
                </div>
                <div className={styles.settingRow}>
                  <div>
                    <div className={styles.sLabel}>Push notifications</div>
                    <div className={styles.sSub}>Browser / PWA push</div>
                  </div>
                  <button
                    type="button"
                    className={`${styles.toggle} ${pushEnabled ? styles.toggleOn : ''} ${!pushEnabled ? styles.toggleOff : ''}`}
                    onClick={() => setPushEnabled(v => !v)}
                    role="switch"
                    aria-checked={pushEnabled}
                    aria-label="Push notifications"
                  />
                </div>
                <button className={styles.saveBtn} style={{ marginTop: 12 }}>Save preferences</button>
              </div>
            </div>

            {/* ── Right column ── */}
            <div className={styles.col}>

              {/* Subscription & billing */}
              <div className={styles.card}>
                <div className={styles.cardTitle}>Subscription & billing</div>
                <div className={styles.planGrid}>
                  <div className={styles.planCard}>
                    <div className={styles.planName}>Starter</div>
                    <div className={styles.planPrice}>$15<span className={styles.planInterval}>/mo</span></div>
                    <ul className={styles.planFeatures}>
                      <li>5 milestones</li>
                      <li>20 photos/month</li>
                      <li>No AI analysis</li>
                    </ul>
                    <button className={`${styles.planBtn} ${styles.planBtnDanger}`}>Downgrade</button>
                  </div>
                  <div className={`${styles.planCard} ${styles.planCardCurrent}`}>
                    <div className={styles.planBadge}><Check size={10} /> Current plan</div>
                    <div className={styles.planName}>Standard</div>
                    <div className={styles.planPrice}>$25<span className={styles.planInterval}>/mo</span></div>
                    <ul className={styles.planFeatures}>
                      <li>Unlimited milestones</li>
                      <li>AI analysis</li>
                      <li>Proxy audit trail</li>
                      <li>PDF exports</li>
                      <li>1 project</li>
                    </ul>
                  </div>
                  <div className={styles.planCard}>
                    <div className={styles.planName}>Premium</div>
                    <div className={styles.planPrice}>$45<span className={styles.planInterval}>/mo</span></div>
                    <ul className={styles.planFeatures}>
                      <li>Everything in Standard</li>
                      <li>Inspector dispatch</li>
                      <li style={{ color: 'var(--color-on-surface-variant)' }}>Coming soon</li>
                      <li>3 projects</li>
                    </ul>
                    <button className={`${styles.planBtn} ${styles.planBtnPrimary}`}>Upgrade</button>
                  </div>
                </div>
                <div className={styles.billingRow}>
                  <span className={styles.billingLabel}>Next billing date</span>
                  <span className={styles.billingVal}>7 July 2026</span>
                </div>
                <div className={styles.billingRow}>
                  <span className={styles.billingLabel}>Payment method</span>
                  <span className={styles.billingVal}>Visa ···· 4242 <span className={styles.billingLink}>Change →</span></span>
                </div>
                <div className={styles.billingRow} style={{ borderBottom: 'none' }}>
                  <span className={styles.cancelLabel}>Cancel subscription</span>
                  <span className={styles.cancelLink}>Cancel →</span>
                </div>
              </div>

              {/* Active sessions */}
              <div className={styles.card}>
                <div className={styles.cardTitle}>Active sessions</div>
                <div className={styles.sessionRow}>
                  <div className={styles.sessionInfo}>
                    <div className={styles.sessionIcon}><Monitor size={14} /></div>
                    <div>
                      <div className={styles.sessionDevice}>MacBook Pro — Chrome</div>
                      <div className={styles.sessionMeta}>London, UK · Current session</div>
                    </div>
                  </div>
                  <button className={styles.revokeBtn} disabled style={{ opacity: 0.4, cursor: 'default' }}>Current</button>
                </div>
                <div className={styles.sessionRow}>
                  <div className={styles.sessionInfo}>
                    <div className={styles.sessionIcon}><Smartphone size={14} /></div>
                    <div>
                      <div className={styles.sessionDevice}>iPhone — Safari</div>
                      <div className={styles.sessionMeta}>Lagos, NG · 2 days ago</div>
                    </div>
                  </div>
                  <button className={styles.revokeBtn}>Revoke</button>
                </div>
              </div>

              {/* Data & privacy */}
              <div className={styles.card}>
                <div className={styles.cardTitle}>Data & privacy</div>
                <div className={styles.dataRow}>
                  <div>
                    <div className={styles.sLabel}>Export my data</div>
                    <div className={styles.sSub}>Full account export as JSON</div>
                  </div>
                  <button className={styles.dataBtn}><Download size={12} /> Download JSON</button>
                </div>
                <div className={styles.dataRow}>
                  <div>
                    <div className={styles.dangerLabel}>Delete account</div>
                    <div className={styles.sSub}>Permanent — requires confirmation</div>
                  </div>
                  <button className={`${styles.dataBtn} ${styles.dataBtnDanger}`}>Request deletion</button>
                </div>
                <div className={styles.retentionNote}>
                  Audit trail records are retained for 7 years under legitimate interest grounds even after account deletion. See our Privacy Policy.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
