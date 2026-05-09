import { invoke } from '@tauri-apps/api/core';

export interface DatabaseRow {
  [key: string]: string;
}

export interface StatisticsReport {
  [metric: string]: {
    [column: string]: string | number;
  };
}

export interface StressInput {
  na: number;
  cl: number;
  mg: number;
  so4: number;
  dryingTemp: number;
  wettingTime: number;
  dryingTime: number;
  strength: number;
  vs: number; // Volume/Surface ratio
  v: number;  // Volume
  cycles: number;
}

/**
 * Service for interacting with the Tauri backend database and ONNX engine
 */
export const databaseService = {
  /**
   * Execute a raw SQL query
   */
  async query(sql: string): Promise<DatabaseRow[]> {
    console.info(`[DB] Executing query: ${sql}`);
    try {
      const result = await invoke<string>('query_db', { sql, paramsVec: [] });
      const parsed = JSON.parse(result);
      console.info(`[DB] Query returned ${parsed.length} rows`);
      return parsed;
    } catch (error) {
      console.error(`[DB] Query failed: ${sql}`, error);
      throw error;
    }
  },

  /**
   * Fetch records with pagination and optional search
   */
  async fetchRecords(options: { limit?: number, offset?: number, search?: string, searchMode?: 'exact' | 'regex' } = {}): Promise<DatabaseRow[]> {
    const { limit = 1000, offset = 0, search, searchMode = 'regex' } = options;
    let sql = "SELECT * FROM data";
    
    if (search) {
      const searchStr = search.replace(/'/g, "''");
      if (searchMode === 'exact') {
        // Simple exact search on all relevant columns (simplified for performance)
        sql += ` WHERE title = '${searchStr}' OR author = '${searchStr}' OR cement = '${searchStr}'`;
      } else {
        // Regex search is handled by the frontend for now, but we'll use LIKE for basic backend filtering
        sql += ` WHERE title LIKE '%${searchStr}%' OR author LIKE '%${searchStr}%' OR cement LIKE '%${searchStr}%'`;
      }
    }
    
    sql += ` ORDER BY id DESC LIMIT ${limit} OFFSET ${offset}`;
    return this.query(sql);
  },

  async fetchAllRecords(): Promise<DatabaseRow[]> {
    return this.fetchRecords({ limit: 50000 }); // Reasonable limit for "All"
  },

  /**
   * Delete a record
   */
  async deleteRecord(id: string | number): Promise<void> {
    console.warn(`[DB] Deleting record ID: ${id}`);
    await this.query(`DELETE FROM data WHERE id = ${id}`);
  },

  /**
   * Add a new record
   */
  async addRecord(data: any): Promise<void> {
    console.info('[DB] Adding new record');
    const columns = Object.keys(data).join(', ');
    const values = Object.values(data).map(v => 
      typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : v
    ).join(', ');
    
    // Get max ID
    const maxIdRes = await this.query("SELECT MAX(id) as maxId FROM data");
    const nextId = (parseInt(maxIdRes[0].maxId || '0')) + 1;
    
    const sql = `INSERT INTO data (id, ${columns}) VALUES (${nextId}, ${values})`;
    await this.query(sql);
  },

  /**
   * Add multiple records in a single transaction (Ported optimization)
   */
  async addRecordsBulk(rows: any[]): Promise<void> {
    if (rows.length === 0) return;
    console.info(`[DB] Adding ${rows.length} records in bulk`);
    
    const maxIdRes = await this.query("SELECT MAX(id) as maxId FROM data");
    let currentId = parseInt(maxIdRes[0].maxId || '0');

    // We build a single INSERT with multiple VALUES if possible, 
    // or just run them in a batch if the backend supports it.
    // Since query_db opens a new connection per call, we should build a large SQL.
    
    // SQLite limit for parameters is 999, but we are using string formatting.
    // Let's chunk to 200 rows per query to avoid massive strings.
    const chunk = 200;
    for (let i = 0; i < rows.length; i += chunk) {
      const batch = rows.slice(i, i + chunk);
      let sql = "INSERT INTO data (id, cement, cementstrength, specimentype, specimenscale, wc, specificarea, sandratio, initialstrength, flyash, slag, silicafume, Na, Mg, Cl, SO4, wettingtime, wettingtemp, dryingtime, dryingtemp, cycle, degradationtime, finalstrength, source, title, journal, author, institute, time, jlcement) VALUES ";
      
      const valueLines = batch.map(row => {
        currentId++;
        const vals = [
          currentId,
          row.cement || 'P.I',
          row.cementstrength || 42.5,
          row.specimentype || '立方体',
          row.specimenscale || '100*100*100',
          row.wc || 0.4,
          row.specificarea || 0.06,
          row.sandratio || 35,
          row.initialstrength || 45,
          row.flyash || 0,
          row.slag || 0,
          row.silicafume || 0,
          row.Na || 0,
          row.Mg || 0,
          row.Cl || 0,
          row.SO4 || 0,
          row.wettingtime || 24,
          row.wettingtemp || 20,
          row.dryingtime || 24,
          row.dryingtemp || 20,
          row.cycle || 1,
          row.degradationtime || 365,
          row.finalstrength || 40,
          row.source || '文献',
          row.title || '',
          row.journal || '',
          row.author || '',
          row.institute || '',
          row.time || '',
          row.jlcement || 'A'
        ].map(v => typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : v);
        return `(${vals.join(', ')})`;
      });
      
      sql += valueLines.join(', ');
      await this.query(sql);
    }
  },

  /**
   * Update an existing record
   */
  async updateRecord(id: string | number, data: any): Promise<void> {
    console.info(`[DB] Updating record ID: ${id}`);
    const sets = Object.entries(data).map(([key, val]) => {
      const escapedVal = typeof val === 'string' ? `'${val.replace(/'/g, "''")}'` : val;
      return `"${key}" = ${escapedVal}`;
    }).join(', ');
    
    const sql = `UPDATE data SET ${sets} WHERE id = ${id}`;
    await this.query(sql);
  },

  /**
   * Check for duplicates in the database (Optimized for Bulk)
   * Legacy logic: cementstrength, finalstrength, Na, Mg, Cl, degradationtime
   */
  async checkDuplicatesBulk(rows: any[]): Promise<boolean[]> {
    console.info(`[DB] Bulk checking duplicates for ${rows.length} rows`);
    // If rows are few, check individually or in small batches
    // For now, let's keep the in-memory check but only fetch the last 2000 records 
    // which is the most likely place for duplicates during import
    const sql = `SELECT cementstrength, finalstrength, Na, Mg, Cl, degradationtime FROM data ORDER BY id DESC LIMIT 5000`;
    const dbRecords = await this.query(sql);
    
    const dbSet = new Set(dbRecords.map(r => 
      `${Number(r.cementstrength).toFixed(2)}|${Number(r.finalstrength).toFixed(2)}|${Number(r.Na).toFixed(2)}|${Number(r.Mg).toFixed(2)}|${Number(r.Cl).toFixed(2)}|${Number(r.degradationtime).toFixed(2)}`
    ));

    return rows.map(row => {
      const key = `${Number(row.cementstrength || 0).toFixed(2)}|${Number(row.finalstrength || 0).toFixed(2)}|${Number(row.Na || 0).toFixed(2)}|${Number(row.Mg || 0).toFixed(2)}|${Number(row.Cl || 0).toFixed(2)}|${Number(row.degradationtime || 0).toFixed(2)}`;
      return dbSet.has(key);
    });
  },

  async checkDuplicate(row: any): Promise<boolean> {
    const results = await this.checkDuplicatesBulk([row]);
    return results[0];
  },

  /**
   * Run ONNX batch inference
   */
  async runBatchInference(vectors: any[][]): Promise<number[]> {
    console.info(`[AI] Running batch inference for ${vectors.length} rows`);
    try {
      const results = await invoke<number[]>('run_batch_prediction', { inputs: vectors });
      console.info(`[AI] Batch inference completed`);
      return results;
    } catch (error) {
      console.error(`[AI] Batch inference failed`, error);
      throw error;
    }
  },

  /**
   * Calculate 10 metrics for a specific column
   * Legacy logic from statistics.cs
   */
  async calculateColumnStats(column: string): Promise<Record<string, string>> {
    const table = "data";
    
    try {
      // 1. Basic counts in SQL
      const basicQueries = {
        valid: `SELECT COUNT(*) as val FROM ${table} WHERE "${column}" IS NOT NULL`,
        missing: `SELECT COUNT(*) as val FROM ${table} WHERE "${column}" IS NULL`,
        unique: `SELECT COUNT(DISTINCT "${column}") as val FROM ${table}`,
      };

      const basicResults: Record<string, string> = {};
      for (const [key, sql] of Object.entries(basicQueries)) {
        const res = await this.query(sql);
        basicResults[key] = res[0]?.val || '0';
      }

      // 2. Fetch all values for complex stats
      const allRows = await this.query(`SELECT "${column}" as val FROM ${table} WHERE "${column}" IS NOT NULL`);
      const rawValues = allRows.map(r => r.val);
      const numericValues = rawValues
        .map(v => parseFloat(v))
        .filter(v => !isNaN(v))
        .sort((a, b) => a - b);

      const isNumeric = numericValues.length > 0;
      const results: Record<string, string> = { ...basicResults };

      if (!isNumeric) {
        results.avg = 'N/A';
        results.median = 'N/A';
        results.mode = rawValues.length > 0 ? this.calculateMode(rawValues) : '--';
        results.std = 'N/A';
        results.var = 'N/A';
        results.max = '--';
        results.min = '--';
      } else {
        // Numeric Calculations
        const sum = numericValues.reduce((a, b) => a + b, 0);
        const avg = sum / numericValues.length;
        
        // Median
        const mid = Math.floor(numericValues.length / 2);
        const median = numericValues.length % 2 !== 0 
          ? numericValues[mid] 
          : (numericValues[mid - 1] + numericValues[mid]) / 2;

        // Variance & Std Dev
        const squareDiffs = numericValues.map(v => Math.pow(v - avg, 2));
        const variance = squareDiffs.reduce((a, b) => a + b, 0) / numericValues.length;
        const stdDev = Math.sqrt(variance);

        results.avg = avg.toFixed(2);
        results.median = median.toFixed(2);
        results.mode = this.calculateMode(rawValues);
        results.std = stdDev.toFixed(2);
        results.var = variance.toFixed(2);
        results.max = numericValues[numericValues.length - 1].toFixed(2);
        results.min = numericValues[0].toFixed(2);
      }

      return results;
    } catch (err) {
      console.error(`[DB] Stats failed for ${column}`, err);
      return { valid: '--', avg: 'Err' };
    }
  },

  /**
   * Helper to calculate mode in JS
   */
  calculateMode(arr: string[]): string {
    if (arr.length === 0) return '--';
    const counts: Record<string, number> = {};
    let maxCount = 0;
    let mode = arr[0];

    for (const val of arr) {
      counts[val] = (counts[val] || 0) + 1;
      if (counts[val] > maxCount) {
        maxCount = counts[val];
        mode = val;
      }
    }
    return mode;
  },

  /**
   * Fetch dictionary list from a table
   */
  async getDictionary(table: string): Promise<string[]> {
    const results = await this.query(`SELECT DISTINCT "${table}" as val FROM "${table}" ORDER BY val ASC`);
    return results.map(r => r.val);
  },

  /**
   * Add item to dictionary
   */
  async addDictionaryItem(table: string, value: string): Promise<void> {
    console.info(`[DB] Adding ${value} to ${table}`);
    await this.query(`INSERT INTO "${table}" ("${table}") VALUES ('${value}')`);
  },

  /**
   * Remove item from dictionary
   */
  async removeDictionaryItem(table: string, value: string): Promise<void> {
    console.warn(`[DB] Removing ${value} from ${table}`);
    await this.query(`DELETE FROM "${table}" WHERE "${table}" = '${value}'`);
  },

  /**
   * Get cement cluster category (jlcement)
   */
  async getCementCategory(cementName: string): Promise<string> {
    const results = await this.query(`SELECT type FROM cement WHERE cement = '${cementName}' LIMIT 1`);
    return results.length > 0 ? results[0].type : 'A';
  },

  /**
   * PORTED Logic from legacy common.cs (ReduceD)
   * Calculates Crystallization Pressure (Pt)
   */
  calculateStress(params: StressInput): number {
    console.info('[AI] Calculating Crystallization Pressure (ReduceD)...');
    try {
      let { na, cl, mg, so4, dryingTemp, wettingTime, dryingTime, strength, vs, v, cycles } = params;
      
      let na2so4 = 0, nacl = 0, mgso4 = 0, mgcl2 = 0;
      
      // Ion to Salt Conversion (Priority Logic)
      if (na >= 2 * so4) {
        na2so4 = so4; na -= 2 * so4;
        if (na > cl) nacl = cl;
        else { nacl = na; cl -= na; mgcl2 = cl > 2 * mg ? mg : cl / 2; }
      } else {
        na2so4 = na / 2; so4 -= na / 2;
        if (so4 > mg) mgso4 = mg;
        else { mgso4 = so4; mg -= so4; mgcl2 = 2 * mg > cl ? cl / 2 : mg; }
      }

      const numbers = [na2so4, nacl, mgso4, mgcl2];
      const gammacls = [1.43, 0.4, 1.25, 0.32];
      const vms = [52.985, 27.021, 45.113, 40.773];
      
      // Saturated solubility matrix (0-100C)
      const S = [
        [0.345, 0.641, 1.373, 2.872, 3.436, 3.253, 3.189, 3.119, 3.077, 3.006, 2.992],
        [6.109, 6.126, 6.160, 6.211, 6.263, 6.33, 6.383, 6.468, 6.571, 6.674, 6.810],
        [1.828, 2.301, 2.783, 3.265, 3.697, 4.071, 4.337, 4.470, 4.453, 4.245, 3.838],
        [1.828, 2.301, 2.783, 3.265, 3.697, 4.071, 4.337, 4.470, 4.453, 4.245, 3.838]
      ];

      const waterContent = [
        [0.983, 0.959, 0.944, 0.930, 0.908, 0.876, 0.836, 0.790, 0.741, 0.691, 0.643, 0.596, 0.552, 0.510, 0.471, 0.435, 0.401, 0.369, 0.341, 0.314, 0.289, 0.267, 0.246, 0.227, 0.209],
        [0.005, 0.041, 0.077, 0.113, 0.149, 0.209, 0.227, 0.246, 0.267, 0.289, 0.314, 0.341, 0.369, 0.401, 0.435, 0.471, 0.510, 0.552, 0.596, 0.643, 0.691, 0.741, 0.790, 0.836, 0.876]
      ];

      const porosityArr = [0.2, 0.13, 0.1, 0.07, 0.06, 0.05, 0.045, 0.035, 0.025, 0.015, 0.01];

      const T1 = dryingTemp + 273.15;
      const R = 8.314;
      const Pls = -R * T1 * 1 * Math.log(0.5) / 18;

      let Pt = 0;
      const wIdx = Math.min(10, Math.max(0, Math.round(dryingTemp / 10)));

      for (let i = 0; i < 4; i++) {
        const tg1 = Math.min(24, Math.round(dryingTime));
        const ts1 = Math.min(24, Math.round(wettingTime));
        const gwater = waterContent[0][tg1];
        const swater = waterContent[1][ts1];
        
        let A, v_param, k_param;
        if (strength <= 50) {
          A = 0.00302 - (0.00302 - 0.000673) / 20 * (50 - strength);
          v_param = 3.057 + (4.375 - 3.057) / 20 * (50 - strength);
          k_param = 49.67 - (49.67 - 28.25) / 20 * (50 - strength);
        } else {
          A = 0.00302 + (0.0112 - 0.00302) / 30 * (strength - 50);
          v_param = 3.057 - (3.057 - 2.224) / 30 * (strength - 50);
          k_param = 49.67 + (64.29 - 49.67) / 30 * (strength - 50);
        }
        
        const fai = (A || 0.000001) * Math.exp((v_param || 0) * 1);
        const Vp = 1 - Math.exp(-(k_param || 0) * fai * 1);

        // Approximation for beta
        let m = 0;
        for (let j = -1; j >= -5; j--) {
          const power = Math.pow(10, j);
          for (let q = 0; q <= 10; q++) {
            const val1 = (Pls + Math.exp(gammacls[i] * vms[i] / (R * T1 * Math.log(m + q * power))) * Math.log(m + q * power) * R * T1 / vms[i]) * Vp;
            const val2 = (Pls + Math.exp(gammacls[i] * vms[i] / (R * T1 * Math.log(m + (q + 1) * power))) * Math.log(m + (q + 1) * power) * R * T1 / vms[i]) * Vp;
            if (val1 * val2 <= 0) { m += q * power; break; }
          }
        }
        const n = m + 1e-10;

        // Multi-cycle saturation
        let bhd = 0.6, bhd0 = 1, Ssalt = 0, detas = 0;
        const porosity = strength > 100 ? 0.01 : porosityArr[Math.min(10, Math.round(strength / 10))];
        
        for (let m1 = 1; m1 <= cycles; m1++) {
          const zk = Math.exp(Math.log(Math.max(0.01, bhd)) / (-80/9));
          bhd = Math.pow(zk, -vs);
          bhd0 = Math.pow(Math.exp(Math.log(Math.max(0.01, bhd0)) / (-80/9)), -vs);

          if (detas > 0) detas /= Math.exp(wettingTime * detas);
          Ssalt = detas + numbers[i];
          const salt = (Ssalt * bhd * v * porosity * 1e-6) + (swater * numbers[i] * v * porosity * 1e-6);
          bhd = Math.min(1, (bhd + swater) * gwater);
          bhd0 = (bhd + swater) * (1 - gwater);
          Ssalt = salt / (bhd * v * porosity * 1e-6);
          if (Ssalt > S[i][wIdx]) Ssalt = S[i][wIdx];
          detas = Ssalt - numbers[i];
        }

        const beta = Math.min(0.999999, (Ssalt / S[i][wIdx]) * (1 - n) + n);
        const Pt0 = bhd0 * (Pls + Math.exp(gammacls[i] * vms[i] / (R * T1 * Math.log(beta))) * Math.log(beta) * R * T1 / vms[i]) * Vp;
        Pt += Pt0;
      }

      const totalIons = numbers.reduce((a, b) => a + b, 0);
      const xishu = totalIons >= 2 ? 0.025 : (totalIons <= 1 ? 0.065 : 0.045);
      let result = Pt * cycles * xishu;
      
      const mk = (Pt * 300 * xishu) / (1 - 1 / Math.exp(0.01 * 300));
      if (cycles > 300) result = mk * (1 - 1 / Math.exp(0.01 * cycles));
      
      return Math.max(0, Number(result.toFixed(2)));
    } catch (e) {
      console.error('[AI] Stress calculation failed', e);
      return 0;
    }
  },
  /**
   * Initialize Users Table if not exists
   */
  async initUsers(): Promise<void> {
    const createTableSql = `
      CREATE TABLE IF NOT EXISTS users (
        uuid TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `;
    await this.query(createTableSql);

    // Check if admin exists
    const adminCheck = await this.query("SELECT * FROM users WHERE username = 'admin'");
    const now = new Date().toISOString().split('T')[0];
    if (adminCheck.length === 0) {
      await this.query(`INSERT INTO users (uuid, username, password, role, created_at) VALUES ('0001', 'admin', '123456', 'admin', '${now}')`);
    } else {
      // If admin exists and has the old default password, update it
      await this.query("UPDATE users SET password = '123456' WHERE username = 'admin' AND password = 'admin123'");
    }
  },

  async login(username: string, password: string, role: string): Promise<any> {
    const results = await this.query(`SELECT * FROM users WHERE username = '${username}' AND password = '${password}' AND role = '${role}'`);
    if (results.length > 0) return results[0];
    throw new Error("用户名、密码或角色不正确");
  },

  async register(username: string, password: string): Promise<void> {
    const check = await this.query(`SELECT * FROM users WHERE username = '${username}'`);
    if (check.length > 0) throw new Error("用户名已存在");
    
    const uuid = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const now = new Date().toISOString().split('T')[0];
    await this.query(`INSERT INTO users (uuid, username, password, role, created_at) VALUES ('${uuid}', '${username}', '${password}', 'user', '${now}')`);
  },

  async getAllUsers(): Promise<any[]> {
    return this.query("SELECT * FROM users ORDER BY uuid ASC");
  },

  async updateUserRole(uuid: string, role: string): Promise<void> {
    await this.query(`UPDATE users SET role = '${role}' WHERE uuid = '${uuid}'`);
  },

  async deleteUser(uuid: string): Promise<void> {
    if (uuid === '0001') throw new Error("初始管理员账户不可删除");
    await this.query(`DELETE FROM users WHERE uuid = '${uuid}'`);
  }
};
