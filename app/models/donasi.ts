import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Donatur from './donatur.js'
import Kategori from './kategori.js'
import TransaksiDonasi from './transaksi_donasi.js'

export default class Donasi extends BaseModel {
  static table = 'donasi'
  
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare donatur_id: number

  @column()
  declare kategori_id: number

  @column()
  declare jumlah: number

  @column.date()
  declare tanggal: DateTime

  @column.dateTime({ autoCreate: true, columnName: 'created_at' })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true, columnName: 'updated_at' })
  declare updatedAt: DateTime

  @belongsTo(() => Donatur, {
    foreignKey: 'donatur_id',
  })
  declare donatur: BelongsTo<typeof Donatur>

  @belongsTo(() => Kategori, {
    foreignKey: 'kategori_id',
  })
  declare kategori: BelongsTo<typeof Kategori>

  @hasMany(() => TransaksiDonasi, {
    foreignKey: 'donasi_id',
  })
  declare transaksiDonasi: HasMany<typeof TransaksiDonasi>
}