import { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import hash from '@adonisjs/core/services/hash'

export default class AuthController {
  async showLogin({ view }: HttpContext) {
    return view.render('auth/login')
  }

  async login({ request, response, auth, session }: HttpContext) {
    const { email, password, remember } = request.only(['email', 'password', 'remember'])

    try {
      let errors = []
      
      if (!email || email.trim() === '') {
        errors.push('Email tidak boleh kosong')
      }
      
      if (!password || password.trim() === '') {
        errors.push('Password tidak boleh kosong')
      }
      
      if (errors.length > 0) {
        throw new Error(errors.join(' dan '))
      }
      
      let user
      try {
        const searchEmail = email.trim().toLowerCase()
        user = await User.findByOrFail('email', searchEmail)
      } catch (userError) {
        throw new Error('Email salah')
      }
      
      const isValid = await hash.verify(user.password, user.password)
      
      if (!isValid) {
        throw new Error('Password salah')
      }
      
      await auth.use('web').login(user, !!remember)
      
      return response.redirect().toRoute('dashboard')
    } catch (error) {
      session.flashExcept(['password'])
      session.flash('errors.form', error.message)
      return response.redirect().back()
    }
  }

  async showRegister({ view }: HttpContext) {
    return view.render('auth/register')
  }

  async register({ request, response, auth, session }: HttpContext) {
    const payload = request.only(['fullName', 'email', 'password', 'password_confirmation'])

    try {
      if (!payload.fullName || payload.fullName.trim().length < 2) {
        throw new Error('Nama lengkap harus diisi minimal 2 karakter')
      }
      
      if (!payload.email || !payload.email.includes('@')) {
        throw new Error('Email tidak valid')
      }
      
      if (!payload.password || payload.password.length < 8) {
        throw new Error('Password minimal 8 karakter')
      }
      
      if (payload.password !== payload.password_confirmation) {
        throw new Error('Konfirmasi password tidak cocok')
      }
      
      const existingUser = await User.findBy('email', payload.email.toLowerCase().trim())
      if (existingUser) {
        throw new Error('Email sudah terdaftar')
      }
      
      const hashedPassword = await hash.make(payload.password)
      
      const user = new User()
      user.fullName = payload.fullName.trim()
      user.email = payload.email.toLowerCase().trim()
      user.password = hashedPassword
      await user.save()
      
      await auth.use('web').login(user)
      
      return response.redirect().toRoute('dashboard')
    } catch (error) {
      session.flashAll()
      session.flash('errors.form', error.message || 'Gagal membuat akun. Silakan coba lagi.')
      return response.redirect().back()
    }
  }

  async logout({ auth, response }: HttpContext) {
    await auth.use('web').logout()
    return response.redirect().toRoute('login')
  }
}