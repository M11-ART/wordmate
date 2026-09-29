import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import { autoPullOnStart } from './lib/sync'
import { refreshStats } from './lib/store'

createApp(App).use(router).mount('#app')
// 已登录则启动时静默拉取云端数据，合并后刷新首页统计
void autoPullOnStart().then((pulled) => {
  if (pulled) void refreshStats()
})
