/**
 * Enhanced logging utility for value-first onboarding implementation
 * Provides structured logging for debugging and monitoring new code paths
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogContext = 'onboarding' | 'feature-flags' | 'asset-selection' | 'plan-selection' | 'database' | 'stripe';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  context: LogContext;
  message: string;
  data?: any;
  userId?: string;
  sessionId?: string;
}

class Logger {
  private isDev = import.meta.env.NODE_ENV === 'development';
  private logs: LogEntry[] = [];
  private maxLogs = 1000; // Keep last 1000 logs in memory

  private createEntry(
    level: LogLevel,
    context: LogContext,
    message: string,
    data?: any,
    userId?: string
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      context,
      message,
      data,
      userId,
      sessionId: this.getSessionId()
    };
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('debug_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      sessionStorage.setItem('debug_session_id', sessionId);
    }
    return sessionId;
  }

  private output(entry: LogEntry) {
    // Store in memory for debugging
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Console output in development
    if (this.isDev) {
      const emoji = {
        debug: '🔍',
        info: 'ℹ️',
        warn: '⚠️',
        error: '🚨'
      }[entry.level];

      const contextColor = {
        'onboarding': 'color: #10B981',
        'feature-flags': 'color: #8B5CF6',
        'asset-selection': 'color: #F59E0B',
        'plan-selection': 'color: #3B82F6',
        'database': 'color: #EF4444',
        'stripe': 'color: #6366F1'
      }[entry.context];

      console.log(
        `%c${emoji} [${entry.context.toUpperCase()}] ${entry.message}`,
        contextColor,
        entry.data ? entry.data : ''
      );

      if (entry.data && typeof entry.data === 'object') {
        console.table(entry.data);
      }
    }
  }

  // Public logging methods
  debug(context: LogContext, message: string, data?: any, userId?: string) {
    this.output(this.createEntry('debug', context, message, data, userId));
  }

  info(context: LogContext, message: string, data?: any, userId?: string) {
    this.output(this.createEntry('info', context, message, data, userId));
  }

  warn(context: LogContext, message: string, data?: any, userId?: string) {
    this.output(this.createEntry('warn', context, message, data, userId));
  }

  error(context: LogContext, message: string, data?: any, userId?: string) {
    this.output(this.createEntry('error', context, message, data, userId));
  }

  // Specialized logging methods for onboarding flow
  onboardingStep(step: string, data?: any, userId?: string) {
    this.info('onboarding', `Step: ${step}`, data, userId);
  }

  featureFlag(flag: string, enabled: boolean, userId?: string) {
    this.debug('feature-flags', `${flag} = ${enabled}`, { flag, enabled }, userId);
  }

  assetSelection(action: string, assetCount: number, assets: any[], userId?: string) {
    this.info('asset-selection', `${action} - ${assetCount} assets`, { 
      action, 
      assetCount, 
      assetIds: assets.map(a => a.id || a.slug) 
    }, userId);
  }

  planRecommendation(recommendedTier: string, assetCount: number, userId?: string) {
    this.info('plan-selection', `Recommended ${recommendedTier} for ${assetCount} assets`, {
      recommendedTier,
      assetCount
    }, userId);
  }

  databaseOperation(operation: string, table: string, success: boolean, error?: any, userId?: string) {
    const level = success ? 'info' : 'error';
    this[level]('database', `${operation} on ${table}: ${success ? 'SUCCESS' : 'FAILED'}`, {
      operation,
      table,
      success,
      error: error?.message || error
    }, userId);
  }

  stripeOperation(operation: string, success: boolean, sessionId?: string, error?: any, userId?: string) {
    const level = success ? 'info' : 'error';
    this[level]('stripe', `${operation}: ${success ? 'SUCCESS' : 'FAILED'}`, {
      operation,
      success,
      stripeSessionId: sessionId,
      error: error?.message || error
    }, userId);
  }

  // Debug utilities
  getLogs(context?: LogContext, level?: LogLevel): LogEntry[] {
    return this.logs.filter(log => {
      if (context && log.context !== context) return false;
      if (level && log.level !== level) return false;
      return true;
    });
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  clearLogs() {
    this.logs = [];
    console.log('🧹 Logger cleared');
  }

  // Get summary of recent activity
  getSummary(): { [context: string]: { [level: string]: number } } {
    const summary: { [context: string]: { [level: string]: number } } = {};
    
    this.logs.forEach(log => {
      if (!summary[log.context]) {
        summary[log.context] = { debug: 0, info: 0, warn: 0, error: 0 };
      }
      summary[log.context][log.level]++;
    });
    
    return summary;
  }
}

// Export singleton instance
export const logger = new Logger();

// Development helpers
if (import.meta.env.NODE_ENV === 'development') {
  // Make logger available globally for debugging
  (window as any).logger = logger;
  
  // Log startup
  logger.info('feature-flags', 'Enhanced logging initialized for value-first onboarding');
}