'use client'

import React from 'react'
import styles from './ProjectDetailsForm.module.css'

const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue',
  'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu',
  'FCT - Abuja', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina',
  'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo',
  'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
]

const BUILD_TYPES = [
  'Residential — Bungalow',
  'Residential — Duplex',
  'Residential — Storey Building',
  'Renovation',
  'Extension',
  'Commercial',
]

const CURRENCIES = ['₦', '£', '$']

export type ProjectDetailsFormData = {
  projectName: string
  state: string
  lga: string
  buildType: string
  currency: string
  totalBudget: string
  startDate: string
}

type ProjectDetailsFormProps = {
  data: ProjectDetailsFormData
  onChange: (data: ProjectDetailsFormData) => void
}

export function ProjectDetailsForm({ data, onChange }: ProjectDetailsFormProps) {
  const update = (partial: Partial<ProjectDetailsFormData>) => {
    onChange({ ...data, ...partial })
  }

  return (
    <div className={styles.card}>
      <h2 className={styles.sectionTitle}>Project details</h2>

      <div className={styles.field}>
        <label className={styles.label}>Project name</label>
        <input
          type="text"
          className={styles.input}
          value={data.projectName}
          onChange={(e) => update({ projectName: e.target.value })}
          placeholder="e.g. Family home — Enugu"
        />
      </div>

      <div className={styles.row}>
        <div className={styles.halfField}>
          <label className={styles.label}>State</label>
          <select
            className={styles.select}
            value={data.state}
            onChange={(e) => update({ state: e.target.value })}
          >
            {NIGERIAN_STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className={styles.halfField}>
          <label className={styles.label}>LGA</label>
          <input
            type="text"
            className={styles.input}
            value={data.lga}
            onChange={(e) => update({ lga: e.target.value })}
            placeholder="e.g. Ikeja"
          />
        </div>
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Build type</label>
        <select
          className={styles.select}
          value={data.buildType}
          onChange={(e) => update({ buildType: e.target.value })}
        >
          {BUILD_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <div className={styles.row}>
        <div className={styles.currencyField}>
          <label className={styles.label}>Currency</label>
          <select
            className={styles.select}
            value={data.currency}
            onChange={(e) => update({ currency: e.target.value })}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className={styles.budgetField}>
          <label className={styles.label}>Total budget</label>
          <input
            type="text"
            className={styles.input}
            value={data.totalBudget}
            onChange={(e) => update({ totalBudget: e.target.value })}
            placeholder="e.g. 9,000,000"
          />
        </div>
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Start date</label>
        <input
          type="date"
          className={styles.input}
          value={data.startDate}
          onChange={(e) => update({ startDate: e.target.value })}
        />
      </div>
    </div>
  )
}
