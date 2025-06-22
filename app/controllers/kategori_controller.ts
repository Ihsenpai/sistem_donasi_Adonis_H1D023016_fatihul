import { HttpContext } from '@adonisjs/core/http'
import Kategori from '#models/kategori'

export default class KategoriController {
  /**
   * Display the kategori listing page
   */
  async index({ view }: HttpContext) {
    const kategoris = await Kategori.all()
    return view.render('kategori/index', { kategoris })
  }

  /**
   * Display the form to create a new kategori
   */
  async create({ view }: HttpContext) {
    return view.render('kategori/create')
  }

  /**
   * Handle storing a new kategori
   */
  async store({ request, response, session }: HttpContext) {
    // Validate request
    const kategoriData = request.only(['nama_kategori'])

    // Basic validation
    if (!kategoriData.nama_kategori || kategoriData.nama_kategori.length < 3) {
      session.flash('error', 'Nama kategori harus memiliki minimal 3 karakter')
      return response.redirect().back()
    }

    try {
      // Create kategori
      await Kategori.create(kategoriData)
      
      // Flash success message
      session.flash('success', 'Kategori berhasil dibuat')
      
      // Redirect to kategori index
      return response.redirect().toRoute('kategori.index')
    } catch (error) {
      // Flash error message
      session.flash('error', 'Gagal membuat kategori. Silakan coba lagi.')
      
      // Redirect back with input
      return response.redirect().back()
    }
  }

  /**
   * Display the form to edit a kategori
   */
  async edit({ params, view, response, session }: HttpContext) {
    try {
      const kategori = await Kategori.findOrFail(params.id)
      return view.render('kategori/edit', { kategori })
    } catch (error) {
      session.flash('error', 'Kategori tidak ditemukan')
      return response.redirect().toRoute('kategori.index')
    }
  }

  /**
   * Handle updating a kategori
   */
  async update({ params, request, response, session }: HttpContext) {
    try {
      // Find the kategori
      const kategori = await Kategori.findOrFail(params.id)
      
      // Validate request
      const kategoriData = request.only(['nama_kategori'])
      
      // Basic validation
      if (!kategoriData.nama_kategori || kategoriData.nama_kategori.length < 3) {
        session.flash('error', 'Nama kategori harus memiliki minimal 3 karakter')
        return response.redirect().back()
      }

      // Update kategori
      kategori.nama_kategori = kategoriData.nama_kategori
      await kategori.save()
      
      // Flash success message
      session.flash('success', 'Kategori berhasil diperbarui')
      
      // Redirect to kategori index
      return response.redirect().toRoute('kategori.index')
    } catch (error) {
      // Flash error message
      session.flash('error', 'Gagal memperbarui kategori. Silakan coba lagi.')
      
      // Redirect back with input
      return response.redirect().back()
    }
  }

  /**
   * Handle deleting a kategori
   */
  async destroy({ params, response, session }: HttpContext) {
    try {
      // Find the kategori
      const kategori = await Kategori.findOrFail(params.id)
      
      // Delete kategori
      await kategori.delete()
      
      // Flash success message
      session.flash('success', 'Kategori berhasil dihapus')
    } catch (error) {
      // Flash error message
      session.flash('error', 'Gagal menghapus kategori. Silakan coba lagi.')
    }
    
    // Redirect to kategori index
    return response.redirect().toRoute('kategori.index')
  }
}
