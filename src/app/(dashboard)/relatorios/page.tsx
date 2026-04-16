"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BarChart3, FileSpreadsheet, Download, Clock, AlertOctagon, UserX, Loader2 } from "lucide-react"
import { databases } from "@/lib/appwrite"
import { Query } from "appwrite"
import { exportToCSV, formatMinsToHHMM } from "@/lib/export-utils"

const DATABASE_ID = 'ponto-eletronico'

export default function RelatoriosPage() {
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  })
  const [isLoading, setIsLoading] = useState(false)
  
  // Opções de meses dinâmicas
  const monthOptions = Array.from({ length: 12 }).map((_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const val = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`
    const label = d.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })
    return { value: val, label: label.charAt(0).toUpperCase() + label.slice(1) }
  })

  async function fetchData() {
    setIsLoading(true)
    try {
        const [year, month] = selectedMonth.split('-')
        const startOfMonth = `${year}-${month}-01T00:00:00.000Z`
        const endOfMonth = `${year}-${month}-31T23:59:59.000Z`

        const [pontoDiaResp, empsResp] = await Promise.all([
            databases.listDocuments(DATABASE_ID, 'ponto_dia', [
                Query.greaterThanEqual('data', startOfMonth),
                Query.lessThanEqual('data', endOfMonth),
                Query.limit(5000)
            ]),
            databases.listDocuments(DATABASE_ID, 'funcionarios', [
                Query.equal('ativo', true),
                Query.limit(100)
            ])
        ])

        return {
            pontos: pontoDiaResp.documents,
            funcionarios: empsResp.documents
        }
    } catch (err) {
        console.error(err)
        alert("Erro ao buscar dados para o relatório")
        return null
    } finally {
        setIsLoading(false)
    }
  }

  const exportExtras = async () => {
    const data = await fetchData()
    if (!data) return

    const { pontos, funcionarios } = data
    const consolidated: Record<string, { nome: string, total: number }> = {}

    funcionarios.forEach(f => {
        consolidated[f.idRelogio] = { nome: f.nome, total: 0 }
    })

    pontos.forEach(p => {
        if (consolidated[p.funcionarioId]) {
            consolidated[p.funcionarioId].total += (p.horasExtrasMinutos || 0)
        }
    })

    const rows = Object.values(consolidated)
        .filter(c => c.total > 0)
        .map(c => [c.nome, formatMinsToHHMM(c.total)])

    exportToCSV(`Horas_Extras_${selectedMonth}`, ["Colaborador", "Total Horas Extras"], rows)
  }

  const exportAtrasos = async () => {
    const data = await fetchData()
    if (!data) return

    const { pontos, funcionarios } = data
    const rows: any[][] = []

    pontos.filter(p => p.atrasoMinutos > 0).forEach(p => {
        const func = funcionarios.find(f => f.idRelogio === p.funcionarioId)
        rows.push([
            new Date(p.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' }),
            func?.nome || `ID: ${p.funcionarioId}`,
            formatMinsToHHMM(p.atrasoMinutos),
            p.status
        ])
    })

    exportToCSV(`Atrasos_${selectedMonth}`, ["Data", "Colaborador", "Atraso", "Status"], rows)
  }

  const exportFaltas = async () => {
    const data = await fetchData()
    if (!data) return

    const { pontos, funcionarios } = data
    const rows: any[][] = []

    pontos.filter(p => p.status === 'falta').forEach(p => {
        const func = funcionarios.find(f => f.idRelogio === p.funcionarioId)
        rows.push([
            new Date(p.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' }),
            func?.nome || `ID: ${p.funcionarioId}`,
            "Falta Injustificada"
        ])
    })

    exportToCSV(`Faltas_${selectedMonth}`, ["Data", "Colaborador", "Tipo"], rows)
  }

  const exportBanco = async () => {
    const data = await fetchData()
    if (!data) return

    const { pontos, funcionarios } = data
    const consolidated: Record<string, { nome: string, extras: number, atrasos: number }> = {}

    funcionarios.forEach(f => {
        consolidated[f.idRelogio] = { nome: f.nome, extras: 0, atrasos: 0 }
    })

    pontos.forEach(p => {
        if (consolidated[p.funcionarioId]) {
            consolidated[p.funcionarioId].extras += (p.horasExtrasMinutos || 0)
            consolidated[p.funcionarioId].atrasos += (p.atrasoMinutos || 0)
        }
    })

    const rows = Object.values(consolidated).map(c => [
        c.nome, 
        formatMinsToHHMM(c.extras), 
        formatMinsToHHMM(c.atrasos),
        formatMinsToHHMM(c.extras - c.atrasos)
    ])

    exportToCSV(`Banco_Horas_${selectedMonth}`, ["Colaborador", "Total Extras", "Total Atrasos", "Saldo Mensal"], rows)
  }

  const reportTypes = [
    {
        title: "Horas Extras Consolidadas",
        description: "Gera um relatório CSV com o total de horas extras por colaborador no mês selecionado.",
        icon: Clock,
        color: "text-emerald-600",
        bgColor: "bg-emerald-100",
        onExport: exportExtras
    },
    {
        title: "Ocorrências de Atrasos",
        description: "Lista todos os funcionários que excederam a tolerância de atraso no período.",
        icon: AlertOctagon,
        color: "text-amber-600",
        bgColor: "bg-amber-100",
        onExport: exportAtrasos
    },
    {
        title: "Relatório de Faltas Injustificadas",
        description: "Extração de dias completos de falta que não possuem marcação ou abono.",
        icon: UserX,
        color: "text-red-600",
        bgColor: "bg-red-100",
        onExport: exportFaltas
    },
    {
        title: "Banco de Horas Geral",
        description: "Relatório gerencial com os saldos gerais (crédito e débito) de banco de horas.",
        icon: BarChart3,
        color: "text-blue-600",
        bgColor: "bg-blue-100",
        onExport: exportBanco
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Relatórios Gerenciais</h1>
          <p className="text-slate-500 text-sm">Extraia e consolide dados de frequência para o fechamento de folha.</p>
        </div>
        <div className="flex items-center gap-3 p-2 bg-white rounded-xl border shadow-sm">
            <span className="text-xs font-bold text-slate-400 uppercase ml-2">Período:</span>
            <select 
                className="h-9 rounded-md border-none bg-transparent text-sm font-semibold text-slate-700 outline-none focus:ring-0"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
            >
                {monthOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {reportTypes.map((report, i) => (
            <Card key={i} className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow group flex flex-col">
                <CardHeader className="flex flex-row items-start gap-4 space-y-0 flex-1">
                    <div className={`p-3 rounded-xl ${report.bgColor} ${report.color}`}>
                        <report.icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                        <CardTitle className="text-lg">{report.title}</CardTitle>
                        <CardDescription className="mt-1 leading-relaxed">{report.description}</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="pt-2 flex gap-3 border-t bg-slate-50 mt-4 px-6 py-4 rounded-b-xl">
                    <Button 
                        onClick={report.onExport} 
                        disabled={isLoading}
                        className="w-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-200"
                    >
                        {isLoading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin text-blue-600" />
                        ) : (
                            <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-600" />
                        )}
                        Exportar Excel / CSV
                    </Button>
                    <Button 
                        variant="outline" 
                        className="bg-slate-100 border-none hover:bg-slate-200 text-slate-500"
                        onClick={() => alert("Dica: Use a opção 'Imprimir' no Espelho de Ponto para relatórios visuais formatados.")}
                    >
                        <Download className="h-4 w-4" />
                    </Button>
                </CardContent>
            </Card>
        ))}
      </div>
    </div>
  )
}
