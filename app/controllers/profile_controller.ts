import { HttpContext } from '@adonisjs/core/http'

export default class ProfileController {
  /**
   * Display the profile page
   */
  async index({ view }: HttpContext) {
    return view.render('profile')
  }
}
