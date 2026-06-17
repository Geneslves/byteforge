/**
 * PostgreSQL Database Adapter
 * Wraps PostgreSQL client to provide a consistent interface with D1
 */

export class PostgresAdapter {
  constructor(client) {
    if (!client || typeof client.query !== 'function') {
      throw new Error('Invalid PostgreSQL client instance')
    }
    this.client = client
    this.platform = 'postgresql'
    this.inTransaction = false
  }

  /**
   * Convert SQL with ? placeholders to PostgreSQL $1, $2, etc.
   * @param {string} sql - SQL with ? placeholders
   * @returns {string} SQL with $n placeholders
   */
  convertPlaceholders(sql) {
    let index = 0
    return sql.replace(/\?/g, () => `$${++index}`)
  }

  /**
   * Execute a query and return all results
   * @param {string} sql - SQL query with ? placeholders
   * @param {Array} params - Parameters to bind
   * @returns {Promise<Array>} Array of result rows
   */
  async query(sql, params = []) {
    const pgSql = this.convertPlaceholders(sql)
    const result = await this.client.query(pgSql, params)
    return result.rows || []
  }

  /**
   * Execute a query and return the first result
   * @param {string} sql - SQL query with ? placeholders
   * @param {Array} params - Parameters to bind
   * @returns {Promise<Object|null>} First result row or null
   */
  async first(sql, params = []) {
    const rows = await this.query(sql, params)
    return rows.length > 0 ? rows[0] : null
  }

  /**
   * Execute a query without returning results (INSERT, UPDATE, DELETE)
   * @param {string} sql - SQL query with ? placeholders
   * @param {Array} params - Parameters to bind
   * @returns {Promise<{changes: number, lastInsertId: any}>}
   */
  async run(sql, params = []) {
    const pgSql = this.convertPlaceholders(sql)

    // For INSERT, try to return the inserted ID
    let resultSql = pgSql
    if (pgSql.trim().toUpperCase().startsWith('INSERT')) {
      // Add RETURNING id if not already present
      if (!pgSql.toUpperCase().includes('RETURNING')) {
        resultSql = `${pgSql} RETURNING id`
      }
    }

    const result = await this.client.query(resultSql, params)

    return {
      changes: result.rowCount || 0,
      lastInsertId: result.rows?.[0]?.id || null
    }
  }

  /**
   * Execute multiple queries in a transaction
   * @param {Function} callback - Function that receives this adapter
   * @returns {Promise<any>} Result from callback
   */
  async transaction(callback) {
    if (this.inTransaction) {
      // Already in a transaction, just execute
      return await callback(this)
    }

    this.inTransaction = true

    try {
      await this.client.query('BEGIN')
      const result = await callback(this)
      await this.client.query('COMMIT')
      return result
    } catch (error) {
      await this.client.query('ROLLBACK')
      throw error
    } finally {
      this.inTransaction = false
    }
  }

  /**
   * Execute a batch of queries (not in a transaction by default)
   * @param {Array<{sql: string, params: Array}>} queries
   * @returns {Promise<Array>} Results from all queries
   */
  async batch(queries) {
    const results = []
    for (const q of queries) {
      try {
        const pgSql = this.convertPlaceholders(q.sql)
        const result = await this.client.query(pgSql, q.params || [])
        results.push({
          results: result.rows || [],
          changes: result.rowCount || 0,
          lastInsertId: result.rows?.[0]?.id || null
        })
      } catch (error) {
        results.push({
          error: error.message,
          results: [],
          changes: 0,
          lastInsertId: null
        })
      }
    }
    return results
  }

  /**
   * Check if the database is available
   * @returns {boolean}
   */
  isAvailable() {
    return !!this.client
  }

  /**
   * Close the database connection
   */
  async close() {
    if (this.client.end) {
      await this.client.end()
    }
  }
}
