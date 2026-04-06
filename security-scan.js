/**
 * Security Scan for MEDsync EMS Suite
 * Comprehensive security analysis and vulnerability assessment
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class SecurityScanner {
  constructor() {
    this.findings = [];
    this.criticalIssues = [];
    this.warningIssues = [];
    this.infoIssues = [];
  }

  log(level, category, message, recommendation = null) {
    const finding = {
      level,
      category,
      message,
      recommendation,
      timestamp: new Date().toISOString()
    };

    this.findings.push(finding);
    
    switch (level) {
      case 'CRITICAL':
        this.criticalIssues.push(finding);
        break;
      case 'WARNING':
        this.warningIssues.push(finding);
        break;
      case 'INFO':
        this.infoIssues.push(finding);
        break;
    }
  }

  // Check environment variables for sensitive data exposure
  checkEnvironmentSecurity() {
    console.log('🔍 Checking environment security...');
    
    const requiredSecrets = [
      'RESGRID_USER',
      'RESGRID_PASS',
      'GOOGLE_SERVICE_ACCOUNT_JSON',
      'LOG_SHEET_ID'
    ];

    const optionalSecrets = [
      'SFTP_HOST',
      'SFTP_USER',
      'SFTP_PASS',
      'SFTP_DIR'
    ];

    // Check for required secrets
    requiredSecrets.forEach(secret => {
      if (!process.env[secret]) {
        this.log('CRITICAL', 'Environment', `Missing required secret: ${secret}`, 
          'Add this secret to environment variables');
      } else {
        this.log('INFO', 'Environment', `Required secret ${secret} is present`);
      }
    });

    // Check for optional secrets
    optionalSecrets.forEach(secret => {
      if (!process.env[secret]) {
        this.log('WARNING', 'Environment', `Optional secret ${secret} not configured`, 
          'Consider adding if using SFTP functionality');
      }
    });

    // Check for hardcoded secrets in code files
    this.checkForHardcodedSecrets();
  }

  // Scan for hardcoded secrets in source files
  checkForHardcodedSecrets() {
    console.log('🔍 Scanning for hardcoded secrets...');
    
    const sourceFiles = this.getSourceFiles();
    const secretPatterns = [
      /password\s*[:=]\s*['"][^'"]+['"]/gi,
      /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/gi,
      /secret\s*[:=]\s*['"][^'"]+['"]/gi,
      /token\s*[:=]\s*['"][^'"]+['"]/gi,
      /bearer\s+[a-zA-Z0-9_-]+/gi,
      /basic\s+[a-zA-Z0-9+/=]+/gi
    ];

    sourceFiles.forEach(file => {
      try {
        const content = fs.readFileSync(file, 'utf8');
        
        secretPatterns.forEach(pattern => {
          const matches = content.match(pattern);
          if (matches) {
            matches.forEach(match => {
              // Skip common false positives
              if (match.includes('process.env') || 
                  match.includes('config.') ||
                  match.includes('placeholder') ||
                  match.includes('example')) {
                return;
              }
              
              this.log('CRITICAL', 'Hardcoded Secrets', 
                `Potential hardcoded secret in ${file}: ${match.substring(0, 50)}...`,
                'Move sensitive data to environment variables');
            });
          }
        });
      } catch (error) {
        this.log('WARNING', 'File Access', `Cannot read file ${file}: ${error.message}`);
      }
    });
  }

  // Check file permissions and access controls
  checkFilePermissions() {
    console.log('🔍 Checking file permissions...');
    
    const sensitiveFiles = [
      '.env',
      '.env.production',
      'package.json',
      'src/index.js',
      'src/auto-closure-manager.js'
    ];

    sensitiveFiles.forEach(file => {
      if (fs.existsSync(file)) {
        try {
          const stats = fs.statSync(file);
          const mode = stats.mode.toString(8);
          
          // Check if file is readable by others
          if (stats.mode & 0o044) {
            this.log('WARNING', 'File Permissions', 
              `File ${file} is readable by others (${mode})`,
              'Consider restricting file permissions');
          }
          
          // Check if file is writable by others
          if (stats.mode & 0o022) {
            this.log('CRITICAL', 'File Permissions', 
              `File ${file} is writable by others (${mode})`,
              'Restrict write permissions immediately');
          }
        } catch (error) {
          this.log('WARNING', 'File Permissions', `Cannot check permissions for ${file}: ${error.message}`);
        }
      }
    });
  }

  // Check for vulnerable dependencies
  checkDependencies() {
    console.log('🔍 Checking dependencies...');
    
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      // Check for known vulnerable packages
      const knownVulnerabilities = [
        'request', // deprecated
        'node-uuid', // deprecated
        'lodash', // often has vulnerabilities
        'moment' // maintenance mode
      ];

      Object.keys(dependencies).forEach(pkg => {
        if (knownVulnerabilities.includes(pkg)) {
          this.log('WARNING', 'Dependencies', 
            `Package ${pkg} may have known vulnerabilities`,
            'Consider updating or replacing with alternatives');
        }
      });

      // Check for wildcard versions
      Object.entries(dependencies).forEach(([pkg, version]) => {
        if (version.includes('*') || version.includes('latest')) {
          this.log('WARNING', 'Dependencies', 
            `Package ${pkg} uses wildcard version: ${version}`,
            'Pin to specific version for better security');
        }
      });

    } catch (error) {
      this.log('WARNING', 'Dependencies', `Cannot read package.json: ${error.message}`);
    }
  }

  // Check network security configurations
  checkNetworkSecurity() {
    console.log('🔍 Checking network security...');
    
    // Check for HTTP instead of HTTPS
    const sourceFiles = this.getSourceFiles();
    sourceFiles.forEach(file => {
      try {
        const content = fs.readFileSync(file, 'utf8');
        
        // Check for insecure HTTP URLs
        const httpMatches = content.match(/http:\/\/[^\s'"]+/gi);
        if (httpMatches) {
          httpMatches.forEach(url => {
            if (!url.includes('localhost') && !url.includes('127.0.0.1')) {
              this.log('WARNING', 'Network Security', 
                `Insecure HTTP URL found in ${file}: ${url}`,
                'Use HTTPS for external connections');
            }
          });
        }

        // Check for hardcoded IPs
        const ipMatches = content.match(/\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g);
        if (ipMatches) {
          ipMatches.forEach(ip => {
            if (!ip.startsWith('127.') && !ip.startsWith('192.168.') && !ip.startsWith('10.')) {
              this.log('WARNING', 'Network Security', 
                `Hardcoded IP address in ${file}: ${ip}`,
                'Consider using domain names instead');
            }
          });
        }
      } catch (error) {
        this.log('WARNING', 'File Access', `Cannot read file ${file}: ${error.message}`);
      }
    });
  }

  // Check authentication and authorization
  checkAuthentication() {
    console.log('🔍 Checking authentication security...');
    
    // Check for weak authentication patterns
    const sourceFiles = this.getSourceFiles();
    sourceFiles.forEach(file => {
      try {
        const content = fs.readFileSync(file, 'utf8');
        
        // Check for basic auth patterns
        if (content.includes('Basic ') || content.includes('basic ')) {
          this.log('WARNING', 'Authentication', 
            `Basic authentication found in ${file}`,
            'Consider using more secure authentication methods');
        }

        // Check for token validation
        if (content.includes('token') && !content.includes('Bearer')) {
          this.log('INFO', 'Authentication', 
            `Token usage found in ${file} - verify proper validation`);
        }
      } catch (error) {
        this.log('WARNING', 'File Access', `Cannot read file ${file}: ${error.message}`);
      }
    });
  }

  // Check for logging security
  checkLoggingSecurity() {
    console.log('🔍 Checking logging security...');
    
    const sourceFiles = this.getSourceFiles();
    sourceFiles.forEach(file => {
      try {
        const content = fs.readFileSync(file, 'utf8');
        
        // Check for potential sensitive data in logs
        const logPatterns = [
          /console\.log\([^)]*password[^)]*\)/gi,
          /console\.log\([^)]*token[^)]*\)/gi,
          /console\.log\([^)]*secret[^)]*\)/gi,
          /logger\.[^(]*\([^)]*password[^)]*\)/gi,
          /logger\.[^(]*\([^)]*token[^)]*\)/gi
        ];

        logPatterns.forEach(pattern => {
          const matches = content.match(pattern);
          if (matches) {
            matches.forEach(match => {
              this.log('WARNING', 'Logging Security', 
                `Potential sensitive data in logs in ${file}: ${match.substring(0, 50)}...`,
                'Avoid logging sensitive information');
            });
          }
        });
      } catch (error) {
        this.log('WARNING', 'File Access', `Cannot read file ${file}: ${error.message}`);
      }
    });
  }

  // Check for input validation
  checkInputValidation() {
    console.log('🔍 Checking input validation...');
    
    const sourceFiles = this.getSourceFiles();
    sourceFiles.forEach(file => {
      try {
        const content = fs.readFileSync(file, 'utf8');
        
        // Check for SQL injection patterns
        if (content.includes('SELECT') || content.includes('INSERT') || content.includes('UPDATE')) {
          if (!content.includes('prepare') && !content.includes('parameterized')) {
            this.log('WARNING', 'Input Validation', 
              `Potential SQL injection risk in ${file}`,
              'Use parameterized queries');
          }
        }

        // Check for XML injection patterns
        if (content.includes('<') && content.includes('>')) {
          if (!content.includes('escape') && !content.includes('sanitize')) {
            this.log('INFO', 'Input Validation', 
              `XML content generation in ${file} - verify proper escaping`);
          }
        }
      } catch (error) {
        this.log('WARNING', 'File Access', `Cannot read file ${file}: ${error.message}`);
      }
    });
  }

  // Helper method to get source files
  getSourceFiles() {
    const sourceFiles = [];
    const extensions = ['.js', '.json', '.md'];
    
    const scanDirectory = (dir) => {
      try {
        const files = fs.readdirSync(dir);
        files.forEach(file => {
          const fullPath = path.join(dir, file);
          const stats = fs.statSync(fullPath);
          
          if (stats.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
            scanDirectory(fullPath);
          } else if (stats.isFile() && extensions.some(ext => file.endsWith(ext))) {
            sourceFiles.push(fullPath);
          }
        });
      } catch (error) {
        this.log('WARNING', 'File Access', `Cannot scan directory ${dir}: ${error.message}`);
      }
    };

    scanDirectory('.');
    return sourceFiles;
  }

  // Generate comprehensive security report
  generateReport() {
    console.log('\n=== SECURITY SCAN REPORT ===');
    console.log(`Scan completed at: ${new Date().toISOString()}`);
    console.log(`Total findings: ${this.findings.length}`);
    console.log(`Critical issues: ${this.criticalIssues.length}`);
    console.log(`Warning issues: ${this.warningIssues.length}`);
    console.log(`Info issues: ${this.infoIssues.length}`);

    if (this.criticalIssues.length > 0) {
      console.log('\n🚨 CRITICAL ISSUES:');
      this.criticalIssues.forEach((issue, index) => {
        console.log(`${index + 1}. [${issue.category}] ${issue.message}`);
        if (issue.recommendation) {
          console.log(`   Recommendation: ${issue.recommendation}`);
        }
      });
    }

    if (this.warningIssues.length > 0) {
      console.log('\n⚠️  WARNING ISSUES:');
      this.warningIssues.forEach((issue, index) => {
        console.log(`${index + 1}. [${issue.category}] ${issue.message}`);
        if (issue.recommendation) {
          console.log(`   Recommendation: ${issue.recommendation}`);
        }
      });
    }

    if (this.infoIssues.length > 0) {
      console.log('\n📝 INFO ISSUES:');
      this.infoIssues.forEach((issue, index) => {
        console.log(`${index + 1}. [${issue.category}] ${issue.message}`);
        if (issue.recommendation) {
          console.log(`   Recommendation: ${issue.recommendation}`);
        }
      });
    }

    // Generate recommendations
    this.generateRecommendations();

    return {
      summary: {
        total: this.findings.length,
        critical: this.criticalIssues.length,
        warning: this.warningIssues.length,
        info: this.infoIssues.length
      },
      findings: this.findings
    };
  }

  generateRecommendations() {
    console.log('\n📋 SECURITY RECOMMENDATIONS:');
    
    const recommendations = [
      '1. Regularly update dependencies to latest secure versions',
      '2. Implement proper input validation and sanitization',
      '3. Use HTTPS for all external communications',
      '4. Regularly rotate API keys and secrets',
      '5. Monitor system logs for suspicious activity',
      '6. Implement proper error handling without exposing sensitive data',
      '7. Use security headers in web responses',
      '8. Regular security audits and penetration testing'
    ];

    recommendations.forEach(rec => console.log(`   ${rec}`));
  }

  // Run comprehensive security scan
  async runScan() {
    console.log('🔒 Starting comprehensive security scan...\n');
    
    this.checkEnvironmentSecurity();
    this.checkFilePermissions();
    this.checkDependencies();
    this.checkNetworkSecurity();
    this.checkAuthentication();
    this.checkLoggingSecurity();
    this.checkInputValidation();
    
    return this.generateReport();
  }
}

// Run the security scan
async function main() {
  const scanner = new SecurityScanner();
  const report = await scanner.runScan();
  
  // Save report to file
  fs.writeFileSync('security-scan-report.json', JSON.stringify(report, null, 2));
  console.log('\n📄 Detailed report saved to: security-scan-report.json');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = SecurityScanner;