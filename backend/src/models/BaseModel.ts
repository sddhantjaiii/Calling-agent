import database from '../config/database';
import { PoolClient } from 'pg';

export interface BaseModelInterface {
  id?: string;
  created_at?: Date;
  updated_at?: Date;
}

export abstract class BaseModel<T extends BaseModelInterface> {
  protected tableName: string;
  protected primaryKey: string = 'id';

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  /**
   * Find a record by ID
   */
  async findById(id: string): Promise<T | null> {
    const query = `SELECT * FROM ${this.tableName} WHERE ${this.primaryKey} = $1`;
    const result = await database.query(query, [id]);
    
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Find records by criteria
   */
  async findBy(criteria: Partial<T>, limit?: number, offset?: number): Promise<T[]> {
    const keys = Object.keys(criteria);
    const values = Object.values(criteria);
    
    if (keys.length === 0) {
      return this.findAll(limit, offset);
    }

    const whereClause = keys.map((key, index) => `${key} = $${index + 1}`).join(' AND ');
    let query = `SELECT * FROM ${this.tableName} WHERE ${whereClause}`;
    
    if (limit) {
      query += ` LIMIT ${limit}`;
    }
    
    if (offset) {
      query += ` OFFSET ${offset}`;
    }
    
    const result = await database.query(query, values);
    return result.rows;
  }

  /**
   * Find all records
   */
  async findAll(limit?: number, offset?: number): Promise<T[]> {
    let query = `SELECT * FROM ${this.tableName} ORDER BY created_at DESC`;
    
    if (limit) {
      query += ` LIMIT ${limit}`;
    }
    
    if (offset) {
      query += ` OFFSET ${offset}`;
    }
    
    const result = await database.query(query);
    return result.rows;
  }

  /**
   * Create a new record
   */
  async create(data: Omit<T, 'id' | 'created_at' | 'updated_at'>): Promise<T> {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, index) => `$${index + 1}`).join(', ');
    const columns = keys.join(', ');

    const query = `
      INSERT INTO ${this.tableName} (${columns})
      VALUES (${placeholders})
      RETURNING *
    `;

    const result = await database.query(query, values);
    return result.rows[0];
  }

  /**
   * Update a record by ID
   */
  async update(id: string, data: Partial<Omit<T, 'id' | 'created_at' | 'updated_at'>>): Promise<T | null> {
    const keys = Object.keys(data);
    const values = Object.values(data);
    
    if (keys.length === 0) {
      return this.findById(id);
    }

    const setClause = keys.map((key, index) => `${key} = $${index + 2}`).join(', ');
    const query = `
      UPDATE ${this.tableName}
      SET ${setClause}
      WHERE ${this.primaryKey} = $1
      RETURNING *
    `;

    const result = await database.query(query, [id, ...values]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Delete a record by ID
   */
  async delete(id: string): Promise<boolean> {
    const query = `DELETE FROM ${this.tableName} WHERE ${this.primaryKey} = $1`;
    const result = await database.query(query, [id]);
    
    return result.rowCount > 0;
  }

  /**
   * Count records
   */
  async count(criteria?: Partial<T>): Promise<number> {
    let query = `SELECT COUNT(*) as count FROM ${this.tableName}`;
    let values: any[] = [];

    if (criteria && Object.keys(criteria).length > 0) {
      const keys = Object.keys(criteria);
      values = Object.values(criteria);
      const whereClause = keys.map((key, index) => `${key} = $${index + 1}`).join(' AND ');
      query += ` WHERE ${whereClause}`;
    }

    const result = await database.query(query, values);
    return parseInt(result.rows[0].count);
  }

  /**
   * Execute a custom query
   */
  async query(sql: string, params?: any[]): Promise<any> {
    return await database.query(sql, params);
  }

  /**
   * Execute within a transaction
   */
  async transaction<R>(callback: (client: PoolClient) => Promise<R>): Promise<R> {
    return await database.transaction(callback);
  }

  /**
   * Check if a record exists
   */
  async exists(criteria: Partial<T>): Promise<boolean> {
    const count = await this.count(criteria);
    return count > 0;
  }

  /**
   * Find one record by criteria
   */
  async findOne(criteria: Partial<T>): Promise<T | null> {
    const results = await this.findBy(criteria, 1);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Create or update a record (upsert)
   */
  async upsert(
    criteria: Partial<T>,
    data: Omit<T, 'id' | 'created_at' | 'updated_at'>
  ): Promise<T> {
    const existing = await this.findOne(criteria);
    
    if (existing) {
      return await this.update(existing.id!, data) as T;
    } else {
      return await this.create({ ...criteria, ...data } as any);
    }
  }
}

export default BaseModel;