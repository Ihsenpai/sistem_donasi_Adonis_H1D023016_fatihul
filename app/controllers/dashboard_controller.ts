import { HttpContext } from '@adonisjs/core/http'

export default class DashboardController {
  /**
   * Display the dashboard
   */
  async index({ view }: HttpContext) {
    return view.render('dashboard')
  }
}
