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
import { 
  Plus, 
  Search, 
  Edit2, 
  UserMinus, 
  MoreVertical,
  Filter
} from "lucide-react"
import { EmployeeModal } from "@/components/employees/employee-modal"

const DATABASE_ID = 'ponto-eletronico'
const EMPLOYEES_COLLECTION = 'funcionarios'

export default function FuncionariosPage() {
  const [employees, setEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<any>(null)

  useEffect(() => {
    fetchEmployees()
  }, [])

  async function fetchEmployees() {
    try {
      setLoading(true)
      const response = await databases.listDocuments(DATABASE_ID, EMPLOYEES_COLLECTION, [
        Query.equal('ativo', true),
        Query.orderAsc('nome')
      ])
      setEmployees(response.documents)
    } catch (error) {
      console.error("Error fetching employees:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (data: any) => {
    try {
      if (editingEmployee) {
        // Update
        const { $id, $databaseId, $collectionId, $createdAt, $updatedAt, $permissions, ...cleanData } = data
        await databases.updateDocument(DATABASE_ID, EMPLOYEES_COLLECTION, editingEmployee.$id, cleanData)
      } else {
        // Create
        await databases.createDocument(DATABASE_ID, EMPLOYEES_COLLECTION, ID.unique(), data)
      }
      fetchEmployees()
    } catch (error) {
      console.error("Save error:", error)
      throw error
    }
  }

  const handleDeactivate = async (id: string) => {
    if (confirm("Deseja realmente desativar este funcionário?")) {
      try {
        await databases.updateDocument(DATABASE_ID, EMPLOYEES_COLLECTION, id, { ativo: false })
        fetchEmployees()
      } catch (error) {
        console.error("Deactivate error:", error)
      }
    }
  }

  const openEdit = (employee: any) => {
    setEditingEmployee(employee)
    setIsModalOpen(true)
  }

  const openCreate = () => {
    setEditingEmployee(null)
    setIsModalOpen(true)
  }

  const filteredEmployees = employees.filter(emp => 
    emp.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.idRelogio.toString().includes(searchTerm)
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Gestão de Funcionários</h1>
          <p className="text-slate-500 text-sm">Cadastre e gerencie os colaboradores da empresa.</p>
        </div>
        <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20">
          <Plus className="mr-2 h-4 w-4" /> Novo Funcionário
        </Button>
      </div>

      <Card className="border-none shadow-sm overflow-hidden">
        <CardHeader className="bg-white border-b space-y-4 py-4 px-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Buscar por nome ou ID..." 
                className="pl-9 h-10 border-slate-200"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="text-slate-500 h-10">
                    <Filter className="mr-2 h-4 w-4" /> Filtros
                </Button>
                <div className="text-xs text-slate-400 font-medium">
                    {filteredEmployees.length} registros encontrados
                </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="w-[100px] font-bold">ID Relógio</TableHead>
                <TableHead className="font-bold">Colaborador</TableHead>
                <TableHead className="font-bold">Departamento / Cargo</TableHead>
                <TableHead className="font-bold">Jornada (Padrão)</TableHead>
                <TableHead className="font-bold">Status</TableHead>
                <TableHead className="text-right font-bold">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center text-slate-400">
                    Carregando funcionários...
                  </TableCell>
                </TableRow>
              ) : filteredEmployees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center text-slate-400">
                    Nenhum funcionário encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filteredEmployees.map((emp) => (
                  <TableRow key={emp.$id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell className="font-mono text-slate-600">#{emp.idRelogio}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-800">{emp.nome}</span>
                        <span className="text-xs text-slate-400">Registrado em {new Date(emp.$createdAt).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm text-slate-700">{emp.departamento || "-"}</span>
                        <span className="text-xs text-slate-500 italic">{emp.cargo || "-"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant="outline" className="text-[10px] w-fit font-normal">
                            {emp.jornadaEntrada1} - {emp.jornadaSaida2}
                        </Badge>
                        <span className="text-[10px] text-slate-400 uppercase tracking-tighter">
                            {emp.toleranciaMinutos}min tolerância
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="success" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                        Ativo
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(emp)} className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                            <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeactivate(emp.$id)} className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50">
                            <UserMinus className="h-4 w-4" />
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

      <EmployeeModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        initialData={editingEmployee}
      />
    </div>
  )
}
