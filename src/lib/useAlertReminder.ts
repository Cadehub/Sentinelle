import { useEffect, useState, useCallback } from 'react'
import { supabase } from './supabase'
import { differenceInDays } from 'date-fns'

interface AlertForReminder {
  id: string
  title: string
  created_at: string
  updated_at: string | null
}

export function useAlertReminder(userId: string | undefined) {
  const [reminderAlert, setReminderAlert] = useState<AlertForReminder | null>(null)
  const [isCheckingReminders, setIsCheckingReminders] = useState(false)

  // Fetch active alerts that need reminder (created > 6 days ago)
  const checkForReminders = useCallback(async () => {
    if (!userId) return

    setIsCheckingReminders(true)
    try {
      const { data, error } = await supabase
        .from('alerts')
        .select('id, title, created_at, updated_at')
        .eq('user_id', userId)
        .in('status', ['active', 'actif'])
        .order('created_at', { ascending: true })

      if (error) {
        console.error('[AlertReminder] Error fetching alerts:', error)
        return
      }

      if (!data || data.length === 0) {
        setReminderAlert(null)
        return
      }

      // Find first alert that's older than 6 days (check updated_at, fallback to created_at)
      const now = new Date()
      const alertNeedingReminder = data.find((alert) => {
        // Use updated_at if available, otherwise fallback to created_at
        const referenceDate = alert.updated_at ? new Date(alert.updated_at) : new Date(alert.created_at)
        const daysOld = differenceInDays(now, referenceDate)
        return daysOld > 6
      })

      if (alertNeedingReminder) {
        console.log('[AlertReminder] Found alert needing reminder:', alertNeedingReminder.id)
        setReminderAlert(alertNeedingReminder)
      } else {
        setReminderAlert(null)
      }
    } catch (err) {
      console.error('[AlertReminder] Error in checkForReminders:', err)
    } finally {
      setIsCheckingReminders(false)
    }
  }, [userId])

  // Check on mount and whenever userId changes
  useEffect(() => {
    checkForReminders()
  }, [userId, checkForReminders])

  // Extend alert for 7 more days
  const extendAlert = useCallback(
    async (alertId: string) => {
      const { error } = await supabase
        .from('alerts')
        .update({
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', alertId)

      if (error) {
        console.error('[AlertReminder] Error extending alert:', error)
        throw error
      }

      console.log('[AlertReminder] Alert extended:', alertId)
      // Immediately clear the reminder modal to force it to disappear
      setReminderAlert(null)
      // Refresh reminders to detect any other alerts that need reminders
      await checkForReminders()
    },
    [checkForReminders]
  )

  // Mark alert as resolved
  const resolveAlert = useCallback(
    async (alertId: string) => {
      const { error } = await supabase
        .from('alerts')
        .update({
          status: 'resolu',
          updated_at: new Date().toISOString(),
        })
        .eq('id', alertId)

      if (error) {
        console.error('[AlertReminder] Error resolving alert:', error)
        throw error
      }

      console.log('[AlertReminder] Alert resolved:', alertId)
      // Immediately clear the reminder modal to force it to disappear
      setReminderAlert(null)
      // Refresh reminders to detect any other alerts that need reminders
      await checkForReminders()
    },
    [checkForReminders]
  )

  return {
    reminderAlert,
    isCheckingReminders,
    extendAlert,
    resolveAlert,
  }
}
