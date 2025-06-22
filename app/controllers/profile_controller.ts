import { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'

export default class ProfileController {
  /**
   * Display the profile page
   */
  async index({ view, auth }: HttpContext) {
    const user = auth.user
    return view.render('profile', { user })
  }

  /**
   * Delete user account
   */
  async deleteAccount({ auth, response, session }: HttpContext) {
    try {
      // Get current user
      const user = auth.user
      
      if (!user) {
        session.flash('error', 'User tidak ditemukan')
        return response.redirect().toRoute('profile.index')
      }
      
      // Delete user
      await User.query().where('id', user.id).delete()
        // Logout user
      await auth.use('web').logout()
      
      // Flash success message
      session.flash('success', 'Akun berhasil dihapus')
      
      // Redirect to login page
      return response.redirect().toRoute('auth.login')
    } catch (error) {
      console.error('Error deleting account:', error)
      session.flash('error', 'Gagal menghapus akun. Silakan coba lagi.')
      return response.redirect().back()
    }
  }
}
