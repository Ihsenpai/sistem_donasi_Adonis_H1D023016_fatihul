import { HttpContext } from '@adonisjs/core/http'
import Donatur from '#models/donatur'
import Donasi from '#models/donasi'
import TransaksiDonasi from '#models/transaksi_donasi'
import Kategori from '#models/kategori'

export default class DonaturController {
  /**
   * Display the donatur listing page
   */
  async index({ view }: HttpContext) {
    const donaturs = await Donatur.all()
    return view.render('donatur/index', { donaturs })
  }  /**
   * Display the donatur history page
   */  async history({ params, request, view, session, response }: HttpContext) {
    try {
      // Get search term from query string
      const { search, page = 1 } = request.qs()
      const perPage = 5 // Items per page
      
      // Find the donatur
      const donatur = await Donatur.findOrFail(params.id)
      
      // Start building the query
      let donasiQuery = Donasi.query()
        .where('donatur_id', donatur.id)
      
      // Apply search if provided
      if (search) {
        donasiQuery = donasiQuery.whereHas('transaksiDonasi', (transQuery) => {
          transQuery.whereHas('kampanye', (kampanyeQuery) => {
            kampanyeQuery.whereILike('nama_kampanye', `%${search}%`)
          })
        })
      }
      
      // Order by date descending (newest first)
      donasiQuery = donasiQuery.orderBy('tanggal', 'desc')
      
      // Paginate results
      const donasisPaginator = await donasiQuery.paginate(page, perPage)
      
      // Convert to JSON to work with the data more easily
      const donasis = donasisPaginator.toJSON().data
      
      // Get all donasi IDs for efficient loading
      const donasiIds = donasis.map(donasi => donasi.id)
      const kategoriIds = donasis.map(donasi => donasi.kategori_id).filter(Boolean)
      
      // Load all transaksis with kampanye in one query
      const transaksis = await TransaksiDonasi.query()
        .whereIn('donasi_id', donasiIds)
        .preload('kampanye')
        // Create a map for efficient lookups
      const transaksiMap: Record<number, any> = {}
      transaksis.forEach(transaksi => {
        transaksiMap[transaksi.donasi_id] = transaksi.serialize()
      })
      
      // Load all kategoris in one query
      const kategoris = await Kategori.query()
        .whereIn('id', kategoriIds)
      
      const kategoriMap: Record<number, any> = {}
      kategoris.forEach(kategori => {
        kategoriMap[kategori.id] = kategori.serialize()
      })
      
      // Attach related data to each donasi
      for (const donasi of donasis) {
        donasi.$extras = donasi.$extras || {}
        
        // Attach transaksi and kampanye
        const transaksi = transaksiMap[donasi.id]
        if (transaksi) {
          donasi.$extras.transaksi = transaksi
          donasi.$extras.status = transaksi.status
        } else {
          donasi.$extras.status = 'unknown'
        }
        
        // Attach kategori
        if (donasi.kategori_id && kategoriMap[donasi.kategori_id]) {
          donasi.kategori = kategoriMap[donasi.kategori_id]
        }
      }
      
      // Calculate total donation amount
      let totalDonasi = 0
      for (const donasi of donasis) {
        totalDonasi += parseFloat(donasi.jumlah) || 0
      }
        
      // Prepare pagination meta with proper query string
      const meta = donasisPaginator.getMeta()
      
      // Create URLs with search parameter if it exists
      if (search) {
        const baseUrl = `/donatur/${donatur.id}/history?search=${encodeURIComponent(search)}`
        
        meta.previousPageUrl = meta.currentPage > 1 
          ? `${baseUrl}&page=${meta.currentPage - 1}` 
          : null
          
        meta.nextPageUrl = meta.currentPage < meta.lastPage 
          ? `${baseUrl}&page=${meta.currentPage + 1}` 
          : null
      }
      
      console.log('Pagination Meta:', meta)
      
      // Debug output
      console.log('Donasi Data Check:')
      donasis.forEach((donasi, index) => {
        console.log(`Donasi ${index + 1} (ID: ${donasi.id}):`)
        console.log(`- Has kampanye: ${donasi.$extras?.transaksi?.kampanye ? 'Yes' : 'No'}`)
        console.log(`- Has kategori: ${donasi.kategori ? 'Yes' : 'No'}`)
      })
      
      return view.render('donatur/history', { 
        donatur, 
        donasis,
        totalDonasi,
        meta,
        search
      })
    } catch (error) {
      console.error('Error in donatur.history:', error.message)
      session.flash('error', 'Donatur tidak ditemukan atau terjadi kesalahan')
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
   */  async destroy({ params, response, session }: HttpContext) {
    try {
      console.log(`Attempting to delete donatur with ID: ${params.id}`)
      
      // Find the donatur
      const donatur = await Donatur.findOrFail(params.id)
      console.log(`Found donatur: ${donatur.nama}`)
      
      // Check if there are any donasi associated with this donatur
      const donasiCount = await Donasi.query()
        .where('donatur_id', donatur.id)
        .count('* as total')
      
      const count = parseInt(donasiCount[0].$extras.total)
      console.log(`Related donasi count: ${count}`)
      
      if (count > 0) {
        console.log(`Cannot delete donatur with ID ${params.id} due to ${count} related donasi`)
        session.flash('error', 'Donatur tidak dapat dihapus karena memiliki riwayat donasi')
        return response.redirect().toRoute('donatur.index')
      }
      
      try {
        // Delete donatur
        await donatur.delete()
        console.log(`Successfully deleted donatur with ID: ${params.id}`)
        
        // Flash success message
        session.flash('success', 'Donatur berhasil dihapus')
      } catch (deleteError) {
        console.error(`Error in delete operation: ${deleteError.message}`, deleteError)
        session.flash('error', `Gagal menghapus donatur: ${deleteError.message}`)
      }
    } catch (error) {
      // Log the error
      console.error(`Error in destroy method: ${error.message}`, error)
      
      // Flash error message
      session.flash('error', 'Gagal menghapus donatur. Donatur tidak ditemukan atau terjadi kesalahan.')
    }
    
    // Redirect to donatur index
    return response.redirect().toRoute('donatur.index')
  }
}
