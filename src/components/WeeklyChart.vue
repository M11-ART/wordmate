<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts/core'
import { BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { SessionLog } from '../lib/types'
import { todayStr } from '../lib/useSession'

echarts.use([BarChart, GridComponent, TooltipComponent, CanvasRenderer])

const props = defineProps<{ logs: SessionLog[] }>()
const el = ref<HTMLDivElement>()
let chart: echarts.ECharts | null = null

function last7(): { date: string; label: string; total: number }[] {
  const days: { date: string; label: string; total: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    days.push({ date, label: `${d.getMonth() + 1}/${d.getDate()}`, total: 0 })
  }
  for (const log of props.logs) {
    const day = days.find((x) => x.date === log.date)
    if (day) day.total += log.total
  }
  return days
}

onMounted(() => {
  if (!el.value) return
  chart = echarts.init(el.value)
  const data = last7()
  const today = todayStr()
  chart.setOption({
    grid: { left: 32, right: 12, top: 24, bottom: 28 },
    tooltip: { trigger: 'axis', formatter: (p: any) => `${p[0].name}：${p[0].value} 词` },
    xAxis: {
      type: 'category',
      data: data.map((d) => d.label),
      axisLine: { lineStyle: { color: '#D3DAC6' } },
      axisTick: { show: false },
      axisLabel: { color: '#5A6659', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      splitLine: { lineStyle: { color: '#E2E7D8' } },
      axisLabel: { color: '#5A6659', fontSize: 11 },
    },
    series: [
      {
        type: 'bar',
        data: data.map((d) => ({
          value: d.total,
          itemStyle: { color: d.date === today ? '#F4C95D' : '#26503F', borderRadius: [3, 3, 0, 0] },
        })),
        barWidth: '46%',
      },
    ],
  })
  const ro = new ResizeObserver(() => chart?.resize())
  ro.observe(el.value)
  onUnmounted(() => {
    ro.disconnect()
    chart?.dispose()
  })
})
</script>

<template>
  <div ref="el" class="w-full h-56"></div>
</template>
