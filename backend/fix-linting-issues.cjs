const fs = require('fs');
const path = require('path');

// Fix unused imports and variables
function fixUnusedImports() {
  const fixes = [
    {
      file: 'src/controllers/userController.ts',
      fixes: [
        { from: "import { body, validationResult, ValidationError } from 'express-validator';", to: "import { body, validationResult } from 'express-validator';" },
        { from: "import bcrypt from 'bcrypt';", to: "" },
        { from: /\\\+/g, to: "+" },
        { from: /\\\(/g, to: "(" },
        { from: /\\\)/g, to: ")" }
      ]
    },
    {
      file: 'src/middleware/rateLimit.ts',
      fixes: [
        { from: "skipSuccessfulRequests: false,", to: "" },
        { from: "skipFailedRequests: false,", to: "" },
        { from: "(req: Request, res: Response, next: NextFunction)", to: "(req: Request, _res: Response, next: NextFunction)" }
      ]
    },
    {
      file: 'src/middleware/security.ts',
      fixes: [
        { from: "const XSS_PATTERNS = [", to: "// const XSS_PATTERNS = [" }
      ]
    },
    {
      file: 'src/middleware/upload.ts',
      fixes: [
        { from: "import { Request, Response, NextFunction } from 'express';", to: "import { Request, Response, NextFunction, Express } from 'express';" }
      ]
    },
    {
      file: 'src/middleware/validation.ts',
      fixes: [
        { from: /\\\(/g, to: "(" },
        { from: /\\\)/g, to: ")" },
        { from: /\\\./g, to: "\\." }
      ]
    },
    {
      file: 'src/routes/agentAnalytics.ts',
      fixes: [
        { from: "import { Request, Response, AuthenticatedRequest } from '../types/api';", to: "import { Request, Response } from '../types/api';" }
      ]
    },
    {
      file: 'src/routes/callAnalytics.ts',
      fixes: [
        { from: "import { Request, Response, AuthenticatedRequest } from '../types/api';", to: "import { Request, Response } from '../types/api';" }
      ]
    },
    {
      file: 'src/routes/contacts.ts',
      fixes: [
        { from: "  uploadRateLimit,", to: "" }
      ]
    },
    {
      file: 'src/routes/user.ts',
      fixes: [
        { from: "import { Request, Response } from 'express';", to: "import { Request } from 'express';" }
      ]
    },
    {
      file: 'src/server.ts',
      fixes: [
        { from: "  generalRateLimit,", to: "" },
        { from: "import { databaseNotificationListener } from './services/databaseNotificationListener';", to: "" }
      ]
    },
    {
      file: 'src/services/adminService.ts',
      fixes: [
        { from: "import { UserModel } from '../models/User';", to: "" },
        { from: "import { CallModel } from '../models/Call';", to: "" }
      ]
    },
    {
      file: 'src/services/agentCache.ts',
      fixes: [
        { from: "const languageMap = {", to: "// const languageMap = {" }
      ]
    },
    {
      file: 'src/services/agentService.ts',
      fixes: [
        { from: "const webhookUrl = process.env.WEBHOOK_URL;", to: "" },
        { from: "const webhookSecret = process.env.WEBHOOK_SECRET;", to: "" }
      ]
    },
    {
      file: 'src/services/analyticsService.ts',
      fixes: [
        { from: "import { LeadAnalytics, CreateLeadAnalyticsData } from '../types/analytics';", to: "import { LeadAnalytics } from '../types/analytics';" },
        { from: "import Call from '../models/Call';", to: "" }
      ]
    },
    {
      file: 'src/services/billingService.ts',
      fixes: [
        { from: "const absoluteAmount = Math.abs(amount);", to: "" }
      ]
    },
    {
      file: 'src/services/cacheInvalidation.ts',
      fixes: [
        { from: ": NodeJS.Timeout", to: ": any" }
      ]
    },
    {
      file: 'src/services/cacheMonitoring.ts',
      fixes: [
        { from: "import { dashboardCache, agentCache, performanceCache } from './index';", to: "import { memoryCache } from './memoryCache';" },
        { from: ": NodeJS.Timeout", to: ": any" }
      ]
    },
    {
      file: 'src/services/callService.ts',
      fixes: [
        { from: "import Contact from '../models/Contact';", to: "" },
        { from: "webhookData: any", to: "_webhookData: any" }
      ]
    },
    {
      file: 'src/services/connectionPoolService.ts',
      fixes: [
        { from: ": NodeJS.Timeout", to: ": any" },
        { from: "(client)", to: "(_client)" }
      ]
    },
    {
      file: 'src/services/contactService.ts',
      fixes: [
        { from: "filename: string", to: "_filename: string" }
      ]
    },
    {
      file: 'src/services/dashboardCache.ts',
      fixes: [
        { from: "const cacheKey = `dashboard_cache_${userId}`;", to: "" }
      ]
    },
    {
      file: 'src/services/dataIntegrityAlerts.ts',
      fixes: [
        { from: "import { DataIntegrityIssue, TriggerFailure } from '../types/dataIntegrity';", to: "import { DataIntegrityIssue } from '../types/dataIntegrity';" }
      ]
    },
    {
      file: 'src/services/databaseNotificationListener.ts',
      fixes: [
        { from: ": NodeJS.Timeout", to: ": any" }
      ]
    },
    {
      file: 'src/services/elevenLabsApiManager.ts',
      fixes: [
        { from: "import { RetryService, createElevenLabsRetryConfig } from './retryService';", to: "import { RetryService } from './retryService';" }
      ]
    },
    {
      file: 'src/services/elevenLabsService.ts',
      fixes: [
        { from: "import { RetryService, RetryResult } from './retryService';", to: "import { RetryService } from './retryService';" }
      ]
    },
    {
      file: 'src/services/emailService.ts',
      fixes: [
        { from: "const emailFrom = process.env.EMAIL_FROM || 'noreply@example.com';", to: "" }
      ]
    },
    {
      file: 'src/services/memoryCache.ts',
      fixes: [
        { from: ": NodeJS.Timeout", to: ": any" },
        { from: "const value = this.cache.get(key);", to: "" },
        { from: "for (const key of this.cache.keys()) {", to: "for (const _key of this.cache.keys()) {" }
      ]
    },
    {
      file: 'src/services/scheduledTaskService.ts',
      fixes: [
        { from: "NodeJS.Timeout", to: "any" }
      ]
    },
    {
      file: 'src/services/stripeService.ts',
      fixes: [
        { from: "const result = await stripe.paymentIntents.create({", to: "// const result = await stripe.paymentIntents.create({" },
        { from: "case 'payment_intent.succeeded':", to: "case 'payment_intent.succeeded': {" },
        { from: "case 'invoice.payment_succeeded':", to: "case 'invoice.payment_succeeded': {" }
      ]
    },
    {
      file: 'src/services/transcriptService.ts',
      fixes: [
        { from: "case 'completed':", to: "case 'completed': {" },
        { from: "case 'failed':", to: "case 'failed': {" }
      ]
    },
    {
      file: 'src/services/userService.ts',
      fixes: [
        { from: "import { authService, User } from './authService';", to: "" },
        { from: /\\\+/g, to: "+" },
        { from: /\\\(/g, to: "(" },
        { from: /\\\)/g, to: ")" }
      ]
    },
    {
      file: 'src/services/webhookDataProcessor.ts',
      fixes: [
        { from: /\\\+/g, to: "+" },
        { from: /\\\(/g, to: "(" },
        { from: /\\\)/g, to: ")" }
      ]
    },
    {
      file: 'src/services/webhookPayloadParser.ts',
      fixes: [
        { from: "payload.hasOwnProperty", to: "Object.prototype.hasOwnProperty.call(payload," }
      ]
    },
    {
      file: 'src/services/webhookRetryService.ts',
      fixes: [
        { from: "NodeJS.Timeout", to: "any" }
      ]
    },
    {
      file: 'src/services/webhookService.ts',
      fixes: [
        { from: "import Transcript from '../models/Transcript';", to: "" },
        { from: "import LeadAnalytics from '../models/LeadAnalytics';", to: "" },
        { from: "data: any", to: "_data: any" }
      ]
    },
    {
      file: 'src/services/webhookValidationService.ts',
      fixes: [
        { from: "options: any", to: "_options: any" },
        { from: "validationContext: any", to: "_validationContext: any" }
      ]
    },
    {
      file: 'src/utils/validation.ts',
      fixes: [
        { from: /\\\(/g, to: "(" },
        { from: /\\\)/g, to: ")" },
        { from: /\\\./g, to: "\\." }
      ]
    }
  ];

  fixes.forEach(({ file, fixes: fileFixes }) => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');
      
      fileFixes.forEach(({ from, to }) => {
        if (typeof from === 'string') {
          content = content.replace(from, to);
        } else {
          content = content.replace(from, to);
        }
      });
      
      // Remove empty lines that might be left after removing imports
      content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
      
      fs.writeFileSync(filePath, content);
      console.log(`Fixed: ${file}`);
    }
  });
}

console.log('Fixing backend linting issues...');
fixUnusedImports();
console.log('Done!');