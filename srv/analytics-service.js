const cds = require('@sap/cds');

/**
 * Analytics Service Implementation
 * CONTAINS MULTIPLE SECURITY VULNERABILITIES FOR DEMO
 */
module.exports = cds.service.impl(async function () {
  const db = await cds.connect.to('db');

  /**
   * CRITICAL: SQL Injection vulnerability
   * User input directly concatenated into SQL query
   */
  this.on('searchProducts', async (req) => {
    const { searchTerm } = req.data;

    // DANGEROUS: Direct string concatenation in SQL
    const query = `SELECT * FROM Products WHERE name LIKE '%${searchTerm}%'`;
    const results = await db.run(query);

    return results;
  });

  /**
   * CRITICAL: Command Injection vulnerability
   * User input used in system command
   */
  this.on('exportReport', async (req) => {
    const { filename } = req.data;
    const exec = require('child_process').exec;

    // DANGEROUS: User input in shell command
    exec(`cat products.csv > ${filename}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Export failed: ${error}`);
        return;
      }
      console.log('Export completed');
    });
  });

  /**
   * SECURITY ISSUE: Missing authentication check
   * Sensitive operation without authorization
   */
  this.on('deleteAllProducts', async (req) => {
    // No authentication or authorization check!
    await DELETE.from('Products');
    return { message: 'All products deleted' };
  });

  /**
   * CODE QUALITY: Missing error handling
   * Unhandled promise rejection
   */
  this.on('getProductStats', async (req) => {
    const stats = await db.run('SELECT COUNT(*) FROM Products');
    // No try-catch, no error handling
    return stats[0];
  });

  /**
   * SECURITY ISSUE: Information disclosure
   * Exposing internal system details
   */
  this.on('getSystemInfo', async (req) => {
    return {
      nodeVersion: process.version,
      platform: process.platform,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      env: process.env, // CRITICAL: Exposing all environment variables!
      currentUser: process.env.USER,
      hostname: require('os').hostname()
    };
  });
});
