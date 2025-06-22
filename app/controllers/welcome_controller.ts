import { HttpContext } from '@adonisjs/core/http'
import Kampanye from '#models/kampanye'
import db from '@adonisjs/lucid/services/db'

export default class WelcomeController {
  /**
   * Display the welcome page with latest campaigns
   */
  async index({ view }: HttpContext) {
    // Get latest campaigns with their categories
    const kampanyes = await Kampanye.query()
      .preload('kategori')
      .orderBy('createdAt', 'desc')
      .limit(3)
    
    // Calculate progress for each kampanye
    for (const kampanye of kampanyes) {
      const result = await db.from('transaksi_donasi')
        .join('donasi', 'transaksi_donasi.donasi_id', 'donasi.id')
        .where('transaksi_donasi.kampanye_id', kampanye.id)
        .where('transaksi_donasi.status', 'success')
        .sum('donasi.jumlah as terkumpul')
        .first()
      
      kampanye.$extras.terkumpul = result ? parseInt(result.terkumpul) || 0 : 0
      kampanye.$extras.percentage = kampanye.target > 0 
        ? Math.min(Math.round((kampanye.$extras.terkumpul / kampanye.target) * 100), 100) 
        : 0
      
      // Calculate remaining days (assuming each campaign has 30 days from creation)
      const createdDate = new Date(kampanye.createdAt.toString())
      const endDate = new Date(createdDate)
      endDate.setDate(createdDate.getDate() + 30)
      const today = new Date()
      const diffTime = endDate.getTime() - today.getTime()
      const daysLeft = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))
      kampanye.$extras.daysLeft = daysLeft
    }
    
    return view.render('welcome', { kampanyes })
  }
}
