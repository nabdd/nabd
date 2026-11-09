import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import type { Env } from '../config/env'
import { ADDED_COLUMNS, SCHEMA } from './schema'
import { seedDemo } from './seed'

export type Param = string | number | null

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger('Database')
  private db!: DatabaseSync

  constructor(private readonly config: ConfigService<Env, true>) {}

  onModuleInit() {
    const path = this.config.get('DATABASE_PATH', { infer: true })
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true })
    this.db = new DatabaseSync(path)
    this.db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;')
    this.db.exec(SCHEMA)
    for (const [table, column, definition] of ADDED_COLUMNS) {
      if (!this.all<{ name: string }>(`PRAGMA table_info(${table})`).some((c) => c.name === column)) {
        this.db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
      }
    }
    if (this.config.get('SEED_DEMO', { infer: true }) && this.get<{ n: number }>('SELECT COUNT(*) AS n FROM hospitals')!.n === 0) {
      seedDemo(this)
      this.log.warn('Seeded demo data (development only). Demo hospital: bloodbank@aubmc.org.lb / nabd-demo-2026')
    }
  }

  onModuleDestroy() {
    this.db?.close()
  }

  all<T>(sql: string, ...params: Param[]): T[] {
    return this.db.prepare(sql).all(...params) as T[]
  }

  get<T>(sql: string, ...params: Param[]): T | undefined {
    return this.db.prepare(sql).get(...params) as T | undefined
  }

  run(sql: string, ...params: Param[]) {
    const r = this.db.prepare(sql).run(...params)
    return { id: Number(r.lastInsertRowid), changes: Number(r.changes) }
  }

  /** Runs `fn` atomically. Any thrown error rolls everything back. */
  transaction<T>(fn: () => T): T {
    this.db.exec('BEGIN IMMEDIATE')
    try {
      const out = fn()
      this.db.exec('COMMIT')
      return out
    } catch (e) {
      this.db.exec('ROLLBACK')
      throw e
    }
  }
}
