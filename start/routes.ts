/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
import { middleware } from './kernel.js'

// Guest routes
router.get('/', '#controllers/welcome_controller.index')

// Auth routes
router.get('/login', '#controllers/auth_controller.showLogin').as('login').use(middleware.guest())
router.post('/login', '#controllers/auth_controller.login').use(middleware.guest())
router.get('/register', '#controllers/auth_controller.showRegister').as('register').use(middleware.guest())
router.post('/register', '#controllers/auth_controller.register').use(middleware.guest())
router.post('/logout', '#controllers/auth_controller.logout').as('logout')

// Protected routes
router.group(() => {
  // Dashboard
  router.get('/dashboard', '#controllers/dashboard_controller.index').as('dashboard')
  
  // Kategori routes
  router.get('/kategori', '#controllers/kategori_controller.index').as('kategori.index')
  router.get('/kategori/create', '#controllers/kategori_controller.create').as('kategori.create')
  router.post('/kategori', '#controllers/kategori_controller.store').as('kategori.store')
  router.get('/kategori/:id/edit', '#controllers/kategori_controller.edit').as('kategori.edit')
  router.post('/kategori/:id', '#controllers/kategori_controller.update').as('kategori.update')
  router.post('/kategori/:id/delete', '#controllers/kategori_controller.destroy').as('kategori.destroy')
  
  // Kampanye routes
  router.get('/kampanye', '#controllers/kampanye_controller.index').as('kampanye.index')
  router.get('/kampanye/create', '#controllers/kampanye_controller.create').as('kampanye.create')
  router.post('/kampanye', '#controllers/kampanye_controller.store').as('kampanye.store')
  router.get('/kampanye/:id/edit', '#controllers/kampanye_controller.edit').as('kampanye.edit')
  router.post('/kampanye/:id', '#controllers/kampanye_controller.update').as('kampanye.update')
  router.post('/kampanye/:id/delete', '#controllers/kampanye_controller.destroy').as('kampanye.destroy')
  router.get('/kampanye/:id/progress', '#controllers/kampanye_controller.showProgress').as('kampanye.progress')
  router.get('/kampanye/:id', '#controllers/kampanye_controller.show').as('kampanye.show')
  
  // Donasi routes
  router.get('/donasi', '#controllers/donasi_controller.index').as('donasi.index')
  router.get('/donasi/create', '#controllers/donasi_controller.create').as('donasi.create')
  router.post('/donasi', '#controllers/donasi_controller.store').as('donasi.store')
  router.get('/donasi/:id', '#controllers/donasi_controller.show').as('donasi.show')
  router.get('/donasi/:id/edit', '#controllers/donasi_controller.edit').as('donasi.edit')
  router.post('/donasi/:id', '#controllers/donasi_controller.update').as('donasi.update')
  router.post('/donasi/:id/delete', '#controllers/donasi_controller.destroy').as('donasi.destroy')
  
  // Donatur routes
  router.get('/donatur', '#controllers/donatur_controller.index').as('donatur.index')
  router.get('/donatur/create', '#controllers/donatur_controller.create').as('donatur.create')
  router.post('/donatur', '#controllers/donatur_controller.store').as('donatur.store')
  router.get('/donatur/:id/edit', '#controllers/donatur_controller.edit').as('donatur.edit')
  router.post('/donatur/:id', '#controllers/donatur_controller.update').as('donatur.update')
  router.post('/donatur/:id/delete', '#controllers/donatur_controller.destroy').as('donatur.destroy')
  router.get('/donatur/:id/history', '#controllers/donatur_controller.history').as('donatur.history')
  
  // Profile routes
  router.get('/profile', '#controllers/profile_controller.index').as('profile')
  router.post('/profile/delete-account', '#controllers/profile_controller.deleteAccount').as('profile.deleteAccount')
}).use(middleware.auth())
