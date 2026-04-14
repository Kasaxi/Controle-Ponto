"use client"

import React, { useEffect, useState } from "react"
import { databases } from "@/lib/appwrite"
import { Query } from "appwrite"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ExternalLink, Loader2, AlertCircle } from "lucide-react"

const DATABASE_ID = 'ponto-eletronico'

export default function AjustesPage() {
    const [pendents, setPendents] = useState<any[]>([])
    const [employeesMap, setEmployeesMap] = useState<Record<number, string>>({})
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchPendents()
    }, [])

    async function fetchPendents() {
        try {
            // Buscamos os pontos incompletos primeiro
            const response = await databases.listDocuments(DATABASE_ID, 'ponto_dia', [
                Query.equal('status', 'incompleto'),
                Query.limit(100),
                Query.orderDesc('data')
            ])

            // Extraímos IDs de funcionários para buscar os nomes em batch
            const funcIds = Array.from(new Set(response.documents.map(d => d.funcionarioId)))
            const empsResponse = await databases.listDocuments(DATABASE_ID, 'funcionarios', [])
            
            const eMap: Record<number, string> = {}
            empsResponse.documents.forEach(e => {
                eMap[e.idRelogio] = e.nome
            })

            setEmployeesMap(eMap)
            setPendents(response.documents)
        } catch (error) {
            console.error("Erro listando pendentes", error)
        } finally {
            setLoading(false)
        }
    }

    const formatDate = (iso: string) => {
        const d = new Date(iso)
        return `${d.getUTCDate().toString().padStart(2, '0')}/${(d.getUTCMonth() + 1).toString().padStart(2, '0')}/${d.getUTCFullYear()}`
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <a href="/"><Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-900"><ArrowLeft className="h-4 w-4" /></Button></a>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Ajustes Pendentes</h1>
                    </div>
                    <p className="text-slate-500 text-sm ml-10">Consulte os dias que possuem marcações de ponto faltando ou em aberto.</p>
                </div>
            </div>

            <Card className="border-none shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <AlertCircle className="h-5 w-5 text-amber-500" />
                        Ação Necessária
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center p-12 text-slate-400">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : pendents.length === 0 ? (
                        <div className="text-center p-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                            <h3 className="text-lg font-semibold text-slate-700 mb-1">Tudo limpo por aqui!</h3>
                            <p className="text-sm text-slate-500">Não há nenhum ajuste pendente de marcação de ponto no momento.</p>
                        </div>
                    ) : (
                        <div className="rounded-xl border bg-white overflow-hidden">
                            <Table>
                                <TableHeader className="bg-slate-50/50">
                                    <TableRow>
                                        <TableHead>Colaborador</TableHead>
                                        <TableHead>Data Pendente</TableHead>
                                        <TableHead className="text-center">Batidas</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Ação</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pendents.map(dia => {
                                        const count = [dia.entrada1, dia.saida1, dia.entrada2, dia.saida2].filter(Boolean).length;
                                        return (
                                            <TableRow key={dia.$id} className="group">
                                                <TableCell className="font-medium text-slate-700">
                                                    {employeesMap[dia.funcionarioId] || `Desconhecido (ID: ${dia.funcionarioId})`}
                                                </TableCell>
                                                <TableCell className="text-slate-500">
                                                    {formatDate(dia.data)}
                                                </TableCell>
                                                <TableCell className="text-center text-slate-600 font-mono text-sm">
                                                    <span className={dia.entrada1 ? "text-blue-600 font-semibold" : "text-slate-300"}>{dia.entrada1 || '--:--'}</span> /&nbsp;
                                                    <span className={dia.saida1 ? "text-blue-600 font-semibold" : "text-slate-300"}>{dia.saida1 || '--:--'}</span> /&nbsp;
                                                    <span className={dia.entrada2 ? "text-blue-600 font-semibold" : "text-slate-300"}>{dia.entrada2 || '--:--'}</span> /&nbsp;
                                                    <span className={dia.saida2 ? "text-blue-600 font-semibold" : "text-slate-300"}>{dia.saida2 || '--:--'}</span>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Incompleto</Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <a href={`/espelho`}>
                                                        <Button variant="outline" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity ml-auto text-blue-600 border-blue-200 hover:bg-blue-50">
                                                            Resolver no Espelho <ExternalLink className="h-3 w-3 ml-2" />
                                                        </Button>
                                                    </a>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
