'use client'

import Link from 'next/link'
import { BellPlus } from 'lucide-react'
import styles from './reminder-fab.module.css'

export default function ReminderFab() {
  return <Link href="/reminders" className={styles.fab} aria-label="Create a new reminder"><BellPlus/><span>New reminder</span></Link>
}
