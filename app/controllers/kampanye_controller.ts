import { HttpContext } from '@adonisjs/core/http'
import Kampanye from '#models/kampanye'
import Kategori from '#models/kategori'
import TransaksiDonasi from '#models/transaksi_donasi'
import db from '@adonisjs/lucid/services/db'

export default class KampanyeController {
  /**
   * Display the kampanye listing page
   */
  async index({ view }: HttpContext) {
    const kampanyes = await Kampanye.query().preload('kategori')
    
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
    }
    
    return view.render('kampanye/index', { kampanyes })
  }

  /**
   * Display the form to create a new kampanye
   */
  async create({ view }: HttpContext) {
    const kategoris = await Kategori.all()
    return view.render('kampanye/create', { kategoris })
  }

  /**
   * Handle storing a new kampanye
   */
  async store({ request, response, session }: HttpContext) {
    // Validate request
    const kampanyeData = request.only(['nama_kampanye', 'kategori_id', 'target'])
    
    // Basic validation
    if (!kampanyeData.nama_kampanye || kampanyeData.nama_kampanye.length < 5) {
      session.flash('error', 'Nama kampanye harus memiliki minimal 5 karakter')
      return response.redirect().back()
    }
    
    if (!kampanyeData.kategori_id) {
      session.flash('error', 'Kategori harus dipilih')
      return response.redirect().back()
    }
    
    if (!kampanyeData.target || parseInt(kampanyeData.target) <= 0) {
      session.flash('error', 'Target donasi harus lebih dari 0')
      return response.redirect().back()
    }

    try {
      // Ensure kategori exists
      await Kategori.findOrFail(kampanyeData.kategori_id)
      
      // Create kampanye
      await Kampanye.create({
        nama_kampanye: kampanyeData.nama_kampanye,
        kategori_id: kampanyeData.kategori_id,
        target: kampanyeData.target
      })
      
      // Flash success message
      session.flash('success', 'Kampanye berhasil dibuat')
      
      // Redirect to kampanye index
      return response.redirect().toRoute('kampanye.index')
    } catch (error) {
      // Flash error message
      session.flash('error', 'Gagal membuat kampanye. Silakan coba lagi.')
      
      // Redirect back with input
      return response.redirect().back()
    }
  }

  /**
   * Display the form to edit a kampanye
   */
  async edit({ params, view, response, session }: HttpContext) {
    try {
      const kampanye = await Kampanye.findOrFail(params.id)
      const kategoris = await Kategori.all()
      return view.render('kampanye/edit', { kampanye, kategoris })
    } catch (error) {
      session.flash('error', 'Kampanye tidak ditemukan')
      return response.redirect().toRoute('kampanye.index')
    }
  }

  /**
   * Handle updating a kampanye
   */
  async update({ params, request, response, session }: HttpContext) {
    try {
      // Find the kampanye
      const kampanye = await Kampanye.findOrFail(params.id)
      
      // Validate request
      const kampanyeData = request.only(['nama_kampanye', 'kategori_id', 'target'])
      
      // Basic validation
      if (!kampanyeData.nama_kampanye || kampanyeData.nama_kampanye.length < 5) {
        session.flash('error', 'Nama kampanye harus memiliki minimal 5 karakter')
        return response.redirect().back()
      }
      
      if (!kampanyeData.kategori_id) {
        session.flash('error', 'Kategori harus dipilih')
        return response.redirect().back()
      }
      
      if (!kampanyeData.target || parseInt(kampanyeData.target) <= 0) {
        session.flash('error', 'Target donasi harus lebih dari 0')
        return response.redirect().back()
      }

      // Ensure kategori exists
      await Kategori.findOrFail(kampanyeData.kategori_id)
      
      // Update kampanye
      kampanye.nama_kampanye = kampanyeData.nama_kampanye
      kampanye.kategori_id = kampanyeData.kategori_id
      kampanye.target = kampanyeData.target
      await kampanye.save()
      
      // Flash success message
      session.flash('success', 'Kampanye berhasil diperbarui')
      
      // Redirect to kampanye index
      return response.redirect().toRoute('kampanye.index')
    } catch (error) {
      // Flash error message
      session.flash('error', 'Gagal memperbarui kampanye. Silakan coba lagi.')
      
      // Redirect back with input
      return response.redirect().back()
    }
  }

  /**
   * Handle deleting a kampanye
   */  async destroy({ params, response, session }: HttpContext) {
    try {
      console.log(`Attempting to delete kampanye with ID: ${params.id}`)
      
      // Find the kampanye
      const kampanye = await Kampanye.findOrFail(params.id)
      console.log(`Found kampanye: ${kampanye.nama_kampanye}`)
      
      // Check if there are any transaksi_donasi associated with this kampanye
      const transaksiCount = await TransaksiDonasi.query()
        .where('kampanye_id', kampanye.id)
        .count('* as total')
      
      const count = parseInt(transaksiCount[0].$extras.total)
      console.log(`Related transaksi count: ${count}`)
      
      if (count > 0) {
        console.log(`Cannot delete kampanye with ID ${params.id} due to ${count} related transaksi`)
        session.flash('error', 'Kampanye tidak dapat dihapus karena memiliki transaksi donasi')
        return response.redirect().toRoute('kampanye.index')
      }
      
      try {
        // Delete kampanye
        await kampanye.delete()
        console.log(`Successfully deleted kampanye with ID: ${params.id}`)
        
        // Flash success message
        session.flash('success', 'Kampanye berhasil dihapus')
      } catch (deleteError) {
        console.error(`Error in delete operation: ${deleteError.message}`, deleteError)
        session.flash('error', `Gagal menghapus kampanye: ${deleteError.message}`)
      }
    } catch (error) {
      // Log the error
      console.error(`Error in destroy method: ${error.message}`, error)
      
      // Flash error message
      session.flash('error', 'Gagal menghapus kampanye. Kampanye tidak ditemukan atau terjadi kesalahan.')
    }
    
    // Redirect to kampanye index
    return response.redirect().toRoute('kampanye.index')
  }
    /**
   * Display the progress of a kampanye
   */
  async showProgress({ params, view, response, session }: HttpContext) {
    try {
      const kampanye = await Kampanye.findOrFail(params.id)
      
      // Get related kategori
      await kampanye.load('kategori')
      
      // Calculate total donations
      const result = await db.from('transaksi_donasi')
        .join('donasi', 'transaksi_donasi.donasi_id', 'donasi.id')
        .where('transaksi_donasi.kampanye_id', kampanye.id)
        .where('transaksi_donasi.status', 'success')
        .sum('donasi.jumlah as terkumpul')
        .first()
      
      const terkumpul = result ? parseInt(result.terkumpul) || 0 : 0
      const percentage = kampanye.target > 0 
        ? Math.min(Math.round((terkumpul / kampanye.target) * 100), 100) 
        : 0
      
      // Get recent donations
      const recentDonations = await db.from('transaksi_donasi')
        .join('donasi', 'transaksi_donasi.donasi_id', 'donasi.id')
        .join('donatur', 'donasi.donatur_id', 'donatur.id')
        .where('transaksi_donasi.kampanye_id', kampanye.id)
        .where('transaksi_donasi.status', 'success')
        .select('donatur.nama', 'donasi.jumlah', 'donasi.tanggal')
        .orderBy('donasi.tanggal', 'desc')
        .limit(5)
      
      return view.render('kampanye/progress', { 
        kampanye, 
        terkumpul, 
        percentage, 
        recentDonations 
      })
    } catch (error) {
      session.flash('error', 'Kampanye tidak ditemukan')
      return response.redirect().toRoute('kampanye.index')
    }
  }

  /**
   * Display a specific kampanye
   */
  async show({ params, view, response, session }: HttpContext) {
    try {
      const kampanye = await Kampanye.findOrFail(params.id)
      
      // Get related kategori
      await kampanye.load('kategori')
      
      // Calculate total donations
      const result = await db.from('transaksi_donasi')
        .join('donasi', 'transaksi_donasi.donasi_id', 'donasi.id')
        .where('transaksi_donasi.kampanye_id', kampanye.id)
        .where('transaksi_donasi.status', 'success')
        .sum('donasi.jumlah as terkumpul')
        .first()
      
      const terkumpul = result ? parseInt(result.terkumpul) || 0 : 0
      const percentage = kampanye.target > 0 
        ? Math.min(Math.round((terkumpul / kampanye.target) * 100), 100) 
        : 0
      
      // Get recent donations
      const recentDonations = await db.from('transaksi_donasi')
        .join('donasi', 'transaksi_donasi.donasi_id', 'donasi.id')
        .leftJoin('donatur', 'donasi.donatur_id', 'donatur.id')
        .where('transaksi_donasi.kampanye_id', kampanye.id)
        .where('transaksi_donasi.status', 'success')
        .select('donatur.nama', 'donasi.jumlah', 'donasi.tanggal', 'donasi.id')
        .orderBy('donasi.tanggal', 'desc')
        .limit(10)
      
      return view.render('kampanye/show', { 
        kampanye, 
        terkumpul, 
        percentage, 
        recentDonations 
      })
    } catch (error) {
      console.error('Error in kampanye.show:', error)
      session.flash('error', 'Kampanye tidak ditemukan atau terjadi kesalahan')
      return response.redirect().toRoute('kampanye.index')
    }
  }
}
