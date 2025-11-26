/**
 * Version client du compatibility layer Supabase
 * Cette version fait des appels API au lieu de se connecter directement à PostgreSQL
 */

interface QueryBuilder<T = any> {
  select(columns?: string, options?: any): QueryBuilder<T>;
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

class ClientQueryBuilder<T = any> implements QueryBuilder<T> {
  private tableName: string;
  private operation: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private selectOptions: any = {};
  private filters: Array<{ type: string; column: string; value: any }> = [];
  private insertData: any = null;
  private updateData: any = null;
  private orderOptions: any = null;
  private limitValue: number | null = null;
  private isSingle: boolean = false;
  private isMaybeSingle: boolean = false;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(columns: string = '*', options?: any): QueryBuilder<T> {
    this.operation = 'select';
    this.selectOptions = { columns, ...options };
    return this;
  }

  insert(data: any): QueryBuilder<T> {
    this.operation = 'insert';
    this.insertData = data;
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
    this.filters.push({ type: 'eq', column, value });
    return this;
  }

  neq(column: string, value: any): QueryBuilder<T> {
    this.filters.push({ type: 'neq', column, value });
    return this;
  }

  gt(column: string, value: any): QueryBuilder<T> {
    this.filters.push({ type: 'gt', column, value });
    return this;
  }

  gte(column: string, value: any): QueryBuilder<T> {
    this.filters.push({ type: 'gte', column, value });
    return this;
  }

  lt(column: string, value: any): QueryBuilder<T> {
    this.filters.push({ type: 'lt', column, value });
    return this;
  }

  lte(column: string, value: any): QueryBuilder<T> {
    this.filters.push({ type: 'lte', column, value });
    return this;
  }

  is(column: string, value: any): QueryBuilder<T> {
    this.filters.push({ type: 'is', column, value });
    return this;
  }

  not(column: string, operator: string, value: any): QueryBuilder<T> {
    this.filters.push({ type: 'not', column, value: { operator, value } });
    return this;
  }

  in(column: string, values: any[]): QueryBuilder<T> {
    this.filters.push({ type: 'in', column, value: values });
    return this;
  }

  order(column: string, options: { ascending?: boolean } = {}): QueryBuilder<T> {
    this.orderOptions = { column, options };
    return this;
  }

  limit(count: number): QueryBuilder<T> {
    this.limitValue = count;
    return this;
  }

  async single(): Promise<{ data: T | null; error: any }> {
    this.isSingle = true;
    return this.executeQuery();
  }

  async maybeSingle(): Promise<{ data: T | null; error: any }> {
    this.isMaybeSingle = true;
    return this.executeQuery();
  }

  async then(resolve: any, reject?: any): Promise<any> {
    try {
      const result = await this.executeQuery();
      return resolve(result);
    } catch (error) {
      if (reject) {
        return reject(error);
      }
      return resolve({ data: null, error });
    }
  }

  private async executeQuery(): Promise<any> {
    try {
      const requestBody = {
        table: this.tableName,
        operation: this.operation,
        data: this.insertData || this.updateData,
        filters: this.filters,
        options: {
          ...this.selectOptions,
          order: this.orderOptions,
          limit: this.limitValue,
          single: this.isSingle,
          maybeSingle: this.isMaybeSingle,
        },
      };

      const response = await fetch('/api/db/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Important pour inclure les cookies
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return { data: null, error: { message: errorData.error } };
      }

      const result = await response.json();
      return result;
    } catch (error: any) {
      console.error('Query execution error:', error);
      return { data: null, error };
    }
  }
}

export function from<T = any>(tableName: string): QueryBuilder<T> {
  return new ClientQueryBuilder<T>(tableName);
}

// Auth API (même que dans supabase-compat.ts)
const auth = {
  getSession: async () => {
    try {
      const response = await fetch('/api/auth/session', { credentials: 'include' });
      const result = await response.json();
      return { data: { session: result.session, user: result.user }, error: null };
    } catch (error: any) {
      return { data: { session: null, user: null }, error };
    }
  },
  getUser: async () => {
    try {
      const response = await fetch('/api/auth/session', { credentials: 'include' });
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
        credentials: 'include',
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
        credentials: 'include',
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
      await fetch('/api/auth/signout', { method: 'POST', credentials: 'include' });
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
        credentials: 'include',
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
    return {
      data: {
        subscription: {
          unsubscribe: () => {},
        },
      },
    };
  },
};

// Stub pour le storage (non implémenté avec PostgreSQL)
const storage = {
  from: (bucket: string) => {
    return {
      upload: async (path: string, file: File, options?: any) => {
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

// Stub pour les edge functions (non implémenté avec PostgreSQL)
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

// Stub pour les real-time channels (non implémenté avec PostgreSQL)
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

export const supabase = {
  from,
  auth,
  storage,
  functions,
  channel,
};

