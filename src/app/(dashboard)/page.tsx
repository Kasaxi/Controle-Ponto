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

const DATABASE_ID = 'ponto-eletronico'
const EMPLOYEES_COLLECTION = 'funcionarios'
const HOLIDAYS_COLLECTION = 'feriados'

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeHolidaysMonth: 0,
    pendingAdjustments: 0,
    presentToday: 0
  })
  const [upcomingHolidays, setUpcomingHolidays] = useState<any[]>([])
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
      
      setStats({
        totalEmployees: employees.total,
        activeHolidaysMonth: holidays.total,
        pendingAdjustments: pendents.total,
        presentToday: Math.floor(employees.total * 0.85) // Mocked until we have today's batida tracking
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
      description: "88% de adesão",
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
        <Card className="md:col-span-4 border-none shadow-sm">
          <CardHeader>
            <CardTitle>Visão Geral de Frequência</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[240px] flex items-center justify-center text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                Gráfico de Frequência em Tempo Real
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-3 border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Próximos Feriados</CardTitle>
            <a href="/feriados"><Badge variant="outline" className="cursor-pointer hover:bg-slate-100">Ver Todos</Badge></a>
          </CardHeader>
          <CardContent className="space-y-4">
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

function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(' ')
}
