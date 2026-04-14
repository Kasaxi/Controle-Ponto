"use client"

import React, { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"

interface Employee {
  $id?: string
  idRelogio: number
  nome: string
  cargo?: string
  departamento?: string
  jornadaEntrada1: string
  jornadaSaida1: string
  jornadaEntrada2: string
  jornadaSaida2: string
  jornadaSabEntrada1: string
  jornadaSabSaida1: string
  toleranciaMinutos: number
  ativo: boolean
}

interface EmployeeModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: any) => Promise<void>
  initialData?: any
}

const DEFAULT_JORNADA = {
  jornadaEntrada1: "08:00",
  jornadaSaida1: "12:00",
  jornadaEntrada2: "13:00",
  jornadaSaida2: "18:00",
  jornadaSabEntrada1: "",
  jornadaSabSaida1: "",
  toleranciaMinutos: 10,
  ativo: true
}

export function EmployeeModal({ isOpen, onClose, onSave, initialData }: EmployeeModalProps) {
  const [formData, setFormData] = useState<any>(DEFAULT_JORNADA)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (initialData) {
      setFormData(initialData)
    } else {
      setFormData(DEFAULT_JORNADA)
    }
  }, [initialData, isOpen])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target
    setFormData((prev: any) => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) : value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onSave(formData)
      onClose()
    } catch (error) {
      console.error("Save error:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog 
        isOpen={isOpen} 
        onClose={onClose} 
        title={initialData ? "Editar Funcionário" : "Novo Funcionário"}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nome Completo</label>
            <Input name="nome" value={formData.nome || ""} onChange={handleChange} required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">ID no Relógio</label>
            <Input name="idRelogio" type="number" value={formData.idRelogio || ""} onChange={handleChange} required />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Cargo</label>
            <Input name="cargo" value={formData.cargo || ""} onChange={handleChange} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Departamento</label>
            <Input name="departamento" value={formData.departamento || ""} onChange={handleChange} />
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <h4 className="text-sm font-bold text-blue-600 uppercase tracking-wider">Jornada Semanal (Seg-Sex)</h4>
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium">Entrada 1</label>
              <Input name="jornadaEntrada1" type="time" value={formData.jornadaEntrada1} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium">Saída 1</label>
              <Input name="jornadaSaida1" type="time" value={formData.jornadaSaida1} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium">Entrada 2</label>
              <Input name="jornadaEntrada2" type="time" value={formData.jornadaEntrada2} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium">Saída 2</label>
              <Input name="jornadaSaida2" type="time" value={formData.jornadaSaida2} onChange={handleChange} />
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <h4 className="text-sm font-bold text-blue-600 uppercase tracking-wider">Jornada Sábado</h4>
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium">Entrada</label>
              <Input name="jornadaSabEntrada1" type="time" value={formData.jornadaSabEntrada1} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium">Saída</label>
              <Input name="jornadaSabSaida1" type="time" value={formData.jornadaSabSaida1} onChange={handleChange} />
            </div>
            <div className="col-span-2 space-y-2">
              <label className="text-xs font-medium">Tolerância (min)</label>
              <Input name="toleranciaMinutos" type="number" value={formData.toleranciaMinutos} onChange={handleChange} />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
            {loading ? "Salvando..." : initialData ? "Atualizar" : "Cadastrar"}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
