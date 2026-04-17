"use client"

import React, { useEffect, useState } from "react"
import { databases } from "@/lib/appwrite"
import { Query, ID } from "appwrite"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Search, Printer, FileDown, CalendarDays, Edit2, Loader2, AlertCircle, TrendingUp, Clock, MapPin, Map } from "lucide-react"
import { Dialog } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { formatMinsToHHMM, exportToPDF } from "@/lib/export-utils"

const DATABASE_ID = 'ponto-eletronico'
const EMPLOYEES_COLLECTION = 'funcionarios'

export default function EspelhoPage() {
  const [employees, setEmployees] = useState<any[]>([])
  const [selectedEmp, setSelectedEmp] = useState<string>("")
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  }) // Inicia sempre no mês atual
  const [loading, setLoading] = useState(true)
  const [pontoDia, setPontoDia] = useState<any[]>([])
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingDay, setEditingDay] = useState<any>(null)

  useEffect(() => {
    fetchEmployees()
  }, [])

  useEffect(() => {
    if (selectedEmp && employees.length > 0) {
        fetchPontoMap()
    }
  }, [selectedEmp, selectedMonth, employees])

  async function fetchEmployees() {
    try {
      const response = await databases.listDocuments(DATABASE_ID, EMPLOYEES_COLLECTION, [
        Query.equal('ativo', true),
        Query.orderAsc('nome')
      ])
      setEmployees(response.documents)
      if (response.documents.length > 0) {
        setSelectedEmp(response.documents[0].$id)
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchPontoMap() {
    const emp = employees.find(e => e.$id === selectedEmp)
    if (!emp) return
    setLoading(true)

    try {
        const [year, month] = selectedMonth.split('-')
        const startOfMonth = `${year}-${month}-01T00:00:00.000Z`
        const endOfMonth = `${year}-${month}-31T23:59:59.000Z` // Simplificado, engloba fim do mes

        const resp = await databases.listDocuments(DATABASE_ID, 'ponto_dia', [
            Query.equal('funcionarioId', emp.idRelogio),
            Query.greaterThanEqual('data', startOfMonth),
            Query.lessThanEqual('data', endOfMonth),
            Query.orderAsc('data'),
            Query.limit(100)
        ])
        setPontoDia(resp.documents)
    } catch (err) {
        console.error(err)
    } finally {
        setLoading(false)
    }
  }

  function formatMinsToHHMM(mins: number) {
      if (!mins || mins === 0) return "-"
      const hours = Math.floor(Math.abs(mins) / 60)
      const minutes = Math.abs(mins) % 60
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
        case 'completo': return <Badge variant="success" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 font-normal">Regular</Badge>
        case 'atraso': return <Badge variant="warning" className="bg-amber-100 text-amber-700 hover:bg-amber-100 font-normal">Atraso</Badge>
        case 'incompleto': return <Badge variant="warning" className="bg-orange-100 text-orange-700 hover:bg-orange-100 font-normal">Incompleto</Badge>
        case 'falta': return <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-100 font-normal">Falta</Badge>
        case 'feriado': return <Badge variant="outline" className="text-blue-500 border-blue-200 bg-blue-50">Feriado/Abono</Badge>
        case 'descanso': 
        case 'folga': return <Badge variant="outline" className="text-slate-500 border-slate-200 bg-slate-50">Folga</Badge>
        case 'futuro': return <span className="text-slate-300 text-xs">-</span>
        default: return <Badge variant="outline" className="capitalize">{status || "Pendente"}</Badge>
    }
  }

  const openEditModal = (diaObj: any) => {
    setEditingDay(diaObj)
    setIsModalOpen(true)
  }

  const handleSaveBatidas = async (e: React.FormEvent) => {
      e.preventDefault()
      const emp = employees.find(e => e.$id === selectedEmp)
      if (!emp) return

      let payload: any = {};
      try {
          // Recálculo Matemático
          const timeToMins = (time: string) => {
              if (!time) return 0;
              const [h, m] = time.split(':').map(Number);
              return (h * 60) + m;
          };

          let minsTrab = 0;
          if (editingDay.entrada1 && editingDay.saida1) minsTrab += timeToMins(editingDay.saida1) - timeToMins(editingDay.entrada1);
          if (editingDay.entrada2 && editingDay.saida2) minsTrab += timeToMins(editingDay.saida2) - timeToMins(editingDay.entrada2);

          // Dia da semana
          const dtObj = new Date(editingDay.data)
          const diaSemana = dtObj.getUTCDay()

          let expectedMins = 0
          if (diaSemana === 0) {
              expectedMins = 0
          } else if (diaSemana === 6) {
              const sSabEnt = timeToMins(emp.jornadaSabEntrada1 || "")
              const sSabSai = timeToMins(emp.jornadaSabSaida1 || "")
              expectedMins = sSabSai > sSabEnt ? sSabSai - sSabEnt : 0
          } else {
              expectedMins = (timeToMins(emp.jornadaSaida1) - timeToMins(emp.jornadaEntrada1)) +
                             (timeToMins(emp.jornadaSaida2) - timeToMins(emp.jornadaEntrada2));
          }

          let extra = 0;
          let atraso = 0;
          const dif = minsTrab - expectedMins;
          const tolerancia = emp.toleranciaMinutos || 10;

          if (dif > 0) {
              extra = dif;
          } else if (dif < -tolerancia && expectedMins > 0) {
              atraso = Math.abs(dif);
          }

          // Se tiver edição manual para os 4 campos e status incompleto estava vindo de trás, vamos limpar o status para completo
          let st = editingDay.status || 'completo'
          if (expectedMins > 0) {
              const batidasCount = [editingDay.entrada1, editingDay.saida1, editingDay.entrada2, editingDay.saida2].filter(Boolean).length
              if (batidasCount === 4 && diaSemana !== 6) st = atraso > 0 ? 'atraso' : 'completo';
              if (batidasCount === 2 && diaSemana === 6) st = atraso > 0 ? 'atraso' : 'completo';
          } else if (minsTrab > 0) {
              st = 'extra'
              extra = minsTrab // Todo o trabalho no folga é extra
          }

          payload = {
              funcionarioId: emp.idRelogio,
              data: editingDay.data,
              entrada1: editingDay.entrada1 || null,
              saida1: editingDay.saida1 || null,
              entrada2: editingDay.entrada2 || null,
              saida2: editingDay.saida2 || null,
              horasTrabalhadasMinutos: minsTrab,
              horasExtrasMinutos: extra,
              atrasoMinutos: atraso,
              status: st,
              ajustadoManualmente: true
          }

          // Salvar no Appwrite
          if (editingDay.$id && !editingDay.isMock) {
              await databases.updateDocument(DATABASE_ID, 'ponto_dia', editingDay.$id, payload)
          } else {
              const customId = `ponto_${emp.idRelogio}_${editingDay.data.split('T')[0]}`
              await databases.createDocument(DATABASE_ID, 'ponto_dia', customId, payload)
          }
          setIsModalOpen(false)
          fetchPontoMap()
      } catch (err: any) {
          if (err.message && err.message.includes("already exists")) {
            const customId = `ponto_${emp.idRelogio}_${editingDay.data.split('T')[0]}`
            await databases.updateDocument(DATABASE_ID, 'ponto_dia', customId, payload)
            setIsModalOpen(false)
            fetchPontoMap()
          } else {
             alert("Erro ao salvar ajustes")
          }
      }
  }

  // Gera dias do mês selecionado
  const getDaysInMonth = () => {
      const [year, month] = selectedMonth.split('-').map(Number)
      const daysInMonth = new Date(year, month, 0).getDate() // ultimo dia do mes
      const fullMonth = []

      for (let i = 1; i <= daysInMonth; i++) {
          const mText = month.toString().padStart(2, '0')
          const dText = i.toString().padStart(2, '0')
          const isoDate = `${year}-${mText}-${dText}T00:00:00.000Z`
          
          const recordFound = pontoDia.find(p => p.data.startsWith(`${year}-${mText}-${dText}`))
          
          if (recordFound) {
              fullMonth.push(recordFound)
          } else {
              const dataObj = new Date(year, month - 1, i)
              const diaDaSemana = dataObj.getDay() // 0 é domingo, 6 é sabado

              // Detecta Fim de Semana basico, não considerando feriado via DB para simplificar
              const isWeekend = diaDaSemana === 0 || diaDaSemana === 6 // ADICIONADO SABADO (6)

              const hoje = new Date()
              hoje.setHours(0, 0, 0, 0)
              const isFuture = dataObj > hoje

              fullMonth.push({
                  isMock: true,
                  data: isoDate,
                  entrada1: null, saida1: null, entrada2: null, saida2: null,
                  horasTrabalhadasMinutos: 0, atrasoMinutos: 0, horasExtrasMinutos: 0,
                  status: isFuture ? 'futuro' : (isWeekend ? 'descanso' : 'falta')
              })
          }
      }
      return fullMonth
  }

  const handleExportPDF = async () => {
    const emp = employees.find(e => e.$id === selectedEmp)
    if (!emp) return

    setLoading(true)
    try {
        const days = getDaysInMonth()
        const headers = ["Data", "Entrada 1", "Saída 1", "Entrada 2", "Saída 2", "Trabalhadas", "Extras", "Atrasos", "Status"]
        
        const rows = days.map(d => [
            new Date(d.data).getUTCDate().toString().padStart(2, '0'),
            d.entrada1 || '-',
            d.saida1 || '-',
            d.entrada2 || '-',
            d.saida2 || '-',
            formatMinsToHHMM(d.horasTrabalhadasMinutos),
            formatMinsToHHMM(d.horasExtrasMinutos),
            formatMinsToHHMM(d.atrasoMinutos),
            d.status.toUpperCase()
        ])

        const filename = `Espelho_${emp.nome.replace(/\s+/g, '_')}_${selectedMonth}`
        const title = `Espelho de Ponto: ${emp.nome} - ${selectedMonth}`
        
        exportToPDF(filename, title, headers, rows, 'l')
    } catch (err) {
        console.error(err)
        alert("Erro ao gerar PDF")
    } finally {
        setLoading(false)
    }
  }

  const generatedMonthRows = getDaysInMonth()
  const totalHorasMensais = generatedMonthRows.reduce((acc, curr) => acc + (curr.horasTrabalhadasMinutos || 0), 0)
  const totalAtrasosMensais = generatedMonthRows.reduce((acc, curr) => acc + (curr.atrasoMinutos || 0), 0)
  const totalExtrasMensais = generatedMonthRows.reduce((acc, curr) => acc + (curr.horasExtrasMinutos || 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Espelho de Ponto</h1>
          <p className="text-slate-500 text-sm">Visualize as batidas diárias calculadas de cada funcionário.</p>
        </div>
        <div className="flex gap-2 print:hidden">
            <Button variant="outline" className="text-slate-600 bg-white" onClick={() => window.print()}>
                <Printer className="mr-2 h-4 w-4" /> Imprimir
            </Button>
            <Button 
                className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20" 
                onClick={handleExportPDF}
                disabled={loading}
            >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                Baixar PDF
            </Button>
        </div>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader className="bg-white border-b py-4">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-end">
            <div className="flex gap-4 w-full md:w-auto">
                <div className="space-y-1.5 flex-1 md:w-64">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Colaborador</label>
                    <select 
                        className="flex h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        value={selectedEmp}
                        onChange={(e) => setSelectedEmp(e.target.value)}
                    >
                        {employees.map(emp => (
                            <option key={emp.$id} value={emp.$id}>{emp.nome} (ID: {emp.idRelogio})</option>
                        ))}
                    </select>
                </div>
                <div className="space-y-1.5 w-40">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Mês / Ano</label>
                    <div className="relative">
                        <CalendarDays className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <select 
                            className="flex h-10 w-full rounded-md border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-500"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                        >
                            {Array.from({ length: 12 }).map((_, i) => {
                                const d = new Date()
                                d.setMonth(d.getMonth() - i)
                                const val = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`
                                const label = d.toLocaleString('pt-BR', { month: 'short', year: 'numeric' })
                                return <option key={val} value={val}>{label.charAt(0).toUpperCase() + label.slice(1)}</option>
                            })}
                        </select>
                    </div>
                </div>
            </div>
            
            <div className="flex gap-4 text-sm w-full md:w-auto p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex flex-col">
                    <span className="text-slate-500 text-xs font-medium">Horas Trabalhadas</span>
                    <span className="font-bold text-slate-800">{formatMinsToHHMM(totalHorasMensais)}</span>
                </div>
                <div className="w-[1px] bg-slate-300"></div>
                <div className="flex flex-col">
                    <span className="text-slate-500 text-xs font-medium">Horas Extras</span>
                    <span className="font-bold text-emerald-600">{formatMinsToHHMM(totalExtrasMensais)}</span>
                </div>
                <div className="w-[1px] bg-slate-300"></div>
                <div className="flex flex-col">
                    <span className="text-slate-500 text-xs font-medium">Atrasos / Faltas</span>
                    <span className="font-bold text-red-600">{formatMinsToHHMM(totalAtrasosMensais)}</span>
                </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="w-[80px] font-bold">Data</TableHead>
                <TableHead className="w-[60px] font-bold">Dia</TableHead>
                <TableHead className="font-bold text-center">Entrada 1</TableHead>
                <TableHead className="font-bold text-center">Saída 1</TableHead>
                <TableHead className="font-bold text-center">Entrada 2</TableHead>
                <TableHead className="font-bold text-center">Saída 2</TableHead>
                <TableHead className="font-bold text-center text-blue-700 bg-blue-50/30">Total</TableHead>
                <TableHead className="font-bold text-center text-emerald-700 bg-emerald-50/30">Extra</TableHead>
                <TableHead className="font-bold text-center text-red-700 bg-red-50/30">Atraso</TableHead>
                <TableHead className="font-bold text-center">Situação</TableHead>
                <TableHead className="font-bold text-right pr-4">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
                {loading && generatedMonthRows.length === 0 ? (
                    <TableRow><TableCell colSpan={11} className="text-center py-10 text-slate-400">Carregando ponto...</TableCell></TableRow>
                ) : generatedMonthRows.map((dia) => {
                    const dataObj = new Date(dia.data)
                    const diaFormatado = dataObj.toLocaleDateString('pt-BR', { timeZone: 'UTC', day: '2-digit', month: '2-digit' })
                    const semana = dataObj.toLocaleDateString('pt-BR', { timeZone: 'UTC', weekday: 'short' }).substring(0,3)
                    
                    const isFinde = dia.status === 'descanso'

                    return (
                        <TableRow key={dia.data} className={`hover:bg-slate-50 transition-colors ${dia.isMock && !isFinde ? 'bg-red-50/30' : ''} ${isFinde ? 'bg-slate-50 opacity-70' : ''}`}>
                            <TableCell className="font-medium text-slate-700">
                                <div className="flex items-center gap-2">
                                    {diaFormatado}
                                    {dia.latitude && dia.longitude && (
                                        <a 
                                            href={`https://www.google.com/maps?q=${dia.latitude},${dia.longitude}`} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            title="Ver localização no mapa"
                                            className="text-blue-500 hover:text-blue-700 transition-colors"
                                        >
                                            <MapPin className="h-3 w-3" />
                                        </a>
                                    )}
                                </div>
                            </TableCell>
                            <TableCell className="text-slate-500 text-xs uppercase">{semana}</TableCell>
                            
                            <TableCell className="text-center font-mono text-slate-600">{dia.entrada1 || "-"}</TableCell>
                            <TableCell className="text-center font-mono text-slate-600">{dia.saida1 || "-"}</TableCell>
                            <TableCell className="text-center font-mono text-slate-600">{dia.entrada2 || "-"}</TableCell>
                            <TableCell className="text-center font-mono text-slate-600">{dia.saida2 || "-"}</TableCell>
                            
                            <TableCell className="text-center font-mono font-bold text-blue-700 bg-blue-50/30">
                                {formatMinsToHHMM(dia.horasTrabalhadasMinutos)}
                            </TableCell>
                            <TableCell className="text-center font-mono font-medium text-emerald-600 bg-emerald-50/30">
                                {formatMinsToHHMM(dia.horasExtrasMinutos)}
                            </TableCell>
                            <TableCell className="text-center font-mono font-medium text-red-600 bg-red-50/30">
                                {formatMinsToHHMM(dia.atrasoMinutos)}
                            </TableCell>
                            <TableCell className="text-center">{getStatusBadge(dia.status)}</TableCell>
                            <TableCell className="text-right pr-4">
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 text-slate-400 hover:text-blue-600"
                                    onClick={() => openEditModal(dia)}
                                >
                                    <Edit2 className="h-4 w-4" />
                                </Button>
                            </TableCell>
                        </TableRow>
                    )
                })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`Ajuste Manual - ${editingDay ? new Date(editingDay.data).toLocaleDateString('pt-BR', { timeZone: 'UTC'}) : ''}`}>
         <form onSubmit={handleSaveBatidas} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Entrada 1</label>
                    <Input type="time" value={editingDay?.entrada1 || ''} onChange={(e) => setEditingDay({...editingDay, entrada1: e.target.value})} />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Saída 1</label>
                    <Input type="time" value={editingDay?.saida1 || ''} onChange={(e) => setEditingDay({...editingDay, saida1: e.target.value})} />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Entrada 2</label>
                    <Input type="time" value={editingDay?.entrada2 || ''} onChange={(e) => setEditingDay({...editingDay, entrada2: e.target.value})} />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Saída 2</label>
                    <Input type="time" value={editingDay?.saida2 || ''} onChange={(e) => setEditingDay({...editingDay, saida2: e.target.value})} />
                </div>
            </div>

            <div className="space-y-2 pt-4">
                <label className="text-sm font-medium">Justificativa / Status</label>
                <select 
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-medium"
                    value={editingDay?.status || 'completo'}
                    onChange={(e) => setEditingDay({...editingDay, status: e.target.value})}
                >
                    <option value="completo">Jornada Completa</option>
                    <option value="descanso">Folga / Descanso DSR</option>
                    <option value="falta">Falta Injustificada</option>
                    <option value="atestado">Falta Justificada (Atestado)</option>
                    <option value="feriado">Feriado Nacional</option>
                    <option value="viagem">Abono (Viagem/Trabalho Externo)</option>
                </select>
            </div>

            <div className="flex justify-end gap-3 pt-6">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Gravar Ajuste</Button>
            </div>
         </form>
      </Dialog>

      <style jsx global>{`
        @media print {
            body * {
                visibility: hidden;
            }
            .print-container, .print-container * {
                visibility: visible;
            }
            .print-container {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
            }
            aside, nav, header, button, select, .print\\:hidden {
                display: none !important;
            }
            .card, .border-none {
                border: 1px solid #e2e8f0 !important;
                box-shadow: none !important;
            }
            table {
                width: 100% !important;
            }
            th, td {
                padding: 4px 8px !important;
                font-size: 10px !important;
            }
        }
      `}</style>
    </div>
  )
}
