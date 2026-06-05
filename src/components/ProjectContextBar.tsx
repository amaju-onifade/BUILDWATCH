import styles from './ProjectContextBar.module.css'

type Props = {
  name: string
  location: string
}

export function ProjectContextBar({ name, location }: Props) {
  return (
    <header className={styles.bar}>
      <div className={styles.left}>
        <h1 className={styles.name}>{name}</h1>
        <span className={styles.location}>{location}</span>
      </div>
    </header>
  )
}
