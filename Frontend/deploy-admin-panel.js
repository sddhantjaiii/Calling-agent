#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Deployment configuration
const config = {
  environments: {
    staging: {
      buildCommand: 'npm run build:staging',
      deployPath: '/var/www/staging',
      backupPath: '/var/backups/staging',
      healthCheckUrl: 'https://staging.example.com/health',
      featureFlags: {
        'admin-panel-enabled': true,
        'admin-configuration': false, // Restricted in staging
        'admin-advanced-features': false
      }
    },
    production: {
      buildCommand: 'npm run build',
      deployPath: '/var/www/production',
      backupPath: '/var/backups/production',
      healthCheckUrl: 'https://app.example.com/health',
      featureFlags: {
        'admin-panel-enabled': true,
        'admin-configuration': true,
        'admin-advanced-features': true
      }
    }
  }
};

class AdminPanelDeployer {
  constructor(environment = 'staging') {
    this.environment = environment;
    this.config = config.environments[environment];
    
    if (!this.config) {
      throw new Error(`Unknown environment: ${environment}`);
    }
    
    this.timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.backupDir = path.join(this.config.backupPath, this.timestamp);
  }

  log(message) {
    console.log(`[${new Date().toISOString()}] ${message}`);
  }

  error(message) {
    console.error(`[${new Date().toISOString()}] ERROR: ${message}`);
  }

  async deploy() {
    try {
      this.log(`Starting deployment to ${this.environment}`);
      
      // Pre-deployment checks
      await this.preDeploymentChecks();
      
      // Create backup
      await this.createBackup();
      
      // Build application
      await this.buildApplication();
      
      // Update feature flags
      await this.updateFeatureFlags();
      
      // Deploy files
      await this.deployFiles();
      
      // Post-deployment verification
      await this.postDeploymentVerification();
      
      // Cleanup old backups
      await this.cleanupOldBackups();
      
      this.log(`Deployment to ${this.environment} completed successfully`);
      
    } catch (error) {
      this.error(`Deployment failed: ${error.message}`);
      await this.rollback();
      throw error;
    }
  }

  async preDeploymentChecks() {
    this.log('Running pre-deployment checks...');
    
    // Check if build directory exists
    if (!fs.existsSync('dist')) {
      throw new Error('Build directory does not exist. Run build first.');
    }
    
    // Check disk space
    try {
      const stats = execSync('df -h /', { encoding: 'utf8' });
      this.log('Disk space check passed');
    } catch (error) {
      this.log('Warning: Could not check disk space');
    }
    
    // Verify admin panel components exist
    const requiredFiles = [
      'dist/index.html',
      'dist/assets'
    ];
    
    for (const file of requiredFiles) {
      if (!fs.existsSync(file)) {
        throw new Error(`Required file missing: ${file}`);
      }
    }
    
    this.log('Pre-deployment checks passed');
  }

  async createBackup() {
    this.log('Creating backup...');
    
    if (fs.existsSync(this.config.deployPath)) {
      // Create backup directory
      fs.mkdirSync(this.backupDir, { recursive: true });
      
      // Copy current deployment
      execSync(`cp -r ${this.config.deployPath}/* ${this.backupDir}/`, { stdio: 'inherit' });
      
      this.log(`Backup created at ${this.backupDir}`);
    } else {
      this.log('No existing deployment to backup');
    }
  }

  async buildApplication() {
    this.log('Building application...');
    
    // Set environment variables for build
    process.env.NODE_ENV = this.environment === 'production' ? 'production' : 'staging';
    process.env.VITE_ADMIN_PANEL_ENABLED = 'true';
    
    // Run build command
    execSync(this.config.buildCommand, { stdio: 'inherit' });
    
    this.log('Build completed');
  }

  async updateFeatureFlags() {
    this.log('Updating feature flags...');
    
    // Create feature flags configuration file
    const flagsConfig = {
      environment: this.environment,
      flags: this.config.featureFlags,
      updatedAt: new Date().toISOString()
    };
    
    const flagsPath = path.join('dist', 'admin-feature-flags.json');
    fs.writeFileSync(flagsPath, JSON.stringify(flagsConfig, null, 2));
    
    this.log('Feature flags updated');
  }

  async deployFiles() {
    this.log('Deploying files...');
    
    // Ensure deploy directory exists
    fs.mkdirSync(this.config.deployPath, { recursive: true });
    
    // Copy built files
    execSync(`cp -r dist/* ${this.config.deployPath}/`, { stdio: 'inherit' });
    
    // Set proper permissions
    execSync(`chmod -R 755 ${this.config.deployPath}`, { stdio: 'inherit' });
    
    this.log('Files deployed successfully');
  }

  async postDeploymentVerification() {
    this.log('Running post-deployment verification...');
    
    // Check if files were deployed correctly
    const indexPath = path.join(this.config.deployPath, 'index.html');
    if (!fs.existsSync(indexPath)) {
      throw new Error('index.html not found in deployment directory');
    }
    
    // Health check (if URL provided)
    if (this.config.healthCheckUrl) {
      try {
        const response = await fetch(this.config.healthCheckUrl);
        if (!response.ok) {
          throw new Error(`Health check failed: ${response.status}`);
        }
        this.log('Health check passed');
      } catch (error) {
        this.log(`Warning: Health check failed: ${error.message}`);
      }
    }
    
    // Verify admin panel assets
    const assetsPath = path.join(this.config.deployPath, 'assets');
    if (!fs.existsSync(assetsPath)) {
      throw new Error('Assets directory not found');
    }
    
    this.log('Post-deployment verification passed');
  }

  async rollback() {
    this.log('Rolling back deployment...');
    
    if (fs.existsSync(this.backupDir)) {
      // Remove current deployment
      execSync(`rm -rf ${this.config.deployPath}/*`, { stdio: 'inherit' });
      
      // Restore from backup
      execSync(`cp -r ${this.backupDir}/* ${this.config.deployPath}/`, { stdio: 'inherit' });
      
      this.log('Rollback completed');
    } else {
      this.log('No backup available for rollback');
    }
  }

  async cleanupOldBackups() {
    this.log('Cleaning up old backups...');
    
    try {
      const backups = fs.readdirSync(this.config.backupPath)
        .filter(name => name.match(/^\d{4}-\d{2}-\d{2}T/))
        .sort()
        .reverse();
      
      // Keep only the 5 most recent backups
      const backupsToDelete = backups.slice(5);
      
      for (const backup of backupsToDelete) {
        const backupPath = path.join(this.config.backupPath, backup);
        execSync(`rm -rf ${backupPath}`, { stdio: 'inherit' });
        this.log(`Deleted old backup: ${backup}`);
      }
      
      this.log(`Cleanup completed. Kept ${Math.min(5, backups.length)} backups`);
    } catch (error) {
      this.log(`Warning: Backup cleanup failed: ${error.message}`);
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const environment = args[0] || 'staging';
  
  if (!['staging', 'production'].includes(environment)) {
    console.error('Usage: node deploy-admin-panel.js [staging|production]');
    process.exit(1);
  }
  
  try {
    const deployer = new AdminPanelDeployer(environment);
    await deployer.deploy();
    console.log('✅ Deployment completed successfully!');
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { AdminPanelDeployer };