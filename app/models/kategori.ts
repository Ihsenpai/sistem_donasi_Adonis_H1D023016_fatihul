import { DateTime } from 'luxon'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import Donasi from './donasi.js'
import Kampanye from './kampanye.js'

export default class Kategori extends BaseModel {
  static table = 'kategori'
  
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare nama_kategori: string

  @column.dateTime({ autoCreate: true, columnName: 'created_at' })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true, columnName: 'updated_at' })
  declare updatedAt: DateTime

  @hasMany(() => Donasi)
  declare donasi: HasMany<typeof Donasi>

  @hasMany(() => Kampanye, {
    foreignKey: 'kategori_id',
  })
  declare kampanye: HasMany<typeof Kampanye>
}