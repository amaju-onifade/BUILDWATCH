import styles from './ActivityChart.module.css'

type BarData = {
  heightPercent: number
  state: 'active' | 'zero' | 'warning'
  label: string
}

const defaultWeeks: BarData[] = [
  { heightPercent: 70, state: 'active', label: '10 May' },
  { heightPercent: 90, state: 'active', label: '17 May' },
  { heightPercent: 50, state: 'active', label: '24 May' },
  { heightPercent: 10, state: 'zero', label: '31 May' },
  { heightPercent: 10, state: 'zero', label: '7 Jun' },
  { heightPercent: 60, state: 'warning', label: '14 Jun' },
  { heightPercent: 30, state: 'active', label: '21 Jun' },
]

export type ActivityChartProps = {
  weeks?: BarData[]
}

function getBarClass(state: BarData['state']): string {
  switch (state) {
    case 'active': return ''
    case 'zero': return styles.barZero
    case 'warning': return styles.barWarning
  }
}

export default function ActivityChart({ weeks = defaultWeeks }: ActivityChartProps) {
  return (
    <div className={styles.card}>
      <div className={styles.title}>Submission activity</div>
      <div className={styles.chart}>
        {weeks.map((w, i) => (
          <div
            key={i}
            className={`${styles.bar} ${getBarClass(w.state)}`}
            style={{ height: `${Math.max(w.heightPercent, 4)}%` }}
          />
        ))}
      </div>
      <div className={styles.weekLabels}>
        {weeks.map((w, i) => (
          <span key={i} className={styles.weekLabel}>{w.label}</span>
        ))}
      </div>
      <div className={styles.subLabel}>Past 7 weeks</div>
    </div>
  )
}
