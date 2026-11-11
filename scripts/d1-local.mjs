import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';

export function localD1(filename = ':memory:') {
  const sqlite = new DatabaseSync(filename);
  sqlite.exec('PRAGMA busy_timeout = 5000');
  const exists = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='records'").get();
  if (!exists) sqlite.exec(readFileSync(new URL('../drizzle/0000_records.sql', import.meta.url), 'utf8'));
  function statement(sql, args = []) {
    return {
      bind(...values) { return statement(sql, values); },
      async all() { return { results: sqlite.prepare(sql).all(...args) }; },
      async first() { return sqlite.prepare(sql).get(...args) || null; },
      async run() { return sqlite.prepare(sql).run(...args); },
    };
  }
  return { prepare: statement, async batch(statements) { sqlite.exec('BEGIN'); try { const values = []; for (const item of statements) values.push(await item.run()); sqlite.exec('COMMIT'); return values; } catch (error) { sqlite.exec('ROLLBACK'); throw error; } }, close: () => sqlite.close(), sqlite };
}
