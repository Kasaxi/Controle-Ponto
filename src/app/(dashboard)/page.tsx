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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  async function fetchStats() {
    try {
      const employees = await databases.listDocuments(DATABASE_ID, EMPLOYEES_COLLECTION, [
        Query.equal('ativo', true)
      ])
      
      const holidays = await databases.listDocuments(DATABASE_ID, HOLIDAYS_COLLECTION)
      
      setStats({
        totalEmployees: employees.total,
        activeHolidaysMonth: holidays.total, // Simplified for now
        pendingAdjustments: 4, // Mocked until logic is implemented
        presentToday: Math.floor(employees.total * 0.85) // Mocked
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
      description: "+2 este mês"
    },
    {
      title: "Presentes Hoje",
      value: stats.presentToday,
      icon: Clock,
      color: "bg-emerald-500",
      description: "88% de adesão"
    },
    {
      title: "Feriados (Mês)",
      value: stats.activeHolidaysMonth,
      icon: Calendar,
      color: "bg-purple-500",
      description: "Próximo: 21/04"
    },
    {
      title: "Ajustes Pendentes",
      value: stats.pendingAdjustments,
      icon: AlertTriangle,
      color: "bg-amber-500",
      description: "Requer atenção"
    }
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard Administrativo</h1>
        <p className="text-slate-500">Bem-vindo de volta! Aqui está o resumo operacional de hoje.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi, i) => (
          <Card key={i} className="border-none shadow-sm overflow-hidden group hover:shadow-md transition-shadow">
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
            <Badge variant="outline">Ver Todos</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group">
                    <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex flex-col items-center justify-center font-bold text-xs ring-1 ring-blue-100">
                        <span>21</span>
                        <span className="text-[10px] uppercase">ABR</span>
                    </div>
                    <div className="flex-1">
                        <h4 className="text-sm font-semibold text-slate-700">Tiradentes</h4>
                        <p className="text-xs text-slate-400">Terça-feira • Nacional</p>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(' ')
}
