import { userService } from './userService';

class ScheduledTaskService {
  private lowCreditsNotificationInterval: any | null = null;
  private emailVerificationReminderInterval: NodeJS.Timeout | null = null;
  private readonly LOW_CREDITS_CHECK_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly LOW_CREDITS_THRESHOLD = 5;
  private readonly EMAIL_VERIFICATION_REMINDER_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours
  private readonly EMAIL_VERIFICATION_REMINDER_THRESHOLD = 24; // 24 hours

  /**
   * Start all scheduled tasks
   */
  startScheduledTasks(): void {
    console.log('Starting scheduled tasks...');
    
    // Start low credits notification task
    this.startLowCreditsNotifications();
    
    // Start email verification reminder task
    this.startEmailVerificationReminders();
    
    console.log('Scheduled tasks started successfully');
  }

  /**
   * Stop all scheduled tasks
   */
  stopScheduledTasks(): void {
    console.log('Stopping scheduled tasks...');
    
    if (this.lowCreditsNotificationInterval) {
      clearInterval(this.lowCreditsNotificationInterval);
      this.lowCreditsNotificationInterval = null;
    }
    
    if (this.emailVerificationReminderInterval) {
      clearInterval(this.emailVerificationReminderInterval);
      this.emailVerificationReminderInterval = null;
    }
    
    console.log('Scheduled tasks stopped');
  }

  /**
   * Start low credits notification task
   */
  private startLowCreditsNotifications(): void {
    // Run immediately on startup
    this.runLowCreditsNotificationTask();
    
    // Then run every 24 hours
    this.lowCreditsNotificationInterval = setInterval(() => {
      this.runLowCreditsNotificationTask();
    }, this.LOW_CREDITS_CHECK_INTERVAL);
    
    console.log(`Low credits notification task scheduled to run every ${this.LOW_CREDITS_CHECK_INTERVAL / (60 * 60 * 1000)} hours`);
  }

  /**
   * Run low credits notification task
   */
  private async runLowCreditsNotificationTask(): Promise<void> {
    try {
      console.log('Running low credits notification task...');
      
      const notificationsSent = await userService.sendLowCreditsNotifications(
        this.LOW_CREDITS_THRESHOLD
      );
      
      console.log(`Low credits notification task completed. Sent ${notificationsSent} notifications.`);
    } catch (error) {
      console.error('Error running low credits notification task:', error);
    }
  }

  /**
   * Start email verification reminder task
   */
  private startEmailVerificationReminders(): void {
    // Run immediately on startup
    this.runEmailVerificationReminderTask();
    
    // Then run every 6 hours
    this.emailVerificationReminderInterval = setInterval(() => {
      this.runEmailVerificationReminderTask();
    }, this.EMAIL_VERIFICATION_REMINDER_INTERVAL);
    
    console.log(`Email verification reminder task scheduled to run every ${this.EMAIL_VERIFICATION_REMINDER_INTERVAL / (60 * 60 * 1000)} hours`);
  }

  /**
   * Run email verification reminder task
   */
  private async runEmailVerificationReminderTask(): Promise<void> {
    try {
      console.log('Running email verification reminder task...');
      
      const remindersSent = await userService.sendVerificationReminders(
        this.EMAIL_VERIFICATION_REMINDER_THRESHOLD
      );
      
      console.log(`Email verification reminder task completed. Sent ${remindersSent} reminders.`);
    } catch (error) {
      console.error('Error running email verification reminder task:', error);
    }
  }

  /**
   * Manually trigger low credits notifications (for admin use)
   */
  async triggerLowCreditsNotifications(): Promise<number> {
    console.log('Manually triggering low credits notifications...');
    return await userService.sendLowCreditsNotifications(this.LOW_CREDITS_THRESHOLD);
  }

  /**
   * Manually trigger email verification reminders (for admin use)
   */
  async triggerEmailVerificationReminders(): Promise<number> {
    console.log('Manually triggering email verification reminders...');
    return await userService.sendVerificationReminders(this.EMAIL_VERIFICATION_REMINDER_THRESHOLD);
  }

  /**
   * Get task status
   */
  getTaskStatus(): {
    lowCreditsNotifications: {
      running: boolean;
      interval: number;
      threshold: number;
    };
    emailVerificationReminders: {
      running: boolean;
      interval: number;
      threshold: number;
    };
  } {
    return {
      lowCreditsNotifications: {
        running: this.lowCreditsNotificationInterval !== null,
        interval: this.LOW_CREDITS_CHECK_INTERVAL,
        threshold: this.LOW_CREDITS_THRESHOLD,
      },
      emailVerificationReminders: {
        running: this.emailVerificationReminderInterval !== null,
        interval: this.EMAIL_VERIFICATION_REMINDER_INTERVAL,
        threshold: this.EMAIL_VERIFICATION_REMINDER_THRESHOLD,
      },
    };
  }
}

export const scheduledTaskService = new ScheduledTaskService();

// Handle graceful shutdown
process.on('SIGTERM', () => {
  scheduledTaskService.stopScheduledTasks();
});

process.on('SIGINT', () => {
  scheduledTaskService.stopScheduledTasks();
});