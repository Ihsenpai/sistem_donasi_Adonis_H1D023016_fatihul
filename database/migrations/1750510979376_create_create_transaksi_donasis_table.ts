import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'transaksi_donasi'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('donasi_id').unsigned().references('id').inTable('donasi').onDelete('CASCADE')
      table.integer('kampanye_id').unsigned().references('id').inTable('kampanye').onDelete('CASCADE')
      table.enum('status', ['pending', 'success', 'failed']).defaultTo('pending')

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}