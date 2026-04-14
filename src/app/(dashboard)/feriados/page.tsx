"use client"

import React, { useEffect, useState } from "react"
import { databases } from "@/lib/appwrite"
import { ID, Query } from "appwrite"
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
import { Input } from "@/components/ui/input"
import { Dialog } from "@/components/ui/dialog"
import { Plus, Search, Edit2, Trash2, Calendar } from "lucide-react"

const DATABASE_ID = 'ponto-eletronico'
const HOLIDAYS_COLLECTION = 'feriados'

export default function FeriadosPage() {
  const [holidays, setHolidays] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingHoliday, setEditingHoliday] = useState<any>(null)
  const [formData, setFormData] = useState({ data: "", descricao: "", tipo: "nacional" })
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString())

  useEffect(() => {
    fetchHolidays()
  }, [yearFilter])

  async function fetchHolidays() {
    try {
      setLoading(true)
      const response = await databases.listDocuments(DATABASE_ID, HOLIDAYS_COLLECTION, [
        Query.orderAsc('data')
      ])
      
      // Filter by year in memory for simplicity or use Query if attribute is optimized
      const filtered = response.documents.filter(h => h.data.startsWith(yearFilter))
      setHolidays(filtered)
    } catch (error) {
      console.error("Error fetching holidays:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
        const payload = {
            ...formData,
            data: new Date(formData.data).toISOString()
        }
        if (editingHoliday) {
            await databases.updateDocument(DATABASE_ID, HOLIDAYS_COLLECTION, editingHoliday.$id, payload)
        } else {
            await databases.createDocument(DATABASE_ID, HOLIDAYS_COLLECTION, ID.unique(), payload)
        }
        setIsModalOpen(false)
        fetchHolidays()
    } catch (error) {
        console.error("Save error:", error)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm("Deseja excluir este feriado?")) {
        try {
            await databases.deleteDocument(DATABASE_ID, HOLIDAYS_COLLECTION, id)
            fetchHolidays()
        } catch (error) {
            console.error("Delete error:", error)
        }
    }
  }

  const openCreate = () => {
    setEditingHoliday(null)
    setFormData({ data: "", descricao: "", tipo: "nacional" })
    setIsModalOpen(true)
  }

  const openEdit = (h: any) => {
    setEditingHoliday(h)
    setFormData({ 
        data: h.data.split('T')[0], 
        descricao: h.descricao, 
        tipo: h.tipo 
    })
    setIsModalOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Cadastro de Feriados</h1>
          <p className="text-slate-500 text-sm">Gerencie os feriados nacionais, estaduais e municipais.</p>
        </div>
        <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="mr-2 h-4 w-4" /> Novo Feriado
        </Button>
      </div>

      <Card className="border-none shadow-sm overflow-hidden">
        <CardHeader className="bg-white border-b space-y-4 py-4 px-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-slate-500">Ano:</label>
                <select 
                    value={yearFilter}
                    onChange={(e) => setYearFilter(e.target.value)}
                    className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm"
                >
                    <option value="2024">2024</option>
                    <option value="2025">2025</option>
                    <option value="2026">2026</option>
                </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="w-[150px] font-bold">Data</TableHead>
                <TableHead className="font-bold">Descrição</TableHead>
                <TableHead className="font-bold">Tipo</TableHead>
                <TableHead className="text-right font-bold">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4} className="h-48 text-center">Carregando...</TableCell></TableRow>
              ) : holidays.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="h-48 text-center text-slate-400">Nenhum feriado cadastrado para este ano.</TableCell></TableRow>
              ) : (
                holidays.map((h) => (
                  <TableRow key={h.$id}>
                    <TableCell className="font-semibold">
                        {new Date(h.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                    </TableCell>
                    <TableCell>{h.descricao}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{h.tipo}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(h)} className="h-8 w-8 text-blue-600">
                            <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(h.$id)} className="h-8 w-8 text-red-500">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingHoliday ? "Editar Feriado" : "Novo Feriado"}>
         <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
                <label className="text-sm font-medium">Data</label>
                <Input type="date" value={formData.data} onChange={(e) => setFormData({...formData, data: e.target.value})} required />
            </div>
            <div className="space-y-2">
                <label className="text-sm font-medium">Descrição</label>
                <Input value={formData.descricao} onChange={(e) => setFormData({...formData, descricao: e.target.value})} placeholder="Ex: Dia do Trabalho" required />
            </div>
            <div className="space-y-2">
                <label className="text-sm font-medium">Tipo</label>
                <select 
                    value={formData.tipo}
                    onChange={(e) => setFormData({...formData, tipo: e.target.value})}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                    <option value="nacional">Nacional</option>
                    <option value="estadual">Estadual</option>
                    <option value="municipal">Municipal</option>
                    <option value="empresa">Empresa</option>
                </select>
            </div>
            <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Salvar</Button>
            </div>
         </form>
      </Dialog>
    </div>
  )
}
