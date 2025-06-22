import { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import Kampanye from '#models/kampanye'
import Donasi from '#models/donasi'
import Kategori from '#models/kategori'
import Donatur from '#models/donatur'

export default class DashboardController {
  /**
   * Display the dashboard
   */
  async index({ view }: HttpContext) {
    try {
      // Get latest campaigns 
      const latestKampanye = await Kampanye.query()
        .preload('kategori')
        .limit(5)
      
      // Get total collected for each campaign manually
      for (const kampanye of latestKampanye) {
        const result = await db.from('donasi')
          .join('transaksi_donasi', 'donasi.id', 'transaksi_donasi.donasi_id')
          .where('transaksi_donasi.kampanye_id', kampanye.id)
          .sum('donasi.jumlah as total')
          .first()
        
        kampanye.$extras.collected = result ? Number(result.total) || 0 : 0
      }
      
      // Get latest donations (simplified approach)
      const latestDonasi = await Donasi.query()
        .preload('donatur')
        .preload('kategori')
        .limit(5)

      // Get total donation amount
      const totalDonasi = await Donasi.query()
        .sum('jumlah as total')
        .first()

      // Get total active campaigns
      const totalKampanye = await Kampanye.query()
        .count('* as total')
        .first()

      // Get total categories
      const totalKategori = await Kategori.query()
        .count('* as total')
        .first()

      // Get total donors
      const totalDonatur = await Donatur.query()
        .count('* as total')
        .first()

      return view.render('dashboard', {
        latestKampanye,
        latestDonasi,
        totalDonasi: totalDonasi ? Number(totalDonasi.$extras.total) || 0 : 0,
        totalKampanye: totalKampanye ? Number(totalKampanye.$extras.total) || 0 : 0,
        totalKategori: totalKategori ? Number(totalKategori.$extras.total) || 0 : 0,
        totalDonatur: totalDonatur ? Number(totalDonatur.$extras.total) || 0 : 0
      })
    } catch (error) {
      console.error('Dashboard Error:', error)
      return view.render('dashboard', {
        latestKampanye: [],
        latestDonasi: [],
        totalDonasi: 0,
        totalKampanye: 0,
        totalKategori: 0,
        totalDonatur: 0,
        error: error.message
      })
    }
  }
}
