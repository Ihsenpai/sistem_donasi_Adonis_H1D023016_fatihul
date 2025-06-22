import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany, computed } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Kategori from './kategori.js'
import TransaksiDonasi from './transaksi_donasi.js'

export default class Kampanye extends BaseModel {
  static table = 'kampanye'
  
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare nama_kampanye: string

  @column()
  declare kategori_id: number

  @column()
  declare target: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Kategori, {
    foreignKey: 'kategori_id',
  })
  declare kategori: BelongsTo<typeof Kategori>

  @hasMany(() => TransaksiDonasi)
  declare transaksiDonasi: HasMany<typeof TransaksiDonasi>

  @computed()
  get progress() {
    // This will be implemented later to calculate donation progress
    return 0
  }
}