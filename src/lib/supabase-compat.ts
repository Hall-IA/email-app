/**
 * Ce fichier fournit une API compatible avec Supabase pour minimiser les changements dans le code existant
 */
import pool, { query as dbQuery } from './db';

interface QueryBuilder<T = any> {
  select(columns?: string, options?: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean }): QueryBuilder<T>;
  insert(data: any): QueryBuilder<T>;
  update(data: any): QueryBuilder<T>;
  delete(): QueryBuilder<T>;
  eq(column: string, value: any): QueryBuilder<T>;
  neq(column: string, value: any): QueryBuilder<T>;
  gt(column: string, value: any): QueryBuilder<T>;
  gte(column: string, value: any): QueryBuilder<T>;
  lt(column: string, value: any): QueryBuilder<T>;
  lte(column: string, value: any): QueryBuilder<T>;
  is(column: string, value: any): QueryBuilder<T>;
  not(column: string, operator: string, value: any): QueryBuilder<T>;
  in(column: string, values: any[]): QueryBuilder<T>;
  order(column: string, options?: { ascending?: boolean }): QueryBuilder<T>;
  limit(count: number): QueryBuilder<T>;
  single(): Promise<{ data: T | null; error: any }>;
  maybeSingle(): Promise<{ data: T | null; error: any }>;
  then(resolve: (value: { data: T[] | null; error: any; count?: number | null }) => void, reject?: (error: any) => void): Promise<any>;
}

class PostgresQueryBuilder<T = any> implements QueryBuilder<T> {
  private tableName: string;
  private selectColumns: string = '*';
  private whereConditions: string[] = [];
  private whereValues: any[] = [];
  private orderByClause: string = '';
  private limitClause: string = '';
  private operation: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private insertData: any = null;
  private updateData: any = null;
  private countMode: boolean = false;
  private headMode: boolean = false;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(columns: string = '*', options?: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean }): QueryBuilder<T> {
    this.operation = 'select';
    this.selectColumns = columns;
    if (options?.count) {
      this.countMode = true;
    }
    if (options?.head) {
      this.headMode = true;
    }
    return this;
  }

  insert(data: any): QueryBuilder<T> {
    this.operation = 'insert';
    this.insertData = Array.isArray(data) ? data : [data];
    return this;
  }

  update(data: any): QueryBuilder<T> {
    this.operation = 'update';
    this.updateData = data;
    return this;
  }

  delete(): QueryBuilder<T> {
    this.operation = 'delete';
    return this;
  }

  eq(column: string, value: any): QueryBuilder<T> {
    this.whereConditions.push(`${column} = $${this.whereValues.length + 1}`);
    this.whereValues.push(value);
    return this;
  }

  neq(column: string, value: any): QueryBuilder<T> {
    this.whereConditions.push(`${column} != $${this.whereValues.length + 1}`);
    this.whereValues.push(value);
    return this;
  }

  gt(column: string, value: any): QueryBuilder<T> {
    this.whereConditions.push(`${column} > $${this.whereValues.length + 1}`);
    this.whereValues.push(value);
    return this;
  }

  gte(column: string, value: any): QueryBuilder<T> {
    this.whereConditions.push(`${column} >= $${this.whereValues.length + 1}`);
    this.whereValues.push(value);
    return this;
  }

  lt(column: string, value: any): QueryBuilder<T> {
    this.whereConditions.push(`${column} < $${this.whereValues.length + 1}`);
    this.whereValues.push(value);
    return this;
  }

  lte(column: string, value: any): QueryBuilder<T> {
    this.whereConditions.push(`${column} <= $${this.whereValues.length + 1}`);
    this.whereValues.push(value);
    return this;
  }

  is(column: string, value: any): QueryBuilder<T> {
    if (value === null) {
      this.whereConditions.push(`${column} IS NULL`);
    } else {
      this.whereConditions.push(`${column} IS $${this.whereValues.length + 1}`);
      this.whereValues.push(value);
    }
    return this;
  }

  not(column: string, operator: string, value: any): QueryBuilder<T> {
    if (operator === 'is' && value === null) {
      this.whereConditions.push(`${column} IS NOT NULL`);
    } else if (operator === 'eq') {
      this.whereConditions.push(`${column} != $${this.whereValues.length + 1}`);
      this.whereValues.push(value);
    } else if (operator === 'in') {
      const placeholders = value.map((_: any, i: number) => `$${this.whereValues.length + i + 1}`).join(', ');
      this.whereConditions.push(`${column} NOT IN (${placeholders})`);
      this.whereValues.push(...value);
    } else {
      // Fallback générique
      this.whereConditions.push(`NOT (${column} ${operator} $${this.whereValues.length + 1})`);
      this.whereValues.push(value);
    }
    return this;
  }

  in(column: string, values: any[]): QueryBuilder<T> {
    const placeholders = values.map((_, i) => `$${this.whereValues.length + i + 1}`).join(', ');
    this.whereConditions.push(`${column} IN (${placeholders})`);
    this.whereValues.push(...values);
    return this;
  }

  order(column: string, options: { ascending?: boolean } = {}): QueryBuilder<T> {
    const direction = options.ascending === false ? 'DESC' : 'ASC';
    this.orderByClause = `ORDER BY ${column} ${direction}`;
    return this;
  }

  limit(count: number): QueryBuilder<T> {
    this.limitClause = `LIMIT ${count}`;
    return this;
  }

  private buildQuery(): { sql: string; values: any[] } {
    let sql = '';
    let values = [...this.whereValues];

    switch (this.operation) {
      case 'select':
        if (this.countMode) {
          sql = `SELECT COUNT(*) as count FROM ${this.tableName}`;
        } else {
          sql = `SELECT ${this.selectColumns} FROM ${this.tableName}`;
        }
        if (this.whereConditions.length > 0) {
          sql += ` WHERE ${this.whereConditions.join(' AND ')}`;
        }
        if (this.orderByClause) {
          sql += ` ${this.orderByClause}`;
        }
        if (this.limitClause) {
          sql += ` ${this.limitClause}`;
        }
        break;

      case 'insert':
        if (this.insertData && this.insertData.length > 0) {
          const keys = Object.keys(this.insertData[0]);
          const valuePlaceholders = this.insertData
            .map((_: any, rowIndex: number) => {
              const placeholders = keys.map((_: any, colIndex: number) => `$${rowIndex * keys.length + colIndex + 1}`).join(', ');
              return `(${placeholders})`;
            })
            .join(', ');

          values = this.insertData.flatMap((row: any) => keys.map((key) => row[key]));
          sql = `INSERT INTO ${this.tableName} (${keys.join(', ')}) VALUES ${valuePlaceholders} RETURNING *`;
        }
        break;

      case 'update':
        if (this.updateData) {
          const keys = Object.keys(this.updateData);
          const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
          values = [...keys.map((key) => this.updateData[key]), ...this.whereValues];

          // Ajuster les numéros de paramètres dans les conditions WHERE
          const adjustedConditions = this.whereConditions.map((cond) => {
            return cond.replace(/\$(\d+)/g, (match, num) => `$${parseInt(num) + keys.length}`);
          });

          sql = `UPDATE ${this.tableName} SET ${setClause}`;
          if (adjustedConditions.length > 0) {
            sql += ` WHERE ${adjustedConditions.join(' AND ')}`;
          }
          sql += ' RETURNING *';
        }
        break;

      case 'delete':
        sql = `DELETE FROM ${this.tableName}`;
        if (this.whereConditions.length > 0) {
          sql += ` WHERE ${this.whereConditions.join(' AND ')}`;
        }
        sql += ' RETURNING *';
        break;
    }

    return { sql, values };
  }

  async single(): Promise<{ data: T | null; error: any }> {
    try {
      const { sql, values } = this.buildQuery();
      const result = await dbQuery(sql, values);
      
      if (result.rows.length === 0) {
        return { data: null, error: { message: 'No rows found', code: 'PGRST116' } };
      }
      if (result.rows.length > 1) {
        return { data: null, error: { message: 'Multiple rows found', code: 'PGRST116' } };
      }

      return { data: result.rows[0] as T, error: null };
    } catch (error: any) {
      console.error('Query error:', error);
      return { data: null, error };
    }
  }

  async maybeSingle(): Promise<{ data: T | null; error: any }> {
    try {
      const { sql, values } = this.buildQuery();
      const result = await dbQuery(sql, values);

      if (result.rows.length === 0) {
        return { data: null, error: null };
      }
      if (result.rows.length > 1) {
        return { data: null, error: { message: 'Multiple rows found', code: 'PGRST116' } };
      }

      return { data: result.rows[0] as T, error: null };
    } catch (error: any) {
      console.error('Query error:', error);
      return { data: null, error };
    }
  }

  async then(resolve: any, reject?: any): Promise<any> {
    try {
      const { sql, values } = this.buildQuery();
      const result = await dbQuery(sql, values);

      if (this.countMode && this.headMode) {
        // Mode count only (pour les requêtes avec { count: 'exact', head: true })
        const count = result.rows.length > 0 ? parseInt(result.rows[0].count) : 0;
        return resolve({ data: null, error: null, count });
      } else if (this.countMode) {
        const count = result.rows.length > 0 ? parseInt(result.rows[0].count) : 0;
        return resolve({ data: result.rows as T[], error: null, count });
      } else {
        return resolve({ data: result.rows as T[], error: null });
      }
    } catch (error: any) {
      console.error('Query error:', error);
      if (reject) {
        return reject(error);
      }
      return resolve({ data: null, error });
    }
  }
}

export function from<T = any>(tableName: string): QueryBuilder<T> {
  return new PostgresQueryBuilder<T>(tableName);
}

// Stub pour le storage (non implémenté avec PostgreSQL) - côté serveur
const storage = {
  from: (bucket: string) => {
    return {
      upload: async (path: string, file: any, options?: any) => {
        console.error('Storage non implémenté: utilisez AWS S3, Cloudinary ou un autre service');
        return {
          data: null,
          error: {
            message: 'Le stockage de fichiers n\'est pas disponible avec PostgreSQL. Veuillez utiliser AWS S3, Cloudinary ou un autre service de stockage.',
          },
        };
      },
      getPublicUrl: (path: string) => {
        return {
          data: {
            publicUrl: '',
          },
        };
      },
      download: async (path: string) => {
        return {
          data: null,
          error: {
            message: 'Le stockage de fichiers n\'est pas disponible avec PostgreSQL.',
          },
        };
      },
      remove: async (paths: string[]) => {
        return {
          data: null,
          error: {
            message: 'Le stockage de fichiers n\'est pas disponible avec PostgreSQL.',
          },
        };
      },
      list: async (path?: string, options?: any) => {
        return {
          data: [],
          error: {
            message: 'Le stockage de fichiers n\'est pas disponible avec PostgreSQL.',
          },
        };
      },
    };
  },
};

// Stub pour les edge functions (non implémenté avec PostgreSQL) - côté serveur
const functions = {
  invoke: async (functionName: string, options?: any) => {
    console.error(`Function ${functionName} non implémentée: créez une API route à la place`);
    return {
      data: null,
      error: {
        message: `Les Edge Functions ne sont pas disponibles avec PostgreSQL. Créez une API route à /api/${functionName} à la place.`,
      },
    };
  },
};

// Stub pour les real-time channels (non implémenté avec PostgreSQL) - côté serveur
const channel = (name: string) => {
  console.warn(`Real-time channel "${name}" non implémenté. Les mises à jour en temps réel ne sont pas disponibles.`);
  return {
    on: (event: string, options: any, callback?: any) => {
      // Ne fait rien - pas de real-time
      return channel(name);
    },
    subscribe: (callback?: any) => {
      if (callback) {
        callback('SUBSCRIBED', null);
      }
      return channel(name);
    },
    unsubscribe: () => {
      return Promise.resolve({ error: null });
    },
  };
};

// Objet compatibilité Supabase
export const supabase = {
  from,
  storage,
  functions,
  channel,
  auth: {
    // Ces méthodes seront appelées depuis le client et feront des appels aux API routes
    getSession: async () => {
      try {
        const response = await fetch('/api/auth/session');
        const result = await response.json();
        return { data: { session: result.session, user: result.user }, error: null };
      } catch (error: any) {
        return { data: { session: null, user: null }, error };
      }
    },
    getUser: async () => {
      try {
        const response = await fetch('/api/auth/session');
        const result = await response.json();
        return { data: { user: result.user }, error: null };
      } catch (error: any) {
        return { data: { user: null }, error };
      }
    },
    signUp: async ({ email, password, options }: any) => {
      try {
        const response = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password,
            fullName: options?.data?.full_name || '',
          }),
        });
        const result = await response.json();
        if (!response.ok) {
          return { data: null, error: { message: result.error } };
        }
        return { data: { user: result.user }, error: null };
      } catch (error: any) {
        return { data: null, error };
      }
    },
    signInWithPassword: async ({ email, password }: any) => {
      try {
        const response = await fetch('/api/auth/signin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const result = await response.json();
        if (!response.ok) {
          return { data: null, error: { message: result.error } };
        }
        return { data: { user: result.user, session: result.session }, error: null };
      } catch (error: any) {
        return { data: null, error };
      }
    },
    signOut: async () => {
      try {
        await fetch('/api/auth/signout', { method: 'POST' });
        return { error: null };
      } catch (error: any) {
        return { error };
      }
    },
    updateUser: async (updates: { password?: string; email?: string; data?: any }) => {
      try {
        const response = await fetch('/api/auth/update-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
        const result = await response.json();
        if (!response.ok) {
          return { data: { user: null }, error: { message: result.error } };
        }
        return { data: { user: result.user }, error: null };
      } catch (error: any) {
        return { data: { user: null }, error };
      }
    },
    onAuthStateChange: (callback: (event: string, session: any) => void) => {
      // Pour simplifier, on ne gère pas les changements d'état en temps réel
      // On peut améliorer cela plus tard avec des WebSockets ou des polling
      return {
        data: {
          subscription: {
            unsubscribe: () => {},
          },
        },
      };
    },
  },
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          company_name: string | null;
          smtp_host: string | null;
          smtp_port: number | null;
          imap_host: string | null;
          imap_port: number | null;
          created_at: string;
          updated_at: string;
        };
      };
    };
  };
};

