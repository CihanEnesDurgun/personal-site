/* ====== Log Cleanup Manager ====== */

const fs = require('fs');
const path = require('path');
const cron = require('node-cron');

class LogCleanupManager {
  constructor(retentionDays = 30) {
    this.retentionDays = retentionDays;
    this.logsDir = path.join(__dirname, '..', 'logs');
    this.isRunning = false;
    
    console.log(`🧹 Log Cleanup Manager initialized (${retentionDays} days retention)`);
  }

  /**
   * Eski log dosyalarını temizle
   */
  async cleanupOldLogs() {
    if (this.isRunning) {
      console.log('🧹 Cleanup already running, skipping...');
      return;
    }

    this.isRunning = true;
    console.log('🧹 Starting log cleanup process...');

    try {
      if (!fs.existsSync(this.logsDir)) {
        console.log('📁 No logs directory found, skipping cleanup');
        return;
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);
      
      const logFiles = fs.readdirSync(this.logsDir)
        .filter(file => file.startsWith('console-') && file.endsWith('.json'))
        .map(file => {
          const filePath = path.join(this.logsDir, file);
          const stats = fs.statSync(filePath);
          return {
            name: file,
            path: filePath,
            created: stats.birthtime,
            modified: stats.mtime
          };
        });

      let deletedCount = 0;
      let totalSize = 0;

      for (const file of logFiles) {
        // Dosya tarihini dosya adından çıkar
        const dateMatch = file.name.match(/console-(\d{4}-\d{2}-\d{2})\.json/);
        if (dateMatch) {
          const fileDate = new Date(dateMatch[1]);
          
          if (fileDate < cutoffDate) {
            const fileSize = fs.statSync(file.path).size;
            fs.unlinkSync(file.path);
            deletedCount++;
            totalSize += fileSize;
            console.log(`🗑️ Deleted old log file: ${file.name} (${this.formatBytes(fileSize)})`);
          }
        }
      }

      if (deletedCount > 0) {
        console.log(`✅ Cleanup completed: ${deletedCount} files deleted, ${this.formatBytes(totalSize)} freed`);
      } else {
        console.log('✅ No old log files found to delete');
      }

    } catch (error) {
      console.error('❌ Error during log cleanup:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Log istatistiklerini al
   */
  async getLogStatistics() {
    try {
      if (!fs.existsSync(this.logsDir)) {
        return {
          totalFiles: 0,
          totalSize: 0,
          oldestFile: null,
          newestFile: null,
          retentionDays: this.retentionDays
        };
      }

      const logFiles = fs.readdirSync(this.logsDir)
        .filter(file => file.startsWith('console-') && file.endsWith('.json'))
        .map(file => {
          const filePath = path.join(this.logsDir, file);
          const stats = fs.statSync(filePath);
          return {
            name: file,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime
          };
        });

      if (logFiles.length === 0) {
        return {
          totalFiles: 0,
          totalSize: 0,
          oldestFile: null,
          newestFile: null,
          retentionDays: this.retentionDays
        };
      }

      const totalSize = logFiles.reduce((sum, file) => sum + file.size, 0);
      const sortedByDate = logFiles.sort((a, b) => a.created - b.created);

      return {
        totalFiles: logFiles.length,
        totalSize: totalSize,
        formattedSize: this.formatBytes(totalSize),
        oldestFile: sortedByDate[0].name,
        newestFile: sortedByDate[sortedByDate.length - 1].name,
        retentionDays: this.retentionDays,
        nextCleanup: this.getNextCleanupDate()
      };

    } catch (error) {
      console.error('❌ Error getting log statistics:', error);
      return null;
    }
  }

  /**
   * Otomatik temizlik zamanlaması
   */
  scheduleCleanup() {
    // Her gün saat 02:00'da temizlik yap
    const cronExpression = '0 2 * * *';
    
    cron.schedule(cronExpression, async () => {
      console.log('🕐 Scheduled log cleanup triggered');
      await this.cleanupOldLogs();
    }, {
      scheduled: true,
      timezone: "UTC"
    });

    console.log('⏰ Log cleanup scheduled: Daily at 02:00 UTC');
  }

  /**
   * Manuel temizlik tetikleme
   */
  async triggerCleanup() {
    console.log('🔧 Manual log cleanup triggered');
    await this.cleanupOldLogs();
  }

  /**
   * Dosya boyutunu formatla
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Sonraki temizlik tarihini hesapla
   */
  getNextCleanupDate() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(2, 0, 0, 0);
    return tomorrow.toISOString();
  }

  /**
   * Temizlik durumunu kontrol et
   */
  isCleanupScheduled() {
    return cron.getTasks().has('log-cleanup');
  }

  /**
   * Temizlik zamanlamasını durdur
   */
  stopCleanup() {
    cron.destroy();
    console.log('⏹️ Log cleanup scheduling stopped');
  }
}

module.exports = LogCleanupManager;
