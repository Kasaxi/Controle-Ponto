"use client"

import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BarChart3, FileSpreadsheet, Download, Clock, AlertOctagon, UserX } from "lucide-react"

export default function RelatoriosPage() {
  
  const reportTypes = [
    {
        title: "Horas Extras Consolidadas",
        description: "Gera um relatório CSV com o total de horas extras por colaborador no mês selecionado.",
        icon: Clock,
        color: "text-emerald-600",
        bgColor: "bg-emerald-100"
    },
    {
        title: "Ocorrências de Atrasos",
        description: "Lista todos os funcionários que excederam a tolerância de atraso no período.",
        icon: AlertOctagon,
        color: "text-amber-600",
        bgColor: "bg-amber-100"
    },
    {
        title: "Relatório de Faltas Injustificadas",
        description: "Extração de dias completos de falta que não possuem marcação ou abono (feriado/férias).",
        icon: UserX,
        color: "text-red-600",
        bgColor: "bg-red-100"
    },
    {
        title: "Banco de Horas Geral",
        description: "Relatório gerencial com os saldos gerais (crédito e débito) de banco de horas da empresa.",
        icon: BarChart3,
        color: "text-blue-600",
        bgColor: "bg-blue-100"
    }
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Relatórios Gerenciais</h1>
        <p className="text-slate-500 text-sm">Extraia e consolide dados de frequência para o fechamento de folha.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {reportTypes.map((report, i) => (
            <Card key={i} className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow group">
                <CardHeader className="flex flex-row items-start gap-4 space-y-0">
                    <div className={`p-3 rounded-xl ${report.bgColor} ${report.color}`}>
                        <report.icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                        <CardTitle className="text-lg">{report.title}</CardTitle>
                        <CardDescription className="mt-1 leading-relaxed">{report.description}</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="pt-2 flex gap-3 border-t bg-slate-50 mt-4 px-6 py-4 rounded-b-xl">
                    <select className="flex h-9 flex-1 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-500">
                        <option>Abril / 2026</option>
                        <option>Março / 2026</option>
                        <option>Fevereiro / 2026</option>
                    </select>
                    <Button variant="outline" className="bg-white hover:bg-slate-50">
                        <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-600" /> Excel
                    </Button>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                        <Download className="mr-2 h-4 w-4" /> PDF
                    </Button>
                </CardContent>
            </Card>
        ))}
      </div>
    </div>
  )
}
