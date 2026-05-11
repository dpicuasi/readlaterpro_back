const cron = require('node-cron');

const env = require('../config/env');
const { sendHighPriorityReminders } = require('../services/notificationService');

let jobInstance = null;

const schedulePriorityReminderJob = () => {
  if (jobInstance) {
    return jobInstance;
  }

  const cronExpression = env.notifications.priorityCron;
  const timezone = env.notifications.timezone;

  jobInstance = cron.schedule(
    cronExpression,
    async () => {
      try {
        const result = await sendHighPriorityReminders();
        if (env.nodeEnv !== 'test') {
          console.log('[Notifications] Recordatorio de prioridad ejecutado:', result);
        }
      } catch (error) {
        console.error('[Notifications] Error ejecutando recordatorio de prioridad:', error);
      }
    },
    {
      scheduled: env.notifications.enabled,
      timezone,
    }
  );

  return jobInstance;
};

module.exports = {
  schedulePriorityReminderJob,
};
