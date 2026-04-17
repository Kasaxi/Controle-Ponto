"use client"

import React, { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BarChart3, FileSpreadsheet, Download, Clock, AlertOctagon, UserX, Loader2 } from "lucide-react"
import { databases } from "@/lib/appwrite"
import { Query } from "appwrite"
import { exportToCSV, exportToPDF, formatMinsToHHMM } from "@/lib/export-utils"

const DATABASE_ID = 'ponto-eletronico'

export default function RelatoriosPage() {
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  })
  const [employees, setEmployees] = useState<any[]>([])
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("all")
  const [isLoading, setIsLoading] = useState(false)
  
  React.useEffect(() => {
    fetchEmployeesList()
  }, [])

  async function fetchEmployeesList() {
    try {
        const resp = await databases.listDocuments(DATABASE_ID, 'funcionarios', [
            Query.equal('ativo', true),
            Query.orderAsc('nome') // Ordem alfabética
        ])
        setEmployees(resp.documents)
    } catch (err) {
        console.error("Erro ao carregar lista de funcionários:", err)
    }
  }
  
  const monthOptions = Array.from({ length: 12 }).map((_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const val = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`
    const label = d.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })
    return { value: val, label: label.charAt(0).toUpperCase() + label.slice(1) }
  })

  // Função central para processar todos os dias do mês para todos os funcionários
  async function getConsolidatedData() {
    setIsLoading(true)
    try {
        const [yearStr, monthStr] = selectedMonth.split('-')
        const year = parseInt(yearStr)
        const month = parseInt(monthStr)
        
        // Data range correta
        const startOfMonth = `${yearStr}-${monthStr}-01T00:00:00.000Z`
        const lastDay = new Date(year, month, 0).getDate()
        const endOfMonth = `${yearStr}-${monthStr}-${lastDay.toString().padStart(2, '0')}T23:59:59.000Z`

        const employeeQuery = selectedEmployeeId === "all" 
            ? [Query.equal('ativo', true), Query.limit(100)]
            : [Query.equal('idRelogio', selectedEmployeeId)]

        const [pontoDiaResp, empsResp] = await Promise.all([
            databases.listDocuments(DATABASE_ID, 'ponto_dia', [
                Query.greaterThanEqual('data', startOfMonth),
                Query.lessThanEqual('data', endOfMonth),
                Query.limit(5000)
            ]),
            databases.listDocuments(DATABASE_ID, 'funcionarios', employeeQuery)
        ])

        const pontos = pontoDiaResp.documents
        const funcionarios = empsResp.documents
        const result: any[] = []

        const hoje = new Date()
        hoje.setHours(0,0,0,0)

        // Processamento Cruzado: Funcionário x Dias do Mês
        funcionarios.forEach(func => {
            for (let i = 1; i <= lastDay; i++) {
                const dateIso = `${yearStr}-${monthStr}-${i.toString().padStart(2, '0')}T00:00:00.000Z`
                const dataObj = new Date(year, month - 1, i)
                
                if (dataObj > hoje) continue; // Não processa dias futuros

                const record = pontos.find(p => p.funcionarioId === func.idRelogio && p.data.startsWith(dateIso.split('T')[0]))
                
                const diaSemana = dataObj.getDay()
                const isWeekend = diaSemana === 0 || diaSemana === 6

                if (record) {
                    result.push({
                        ...record,
                        nomeFuncionario: func.nome,
                        isAbsence: false
                    })
                } else if (!isWeekend) {
                    // Se não tem registro e é dia útil, é FALTA
                    result.push({
                        funcionarioId: func.idRelogio,
                        nomeFuncionario: func.nome,
                        data: dateIso,
                        horasExtrasMinutos: 0,
                        atrasoMinutos: 0,
                        status: 'falta',
                        isAbsence: true
                    })
                }
            }
        })

        return result
    } catch (err) {
        console.error(err)
        alert("Erro ao processar dados")
        return null
    } finally {
        setIsLoading(false)
    }
  }

  const exportExtras = async (format: 'csv' | 'pdf' = 'csv') => {
    const data = await getConsolidatedData()
    if (!data) return

    const consolidated: Record<string, { nome: string, total: number }> = {}

    data.forEach(p => {
        if (!consolidated[p.funcionarioId]) {
            consolidated[p.funcionarioId] = { nome: p.nomeFuncionario, total: 0 }
        }
        consolidated[p.funcionarioId].total += (p.horasExtrasMinutos || 0)
    })

    const rows = Object.values(consolidated)
        .filter(c => c.total > 0)
        .map(c => [c.nome, formatMinsToHHMM(c.total)])

    const headers = ["Colaborador", "Total Horas Extras"]
    const filename = `Horas_Extras_${selectedMonth}`

    if (format === 'csv') {
        const csvRows = selectedEmployeeId === "all" ? rows : rows.map(r => [r[1]])
        const csvHeaders = selectedEmployeeId === "all" ? headers : ["Total Horas Extras"]
        exportToCSV(filename, csvHeaders, csvRows)
    } else {
        const title = `Relatório de Horas Extras - ${selectedMonth}`
        exportToPDF(filename, title, headers, rows)
    }
  }

  const exportAtrasos = async (format: 'csv' | 'pdf' = 'csv') => {
    const data = await getConsolidatedData()
    if (!data) return

    const rows = data
        .filter(p => p.atrasoMinutos > 0)
        .map(p => [
            new Date(p.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' }),
            p.nomeFuncionario,
            formatMinsToHHMM(p.atrasoMinutos),
            p.status
        ])

    const headers = ["Data", "Colaborador", "Atraso", "Status"]
    const filename = `Atrasos_${selectedMonth}`

    if (format === 'csv') {
        const csvRows = selectedEmployeeId === "all"
            ? rows // Já tem o nome na coluna 2
            : rows.map(r => r.slice(0, 1).concat(r.slice(2))) // Remove o nome se for individual
        
        const csvHeaders = selectedEmployeeId === "all" ? headers : ["Data", "Atraso", "Status"]
        exportToCSV(filename, csvHeaders, csvRows)
    } else {
        if (selectedEmployeeId === "all") {
            // PDF Consolidado com quebras de página
            const jsPDF = (await import("jspdf")).jsPDF
            const autoTable = (await import("jspdf-autotable")).default
            const doc = new jsPDF()
            
            const emps = Array.from(new Set(data.map(p => p.nomeFuncionario))).sort()
            
            emps.forEach((emp, index) => {
                if (index > 0) doc.addPage()
                
                doc.setFontSize(16)
                doc.text(`Relatório de Atrasos: ${emp}`, 14, 20)
                doc.setFontSize(10)
                doc.text(`Período: ${selectedMonth}`, 14, 28)
                
                const empRows = data
                    .filter(p => p.nomeFuncionario === emp && p.atrasoMinutos > 0)
                    .map(p => [
                        new Date(p.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' }),
                        formatMinsToHHMM(p.atrasoMinutos),
                        p.status
                    ])
                
                autoTable(doc, {
                    head: [["Data", "Atraso", "Status"]],
                    body: empRows,
                    startY: 35,
                    theme: 'striped',
                    headStyles: { fillColor: [37, 99, 235] }
                })
            })
            doc.save(`${filename}.pdf`)
        } else {
            exportToPDF(filename, `Relatório de Atrasos - ${selectedMonth}`, ["Data", "Atraso", "Status"], rows.map(r => [r[0], r[2], r[3]]))
        }
    }
  }

  const exportFaltas = async (format: 'csv' | 'pdf' = 'csv') => {
    const data = await getConsolidatedData()
    if (!data) return

    const rows = data
        .filter(p => p.status === 'falta')
        .map(p => [
            new Date(p.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' }),
            p.nomeFuncionario,
            "Falta Injustificada"
        ])

    const headers = ["Data", "Colaborador", "Tipo"]
    const filename = `Faltas_${selectedMonth}`

    if (format === 'csv') {
        const csvRows = selectedEmployeeId === "all" ? rows : rows.map(r => [r[0], r[2]])
        const csvHeaders = selectedEmployeeId === "all" ? headers : ["Data", "Tipo"]
        exportToCSV(filename, csvHeaders, csvRows)
    } else {
        if (selectedEmployeeId === "all") {
            const jsPDF = (await import("jspdf")).jsPDF
            const autoTable = (await import("jspdf-autotable")).default
            const doc = new jsPDF()
            
            const emps = Array.from(new Set(data.map(p => p.nomeFuncionario))).sort()
            
            emps.forEach((emp, index) => {
                const empRows = data
                    .filter(p => p.nomeFuncionario === emp && p.status === 'falta')
                    .map(p => [
                        new Date(p.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' }),
                        "Falta Injustificada"
                    ])
                
                if (empRows.length === 0) return

                if (doc.getCurrentPageInfo().pageNumber > 1 || index > 0) {
                     // Só adicionamos página se houver conteúdo e não for a primeira iteração válida
                     if (index > 0) doc.addPage()
                }
                
                doc.setFontSize(16)
                doc.text(`Relatório de Faltas: ${emp}`, 14, 20)
                doc.setFontSize(10)
                doc.text(`Período: ${selectedMonth}`, 14, 28)
                
                autoTable(doc, {
                    head: [["Data", "Tipo"]],
                    body: empRows,
                    startY: 35,
                    theme: 'striped',
                    headStyles: { fillColor: [220, 38, 38] } // Red for absences
                })
            })
            doc.save(`${filename}.pdf`)
        } else {
            exportToPDF(filename, `Relatório de Faltas - ${selectedMonth}`, ["Data", "Tipo"], rows.map(r => [r[0], r[2]]))
        }
    }
  }

  const exportBanco = async (format: 'csv' | 'pdf' = 'csv') => {
    const data = await getConsolidatedData()
    if (!data) return

    const consolidated: Record<string, { nome: string, extras: number, atrasos: number }> = {}

    data.forEach(p => {
        if (!consolidated[p.funcionarioId]) {
            consolidated[p.funcionarioId] = { nome: p.nomeFuncionario, extras: 0, atrasos: 0 }
        }
        consolidated[p.funcionarioId].extras += (p.horasExtrasMinutos || 0)
        consolidated[p.funcionarioId].atrasos += (p.atrasoMinutos || 0)
    })

    const rows = Object.values(consolidated).map(c => [
        c.nome, 
        formatMinsToHHMM(c.extras), 
        formatMinsToHHMM(c.atrasos),
        formatMinsToHHMM(c.extras - c.atrasos)
    ])

    const headers = ["Colaborador", "Total Extras", "Total Atrasos", "Saldo Mensal"]
    const filename = `Banco_Horas_${selectedMonth}`

    if (format === 'csv') {
        const csvRows = selectedEmployeeId === "all" ? rows : rows.map(r => [r[1], r[2], r[3]])
        const csvHeaders = selectedEmployeeId === "all" ? headers : ["Total Extras", "Total Atrasos", "Saldo Mensal"]
        exportToCSV(filename, csvHeaders, csvRows)
    } else {
        if (selectedEmployeeId === "all") {
            const jsPDF = (await import("jspdf")).jsPDF
            const autoTable = (await import("jspdf-autotable")).default
            const doc = new jsPDF()
            
            const emps = Array.from(new Set(data.map(p => p.nomeFuncionario))).sort()
            
            emps.forEach((emp, index) => {
                const groupData = rows.find(r => r[0] === emp)
                if (!groupData) return

                if (index > 0) doc.addPage()
                
                doc.setFontSize(16)
                doc.text(`Banco de Horas: ${emp}`, 14, 20)
                doc.setFontSize(10)
                doc.text(`Período: ${selectedMonth}`, 14, 28)
                
                autoTable(doc, {
                    head: [["Total Extras", "Total Atrasos", "Saldo Mensal"]],
                    body: [[groupData[1], groupData[2], groupData[3]]],
                    startY: 35,
                    theme: 'striped',
                    headStyles: { fillColor: [59, 130, 246] }
                })
            })
            doc.save(`${filename}.pdf`)
        } else {
            exportToPDF(filename, `Extrato Banco de Horas - ${selectedMonth}`, ["Total Extras", "Total Atrasos", "Saldo Mensal"], rows.map(r => [r[1], r[2], r[3]]))
        }
    }
  }

  const reportTypes = [
    {
        title: "Horas Extras Consolidadas",
        description: "Gera um relatório exportável com o total de horas extras por colaborador no mês selecionado.",
        icon: Clock,
        color: "text-emerald-600",
        bgColor: "bg-emerald-100",
        onExport: () => exportExtras('csv'),
        onPDF: () => exportExtras('pdf')
    },
    {
        title: "Ocorrências de Atrasos",
        description: "Lista todos os funcionários que excederam a tolerância de atraso no período.",
        icon: AlertOctagon,
        color: "text-amber-600",
        bgColor: "bg-amber-100",
        onExport: () => exportAtrasos('csv'),
        onPDF: () => exportAtrasos('pdf')
    },
    {
        title: "Relatório de Faltas Injustificadas",
        description: "Extração de dias completos de falta que não possuem marcação ou abono.",
        icon: UserX,
        color: "text-red-600",
        bgColor: "bg-red-100",
        onExport: () => exportFaltas('csv'),
        onPDF: () => exportFaltas('pdf')
    },
    {
        title: "Banco de Horas Geral",
        description: "Relatório gerencial com os saldos gerais (crédito e débito) de banco de horas.",
        icon: BarChart3,
        color: "text-blue-600",
        bgColor: "bg-blue-100",
        onExport: () => exportBanco('csv'),
        onPDF: () => exportBanco('pdf')
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Relatórios Gerenciais</h1>
          <p className="text-slate-500 text-sm">Extraia e consolide dados de frequência para o fechamento de folha.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 p-2 bg-white rounded-xl border shadow-sm">
            <div className="flex items-center w-full sm:w-auto">
                <span className="text-xs font-bold text-slate-400 uppercase ml-2 whitespace-nowrap">Mês:</span>
                <select 
                    className="h-9 rounded-md border-none bg-transparent text-sm font-semibold text-slate-700 outline-none focus:ring-0 cursor-pointer"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                >
                    {monthOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            </div>
            <div className="hidden sm:block w-[1px] h-6 bg-slate-200"></div>
            <div className="flex items-center w-full sm:w-auto border-t sm:border-t-0 pt-2 sm:pt-0">
                <span className="text-xs font-bold text-slate-400 uppercase ml-2 whitespace-nowrap">Colaborador:</span>
                <select 
                    className="h-9 rounded-md border-none bg-transparent text-sm font-semibold text-slate-700 outline-none focus:ring-0 cursor-pointer min-w-[150px]"
                    value={selectedEmployeeId}
                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                >
                    <option value="all">Todos os Funcionários</option>
                    {employees.map(emp => (
                        <option key={emp.$id} value={emp.idRelogio}>{emp.nome}</option>
                    ))}
                </select>
            </div>
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
                <CardContent className="pt-2 flex flex-col sm:flex-row gap-3 border-t bg-slate-50 mt-4 px-6 py-4 rounded-b-xl">
                    <Button 
                        onClick={report.onPDF}
                        disabled={isLoading}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 shadow-sm"
                    >
                        {isLoading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Download className="mr-2 h-4 w-4" />
                        )}
                        Baixar Relatório (PDF)
                    </Button>
                    <Button 
                        variant="outline" 
                        className="bg-white border-slate-200 hover:bg-slate-100 text-slate-600"
                        onClick={report.onExport} 
                        disabled={isLoading}
                    >
                        <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-600" />
                        Excel
                    </Button>
                </CardContent>
            </Card>
        ))}
      </div>
    </div>
  )
}
