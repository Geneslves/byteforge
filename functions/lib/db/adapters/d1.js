/**
 * Cloudflare D1 Database Adapter
 * Wraps D1 API to provide a consistent interface
 */

export class D1Adapter {
  constructor(db) {
    if (!db || typeof db.prepare !== 'function') {
      throw new Error('Invalid D1 database instance')
    }
    this.db = db
    this.platform = 'cloudflare-d1'
  }

  /**
   * Execute a query and return all results
   * @param {string} sql - SQL query with ? placeholders
   * @param {Array} params - Parameters to bind
   * @returns {Promise<Array>} Array of result rows
   */
  async query(sql, params = []) {
    const result = await this.db.prepare(sql).bind(...params).all()
    return result.results || []
  }

  /**
   * Execute a query and return the first result
   * @param {string} sql - SQL query with ? placeholders
   * @param {Array} params - Parameters to bind
   * @returns {Promise<Object|null>} First result row or null
   */
  async first(sql, params = []) {
    return await this.db.prepare(sql).bind(...params).first()
  }

  /**
   * Execute a query without returning results (INSERT, UPDATE, DELETE)
   * @param {string} sql - SQL query with ? placeholders
   * @param {Array} params - Parameters to bind
   * @returns {Promise<{changes: number, lastInsertId: number}>}
   */
  async run(sql, params = []) {
    const result = await this.db.prepare(sql).bind(...params).run()
    return {
      changes: result.meta?.changes || 0,
      lastInsertId: result.meta?.last_row_id || null
    }
  }

  /**
   * Execute multiple queries in a transaction
   * D1 batch API provides atomic execution
   * @param {Function} callback - Function that receives this adapter
   * @returns {Promise<any>} Result from callback
   */
  async transaction(callback) {
    // D1 doesn't have traditional transactions yet
    // Use batch API for atomic operations
    // For now, just execute the callback
    // TODO: Implement proper transaction support when D1 adds it
    return await callback(this)
  }

  /**
   * Execute a batch of queries atomically
   * @param {Array<{sql: string, params: Array}>} queries
   * @returns {Promise<Array>} Results from all queries
   */
  async batch(queries) {
    const statements = queries.map(q =>
      this.db.prepare(q.sql).bind(...(q.params || []))
    )
    const results = await this.db.batch(statements)
    return results.map(r => ({
      results: r.results || [],
      changes: r.meta?.changes || 0,
      lastInsertId: r.meta?.last_row_id || null
    }))
  }

  /**
   * Check if the database is available
   * @returns {boolean}
   */
  isAvailable() {
    return !!this.db
  }
}
