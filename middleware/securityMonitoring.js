const fs = require('fs');
const path = require('path');

// Security event types
const SECURITY_EVENTS = {
  SUSPICIOUS_REQUEST: 'suspicious_request',
  FAILED_LOGIN: 'failed_login',
  BRUTE_FORCE: 'brute_force',
  UNAUTHORIZED_ACCESS: 'unauthorized_access',
  FILE_UPLOAD_VIOLATION: 'file_upload_violation',
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
  SQL_INJECTION_ATTEMPT: 'sql_injection_attempt',
  XSS_ATTEMPT: 'xss_attempt',
  CSRF_VIOLATION: 'csrf_violation'
};

// Security monitoring class
class SecurityMonitor {
  constructor() {
    this.events = [];
    this.alertThresholds = {
      [SECURITY_EVENTS.FAILED_LOGIN]: { count: 5, timeWindow: 15 * 60 * 1000 }, // 5 in 15 minutes
      [SECURITY_EVENTS.SUSPICIOUS_REQUEST]: { count: 10, timeWindow: 60 * 1000 }, // 10 in 1 minute
      [SECURITY_EVENTS.UNAUTHORIZED_ACCESS]: { count: 3, timeWindow: 5 * 60 * 1000 }, // 3 in 5 minutes
      [SECURITY_EVENTS.RATE_LIMIT_EXCEEDED]: { count: 1, timeWindow: 60 * 1000 } // 1 in 1 minute
    };
    this.logFile = path.join(__dirname, '../logs/security.log');
    this.ensureLogDirectory();
  }

  ensureLogDirectory() {
    const logDir = path.dirname(this.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  logEvent(eventType, details, req = null) {
    const event = {
      id: this.generateEventId(),
      type: eventType,
      timestamp: new Date().toISOString(),
      details,
      ip: req?.ip || 'unknown',
      userAgent: req?.get('User-Agent') || 'unknown',
      url: req?.originalUrl || 'unknown',
      method: req?.method || 'unknown',
      userId: req?.user?.id || null,
      severity: this.getSeverity(eventType)
    };

    // Add to memory (keep last 1000 events)
    this.events.push(event);
    if (this.events.length > 1000) {
      this.events.shift();
    }

    // Log to file
    this.writeToLogFile(event);

    // Check for alerts
    this.checkAlerts(eventType, event.ip);

    // Console log for immediate visibility
    this.consoleLog(event);

    return event;
  }

  generateEventId() {
    return `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getSeverity(eventType) {
    const severityMap = {
      [SECURITY_EVENTS.FAILED_LOGIN]: 'medium',
      [SECURITY_EVENTS.BRUTE_FORCE]: 'high',
      [SECURITY_EVENTS.UNAUTHORIZED_ACCESS]: 'high',
      [SECURITY_EVENTS.SQL_INJECTION_ATTEMPT]: 'critical',
      [SECURITY_EVENTS.XSS_ATTEMPT]: 'high',
      [SECURITY_EVENTS.SUSPICIOUS_REQUEST]: 'medium',
      [SECURITY_EVENTS.FILE_UPLOAD_VIOLATION]: 'medium',
      [SECURITY_EVENTS.RATE_LIMIT_EXCEEDED]: 'low',
      [SECURITY_EVENTS.CSRF_VIOLATION]: 'high'
    };
    return severityMap[eventType] || 'low';
  }

  writeToLogFile(event) {
    try {
      const logEntry = `${event.timestamp} [${event.severity.toUpperCase()}] ${event.type} - IP: ${event.ip} - ${JSON.stringify(event.details)}\n`;
      fs.appendFileSync(this.logFile, logEntry);
    } catch (error) {
      console.error('Failed to write to security log:', error);
    }
  }

  consoleLog(event) {
    const emoji = {
      low: '🔵',
      medium: '🟡',
      high: '🟠',
      critical: '🔴'
    };

    console.log(`${emoji[event.severity]} SECURITY EVENT [${event.severity.toUpperCase()}]`);
    console.log(`   Type: ${event.type}`);
    console.log(`   IP: ${event.ip}`);
    console.log(`   URL: ${event.url}`);
    console.log(`   Details:`, event.details);
    console.log(`   Time: ${event.timestamp}`);
    console.log('---');
  }

  checkAlerts(eventType, ip) {
    const threshold = this.alertThresholds[eventType];
    if (!threshold) return;

    const now = Date.now();
    const recentEvents = this.events.filter(event => 
      event.type === eventType &&
      event.ip === ip &&
      (now - new Date(event.timestamp).getTime()) < threshold.timeWindow
    );

    if (recentEvents.length >= threshold.count) {
      this.triggerAlert(eventType, ip, recentEvents);
    }
  }

  triggerAlert(eventType, ip, events) {
    const alert = {
      id: this.generateEventId(),
      type: 'SECURITY_ALERT',
      alertType: eventType,
      ip,
      eventCount: events.length,
      timeWindow: this.alertThresholds[eventType].timeWindow,
      timestamp: new Date().toISOString(),
      events: events.map(e => e.id)
    };

    console.error('🚨🚨🚨 SECURITY ALERT 🚨🚨🚨');
    console.error(`Alert Type: ${eventType}`);
    console.error(`IP Address: ${ip}`);
    console.error(`Event Count: ${events.length}`);
    console.error(`Time Window: ${this.alertThresholds[eventType].timeWindow / 1000}s`);
    console.error('🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨');

    // Log alert to file
    this.writeToLogFile(alert);

    // Here you could integrate with external alerting systems
    // this.sendToSlack(alert);
    // this.sendEmail(alert);
    // this.sendToSecurityService(alert);
  }

  getSecurityReport(timeRange = 24 * 60 * 60 * 1000) { // Default: last 24 hours
    const now = Date.now();
    const recentEvents = this.events.filter(event => 
      (now - new Date(event.timestamp).getTime()) < timeRange
    );

    const report = {
      timeRange: `${timeRange / (60 * 60 * 1000)} hours`,
      totalEvents: recentEvents.length,
      eventsByType: {},
      eventsBySeverity: {},
      topIPs: {},
      timeline: []
    };

    recentEvents.forEach(event => {
      // Count by type
      report.eventsByType[event.type] = (report.eventsByType[event.type] || 0) + 1;
      
      // Count by severity
      report.eventsBySeverity[event.severity] = (report.eventsBySeverity[event.severity] || 0) + 1;
      
      // Count by IP
      report.topIPs[event.ip] = (report.topIPs[event.ip] || 0) + 1;
    });

    // Sort top IPs
    report.topIPs = Object.entries(report.topIPs)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .reduce((obj, [ip, count]) => ({ ...obj, [ip]: count }), {});

    return report;
  }

  // Middleware functions
  logSuspiciousRequest(details) {
    return (req, res, next) => {
      this.logEvent(SECURITY_EVENTS.SUSPICIOUS_REQUEST, details, req);
      next();
    };
  }

  logFailedLogin(email, reason) {
    return (req, res, next) => {
      this.logEvent(SECURITY_EVENTS.FAILED_LOGIN, { email, reason }, req);
      next();
    };
  }

  logUnauthorizedAccess(resource, action) {
    return (req, res, next) => {
      this.logEvent(SECURITY_EVENTS.UNAUTHORIZED_ACCESS, { resource, action }, req);
      next();
    };
  }

  logFileUploadViolation(violation, filename) {
    return (req, res, next) => {
      this.logEvent(SECURITY_EVENTS.FILE_UPLOAD_VIOLATION, { violation, filename }, req);
      next();
    };
  }

  logRateLimitExceeded(limit, timeWindow) {
    return (req, res, next) => {
      this.logEvent(SECURITY_EVENTS.RATE_LIMIT_EXCEEDED, { limit, timeWindow }, req);
      next();
    };
  }
}

// Create singleton instance
const securityMonitor = new SecurityMonitor();

// Export middleware functions
const logSecurityEvent = (eventType, details) => {
  return (req, res, next) => {
    securityMonitor.logEvent(eventType, details, req);
    next();
  };
};

const getSecurityReport = (req, res) => {
  const timeRange = req.query.hours ? parseInt(req.query.hours) * 60 * 60 * 1000 : undefined;
  const report = securityMonitor.getSecurityReport(timeRange);
  res.json(report);
};

module.exports = {
  securityMonitor,
  logSecurityEvent,
  getSecurityReport,
  SECURITY_EVENTS
};
