import { HttpContext } from '@adonisjs/core/http'
import Donasi from '#models/donasi'
import Donatur from '#models/donatur'
import Kategori from '#models/kategori'
import Kampanye from '#models/kampanye'
import TransaksiDonasi from '#models/transaksi_donasi'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

export default class DonasiController {
  /**
   * Display the donasi listing page
   */
  async index({ view }: HttpContext) {
    // Get all donasi with related data
    const donasis = await Donasi.query()
      .preload('donatur')
      .preload('kategori')
      .orderBy('createdAt', 'desc')
    
    // Get related transaksi for each donasi
    for (const donasi of donasis) {
      donasi.$extras.transaksi = await TransaksiDonasi.query()
        .where('donasi_id', donasi.id)
        .preload('kampanye')
        .first()
    }
    
    return view.render('donasi/index', { donasis })
  }

  /**
   * Display the form to create a new donasi
   */
  async create({ view }: HttpContext) {
    const kategoris = await Kategori.all()
    const donaturs = await Donatur.all()
    const kampanyes = await Kampanye.query().preload('kategori')
    
    // Calculate remaining target for each kampanye
    for (const kampanye of kampanyes) {
      const result = await db.from('transaksi_donasi')
        .join('donasi', 'transaksi_donasi.donasi_id', 'donasi.id')
        .where('transaksi_donasi.kampanye_id', kampanye.id)
        .where('transaksi_donasi.status', 'success')
        .sum('donasi.jumlah as terkumpul')
        .first()
      
      const terkumpul = result ? parseInt(result.terkumpul) || 0 : 0
      kampanye.$extras.terkumpul = terkumpul
      kampanye.$extras.sisaTarget = Math.max(kampanye.target - terkumpul, 0)
    }
    
    return view.render('donasi/create', { kategoris, donaturs, kampanyes })
  }

  /**
   * Handle storing a new donasi
   */
  async store({ request, response, session }: HttpContext) {
    const trx = await db.transaction()
    
    try {
      // Validate request
      const donasiData = request.only(['donatur_id', 'nama', 'email', 'telepon', 'kategori_id', 'jumlah', 'kampanye_id'])
      
      // Handle donatur (existing or create new)
      let donaturId = donasiData.donatur_id
      
      if (!donaturId && donasiData.nama && donasiData.email) {
        // Create new donatur
        const donatur = await Donatur.create({
          nama: donasiData.nama,
          email: donasiData.email,
          telepon: donasiData.telepon || ''
        }, { client: trx })
        
        donaturId = donatur.id
      }
      
      if (!donaturId) {
        session.flash('error', 'Donatur harus dipilih atau dibuat baru')
        return response.redirect().back()
      }
      
      // Validate kampanye_id
      if (!donasiData.kampanye_id) {
        session.flash('error', 'Kampanye harus dipilih')
        return response.redirect().back()
      }
      
      // Validate jumlah
      if (!donasiData.jumlah || parseInt(donasiData.jumlah) <= 0) {
        session.flash('error', 'Jumlah donasi harus lebih dari 0')
        return response.redirect().back()
      }
      
      // Check if kampanye exists
      const kampanye = await Kampanye.findOrFail(donasiData.kampanye_id)
      
      // Calculate current total for kampanye
      const result = await db.from('transaksi_donasi')
        .join('donasi', 'transaksi_donasi.donasi_id', 'donasi.id')
        .where('transaksi_donasi.kampanye_id', kampanye.id)
        .where('transaksi_donasi.status', 'success')
        .sum('donasi.jumlah as terkumpul')
        .first()
      
      const terkumpul = result ? parseInt(result.terkumpul) || 0 : 0
      const sisaTarget = kampanye.target - terkumpul
      
      // Check if donation exceeds target
      if (parseInt(donasiData.jumlah) > sisaTarget) {
        session.flash('error', `Jumlah donasi melebihi sisa target kampanye (${sisaTarget})`)
        return response.redirect().back()
      }
      
      // Create donasi
      const donasi = await Donasi.create({
        donatur_id: donaturId,
        kategori_id: kampanye.kategori_id, 
        jumlah: donasiData.jumlah,
        tanggal: DateTime.local()
      }, { client: trx })
      
      // Create transaksi_donasi
      await TransaksiDonasi.create({
        donasi_id: donasi.id,
        kampanye_id: donasiData.kampanye_id,
        status: 'success' // Default status, could be changed based on payment flow
      }, { client: trx })
      
      await trx.commit()
      
      // Flash success message
      session.flash('success', 'Donasi berhasil dibuat')
      
      // Redirect to donasi index
      return response.redirect().toRoute('donasi.index')
    } catch (error) {
      await trx.rollback()
      
      // Flash error message
      session.flash('error', 'Gagal membuat donasi. Silakan coba lagi.')
      
      // Redirect back with input
      return response.redirect().back()
    }
  }

  /**
   * Display the details of a donasi
   */
  async show({ params, view, response, session }: HttpContext) {
    try {
      const donasi = await Donasi.findOrFail(params.id)
      
      // Load related data (using optional chaining to handle possible null values)
      await donasi.load('donatur')
      await donasi.load('kategori')
      
      // Get transaksi data with kampanye preloaded
      const transaksi = await TransaksiDonasi.query()
        .where('donasi_id', donasi.id)
        .preload('kampanye', (kampanyeQuery) => {
          kampanyeQuery.preload('kategori')
        })
        .first()
      
      return view.render('donasi/show', { 
        donasi, 
        transaksi,
        kampanye: transaksi ? transaksi.kampanye : null
      })
    } catch (error) {
      console.error('Error in donasi.show:', error.message)
      session.flash('error', 'Donasi tidak ditemukan atau terjadi kesalahan')
      return response.redirect().toRoute('donasi.index')
    }
  }
  /**   * Handle deleting a donasi
   */  async destroy({ params, request, response, session }: HttpContext) {
    const trx = await db.transaction()
    const { referrer, donatur_id } = request.qs()
    
    try {
      console.log(`Attempting to delete donasi with ID: ${params.id}`)
      
      // Find the donasi
      const donasi = await Donasi.findOrFail(params.id)
      console.log(`Found donasi with ID: ${donasi.id}`)
      
      try {
        // Delete related transaksi_donasi
        const deletedTransaksi = await TransaksiDonasi.query({ client: trx })
          .where('donasi_id', donasi.id)
          .delete()
        
        console.log(`Deleted ${deletedTransaksi} related transaksi_donasi records`)
        
        // Delete donasi
        await donasi.useTransaction(trx).delete()
        console.log(`Successfully deleted donasi with ID: ${params.id}`)
        
        await trx.commit()
        console.log('Transaction committed successfully')
        
        // Flash success message
        session.flash('success', 'Donasi berhasil dihapus')
      } catch (deleteError) {
        await trx.rollback()
        console.error(`Error during delete operation: ${deleteError.message}`, deleteError)
        session.flash('error', `Gagal menghapus donasi: ${deleteError.message}`)
      }
    } catch (error) {
      await trx.rollback()
      console.error(`Error in destroy method: ${error.message}`, error)
      // Flash error message
      session.flash('error', 'Gagal menghapus donasi. Donasi tidak ditemukan atau terjadi kesalahan.')
    }
    
    // If referrer is 'history' and donatur_id is provided, redirect back to the donatur history page
    if (referrer === 'history' && donatur_id) {
      return response.redirect().toRoute('donatur.history', [donatur_id])
    }
    
    // Otherwise, redirect to donasi index
    return response.redirect().toRoute('donasi.index')
  }

  /**
   * Display the form to edit a donasi
   */
  async edit({ params, view, response, session }: HttpContext) {
    try {
      const donasi = await Donasi.findOrFail(params.id)
      
      // Load related data
      await donasi.load('donatur')
      await donasi.load('kategori')
      
      // Get transaksi data with kampanye preloaded
      const transaksi = await TransaksiDonasi.query()
        .where('donasi_id', donasi.id)
        .preload('kampanye')
        .first()
      
      // Get data for form dropdowns
      const kategoris = await Kategori.all()
      const donaturs = await Donatur.all()
      const kampanyes = await Kampanye.all()
      
      return view.render('donasi/edit', { 
        donasi, 
        transaksi,
        kategoris,
        donaturs,
        kampanyes
      })
    } catch (error) {
      console.error('Error in donasi.edit:', error.message)
      session.flash('error', 'Donasi tidak ditemukan atau terjadi kesalahan')
      return response.redirect().toRoute('donasi.index')
    }
  }

  /**
   * Handle updating a donasi
   */
  async update({ params, request, response, session }: HttpContext) {
    const trx = await db.transaction()
    
    try {
      // Find the donasi
      const donasi = await Donasi.findOrFail(params.id)
      
      // Validate request
      const donasiData = request.only(['donatur_id', 'kategori_id', 'jumlah'])
      const transaksiData = request.only(['kampanye_id', 'status'])
      
      // Validate jumlah
      if (!donasiData.jumlah || parseInt(donasiData.jumlah) <= 0) {
        session.flash('error', 'Jumlah donasi harus lebih dari 0')
        return response.redirect().back()
      }
      
      // Update donasi
      donasi.donatur_id = donasiData.donatur_id
      donasi.kategori_id = donasiData.kategori_id
      donasi.jumlah = donasiData.jumlah
      
      await donasi.useTransaction(trx).save()
      
      // Update transaksi
      const transaksi = await TransaksiDonasi.query()
        .where('donasi_id', donasi.id)
        .first()
      
      if (transaksi) {
        transaksi.kampanye_id = transaksiData.kampanye_id
        transaksi.status = transaksiData.status
        
        await transaksi.useTransaction(trx).save()
      }
      
      await trx.commit()
      
      // Flash success message
      session.flash('success', 'Donasi berhasil diperbarui')
      
      // Redirect to donasi show page
      return response.redirect().toRoute('donasi.show', [donasi.id])
    } catch (error) {
      await trx.rollback()
      
      console.error('Error updating donasi:', error)
      // Flash error message
      session.flash('error', 'Gagal memperbarui donasi. Silakan coba lagi.')
      
      // Redirect back with input
      return response.redirect().back()
    }
  }
}
