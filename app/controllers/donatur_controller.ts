import { HttpContext } from '@adonisjs/core/http'
import Donatur from '#models/donatur'
import Donasi from '#models/donasi'
import TransaksiDonasi from '#models/transaksi_donasi'

export default class DonaturController {
  /**
   * Display the donatur listing page
   */
  async index({ view }: HttpContext) {
    const donaturs = await Donatur.all()
    return view.render('donatur/index', { donaturs })
  }
  /**
   * Display the donatur history page
   */
  async history({ params, request, view, session, response }: HttpContext) {
    try {
      // Get filter parameters
      const { kampanye_id, status, periode } = request.qs()
      
      // Find the donatur
      const donatur = await Donatur.findOrFail(params.id)
      
      // Start building the query
      let donasiQuery = Donasi.query()
        .where('donatur_id', donatur.id)
      
      // Apply status filter if provided
      if (status) {
        donasiQuery = donasiQuery.where('status', status)
      }
      
      // Apply date filter if provided
      if (periode) {
        const today = new Date()
        let startDate = new Date()
        
        switch (periode) {
          case 'today':
            startDate.setHours(0, 0, 0, 0)
            break
          case 'week':
            startDate.setDate(today.getDate() - 7)
            break
          case 'month':
            startDate.setMonth(today.getMonth() - 1)
            break
          case 'year':
            startDate.setFullYear(today.getFullYear() - 1)
            break
        }
        
        donasiQuery = donasiQuery.where('tanggal', '>=', startDate.toISOString())
      }
      
      // Order by date
      donasiQuery = donasiQuery.orderBy('tanggal', 'desc')
      
      // Execute the query
      const donasis = await donasiQuery
      
      // Get related transaksi for each donasi
      for (const donasi of donasis) {
        let transaksiQuery = TransaksiDonasi.query()
          .where('donasi_id', donasi.id)
          .preload('kampanye')
        
        // Apply kampanye filter if provided
        if (kampanye_id) {
          transaksiQuery = transaksiQuery.whereHas('kampanye', (query) => {
            query.where('id', kampanye_id)
          })
        }
        
        const transaksi = await transaksiQuery.first()
        donasi.$extras.transaksi = transaksi
        
        // Also load the kategori
        await donasi.load('kategori')
      }
      
      // Filter out donasis if kampanye_id is specified and no matching transaksi was found
      let filteredDonasis = donasis
      if (kampanye_id) {
        filteredDonasis = donasis.filter(donasi => 
          donasi.$extras.transaksi && donasi.$extras.transaksi.kampanye.id.toString() === kampanye_id
        )
      }
      
      // Calculate total donation amount for the filtered results
      let totalDonasi = 0
      for (const donasi of filteredDonasis) {
        totalDonasi += donasi.jumlah
      }
      
      return view.render('donatur/history', { 
        donatur, 
        donasis: filteredDonasis, 
        totalDonasi,
        filters: { kampanye_id, status, periode }
      })
    } catch (error) {
      session.flash('error', 'Donatur tidak ditemukan')
      return response.redirect().toRoute('donatur.index')
    }
  }

  /**
   * Display the form to create a new donatur
   */
  async create({ view }: HttpContext) {
    return view.render('donatur/create')
  }

  /**
   * Handle storing a new donatur
   */
  async store({ request, response, session }: HttpContext) {
    // Validate request
    const donaturData = request.only(['nama', 'email', 'telepon'])
    
    // Basic validation
    if (!donaturData.nama || donaturData.nama.length < 3) {
      session.flash('error', 'Nama donatur harus memiliki minimal 3 karakter')
      return response.redirect().back()
    }
    
    if (!donaturData.email || !donaturData.email.includes('@')) {
      session.flash('error', 'Email tidak valid')
      return response.redirect().back()
    }

    try {
      // Check if email already exists
      const existingDonatur = await Donatur.findBy('email', donaturData.email)
      if (existingDonatur) {
        session.flash('error', 'Email sudah digunakan oleh donatur lain')
        return response.redirect().back()
      }
      
      // Create donatur
      await Donatur.create(donaturData)
      
      // Flash success message
      session.flash('success', 'Donatur berhasil dibuat')
      
      // Redirect to donatur index
      return response.redirect().toRoute('donatur.index')
    } catch (error) {
      // Flash error message
      session.flash('error', 'Gagal membuat donatur. Silakan coba lagi.')
      
      // Redirect back with input
      return response.redirect().back()
    }
  }

  /**
   * Display the form to edit a donatur
   */
  async edit({ params, view, response, session }: HttpContext) {
    try {
      const donatur = await Donatur.findOrFail(params.id)
      return view.render('donatur/edit', { donatur })
    } catch (error) {
      session.flash('error', 'Donatur tidak ditemukan')
      return response.redirect().toRoute('donatur.index')
    }
  }

  /**
   * Handle updating a donatur
   */
  async update({ params, request, response, session }: HttpContext) {
    try {
      // Find the donatur
      const donatur = await Donatur.findOrFail(params.id)
      
      // Validate request
      const donaturData = request.only(['nama', 'email', 'telepon'])
      
      // Basic validation
      if (!donaturData.nama || donaturData.nama.length < 3) {
        session.flash('error', 'Nama donatur harus memiliki minimal 3 karakter')
        return response.redirect().back()
      }
      
      if (!donaturData.email || !donaturData.email.includes('@')) {
        session.flash('error', 'Email tidak valid')
        return response.redirect().back()
      }

      // Check if email already exists for other donatur
      const existingDonatur = await Donatur.query()
        .where('email', donaturData.email)
        .whereNot('id', donatur.id)
        .first()
      
      if (existingDonatur) {
        session.flash('error', 'Email sudah digunakan oleh donatur lain')
        return response.redirect().back()
      }
      
      // Update donatur
      donatur.nama = donaturData.nama
      donatur.email = donaturData.email
      donatur.telepon = donaturData.telepon || ''
      await donatur.save()
      
      // Flash success message
      session.flash('success', 'Donatur berhasil diperbarui')
      
      // Redirect to donatur index
      return response.redirect().toRoute('donatur.index')
    } catch (error) {
      // Flash error message
      session.flash('error', 'Gagal memperbarui donatur. Silakan coba lagi.')
      
      // Redirect back with input
      return response.redirect().back()
    }
  }

  /**
   * Handle deleting a donatur
   */
  async destroy({ params, response, session }: HttpContext) {
    try {
      // Find the donatur
      const donatur = await Donatur.findOrFail(params.id)
      
      // Check if there are any donasi associated with this donatur
      const donasiCount = await Donasi.query()
        .where('donatur_id', donatur.id)
        .count('* as total')
      
      if (parseInt(donasiCount[0].$extras.total) > 0) {
        session.flash('error', 'Donatur tidak dapat dihapus karena memiliki riwayat donasi')
        return response.redirect().toRoute('donatur.index')
      }
      
      // Delete donatur
      await donatur.delete()
      
      // Flash success message
      session.flash('success', 'Donatur berhasil dihapus')
    } catch (error) {
      // Flash error message
      session.flash('error', 'Gagal menghapus donatur. Silakan coba lagi.')
    }
    
    // Redirect to donatur index
    return response.redirect().toRoute('donatur.index')
  }
}
