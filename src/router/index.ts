import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: () => import('../views/DashboardView.vue') },
    { path: '/library', name: 'library', component: () => import('../views/LibraryView.vue') },
    { path: '/deck/:id', name: 'chapters', component: () => import('../views/ChaptersView.vue'), props: true },
    { path: '/study/:id/:ch?', name: 'study', component: () => import('../views/StudyView.vue'), props: true },
    { path: '/dictation/:id/:ch?', name: 'dictation', component: () => import('../views/DictationView.vue'), props: true },
    { path: '/recall/:id/:ch?', name: 'recall', component: () => import('../views/RecallView.vue'), props: true },
    { path: '/review', name: 'review', component: () => import('../views/ReviewView.vue') },
    { path: '/wrong', name: 'wrong', component: () => import('../views/WrongBookView.vue') },
    { path: '/anki', name: 'anki', component: () => import('../views/AnkiExportView.vue') },
  ],
  scrollBehavior() {
    return { top: 0 }
  },
})

export default router
