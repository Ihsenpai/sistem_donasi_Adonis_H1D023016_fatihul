import { HttpContext } from '@adonisjs/core/http'

export default class HistoryController {
  /**
   * Display the history page
   */
  async index({ view }: HttpContext) {
    return view.render('history')
  }
}
