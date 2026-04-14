"use client"

import React, { useEffect, useState } from "react"
import { databases } from "@/lib/appwrite"
import { Query } from "appwrite"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Users, 
  Calendar, 
  Clock, 
  AlertTriangle,
  ArrowUpRight,
  TrendingUp
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend,
  Cell
} from "recharts"

const DATABASE_ID = 'ponto-eletronico'
const EMPLOYEES_COLLECTION = 'funcionarios'
const HOLIDAYS_COLLECTION = 'feriados'

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeHolidaysMonth: 0,
    pendingAdjustments: 0,
    presentToday: 0,
    adhesion: 0
  })
  const [upcomingHolidays, setUpcomingHolidays] = useState<any[]>([])
  const [frequencyData, setFrequencyData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  async function fetchStats() {
    try {
      const employees = await databases.listDocuments(DATABASE_ID, EMPLOYEES_COLLECTION, [
        Query.equal('ativo', true)
      ])
      
      const todayIso = new Date().toISOString()
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      
      const holidays = await databases.listDocuments(DATABASE_ID, HOLIDAYS_COLLECTION, [
        Query.greaterThanEqual('data', startOfMonth.toISOString())
      ])

      const upcoming = await databases.listDocuments(DATABASE_ID, HOLIDAYS_COLLECTION, [
        Query.greaterThanEqual('data', todayIso),
        Query.orderAsc('data'),
        Query.limit(3)
      ])
      setUpcomingHolidays(upcoming.documents)

      const pendents = await databases.listDocuments(DATABASE_ID, 'ponto_dia', [
        Query.equal('status', 'incompleto'),
        Query.limit(1)
      ])

      // Cálculo de Presentes Hoje (Real)
      const startOfToday = new Date()
      startOfToday.setHours(0,0,0,0)
      const endOfToday = new Date()
      endOfToday.setHours(23,59,59,999)

      const presentTodayDocs = await databases.listDocuments(DATABASE_ID, 'ponto_dia', [
        Query.greaterThanEqual('data', startOfToday.toISOString()),
        Query.lessThanEqual('data', endOfToday.toISOString()),
        Query.limit(500)
      ])
      
      const uniquePresent = new Set(presentTodayDocs.documents.map(d => d.funcionarioId)).size
      const adhesion = employees.total > 0 ? Math.round((uniquePresent / employees.total) * 100) : 0

      // Cálculo do Gráfico de 14 dias
      const daysToFetch = 14
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - (daysToFetch - 1))
      startDate.setHours(0, 0, 0, 0)

      const historyResponse = await databases.listDocuments(DATABASE_ID, 'ponto_dia', [
        Query.greaterThanEqual('data', startDate.toISOString()),
        Query.limit(500)
      ])

      const chartMap: Record<string, any> = {}
      for (let i = 0; i < daysToFetch; i++) {
        const d = new Date(startDate)
        d.setDate(d.getDate() + i)
        const key = d.toISOString().split('T')[0]
        const label = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`
        chartMap[key] = { date: label, "No Horário": 0, "Atrasados": 0 }
      }

      historyResponse.documents.forEach(doc => {
          const key = doc.data.split('T')[0]
          if (chartMap[key]) {
              if (doc.status === 'atraso') {
                  chartMap[key]["Atrasados"] += 1
              } else if (doc.status === 'completo') {
                  chartMap[key]["No Horário"] += 1
              }
          }
      })

      setFrequencyData(Object.values(chartMap))
      
      setStats({
        totalEmployees: employees.total,
        activeHolidaysMonth: holidays.total,
        pendingAdjustments: pendents.total,
        presentToday: uniquePresent,
        adhesion: adhesion
      })
    } catch (error) {
      console.error("Error fetching stats:", error)
    } finally {
      setLoading(false)
    }
  }

  const kpis = [
    {
      title: "Colaboradores Ativos",
      value: stats.totalEmployees,
      icon: Users,
      color: "bg-blue-500",
      description: "+2 este mês",
      href: "/funcionarios"
    },
    {
      title: "Presentes Hoje",
      value: stats.presentToday,
      icon: Clock,
      color: "bg-emerald-500",
      description: `${stats.adhesion}% de adesão`,
      href: "#"
    },
    {
      title: "Feriados (Mês)",
      value: stats.activeHolidaysMonth,
      icon: Calendar,
      color: "bg-purple-500",
      description: upcomingHolidays.length > 0 ? `Próximo: ${new Date(upcomingHolidays[0].data).getUTCDate().toString().padStart(2, '0')}/${(new Date(upcomingHolidays[0].data).getUTCMonth() + 1).toString().padStart(2, '0')}` : "Nenhum",
      href: "/feriados"
    },
    {
      title: "Ajustes Pendentes",
      value: stats.pendingAdjustments,
      icon: AlertTriangle,
      color: "bg-amber-500",
      description: "Requer atenção",
      href: "/ajustes"
    }
  ]

  const getWeekDayName = (isoString: string) => {
      const days = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
      return days[new Date(isoString).getUTCDay()];
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard Administrativo</h1>
        <p className="text-slate-500">Bem-vindo de volta! Aqui está o resumo operacional de hoje.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi, i) => (
          <a key={i} href={kpi.href} className="block group">
            <Card className="border-none shadow-sm overflow-hidden h-full hover:shadow-md transition-all group-hover:scale-[1.02]">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">
                  {kpi.title}
                </CardTitle>
                <div className={cn("p-2 rounded-lg text-white", kpi.color)}>
                  <kpi.icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">{loading ? "..." : kpi.value}</div>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1 font-medium">
                  <TrendingUp className="h-3 w-3 text-emerald-500" />
                  {kpi.description}
                </p>
              </CardContent>
            </Card>
          </a>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-7">
        <Card className="md:col-span-4 border-none shadow-sm h-[400px] flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
                Visão Geral de Frequência
                <Badge variant="outline" className="font-normal text-slate-500">Últimos 14 dias</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 pb-6">
            {loading ? (
                <div className="h-full w-full flex items-center justify-center text-slate-400 bg-slate-50 rounded-lg animate-pulse">
                    Calculando frequência...
                </div>
            ) : (
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={frequencyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                            dataKey="date" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#94a3b8', fontSize: 12 }} 
                            dy={10}
                        />
                        <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#94a3b8', fontSize: 12 }}
                        />
                        <Tooltip 
                            cursor={{ fill: '#f8fafc' }}
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                        />
                        <Legend 
                            verticalAlign="top" 
                            align="right" 
                            iconType="circle"
                            wrapperStyle={{ paddingTop: '0px', paddingBottom: '20px', fontSize: '12px', fontWeight: 500 }} 
                        />
                        <Bar 
                            dataKey="No Horário" 
                            stackId="a" 
                            fill="#10b981" 
                            radius={[0, 0, 0, 0]} 
                            barSize={24}
                        />
                        <Bar 
                            dataKey="Atrasados" 
                            stackId="a" 
                            fill="#f59e0b" 
                            radius={[6, 6, 0, 0]} 
                            barSize={24}
                        />
                    </BarChart>
                </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-3 border-none shadow-sm h-[400px] flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between shrink-0">
            <CardTitle>Próximos Feriados</CardTitle>
            <a href="/feriados"><Badge variant="outline" className="cursor-pointer hover:bg-slate-100">Ver Todos</Badge></a>
          </CardHeader>
          <CardContent className="space-y-4 overflow-y-auto">
            {upcomingHolidays.length === 0 && !loading && (
                <div className="text-center py-6 text-sm text-slate-500">Nenhum feriado próximo programado.</div>
            )}
            {upcomingHolidays.map((feriado, i) => {
                const fDate = new Date(feriado.data);
                const day = fDate.getUTCDate().toString().padStart(2, '0');
                const monthText = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"][fDate.getUTCMonth()];
                return (
                <div key={i} className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group">
                    <div className="h-10 w-10 shrink-0 rounded-lg bg-blue-50 text-blue-600 flex flex-col items-center justify-center font-bold text-xs ring-1 ring-blue-100">
                        <span>{day}</span>
                        <span className="text-[10px] uppercase">{monthText}</span>
                    </div>
                    <div className="flex-1">
                        <h4 className="text-sm font-semibold text-slate-700">{feriado.nome}</h4>
                        <p className="text-xs text-slate-400">{getWeekDayName(feriado.data)} • Feriado/Descanso</p>
                    </div>
                </div>
            )})}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
