import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Donasi from './donasi.js'
import Kampanye from './kampanye.js'

export default class TransaksiDonasi extends BaseModel {
  static table = 'transaksi_donasi'
  
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare donasi_id: number

  @column()
  declare kampanye_id: number

  @column()
  declare status: 'pending' | 'success' | 'failed'

  @column.dateTime({ autoCreate: true, columnName: 'created_at' })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true, columnName: 'updated_at' })
  declare updatedAt: DateTime

  @belongsTo(() => Donasi, {
    foreignKey: 'donasi_id',
  })
  declare donasi: BelongsTo<typeof Donasi>

  @belongsTo(() => Kampanye, {
    foreignKey: 'kampanye_id',
  })
  declare kampanye: BelongsTo<typeof Kampanye>
}