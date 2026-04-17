"use client"

import React, { useState, useEffect } from "react"
import { databases } from "@/lib/appwrite"
import { Query, ID } from "appwrite"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Clock, MapPin, CheckCircle2, AlertCircle, Loader2, Fingerprint } from "lucide-react"

const DATABASE_ID = 'ponto-eletronico'

export default function PontoExternoPage() {
  const [time, setTime] = useState(new Date())
  const [idRelogio, setIdRelogio] = useState("")
  const [pin, setPin] = useState("")
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState("")
  const [location, setLocation] = useState<{lat: string, lng: string} | null>(null)

  // Relógio em tempo real
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Solicita GPS ao carregar
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude.toString(), lng: pos.coords.longitude.toString() }),
        (err) => console.warn("GPS access denied")
      )
    }
  }, [])

  const handlePunch = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')
    setMessage("")

    try {
      // 1. Validar Funcionário e PIN
      const empResp = await databases.listDocuments(DATABASE_ID, 'funcionarios', [
        Query.equal('idRelogio', parseInt(idRelogio)),
        Query.equal('ativo', true),
        Query.limit(1)
      ])

      if (empResp.total === 0) {
        throw new Error("Funcionário não encontrado ou desativado")
      }

      const emp = empResp.documents[0]

      if (!emp.permiteMarcacaoExterna) {
        throw new Error("Você não tem permissão para marcação externa")
      }

      if (emp.senhaPonto !== pin) {
        throw new Error("PIN de acesso incorreto")
      }

      // 2. Tentar obter localização no momento do clique se ainda não tiver
      let currentLat = location?.lat || ""
      let currentLng = location?.lng || ""

      // 3. Registrar a Batida
      const now = new Date()
      const todayIso = now.toLocaleDateString('en-CA') // YYYY-MM-DD
      const dateKey = `${todayIso}T00:00:00.000Z`
      const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

      // Busca se já existe registro hoje
      const pontoResp = await databases.listDocuments(DATABASE_ID, 'ponto_dia', [
        Query.equal('funcionarioId', emp.idRelogio),
        Query.equal('data', dateKey),
        Query.limit(1)
      ])

      if (pontoResp.total > 0) {
        const doc = pontoResp.documents[0]
        let fieldToUpdate = ""

        if (!doc.entrada1) fieldToUpdate = "entrada1"
        else if (!doc.saida1) fieldToUpdate = "saida1"
        else if (!doc.entrada2) fieldToUpdate = "entrada2"
        else if (!doc.saida2) fieldToUpdate = "saida2"
        else {
          throw new Error("Limite de 4 batidas diárias atingido.")
        }

        await databases.updateDocument(DATABASE_ID, 'ponto_dia', doc.$id, {
          [fieldToUpdate]: timeStr,
          latitude: currentLat,
          longitude: currentLng,
          ajustadoManualmente: false // Marcação real
        })
      } else {
        // Primeiro registro do dia
        await databases.createDocument(DATABASE_ID, 'ponto_dia', ID.unique(), {
          funcionarioId: emp.idRelogio,
          data: dateKey,
          entrada1: timeStr,
          latitude: currentLat,
          longitude: currentLng,
          ajustadoManualmente: false,
          status: 'incompleto'
        })
      }

      setStatus('success')
      setMessage(`Batida registrada com sucesso às ${timeStr}!`)
      setPin("")
      
      // Auto-reset após 5 segundos
      setTimeout(() => {
        setStatus('idle')
        setMessage("")
      }, 5000)

    } catch (err: any) {
      console.error(err)
      setStatus('error')
      setMessage(err.message || "Falha ao registrar ponto")
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-none shadow-2xl overflow-hidden">
        <div className="bg-blue-600 p-8 text-white text-center space-y-2">
          <Clock className="w-12 h-12 mx-auto mb-2 animate-pulse" />
          <h1 className="text-4xl font-bold tracking-tighter">
            {time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </h1>
          <p className="text-blue-100 font-medium">
            {time.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>

        <CardContent className="p-8 space-y-6">
          {status === 'success' ? (
            <div className="text-center space-y-4 py-8 animate-in zoom-in duration-300">
               <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                 <CheckCircle2 className="w-10 h-10" />
               </div>
               <h2 className="text-2xl font-bold text-slate-800">Sucesso!</h2>
               <p className="text-slate-500 font-medium">{message}</p>
               <Button variant="outline" onClick={() => setStatus('idle')} className="mt-4">Nova Marcação</Button>
            </div>
          ) : (
            <form onSubmit={handlePunch} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">ID do Funcionário</label>
                  <div className="relative">
                    <Fingerprint className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                    <Input 
                      type="number" 
                      placeholder="Identificador" 
                      className="pl-10 h-12 border-slate-200 text-lg"
                      value={idRelogio}
                      onChange={(e) => setIdRelogio(e.target.value)}
                      required
                      disabled={status === 'loading'}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">PIN de Acesso</label>
                  <Input 
                    type="password" 
                    inputMode="numeric"
                    placeholder="****" 
                    className="h-12 border-slate-200 text-center text-lg tracking-[1em]"
                    maxLength={6}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    required
                    disabled={status === 'loading'}
                  />
                </div>
              </div>

              {status === 'error' && (
                <div className="p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-3 text-sm font-medium animate-in slide-in-from-top-2">
                  <AlertCircle className="shrink-0 h-5 w-5" />
                  {message}
                </div>
              )}

              <Button 
                type="submit" 
                disabled={status === 'loading'}
                className="w-full h-14 text-lg bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-500/30 transition-all active:scale-95"
              >
                {status === 'loading' ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <>Registrar Ponto AGORA</>
                )}
              </Button>

              <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 font-medium uppercase tracking-tighter pt-2">
                <MapPin className="h-3 w-3" />
                {location ? "Localização capturada" : "Aguardando GPS..."}
              </div>
            </form>
          )}
        </CardContent>
        <div className="p-4 bg-slate-50 border-t text-center">
            <p className="text-[10px] text-slate-400 font-semibold tracking-wider">SISTEMA RH • MARCAÇÃO EXTERNA AUTORIZADA</p>
        </div>
      </Card>
    </div>
  )
}
